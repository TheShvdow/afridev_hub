-- AlterTable
ALTER TABLE "User" ADD COLUMN     "country" TEXT,
ADD COLUMN     "stack" TEXT[] DEFAULT ARRAY[]::TEXT[];

