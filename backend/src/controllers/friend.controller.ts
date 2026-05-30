import type { Request, Response } from "express";
import {
  AccountStatuses,
  FriendRequestStatus,
  UserRoles,
} from "../generated/prisma/enums.js";
import prisma from "../lib/prisma.js";

type SendFriendRequestBody = {
  receiverId?: string;
};

type FriendRequestParams = {
  requestId: string;
};

type FriendParams = {
  friendId: string;
};

const selectAccountSummary = {
  id: true,
  username: true,
  profileUrl: true,
} as const;

const mapFriendRequest = (
  request: {
    id: string;
    status: FriendRequestStatus;
    createdAt: Date;
    updatedAt: Date;
    requester: { id: string; username: string; profileUrl: string };
    receiver: { id: string; username: string; profileUrl: string };
  },
  currentUserId: string,
) => ({
  id: request.id,
  status: request.status,
  createdAt: request.createdAt,
  updatedAt: request.updatedAt,
  direction: request.requester.id === currentUserId ? "outgoing" : "incoming",
  requester: request.requester,
  receiver: request.receiver,
});

const getFriendWhere = (currentUserId: string, friendId: string) => ({
  status: FriendRequestStatus.accepted,
  OR: [
    { requesterId: currentUserId, receiverId: friendId },
    { requesterId: friendId, receiverId: currentUserId },
  ],
});

const getPaginationValue = (
  value: unknown,
  fallback: number,
  options: { min: number; max: number },
) => {
  const parsedValue = typeof value === "string" ? Number(value) : NaN;
  if (!Number.isInteger(parsedValue)) return fallback;

  return Math.min(options.max, Math.max(options.min, parsedValue));
};

