-- DropForeignKey
ALTER TABLE "RespondentAccount" DROP CONSTRAINT "RespondentAccount_surveyId_fkey";

-- DropIndex
DROP INDEX "RespondentAccount_surveyId_loginId_key";

-- DropIndex
DROP INDEX "SurveyResponse_respondentAccountId_key";

-- AlterTable
ALTER TABLE "RespondentAccount" DROP COLUMN "surveyId";

-- CreateIndex
CREATE UNIQUE INDEX "RespondentAccount_loginId_key" ON "RespondentAccount"("loginId");

