-- Valeurs d'enum seules : PostgreSQL refuse d'utiliser une valeur ajoutée
-- dans la même transaction (ici, comme défaut de JobOffer.status).
ALTER TYPE "JobStatus" ADD VALUE 'PENDING_REVIEW';
ALTER TYPE "JobStatus" ADD VALUE 'REJECTED';

ALTER TYPE "NotificationType" ADD VALUE 'JOB_APPLICATION';
ALTER TYPE "NotificationType" ADD VALUE 'JOB_REVIEWED';
