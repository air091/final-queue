import type { Request, Response } from "express";
import { CommunityAdminInviteStatus } from "../generated/prisma/enums.js";
import prisma from "../lib/prisma.js";

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

    const notifications = adminInvites.map(mapAdminInviteNotification);

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
