-- CreateEnum
CREATE TYPE "HostStatus" AS ENUM ('available', 'unavailable');

-- AlterTable
ALTER TABLE "Host" ADD COLUMN     "status" "HostStatus" NOT NULL DEFAULT 'available';
