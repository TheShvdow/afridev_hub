-- Décision 2026-10-21 : plus d'approbation manuelle. Un projet est publié dès que
-- l'auteur a le badge vérifié et que le dépôt GitHub existe (FR-27).
DROP INDEX "Project_isApproved_idx";
ALTER TABLE "Project" DROP COLUMN "isApproved";

ALTER TABLE "Project"
  ADD COLUMN "githubForks"    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "githubFullName" TEXT,
  ADD COLUMN "githubSyncedAt" TIMESTAMP(3),
  ADD COLUMN "slug"           TEXT;

-- Données existantes : « owner/repo » extrait de l'URL GitHub, et un slug
-- tiré du nom, suffixé du début de l'identifiant pour rester unique.
UPDATE "Project" SET "githubFullName" = lower(substring("repoUrl" from '^https?://(?:www\.)?github\.com/([A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+?)(?:\.git)?/?$'));

UPDATE "Project" SET "slug" =
  trim(both '-' from regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g')) || '-' || left("id", 6);

ALTER TABLE "Project" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");
CREATE INDEX "Project_githubFullName_idx" ON "Project"("githubFullName");
CREATE INDEX "Project_githubStars_idx" ON "Project"("githubStars");
CREATE INDEX "Project_country_idx" ON "Project"("country");
