/*
  Warnings:

  - The values [pending,partial,failed,refunded,waived] on the enum `PaymentStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PaymentStatus_new" AS ENUM ('unpaid', 'paid');
ALTER TABLE "public"."HostedPlayer" ALTER COLUMN "paymentStatus" DROP DEFAULT;
ALTER TABLE "public"."PlayerPayment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "HostedPlayer" ALTER COLUMN "paymentStatus" TYPE "PaymentStatus_new" USING ("paymentStatus"::text::"PaymentStatus_new");
ALTER TABLE "PlayerPayment" ALTER COLUMN "status" TYPE "PaymentStatus_new" USING ("status"::text::"PaymentStatus_new");
ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
ALTER TYPE "PaymentStatus_new" RENAME TO "PaymentStatus";
DROP TYPE "public"."PaymentStatus_old";
ALTER TABLE "HostedPlayer" ALTER COLUMN "paymentStatus" SET DEFAULT 'unpaid';
ALTER TABLE "PlayerPayment" ALTER COLUMN "status" SET DEFAULT 'unpaid';
COMMIT;
