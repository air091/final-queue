/*
  Warnings:

  - You are about to drop the column `createdAt` on the `QueueEntry` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `CourtAssignment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CourtAssignment" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "QueueEntry" DROP COLUMN "createdAt",
ADD COLUMN     "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
