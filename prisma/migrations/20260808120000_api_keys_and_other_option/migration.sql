-- AlterTable
ALTER TABLE "AppSetting" ADD COLUMN     "deepseekApiKeyEnc" TEXT,
ADD COLUMN     "openaiApiKeyEnc" TEXT;

-- AlterTable
ALTER TABLE "QuestionOption" ADD COLUMN     "allowsText" BOOLEAN NOT NULL DEFAULT false;

