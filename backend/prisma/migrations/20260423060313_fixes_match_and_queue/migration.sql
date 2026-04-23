/*
  Warnings:

  - Added the required column `hostId` to the `match` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hostId` to the `queue` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "match" ADD COLUMN     "hostId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "queue" ADD COLUMN     "hostId" TEXT NOT NULL;
