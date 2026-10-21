-- AlterTable
ALTER TABLE "JobAlert" ADD COLUMN     "lastDigestAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "JobOffer" ADD COLUMN     "expiryReminderSentAt" TIMESTAMP(3),
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "salaryMaxUsd" INTEGER,
ADD COLUMN     "salaryMinUsd" INTEGER,
ALTER COLUMN "status" SET DEFAULT 'PENDING_REVIEW';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "isRecruiter" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preferredCurrency" TEXT;

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "currency" TEXT NOT NULL,
    "perUsd" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("currency")
);

-- CreateIndex
CREATE INDEX "JobOffer_salaryMaxUsd_idx" ON "JobOffer"("salaryMaxUsd");

-- CreateIndex
CREATE INDEX "JobOffer_publishedAt_idx" ON "JobOffer"("publishedAt");

-- ── Données existantes ───────────────────────────────────────────────────────
-- Les offres déjà en ligne sont considérées comme publiées à leur création.
UPDATE "JobOffer" SET "publishedAt" = "createdAt" WHERE "status" <> 'PENDING_REVIEW';

-- Leurs auteurs deviennent recruteurs, avec l'entreprise de leur dernière offre.
UPDATE "User" u SET
  "isRecruiter" = true,
  "companyName" = (
    SELECT j."company" FROM "JobOffer" j
    WHERE j."recruiterId" = u."id" ORDER BY j."createdAt" DESC LIMIT 1
  )
WHERE EXISTS (SELECT 1 FROM "JobOffer" j WHERE j."recruiterId" = u."id");
