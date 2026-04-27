/*
  Warnings:

  - You are about to drop the column `acceptedAt` on the `HostedPlayer` table. All the data in the column will be lost.
  - You are about to drop the column `addedAt` on the `HostedPlayer` table. All the data in the column will be lost.
  - You are about to drop the column `rejectedAt` on the `HostedPlayer` table. All the data in the column will be lost.
  - You are about to drop the column `requestedAt` on the `HostedPlayer` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "HostedPlayerStatus" AS ENUM ('requested', 'accepted', 'rejected');

-- DropIndex
DROP INDEX "HostedPlayer_hostId_idx";

-- DropIndex
DROP INDEX "HostedPlayer_playerId_idx";

-- AlterTable
ALTER TABLE "HostedPlayer" DROP COLUMN "acceptedAt",
DROP COLUMN "addedAt",
DROP COLUMN "rejectedAt",
DROP COLUMN "requestedAt",
ADD COLUMN     "status" "HostedPlayerStatus" NOT NULL DEFAULT 'requested';

-- DropEnum
DROP TYPE "PlayerStatus";

-- CreateIndex
CREATE INDEX "HostedPlayer_hostId_status_playerId_idx" ON "HostedPlayer"("hostId", "status", "playerId");
