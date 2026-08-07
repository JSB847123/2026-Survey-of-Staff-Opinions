import { PrismaClient } from "@prisma/client";

// serverless/핫리로드 환경에서 PrismaClient가 중복 생성되지 않도록 전역에 캐시한다.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
