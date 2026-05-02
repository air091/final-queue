/*
  Warnings:

  - Made the column `profileUrl` on table `Community` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Community" ALTER COLUMN "profileUrl" SET NOT NULL,
ALTER COLUMN "profileUrl" SET DEFAULT 'https://image.pngaaa.com/189/734189-middle.png';
