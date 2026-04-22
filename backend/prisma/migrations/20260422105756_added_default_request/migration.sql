/*
  Warnings:

  - Made the column `requestedAt` on table `HostedPlayers` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "HostedPlayers" ALTER COLUMN "requestedAt" SET NOT NULL,
ALTER COLUMN "requestedAt" SET DEFAULT CURRENT_TIMESTAMP;
