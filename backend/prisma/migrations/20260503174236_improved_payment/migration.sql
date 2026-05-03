/*
  Warnings:

  - You are about to drop the column `isPaid` on the `HostedPlayer` table. All the data in the column will be lost.
  - You are about to drop the `Payment` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('PHP', 'USD', 'EUR');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('unpaid', 'pending', 'partial', 'paid', 'failed', 'refunded', 'waived');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'ewallet');

-- AlterTable
ALTER TABLE "HostedPlayer" DROP COLUMN "isPaid",
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'unpaid';

-- DropTable
DROP TABLE "Payment";

-- CreateTable
CREATE TABLE "HostPricing" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "entranceFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "perMatchFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" "Currency" NOT NULL DEFAULT 'PHP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostPricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerPayment" (
    "id" TEXT NOT NULL,
    "hostedPlayerId" TEXT NOT NULL,
    "amountExpected" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" "Currency" NOT NULL DEFAULT 'PHP',
    "status" "PaymentStatus" NOT NULL DEFAULT 'unpaid',
    "method" "PaymentMethod",
    "providerReference" TEXT,
    "notes" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HostPricing_hostId_key" ON "HostPricing"("hostId");

-- CreateIndex
CREATE INDEX "PlayerPayment_hostedPlayerId_idx" ON "PlayerPayment"("hostedPlayerId");

-- CreateIndex
CREATE INDEX "PlayerPayment_status_idx" ON "PlayerPayment"("status");

-- CreateIndex
CREATE INDEX "PlayerPayment_paidAt_idx" ON "PlayerPayment"("paidAt");

-- CreateIndex
CREATE INDEX "HostedPlayer_hostId_paymentStatus_idx" ON "HostedPlayer"("hostId", "paymentStatus");

-- AddForeignKey
ALTER TABLE "HostPricing" ADD CONSTRAINT "HostPricing_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "Host"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerPayment" ADD CONSTRAINT "PlayerPayment_hostedPlayerId_fkey" FOREIGN KEY ("hostedPlayerId") REFERENCES "HostedPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
