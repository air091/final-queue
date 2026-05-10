/*
  Warnings:

  - You are about to drop the column `endtime` on the `Host` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Host" DROP COLUMN "endtime",
ADD COLUMN     "endtTime" TIMESTAMP(3);
