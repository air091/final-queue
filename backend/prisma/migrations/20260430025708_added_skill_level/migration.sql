/*
  Warnings:

  - The `skillLevel` column on the `Account` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('beginner', 'intermediate', 'advanced', 'elite');

-- AlterTable
ALTER TABLE "Account" DROP COLUMN "skillLevel",
ADD COLUMN     "skillLevel" "SkillLevel" NOT NULL DEFAULT 'beginner';
