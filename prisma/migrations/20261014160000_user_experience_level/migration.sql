-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('JUNIOR', 'MID', 'SENIOR');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "level" "ExperienceLevel";

