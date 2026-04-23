/*
  Warnings:

  - Made the column `sport` on table `Host` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Host" ALTER COLUMN "sport" SET NOT NULL;
