UPDATE "HostedPlayer"
SET "paymentStatus" = 'unpaid'
WHERE "paymentStatus" <> 'paid';

UPDATE "PlayerPayment"
SET "status" = 'unpaid'
WHERE "status" <> 'paid';

ALTER TABLE "HostedPlayer" ALTER COLUMN "paymentStatus" DROP DEFAULT;
ALTER TABLE "PlayerPayment" ALTER COLUMN "status" DROP DEFAULT;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentStatus_new') THEN
    DROP TYPE "PaymentStatus_new";
  END IF;
END $$;

CREATE TYPE "PaymentStatus_new" AS ENUM ('unpaid', 'paid');

ALTER TABLE "HostedPlayer"
ALTER COLUMN "paymentStatus" TYPE "PaymentStatus_new"
USING ("paymentStatus"::text::"PaymentStatus_new");

ALTER TABLE "PlayerPayment"
ALTER COLUMN "status" TYPE "PaymentStatus_new"
USING ("status"::text::"PaymentStatus_new");

ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
ALTER TYPE "PaymentStatus_new" RENAME TO "PaymentStatus";
DROP TYPE "PaymentStatus_old";

ALTER TABLE "HostedPlayer" ALTER COLUMN "paymentStatus" SET DEFAULT 'unpaid';
ALTER TABLE "PlayerPayment" ALTER COLUMN "status" SET DEFAULT 'unpaid';
