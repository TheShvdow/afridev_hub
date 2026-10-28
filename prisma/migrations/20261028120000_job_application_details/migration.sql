-- Candidature enrichie : coordonnées, liens, expérience, disponibilité, prétentions salariales et stack.
-- Colonnes facultatives : les candidatures existantes restent valides.
ALTER TABLE "JobApplication"
  ADD COLUMN "fullName" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "country" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "linkedinUrl" TEXT,
  ADD COLUMN "githubUrl" TEXT,
  ADD COLUMN "portfolioUrl" TEXT,
  ADD COLUMN "experienceYears" INTEGER,
  ADD COLUMN "availableFrom" DATE,
  ADD COLUMN "expectedSalary" INTEGER,
  ADD COLUMN "expectedCurrency" TEXT,
  ADD COLUMN "stack" TEXT[] DEFAULT ARRAY[]::TEXT[];
