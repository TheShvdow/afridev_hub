-- AlterEnum
ALTER TYPE "ModerationActionType" ADD VALUE 'DISMISSED';

-- DropForeignKey
ALTER TABLE "ModerationAction" DROP CONSTRAINT "ModerationAction_moderatorId_fkey";

-- AlterTable
ALTER TABLE "Answer" ADD COLUMN     "hiddenAt" TIMESTAMP(3),
ADD COLUMN     "isHidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "voteScore" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ModerationAction" ALTER COLUMN "moderatorId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "hiddenAt" TIMESTAMP(3),
ADD COLUMN     "isHidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "voteScore" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "hiddenAt" TIMESTAMP(3),
ADD COLUMN     "isHidden" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailNotifications" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Post_voteScore_idx" ON "Post"("voteScore");

-- CreateIndex
CREATE INDEX "Post_lastActivityAt_idx" ON "Post"("lastActivityAt");

-- CreateIndex
CREATE INDEX "Post_isHidden_idx" ON "Post"("isHidden");

-- FR-20 : un signalement par membre et par contenu. On garde le plus ancien des doublons.
DELETE FROM "Report" r
USING "Report" older
WHERE r."userId" = older."userId"
  AND r."entityType" = older."entityType"
  AND r."entityId" = older."entityId"
  AND (r."createdAt", r."id") > (older."createdAt", older."id");

-- CreateIndex
CREATE UNIQUE INDEX "Report_userId_entityType_entityId_key" ON "Report"("userId", "entityType", "entityId");

-- AddForeignKey
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ── Recherche (FR-19) et détection de doublons (FR-14) ──────────────────────
-- Index d'expression, hors du schéma Prisma : la recherche passe par $queryRaw.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- unaccent() n'est pas IMMUTABLE : ce wrapper permet de l'utiliser dans un index.
CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;

CREATE INDEX "Post_search_fts_idx" ON "Post"
  USING GIN (to_tsvector('french', f_unaccent("title" || ' ' || "body")));

CREATE INDEX "Post_title_trgm_idx" ON "Post"
  USING GIN (lower(f_unaccent("title")) gin_trgm_ops);

-- ── Données existantes ───────────────────────────────────────────────────────
UPDATE "Post" p SET "voteScore" = COALESCE((
  SELECT SUM(CASE WHEN v."value" = 'UP' THEN 1 ELSE -1 END)
  FROM "Vote" v WHERE v."entityType" = 'POST' AND v."entityId" = p."id"
), 0);

UPDATE "Answer" a SET "voteScore" = COALESCE((
  SELECT SUM(CASE WHEN v."value" = 'UP' THEN 1 ELSE -1 END)
  FROM "Vote" v WHERE v."entityType" = 'ANSWER' AND v."entityId" = a."id"
), 0);

UPDATE "Post" p SET "lastActivityAt" = GREATEST(
  p."updatedAt",
  COALESCE((SELECT MAX(a."createdAt") FROM "Answer" a WHERE a."postId" = p."id"), p."createdAt")
);
