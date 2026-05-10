-- AlterTable
ALTER TABLE "Host" ADD COLUMN     "endtime" TIMESTAMP(3),
ADD COLUMN     "location" TEXT,
ADD COLUMN     "maxPlayers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "startTime" TIMESTAMP(3);