export const searchFriendCandidates = async (
  request: Request,
  response: Response,
) => {
  try {
    const user = request.user;
    const query =
      typeof request.query.query === "string" ? request.query.query.trim() : "";
    const shouldReturnAll = request.query.all === "true";
    const limit = getPaginationValue(request.query.limit, 6, {
      min: 1,
      max: 24,
    });
    const offset = getPaginationValue(request.query.offset, 0, {
      min: 0,
      max: 10000,
    });

    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    const users = await prisma.account.findMany({
      where: {
        id: { not: user.sub },
        role: { not: UserRoles.static },
        status: AccountStatuses.active,
        ...(query
          ? {
              username: {
                contains: query,
                mode: "insensitive",
              },
            }
          : {}),
      },
      orderBy: { username: "asc" },
      ...(shouldReturnAll ? {} : { skip: offset, take: limit + 1 }),
      select: selectAccountSummary,
    });
    const hasMore = !shouldReturnAll && users.length > limit;

    return response.status(200).json({
      success: true,
      users: shouldReturnAll ? users : users.slice(0, limit),
      hasMore,
      nextOffset: hasMore ? offset + limit : null,
    });
  } catch (error) {
    console.error("Error searching friend candidates:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const getFriends = async (request: Request, response: Response) => {
  try {
    const user = request.user;

    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    const friendships = await prisma.friendRequest.findMany({
      where: {
        status: FriendRequestStatus.accepted,
        OR: [{ requesterId: user.sub }, { receiverId: user.sub }],
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        requester: { select: selectAccountSummary },
        receiver: { select: selectAccountSummary },
      },
    });

    const friends = friendships.map((friendship) => {
      const friend =
        friendship.requester.id === user.sub
          ? friendship.receiver
          : friendship.requester;

      return {
        friendshipId: friendship.id,
        friendsSince: friendship.updatedAt,
        friend,
      };
    });

    return response.status(200).json({
      success: true,
      friends,
    });
  } catch (error) {
    console.error("Error getting friends:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const getFriendRequests = async (
  request: Request,
  response: Response,
) => {
  try {
    const user = request.user;

    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    const requests = await prisma.friendRequest.findMany({
      where: {
        status: FriendRequestStatus.pending,
        OR: [{ requesterId: user.sub }, { receiverId: user.sub }],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        requester: { select: selectAccountSummary },
        receiver: { select: selectAccountSummary },
      },
    });

    return response.status(200).json({
      success: true,
      incoming: requests
        .filter((friendRequest) => friendRequest.receiver.id === user.sub)
        .map((friendRequest) => mapFriendRequest(friendRequest, user.sub)),
      outgoing: requests
        .filter((friendRequest) => friendRequest.requester.id === user.sub)
        .map((friendRequest) => mapFriendRequest(friendRequest, user.sub)),
    });
  } catch (error) {
    console.error("Error getting friend requests:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const sendFriendRequest = async (
  request: Request<unknown, unknown, SendFriendRequestBody>,
  response: Response,
) => {
  try {
    const user = request.user;
    const receiverId = request.body.receiverId;

    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    if (!receiverId)
      return response
        .status(400)
        .json({ success: false, message: "Friend id is required" });

    if (receiverId === user.sub)
      return response
        .status(400)
        .json({ success: false, message: "You cannot add yourself" });

    const receiver = await prisma.account.findFirst({
      where: {
        id: receiverId,
        role: { not: UserRoles.static },
        status: AccountStatuses.active,
      },
      select: { id: true },
    });

    if (!receiver)
      return response
        .status(404)
        .json({ success: false, message: "User not found" });

    const existingActiveRequest = await prisma.friendRequest.findFirst({
      where: {
        status: {
          in: [FriendRequestStatus.pending, FriendRequestStatus.accepted],
        },
        OR: [
          { requesterId: user.sub, receiverId },
          { requesterId: receiverId, receiverId: user.sub },
        ],
      },
      select: { status: true },
    });

    if (existingActiveRequest)
      return response.status(409).json({
        success: false,
        message:
          existingActiveRequest.status === FriendRequestStatus.accepted
            ? "You are already friends"
            : "A friend request is already pending",
      });

    const existingRejectedRequest = await prisma.friendRequest.findFirst({
      where: {
        status: FriendRequestStatus.rejected,
        OR: [
          { requesterId: user.sub, receiverId },
          { requesterId: receiverId, receiverId: user.sub },
        ],
      },
      select: { id: true },
    });

    const friendRequest = existingRejectedRequest
      ? await prisma.friendRequest.update({
          where: { id: existingRejectedRequest.id },
          data: {
            requesterId: user.sub,
            receiverId,
            status: FriendRequestStatus.pending,
          },
          select: {
            id: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            requester: { select: selectAccountSummary },
            receiver: { select: selectAccountSummary },
          },
        })
      : await prisma.friendRequest.create({
          data: {
            requesterId: user.sub,
            receiverId,
          },
          select: {
            id: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            requester: { select: selectAccountSummary },
            receiver: { select: selectAccountSummary },
          },
        });

    return response.status(201).json({
      success: true,
      message: "Friend request sent",
      request: mapFriendRequest(friendRequest, user.sub),
    });
  } catch (error) {
    console.error("Error sending friend request:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const acceptFriendRequest = async (
  request: Request<FriendRequestParams>,
  response: Response,
) => {
  try {
    const user = request.user;
    const { requestId } = request.params;

    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    const friendRequest = await prisma.friendRequest.findFirst({
      where: {
        id: requestId,
        receiverId: user.sub,
        status: FriendRequestStatus.pending,
      },
      select: { id: true },
    });

    if (!friendRequest)
      return response
        .status(404)
        .json({ success: false, message: "Friend request not found" });

    const acceptedRequest = await prisma.friendRequest.update({
      where: { id: friendRequest.id },
      data: { status: FriendRequestStatus.accepted },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        requester: { select: selectAccountSummary },
        receiver: { select: selectAccountSummary },
      },
    });

    return response.status(200).json({
      success: true,
      message: "Friend request accepted",
      request: mapFriendRequest(acceptedRequest, user.sub),
    });
  } catch (error) {
    console.error("Error accepting friend request:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const rejectFriendRequest = async (
  request: Request<FriendRequestParams>,
  response: Response,
) => {
  try {
    const user = request.user;
    const { requestId } = request.params;

    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    const friendRequest = await prisma.friendRequest.findFirst({
      where: {
        id: requestId,
        receiverId: user.sub,
        status: FriendRequestStatus.pending,
      },
      select: { id: true },
    });

    if (!friendRequest)
      return response
        .status(404)
        .json({ success: false, message: "Friend request not found" });

    const rejectedRequest = await prisma.friendRequest.update({
      where: { id: friendRequest.id },
      data: { status: FriendRequestStatus.rejected },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        requester: { select: selectAccountSummary },
        receiver: { select: selectAccountSummary },
      },
    });

    return response.status(200).json({
      success: true,
      message: "Friend request rejected",
      request: mapFriendRequest(rejectedRequest, user.sub),
    });
  } catch (error) {
    console.error("Error rejecting friend request:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const deleteFriendRequest = async (
  request: Request<FriendRequestParams>,
  response: Response,
) => {
  try {
    const user = request.user;
    const { requestId } = request.params;

    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    const friendRequest = await prisma.friendRequest.findFirst({
      where: {
        id: requestId,
        status: FriendRequestStatus.pending,
        OR: [{ requesterId: user.sub }, { receiverId: user.sub }],
      },
      select: { id: true },
    });

    if (!friendRequest)
      return response
        .status(404)
        .json({ success: false, message: "Friend request not found" });

    await prisma.friendRequest.delete({
      where: { id: friendRequest.id },
    });

    return response.status(200).json({
      success: true,
      message: "Friend request deleted",
      requestId,
    });
  } catch (error) {
    console.error("Error deleting friend request:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const removeFriend = async (
  request: Request<FriendParams>,
  response: Response,
) => {
  try {
    const user = request.user;
    const { friendId } = request.params;

    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    if (friendId === user.sub)
      return response
        .status(400)
        .json({ success: false, message: "Invalid friend id" });

    const friendship = await prisma.friendRequest.findFirst({
      where: getFriendWhere(user.sub, friendId),
      select: { id: true },
    });

    if (!friendship)
      return response
        .status(404)
        .json({ success: false, message: "Friendship not found" });

    await prisma.friendRequest.delete({
      where: { id: friendship.id },
    });

    return response.status(200).json({
      success: true,
      message: "Friend removed",
      friendId,
    });
  } catch (error) {
    console.error("Error removing friend:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};
