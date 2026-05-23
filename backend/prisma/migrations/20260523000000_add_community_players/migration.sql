-- CreateTable
CREATE TABLE "CommunityPlayer" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommunityPlayer_communityId_idx" ON "CommunityPlayer"("communityId");

-- CreateIndex
CREATE INDEX "CommunityPlayer_accountId_idx" ON "CommunityPlayer"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityPlayer_communityId_accountId_key" ON "CommunityPlayer"("communityId", "accountId");

-- AddForeignKey
ALTER TABLE "CommunityPlayer" ADD CONSTRAINT "CommunityPlayer_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPlayer" ADD CONSTRAINT "CommunityPlayer_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
