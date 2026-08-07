import "server-only";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FileStorage } from "./index";

/**
 * 로컬 개발/테스트 전용 드라이버.
 * Vercel filesystem은 영구 저장소가 아니므로 production에서는 사용하지 않는다.
 */
const BASE_DIR = path.join(process.cwd(), ".storage");

function resolveSafe(relPath: string): string {
  const abs = path.resolve(BASE_DIR, relPath);
  if (!abs.startsWith(path.resolve(BASE_DIR))) {
    throw new Error("잘못된 저장 경로입니다.");
  }
  return abs;
}

export const localStorageDriver: FileStorage = {
  id: "local",

  async put({ path: relPath, data }) {
    const abs = resolveSafe(relPath);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, data);
  },

  async remove(relPath) {
    try {
      await unlink(resolveSafe(relPath));
    } catch {
      // 없는 파일 삭제는 무시
    }
  },
};
