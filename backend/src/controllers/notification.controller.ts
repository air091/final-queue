import type { Request, Response } from "express";
import {
  CommunityAdminInviteStatus,
  PlayerHostStatuses,
} from "../generated/prisma/enums.js";
import prisma from "../lib/prisma.js";

const COMMUNITY_PLAYER_REQUEST_PREFIX = "community_player_request:";
const COMMUNITY_PLAYER_INVITE_PREFIX = "community_player_invite:";

const selectAdminInviteNotification = {
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  community: {
    select: {
      id: true,
      communityName: true,
      profileUrl: true,
    },
  },
  inviter: {
    select: {
      id: true,
      username: true,
      profileUrl: true,
    },
  },
} as const;

const mapAdminInviteNotification = (invite: {
  id: string;
  status: CommunityAdminInviteStatus;
  createdAt: Date;
  updatedAt: Date;
  community: {
    id: string;
    communityName: string;
    profileUrl: string;
  };
  inviter: {
    id: string;
    username: string;
    profileUrl: string;
  };
}) => ({
  id: invite.id,
  type: "community_admin_invite",
  status: invite.status,
  createdAt: invite.createdAt,
  updatedAt: invite.updatedAt,
  community: invite.community,
  actor: invite.inviter,
  message: `${invite.inviter.username} invited you to be an admin of ${invite.community.communityName}.`,
});

const mapCommunityPlayerRequestNotification = (communityPlayer: {
  id: string;
  status: PlayerHostStatuses;
  addedAt: Date;
  community: {
    id: string;
    communityName: string;
    profileUrl: string;
  };
  account: {
    id: string;
    username: string;
    profileUrl: string;
  };
}) => ({
  id: `${COMMUNITY_PLAYER_REQUEST_PREFIX}${communityPlayer.id}`,
  type: "community_player_request",
  status: communityPlayer.status,
  createdAt: communityPlayer.addedAt,
  updatedAt: communityPlayer.addedAt,
  community: communityPlayer.community,
  actor: communityPlayer.account,
  message: `${communityPlayer.account.username} requested to join ${communityPlayer.community.communityName}.`,
});

type CommunityPlayerInviteNotificationRow = {
  id: string;
  status: CommunityAdminInviteStatus;
  createdAt: Date;
  updatedAt: Date;
  communityId: string;
  communityName: string;
  communityProfileUrl: string;
  inviterId: string;
  inviterUsername: string;
  inviterProfileUrl: string;
};

const mapCommunityPlayerInviteNotification = (
  invite: CommunityPlayerInviteNotificationRow,
) => ({
  id: `${COMMUNITY_PLAYER_INVITE_PREFIX}${invite.id}`,
  type: "community_player_invite",
  status: invite.status,
  createdAt: invite.createdAt,
  updatedAt: invite.updatedAt,
  community: {
    id: invite.communityId,
    communityName: invite.communityName,
    profileUrl: invite.communityProfileUrl,
  },
  actor: {
    id: invite.inviterId,
    username: invite.inviterUsername,
    profileUrl: invite.inviterProfileUrl,
  },
  message: `${invite.inviterUsername} invited you to join ${invite.communityName}.`,
});

