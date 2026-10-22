-- Nettoyage du schéma (décision 2026-10-22) : tables et colonnes jamais utilisées par le code.
-- Toutes étaient vides sur Neon au moment de la suppression.
--   JobCategory et JobOffer.categoryId : le job board filtre par stack, pays et mode.
--   Refund et RefundStatus : remboursements reportés en phase 2.
--   User.name, githubUrl, linkedinUrl : doublons de displayName, githubUsername, linkedinUsername.
--   Account.*Token, expiresAt, scope : l'API ne conserve pas les jetons des fournisseurs OAuth.

-- DropForeignKey
ALTER TABLE "JobOffer" DROP CONSTRAINT "JobOffer_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Refund" DROP CONSTRAINT "Refund_adminId_fkey";

-- DropForeignKey
ALTER TABLE "Refund" DROP CONSTRAINT "Refund_paymentId_fkey";

-- AlterTable
ALTER TABLE "Account" DROP COLUMN "accessToken",
DROP COLUMN "expiresAt",
DROP COLUMN "idToken",
DROP COLUMN "refreshToken",
DROP COLUMN "scope",
DROP COLUMN "tokenType";

-- AlterTable
ALTER TABLE "JobOffer" DROP COLUMN "categoryId";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "githubUrl",
DROP COLUMN "linkedinUrl",
DROP COLUMN "name";

-- DropTable
DROP TABLE "JobCategory";

-- DropTable
DROP TABLE "Refund";

-- DropEnum
DROP TYPE "RefundStatus";

