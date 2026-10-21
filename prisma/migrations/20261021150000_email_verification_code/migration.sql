-- Vérification d'email par code à 6 caractères (décision 2026-10-21) : compteur d'essais.
ALTER TABLE "VerificationToken" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;

-- Les anciens liens ne sont plus acceptés : chaque membre non vérifié demandera un code.
DELETE FROM "VerificationToken";
