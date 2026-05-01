UPDATE "Account"
SET "status" = 'active'
WHERE "status"::text IN ('waiting', 'inqueue', 'playing');

ALTER TYPE "AccountStatus" RENAME TO "AccountStatus_old";

CREATE TYPE "AccountStatus" AS ENUM ('active');

ALTER TABLE "Account"
ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Account"
ALTER COLUMN "status" TYPE "AccountStatus"
USING ("status"::text::"AccountStatus");

ALTER TABLE "Account"
ALTER COLUMN "status" SET DEFAULT 'active';

DROP TYPE "AccountStatus_old";
