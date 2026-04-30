/*
  Warnings:

  - The `status` column on the `Account` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('active', 'waiting', 'inqueue', 'playing');

-- AlterTable
ALTER TABLE "Account" DROP COLUMN "status",
ADD COLUMN     "status" "AccountStatus" NOT NULL DEFAULT 'active';
