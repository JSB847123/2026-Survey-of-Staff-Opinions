import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { handleApi } from "@/lib/api";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { MAX_FILE_SIZE, FILE_TOO_LARGE_MESSAGE } from "@/lib/constants";
import {
  parseSurveyDocument,
  validateUploadedFile,
  type UploadedFile,
} from "@/lib/parsing";
import { getStorage } from "@/lib/storage";
import { generateSlug } from "@/lib/slug";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const session = await requireStaff();

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    // multipart 오버헤드를 감안해 여유를 두고 1차 차단
    if (contentLength > MAX_FILE_SIZE + 64 * 1024) {
      throw new AppError(413, FILE_TOO_LARGE_MESSAGE);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new AppError(400, "업로드할 파일을 선택해 주세요.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded: UploadedFile = {
      name: file.name,
      size: buffer.length,
      mimeType: file.type,
      buffer,
    };

    const extension = validateUploadedFile(uploaded);
    const parsed = await parseSurveyDocument(uploaded);

    // Draft 설문 생성 (자동 게시하지 않음)
    const surveyId = randomUUID();
    const storagePath = `surveys/${surveyId}/${randomUUID()}.${extension}`;

    await getStorage().put(
      storagePath,
      buffer,
      file.type || "application/octet-stream",
    );

    const survey = await prisma.survey.create({
      data: {
        id: surveyId,
        title: parsed.title?.slice(0, 200) || file.name.replace(/\.[^.]+$/, ""),
        slug: generateSlug(),
        status: "DRAFT",
        sourceFileName: file.name,
        sourceFileType: extension,
        sourceFilePath: storagePath,
        questions: {
          create: parsed.questions.map((q) => ({
            order: q.order,
            type: q.type,
            title: q.title,
            description: q.description,
            required: q.required,
            needsReview: q.needsReview,
            options: {
              create: q.options.map((o) => ({ order: o.order, label: o.label })),
            },
          })),
        },
      },
      include: { questions: { include: { options: true } } },
    });

    await logAudit({
      actorRole: session.role,
      action: "survey.upload",
      targetType: "survey",
      targetId: survey.id,
      metadata: {
        fileName: file.name,
        fileType: extension,
        questionCount: parsed.questions.length,
      },
    });

    return {
      surveyId: survey.id,
      questionCount: parsed.questions.length,
      warnings: parsed.warnings,
    };
  });
}
