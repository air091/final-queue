-- AlterTable
ALTER TABLE "CommunityPlayer"
ADD COLUMN "status" "PlayerHostStatuses" NOT NULL DEFAULT 'accepted';
