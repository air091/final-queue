/*
  Warnings:

  - You are about to drop the column `skillLevel` on the `Account` table. All the data in the column will be lost.
  - The `status` column on the `Account` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `adminId` on the `Community` table. All the data in the column will be lost.
  - You are about to drop the column `assignedAt` on the `CourtAssignment` table. All the data in the column will be lost.
  - You are about to drop the column `hostedPlayerId` on the `CourtAssignment` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `CourtAssignment` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `HostPricing` table. All the data in the column will be lost.
  - The `currency` column on the `HostPricing` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `hostedPlayerId` on the `MatchParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `staticName` on the `MatchParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `staticProfileUrl` on the `MatchParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `staticSkillLevel` on the `MatchParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `amountExpected` on the `PlayerPayment` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `PlayerPayment` table. All the data in the column will be lost.
  - You are about to drop the column `hostedPlayerId` on the `PlayerPayment` table. All the data in the column will be lost.
  - You are about to drop the column `method` on the `PlayerPayment` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `PlayerPayment` table. All the data in the column will be lost.
  - You are about to drop the column `paidAt` on the `PlayerPayment` table. All the data in the column will be lost.
  - You are about to drop the column `providerReference` on the `PlayerPayment` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `PlayerPayment` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `PlayerPayment` table. All the data in the column will be lost.
  - You are about to drop the `HostedPlayer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QueueEntry` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[playerId]` on the table `CourtAssignment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[matchId,playerId]` on the table `MatchParticipant` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `masterId` to the `Community` table without a default value. This is not possible if the table is not empty.
  - Added the required column `playerId` to the `CourtAssignment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `playerId` to the `MatchParticipant` table without a default value. This is not possible if the table is not empty.
  - Made the column `accountId` on table `MatchParticipant` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `playerId` to the `PlayerPayment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AccountStatuses" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "UserRoles" AS ENUM ('player', 'master', 'static');

-- CreateEnum
CREATE TYPE "SkillLevels" AS ENUM ('beginner', 'intermediate', 'advanced', 'elite');

-- CreateEnum
CREATE TYPE "Sports" AS ENUM ('badminton');

-- CreateEnum
CREATE TYPE "PaymentStatuses" AS ENUM ('unpaid', 'paid');

-- CreateEnum
CREATE TYPE "PaymentMethods" AS ENUM ('cash', 'ewallet');

-- CreateEnum
CREATE TYPE "PlayerHostStatuses" AS ENUM ('requested', 'accepted', 'rejected', 'banned');

-- CreateEnum
CREATE TYPE "Currencies" AS ENUM ('PHP', 'USD');

-- DropForeignKey
ALTER TABLE "Community" DROP CONSTRAINT "Community_adminId_fkey";

-- DropForeignKey
ALTER TABLE "CourtAssignment" DROP CONSTRAINT "CourtAssignment_hostedPlayerId_fkey";

-- DropForeignKey
ALTER TABLE "HostedPlayer" DROP CONSTRAINT "HostedPlayer_hostId_fkey";

-- DropForeignKey
ALTER TABLE "HostedPlayer" DROP CONSTRAINT "HostedPlayer_playerId_fkey";

-- DropForeignKey
ALTER TABLE "MatchParticipant" DROP CONSTRAINT "MatchParticipant_hostedPlayerId_fkey";

-- DropForeignKey
ALTER TABLE "PlayerPayment" DROP CONSTRAINT "PlayerPayment_hostedPlayerId_fkey";

-- DropForeignKey
ALTER TABLE "QueueEntry" DROP CONSTRAINT "QueueEntry_hostedPlayerId_fkey";

-- DropForeignKey
ALTER TABLE "QueueEntry" DROP CONSTRAINT "QueueEntry_queueId_fkey";

-- DropIndex
DROP INDEX "Community_adminId_idx";

-- DropIndex
DROP INDEX "CourtAssignment_hostedPlayerId_key";

-- DropIndex
DROP INDEX "MatchParticipant_hostedPlayerId_idx";

-- DropIndex
DROP INDEX "MatchParticipant_matchId_hostedPlayerId_key";

-- DropIndex
DROP INDEX "PlayerPayment_hostedPlayerId_idx";

-- AlterTable
ALTER TABLE "Account" DROP COLUMN "skillLevel",
ADD COLUMN     "role" "UserRoles" NOT NULL DEFAULT 'player',
DROP COLUMN "status",
ADD COLUMN     "status" "AccountStatuses" NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "Community" DROP COLUMN "adminId",
ADD COLUMN     "masterId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "CourtAssignment" DROP COLUMN "assignedAt",
DROP COLUMN "hostedPlayerId",
DROP COLUMN "updatedAt",
ADD COLUMN     "playerId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "HostPricing" DROP COLUMN "createdAt",
DROP COLUMN "currency",
ADD COLUMN     "currency" "Currencies" NOT NULL DEFAULT 'PHP';

-- AlterTable
ALTER TABLE "MatchParticipant" DROP COLUMN "hostedPlayerId",
DROP COLUMN "staticName",
DROP COLUMN "staticProfileUrl",
DROP COLUMN "staticSkillLevel",
ADD COLUMN     "playerId" TEXT NOT NULL,
ALTER COLUMN "accountId" SET NOT NULL;

-- AlterTable
ALTER TABLE "PlayerPayment" DROP COLUMN "amountExpected",
DROP COLUMN "currency",
DROP COLUMN "hostedPlayerId",
DROP COLUMN "method",
DROP COLUMN "notes",
DROP COLUMN "paidAt",
DROP COLUMN "providerReference",
DROP COLUMN "status",
DROP COLUMN "updatedAt",
ADD COLUMN     "playerId" TEXT NOT NULL;

-- DropTable
DROP TABLE "HostedPlayer";

-- DropTable
DROP TABLE "QueueEntry";

-- DropEnum
DROP TYPE "AccountStatus";

-- DropEnum
DROP TYPE "Currency";

-- DropEnum
DROP TYPE "HostedPlayerStatus";

-- DropEnum
DROP TYPE "PaymentMethod";

-- DropEnum
DROP TYPE "PaymentStatus";

-- DropEnum
DROP TYPE "SkillLevel";

-- CreateTable
CREATE TABLE "UserSport" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "sport" "Sports" NOT NULL,
    "skillLevel" "SkillLevels" NOT NULL DEFAULT 'beginner',

    CONSTRAINT "UserSport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "paymentStatus" "PaymentStatuses" NOT NULL DEFAULT 'unpaid',
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "hostStatus" "PlayerHostStatuses" NOT NULL DEFAULT 'requested',
    "timerStartedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueueAssignment" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "queueId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QueueAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserSport_accountId_idx" ON "UserSport"("accountId");

-- CreateIndex
CREATE INDEX "Player_hostId_hostStatus_playerId_idx" ON "Player"("hostId", "hostStatus", "playerId");

-- CreateIndex
CREATE INDEX "Player_hostId_paymentStatus_idx" ON "Player"("hostId", "paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Player_hostId_playerId_key" ON "Player"("hostId", "playerId");

-- CreateIndex
CREATE INDEX "QueueAssignment_queueId_idx" ON "QueueAssignment"("queueId");

-- CreateIndex
CREATE UNIQUE INDEX "QueueAssignment_queueId_position_key" ON "QueueAssignment"("queueId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "QueueAssignment_playerId_key" ON "QueueAssignment"("playerId");

-- CreateIndex
CREATE INDEX "Community_masterId_idx" ON "Community"("masterId");

-- CreateIndex
CREATE UNIQUE INDEX "CourtAssignment_playerId_key" ON "CourtAssignment"("playerId");

-- CreateIndex
CREATE INDEX "MatchParticipant_playerId_idx" ON "MatchParticipant"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchParticipant_matchId_playerId_key" ON "MatchParticipant"("matchId", "playerId");

-- CreateIndex
CREATE INDEX "PlayerPayment_playerId_idx" ON "PlayerPayment"("playerId");

-- AddForeignKey
ALTER TABLE "UserSport" ADD CONSTRAINT "UserSport_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Community" ADD CONSTRAINT "Community_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "Host"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueAssignment" ADD CONSTRAINT "QueueAssignment_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueAssignment" ADD CONSTRAINT "QueueAssignment_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "Queue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourtAssignment" ADD CONSTRAINT "CourtAssignment_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerPayment" ADD CONSTRAINT "PlayerPayment_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
