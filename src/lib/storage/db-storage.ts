import "server-only";
import { prisma } from "../db";
import type { FileStorage } from "./index";

/**
 * 원본 파일을 Postgres(SurveySourceFile)에 보관하는 드라이버.
 * 업로드 파일은 500KB 이하로 제한되므로 DB 보관이 가능하며,
 * Supabase Storage service role key가 없는 환경에서도 원본이 유실되지 않는다.
 */
export const dbStorage: FileStorage = {
  id: "database",

  async put({ surveyId, fileName, contentType, data }) {
    await prisma.surveySourceFile.upsert({
      where: { surveyId },
      create: {
        surveyId,
        fileName,
        contentType,
        size: data.length,
        data: new Uint8Array(data),
      },
      update: {
        fileName,
        contentType,
        size: data.length,
        data: new Uint8Array(data),
      },
    });
  },

  async remove() {
    // Survey 삭제 시 onDelete: Cascade로 함께 제거된다.
  },
};
