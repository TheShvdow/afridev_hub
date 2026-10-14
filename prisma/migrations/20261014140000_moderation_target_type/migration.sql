-- CreateEnum
CREATE TYPE "ModerationTargetType" AS ENUM ('POST', 'ANSWER', 'PROJECT', 'USER');

-- AlterTable
ALTER TABLE "ModerationAction" DROP COLUMN "entityType",
ADD COLUMN     "entityType" "ModerationTargetType" NOT NULL;

-- CreateIndex
CREATE INDEX "ModerationAction_entityType_entityId_idx" ON "ModerationAction"("entityType", "entityId");

