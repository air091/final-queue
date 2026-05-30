-- CreateEnum
CREATE TYPE "CommunityAdminInviteStatus" AS ENUM ('pending', 'accepted', 'rejected');

-- CreateTable
CREATE TABLE "CommunityAdmin" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityAdminInvite" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "status" "CommunityAdminInviteStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityAdminInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommunityAdmin_communityId_accountId_key" ON "CommunityAdmin"("communityId", "accountId");

-- CreateIndex
CREATE INDEX "CommunityAdmin_communityId_idx" ON "CommunityAdmin"("communityId");

-- CreateIndex
CREATE INDEX "CommunityAdmin_accountId_idx" ON "CommunityAdmin"("accountId");

-- CreateIndex
CREATE INDEX "CommunityAdminInvite_inviteeId_status_idx" ON "CommunityAdminInvite"("inviteeId", "status");

-- CreateIndex
CREATE INDEX "CommunityAdminInvite_inviterId_idx" ON "CommunityAdminInvite"("inviterId");

-- CreateIndex
CREATE INDEX "CommunityAdminInvite_communityId_idx" ON "CommunityAdminInvite"("communityId");

-- AddForeignKey
ALTER TABLE "CommunityAdmin" ADD CONSTRAINT "CommunityAdmin_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityAdmin" ADD CONSTRAINT "CommunityAdmin_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityAdminInvite" ADD CONSTRAINT "CommunityAdminInvite_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityAdminInvite" ADD CONSTRAINT "CommunityAdminInvite_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityAdminInvite" ADD CONSTRAINT "CommunityAdminInvite_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
