-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('finished', 'ongoing');

-- DropIndex
DROP INDEX "PlayerPayment_paidAt_idx";

-- DropIndex
DROP INDEX "PlayerPayment_status_idx";

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "courtId" TEXT,
    "status" "MatchStatus" NOT NULL DEFAULT 'ongoing',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "teamWinner" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchParticipant" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "hostedPlayerId" TEXT NOT NULL,
    "accountId" TEXT,
    "staticName" TEXT,
    "staticProfileUrl" TEXT,
    "staticSkillLevel" "SkillLevel",
    "team" TEXT,
    "result" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Match_hostId_status_startedAt_idx" ON "Match"("hostId", "status", "startedAt");

-- CreateIndex
CREATE INDEX "Match_courtId_idx" ON "Match"("courtId");

-- CreateIndex
CREATE INDEX "MatchParticipant_matchId_idx" ON "MatchParticipant"("matchId");

-- CreateIndex
CREATE INDEX "MatchParticipant_hostedPlayerId_idx" ON "MatchParticipant"("hostedPlayerId");

-- CreateIndex
CREATE INDEX "MatchParticipant_accountId_idx" ON "MatchParticipant"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchParticipant_matchId_hostedPlayerId_key" ON "MatchParticipant"("matchId", "hostedPlayerId");

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "Host"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "Court"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_hostedPlayerId_fkey" FOREIGN KEY ("hostedPlayerId") REFERENCES "HostedPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
