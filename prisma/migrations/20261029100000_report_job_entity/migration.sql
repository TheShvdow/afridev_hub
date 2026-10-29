-- Story 7.13 : une offre d'emploi peut être signalée.
-- Valeurs ajoutées aux deux énumérations ; aucune donnée existante n'est touchée.
ALTER TYPE "ReportEntityType" ADD VALUE 'JOB';
ALTER TYPE "ModerationTargetType" ADD VALUE 'JOB';