export const getNotifications = async (
  request: Request,
  response: Response,
) => {
  try {
    const user = request.user;

    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    const adminInvites = await prisma.communityAdminInvite.findMany({
      where: {
        inviteeId: user.sub,
        status: CommunityAdminInviteStatus.pending,
      },
      orderBy: { createdAt: "desc" },
      select: selectAdminInviteNotification,
    });

    const communityPlayerRequests = await prisma.communityPlayer.findMany({
      where: {
        status: PlayerHostStatuses.requested,
        community: {
          masterId: user.sub,
        },
      },
      orderBy: { addedAt: "desc" },
      select: {
        id: true,
        status: true,
        addedAt: true,
        community: {
          select: {
            id: true,
            communityName: true,
            profileUrl: true,
          },
        },
        account: {
          select: {
            id: true,
            username: true,
            profileUrl: true,
          },
        },
      },
    });

    const communityPlayerInvites =
      await prisma.$queryRaw<CommunityPlayerInviteNotificationRow[]>`
        SELECT
          invite."id",
          invite."status",
          invite."createdAt",
          invite."updatedAt",
          community."id" AS "communityId",
          community."communityName",
          community."profileUrl" AS "communityProfileUrl",
          inviter."id" AS "inviterId",
          inviter."username" AS "inviterUsername",
          inviter."profileUrl" AS "inviterProfileUrl"
        FROM "CommunityPlayerInvite" invite
        JOIN "Community" community ON community."id" = invite."communityId"
        JOIN "Account" inviter ON inviter."id" = invite."inviterId"
        WHERE invite."inviteeId" = ${user.sub}
          AND invite."status" = 'pending'::"CommunityAdminInviteStatus"
        ORDER BY invite."createdAt" DESC
      `;

    const notifications = [
      ...adminInvites.map(mapAdminInviteNotification),
      ...communityPlayerRequests.map(mapCommunityPlayerRequestNotification),
      ...communityPlayerInvites.map(mapCommunityPlayerInviteNotification),
    ].sort(
      (firstNotification, secondNotification) =>
        new Date(secondNotification.createdAt).getTime() -
        new Date(firstNotification.createdAt).getTime(),
    );

    return response.status(200).json({
      success: true,
      notifications,
      unreadCount: notifications.length,
    });
  } catch (error) {
    console.error("Error getting notifications:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const acceptNotification = async (
  request: Request<{ notificationId: string }>,
  response: Response,
) => {
  try {
    const user = request.user;
    const { notificationId } = request.params;

    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    if (notificationId.startsWith(COMMUNITY_PLAYER_REQUEST_PREFIX)) {
      const communityPlayerId = notificationId.slice(
        COMMUNITY_PLAYER_REQUEST_PREFIX.length,
      );

      const communityPlayer = await prisma.communityPlayer.findFirst({
        where: {
          id: communityPlayerId,
          status: PlayerHostStatuses.requested,
          community: {
            masterId: user.sub,
          },
        },
        select: { id: true },
      });

      if (!communityPlayer)
        return response
          .status(404)
          .json({ success: false, message: "Notification not found" });

      await prisma.communityPlayer.update({
        where: { id: communityPlayer.id },
        data: { status: PlayerHostStatuses.accepted },
      });

      return response.status(200).json({
        success: true,
        message: "Community player request accepted",
        notificationId,
      });
    }

    if (notificationId.startsWith(COMMUNITY_PLAYER_INVITE_PREFIX)) {
      const inviteId = notificationId.slice(COMMUNITY_PLAYER_INVITE_PREFIX.length);
      const invites = await prisma.$queryRaw<
        Array<{ id: string; communityId: string; inviteeId: string }>
      >`
        SELECT "id", "communityId", "inviteeId"
        FROM "CommunityPlayerInvite"
        WHERE "id" = ${inviteId}
          AND "inviteeId" = ${user.sub}
          AND "status" = 'pending'::"CommunityAdminInviteStatus"
        LIMIT 1
      `;
      const invite = invites[0];

      if (!invite)
        return response
          .status(404)
          .json({ success: false, message: "Notification not found" });

      await prisma.$transaction([
        prisma.communityPlayer.upsert({
          where: {
            communityId_accountId: {
              communityId: invite.communityId,
              accountId: invite.inviteeId,
            },
          },
          update: {
            status: PlayerHostStatuses.accepted,
          },
          create: {
            communityId: invite.communityId,
            accountId: invite.inviteeId,
            status: PlayerHostStatuses.accepted,
          },
        }),
        prisma.$executeRaw`
          UPDATE "CommunityPlayerInvite"
          SET "status" = 'accepted'::"CommunityAdminInviteStatus",
              "updatedAt" = NOW()
          WHERE "id" = ${invite.id}
        `,
      ]);

      return response.status(200).json({
        success: true,
        message: "Community invite accepted",
        notificationId,
      });
    }

    const invite = await prisma.communityAdminInvite.findFirst({
      where: {
        id: notificationId,
        inviteeId: user.sub,
        status: CommunityAdminInviteStatus.pending,
      },
      select: {
        id: true,
        communityId: true,
        inviteeId: true,
      },
    });

    if (!invite)
      return response
        .status(404)
        .json({ success: false, message: "Notification not found" });

    await prisma.$transaction([
      prisma.communityAdmin.upsert({
        where: {
          communityId_accountId: {
            communityId: invite.communityId,
            accountId: invite.inviteeId,
          },
        },
        update: {},
        create: {
          communityId: invite.communityId,
          accountId: invite.inviteeId,
        },
      }),
      prisma.communityAdminInvite.update({
        where: { id: invite.id },
        data: { status: CommunityAdminInviteStatus.accepted },
      }),
    ]);

    return response.status(200).json({
      success: true,
      message: "Admin invite accepted",
      notificationId: invite.id,
    });
  } catch (error) {
    console.error("Error accepting notification:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const rejectNotification = async (
  request: Request<{ notificationId: string }>,
  response: Response,
) => {
  try {
    const user = request.user;
    const { notificationId } = request.params;

    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    if (notificationId.startsWith(COMMUNITY_PLAYER_REQUEST_PREFIX)) {
      const communityPlayerId = notificationId.slice(
        COMMUNITY_PLAYER_REQUEST_PREFIX.length,
      );

      const communityPlayer = await prisma.communityPlayer.findFirst({
        where: {
          id: communityPlayerId,
          status: PlayerHostStatuses.requested,
          community: {
            masterId: user.sub,
          },
        },
        select: { id: true },
      });

      if (!communityPlayer)
        return response
          .status(404)
          .json({ success: false, message: "Notification not found" });

      await prisma.communityPlayer.update({
        where: { id: communityPlayer.id },
        data: { status: PlayerHostStatuses.rejected },
      });

      return response.status(200).json({
        success: true,
        message: "Community player request rejected",
        notificationId,
      });
    }

    if (notificationId.startsWith(COMMUNITY_PLAYER_INVITE_PREFIX)) {
      const inviteId = notificationId.slice(COMMUNITY_PLAYER_INVITE_PREFIX.length);
      const invites = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "CommunityPlayerInvite"
        WHERE "id" = ${inviteId}
          AND "inviteeId" = ${user.sub}
          AND "status" = 'pending'::"CommunityAdminInviteStatus"
        LIMIT 1
      `;
      const invite = invites[0];

      if (!invite)
        return response
          .status(404)
          .json({ success: false, message: "Notification not found" });

      await prisma.$executeRaw`
        UPDATE "CommunityPlayerInvite"
        SET "status" = 'rejected'::"CommunityAdminInviteStatus",
            "updatedAt" = NOW()
        WHERE "id" = ${invite.id}
      `;

      return response.status(200).json({
        success: true,
        message: "Community invite rejected",
        notificationId,
      });
    }

    const invite = await prisma.communityAdminInvite.findFirst({
      where: {
        id: notificationId,
        inviteeId: user.sub,
        status: CommunityAdminInviteStatus.pending,
      },
      select: { id: true },
    });

    if (!invite)
      return response
        .status(404)
        .json({ success: false, message: "Notification not found" });

    await prisma.communityAdminInvite.update({
      where: { id: invite.id },
      data: { status: CommunityAdminInviteStatus.rejected },
    });

    return response.status(200).json({
      success: true,
      message: "Admin invite rejected",
      notificationId: invite.id,
    });
  } catch (error) {
    console.error("Error rejecting notification:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};
