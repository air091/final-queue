-- AlterTable
ALTER TABLE "HostedPlayer" ADD COLUMN     "isPaid" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "entranceFee" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "perMatchFee" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "expectedFee" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);
