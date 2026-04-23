/*
  Warnings:

  - You are about to drop the column `sportName` on the `Host` table. All the data in the column will be lost.
  - You are about to drop the `HostedPlayers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `match` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `queue` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "HostedPlayers" DROP CONSTRAINT "HostedPlayers_hostId_fkey";

-- DropForeignKey
ALTER TABLE "HostedPlayers" DROP CONSTRAINT "HostedPlayers_playerId_fkey";

-- AlterTable
ALTER TABLE "Host" DROP COLUMN "sportName",
ADD COLUMN     "sport" TEXT;

-- DropTable
DROP TABLE "HostedPlayers";

-- DropTable
DROP TABLE "match";

-- DropTable
DROP TABLE "queue";

-- CreateTable
CREATE TABLE "HostedPlayer" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostedPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Queue" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueueEntry" (
    "id" TEXT NOT NULL,
    "hostedPlayerId" TEXT NOT NULL,
    "queueId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QueueEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Court" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Court_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourtAssignment" (
    "id" TEXT NOT NULL,
    "hostedPlayerId" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourtAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HostedPlayer_hostId_idx" ON "HostedPlayer"("hostId");

-- CreateIndex
CREATE INDEX "HostedPlayer_playerId_idx" ON "HostedPlayer"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "HostedPlayer_hostId_playerId_key" ON "HostedPlayer"("hostId", "playerId");

-- CreateIndex
CREATE INDEX "Queue_hostId_idx" ON "Queue"("hostId");

-- CreateIndex
CREATE INDEX "QueueEntry_queueId_idx" ON "QueueEntry"("queueId");

-- CreateIndex
CREATE UNIQUE INDEX "QueueEntry_queueId_position_key" ON "QueueEntry"("queueId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "QueueEntry_hostedPlayerId_key" ON "QueueEntry"("hostedPlayerId");

-- CreateIndex
CREATE INDEX "Court_hostId_idx" ON "Court"("hostId");

-- CreateIndex
CREATE UNIQUE INDEX "CourtAssignment_hostedPlayerId_key" ON "CourtAssignment"("hostedPlayerId");

-- CreateIndex
CREATE INDEX "CourtAssignment_courtId_idx" ON "CourtAssignment"("courtId");

-- AddForeignKey
ALTER TABLE "HostedPlayer" ADD CONSTRAINT "HostedPlayer_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "Host"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostedPlayer" ADD CONSTRAINT "HostedPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Queue" ADD CONSTRAINT "Queue_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "Host"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueEntry" ADD CONSTRAINT "QueueEntry_hostedPlayerId_fkey" FOREIGN KEY ("hostedPlayerId") REFERENCES "HostedPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueEntry" ADD CONSTRAINT "QueueEntry_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "Queue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Court" ADD CONSTRAINT "Court_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "Host"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourtAssignment" ADD CONSTRAINT "CourtAssignment_hostedPlayerId_fkey" FOREIGN KEY ("hostedPlayerId") REFERENCES "HostedPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourtAssignment" ADD CONSTRAINT "CourtAssignment_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "Court"("id") ON DELETE CASCADE ON UPDATE CASCADE;
