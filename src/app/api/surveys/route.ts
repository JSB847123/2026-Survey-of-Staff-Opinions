import { handleApi } from "@/lib/api";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  return handleApi(async () => {
    await requireStaff();
    const surveys = await prisma.survey.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        responseCount: true,
        maxRespondents: true,
        createdAt: true,
        publishedAt: true,
        _count: { select: { questions: true, responses: true } },
      },
    });
    return { surveys };
  });
}
