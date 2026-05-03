ALTER TABLE "HostedPlayer"
ALTER COLUMN "playerId" DROP NOT NULL,
ADD COLUMN "staticName" TEXT,
ADD COLUMN "staticProfileUrl" TEXT,
ADD COLUMN "staticSkillLevel" "SkillLevel";
