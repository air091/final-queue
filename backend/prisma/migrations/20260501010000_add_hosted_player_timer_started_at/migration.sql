ALTER TABLE "HostedPlayer"
ADD COLUMN "timerStartedAt" TIMESTAMP(3);

UPDATE "HostedPlayer"
SET "timerStartedAt" = NOW()
WHERE "status" = 'accepted';
