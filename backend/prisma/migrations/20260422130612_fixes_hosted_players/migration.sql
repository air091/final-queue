/*
  Warnings:

  - A unique constraint covering the columns `[hostId,playerId]` on the table `HostedPlayers` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "HostedPlayers" ADD COLUMN     "rejectedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Community_adminId_idx" ON "Community"("adminId");

-- CreateIndex
CREATE INDEX "Host_communityId_idx" ON "Host"("communityId");

-- CreateIndex
CREATE INDEX "HostedPlayers_hostId_idx" ON "HostedPlayers"("hostId");

-- CreateIndex
CREATE INDEX "HostedPlayers_playerId_idx" ON "HostedPlayers"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "HostedPlayers_hostId_playerId_key" ON "HostedPlayers"("hostId", "playerId");
