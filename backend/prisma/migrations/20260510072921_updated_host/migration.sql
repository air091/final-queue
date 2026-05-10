/*
  Warnings:

  - You are about to drop the column `endtTime` on the `Host` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Host" DROP COLUMN "endtTime",
ADD COLUMN     "endTime" TIMESTAMP(3);
