CREATE TABLE "CommunityPlayerInvite" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "status" "CommunityAdminInviteStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityPlayerInvite_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CommunityPlayerInvite_inviteeId_status_idx" ON "CommunityPlayerInvite"("inviteeId", "status");
CREATE INDEX "CommunityPlayerInvite_inviterId_idx" ON "CommunityPlayerInvite"("inviterId");
CREATE INDEX "CommunityPlayerInvite_communityId_idx" ON "CommunityPlayerInvite"("communityId");
CREATE UNIQUE INDEX "CommunityPlayerInvite_pending_communityId_inviteeId_key" ON "CommunityPlayerInvite"("communityId", "inviteeId") WHERE "status" = 'pending';

ALTER TABLE "CommunityPlayerInvite" ADD CONSTRAINT "CommunityPlayerInvite_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityPlayerInvite" ADD CONSTRAINT "CommunityPlayerInvite_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityPlayerInvite" ADD CONSTRAINT "CommunityPlayerInvite_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
