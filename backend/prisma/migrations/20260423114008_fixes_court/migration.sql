/*
  Warnings:

  - A unique constraint covering the columns `[courtId,position]` on the table `CourtAssignment` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CourtAssignment_courtId_position_key" ON "CourtAssignment"("courtId", "position");
