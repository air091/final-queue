import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import type { Params } from "./community.controller.js";
import {
  HostedPlayerStatus,
  SkillLevel,
} from "../generated/prisma/enums.js";
import {
  DEFAULT_HOSTED_PLAYER_PROFILE_URL,
  hostedPlayerProfileSelect,
  type HostedPlayerProfileSource,
  toHostedPlayerProfile,
} from "../lib/hostedPlayer.js";

const getMatchPlayerStatus = (player: {
  queueEntry: { id: string } | null;
  courtAssignment:
    | {
        id: string;
        court: { startedAt: Date | null } | null;
      }
    | null;
}) => {
  if (player.courtAssignment?.court?.startedAt) return "playing";
  if (player.courtAssignment) return "inQueue";
  if (player.queueEntry) return "inQueue";
  return "waiting";
};

const mapHostPlayerRecord = (
  player: {
    id: string;
    status: HostedPlayerStatus;
    paymentStatus: string;
  } & HostedPlayerProfileSource,
) => ({
  id: player.id,
  status: player.status,
  paymentStatus: player.paymentStatus,
  player: toHostedPlayerProfile(player),
});

export const host = async (request: Request<Params>, response: Response) => {
  try {
    const { communityId } = request.params;
    const { sportName } = request.body;
    const cleanSportName = sportName?.trim();

    const user = request.user;
    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    if (!cleanSportName)
      return response
        .status(400)
        .json({ success: false, message: "Sport name is required" });

    const community = await prisma.community.findFirst({
      where: { id: communityId, adminId: user.sub },
    });

    if (!community)
      return response
        .status(404)
        .json({ success: false, message: "Community not found" });

    const count = await prisma.host.count({
      where: { communityId: community.id },
    });

    const newHost = await prisma.host.create({
      data: {
        hostName: `Host ${count + 1}`,
        communityId: community.id,
        sport: cleanSportName,
      },
    });

    return response.status(201).json({
      success: true,
      message: "Host created successfully",
      data: newHost,
    });
  } catch (error) {
    console.error("Error hosting:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

type GetHostsParamsType = {
  communityId: string;
};

export const getHosts = async (
  request: Request<GetHostsParamsType>,
  response: Response,
) => {
  try {
    const { communityId } = request.params;
    const user = request.user;
    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    if (!communityId)
      return response
        .status(404)
        .json({ success: false, message: "Missing required params" });

    const community = await prisma.community.findFirst({
      where: { id: communityId, adminId: user.sub },
    });

    if (!community)
      return response
        .status(404)
        .json({ success: false, message: "Community not found" });

    // get hosts
    const hosts = await prisma.host.findMany({
      where: { communityId: community.id },
      select: {
        id: true,
        hostName: true,
        sport: true,
        status: true,
      },
    });

    return response.status(200).json({
      success: true,
      message: "Hosts retrieved successfully",
      hosts,
    });
  } catch (error) {
    console.error("Error getting hosts:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

type GetHostByIdParams = {
  communityId: string;
  hostId: string;
};

export const getHostById = async (
  request: Request<GetHostByIdParams>,
  response: Response,
) => {
  try {
    const { communityId, hostId } = request.params;
    const user = request.user;
    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    if (!communityId || !hostId)
      return response
        .status(404)
        .json({ success: false, message: "Missing required params" });

    const community = await prisma.community.findFirst({
      where: { id: communityId, adminId: user.sub },
    });

    if (!community)
      return response
        .status(404)
        .json({ success: false, message: "Community not found" });

    // get host
    const [
      host,
      requestedPlayers,
      acceptedPlayers,
      rejectedPlayers,
      bannedPlayers,
    ] = await Promise.all([
      prisma.host.findFirst({
        where: { id: hostId, communityId: community.id },
        select: {
          id: true,
          hostName: true,
          sport: true,
          status: true,
          createdAt: true,
          community: {
            select: {
              profileUrl: true,
              communityName: true,
            },
          },
          _count: { select: { players: true } },
        },
      }),

      // requests
      prisma.hostedPlayer.findMany({
        where: {
          hostId,
          status: HostedPlayerStatus.requested,
        },
        select: {
          id: true,
          status: true,
          paymentStatus: true,
          ...hostedPlayerProfileSelect,
        },
      }),

      // accepts
      prisma.hostedPlayer.findMany({
        where: {
          hostId,
          status: HostedPlayerStatus.accepted,
        },
        select: {
          id: true,
          status: true,
          paymentStatus: true,
          ...hostedPlayerProfileSelect,
        },
      }),

      // rejects
      prisma.hostedPlayer.findMany({
        where: {
          hostId,
          status: HostedPlayerStatus.rejected,
        },
        select: {
          id: true,
          status: true,
          paymentStatus: true,
          ...hostedPlayerProfileSelect,
        },
      }),

      // ban
      prisma.hostedPlayer.findMany({
        where: {
          hostId,
          status: HostedPlayerStatus.banned,
        },
        select: {
          id: true,
          status: true,
          paymentStatus: true,
          ...hostedPlayerProfileSelect,
        },
      }),
    ]);

    if (!host)
      return response
        .status(404)
        .json({ success: false, message: "Host not found" });

    return response.status(200).json({
      success: true,
      message: "Host retrieved successfully",
      ...host,
      requestedPlayers: requestedPlayers.map(mapHostPlayerRecord),
      acceptedPlayers: acceptedPlayers.map(mapHostPlayerRecord),
      rejectedPlayers: rejectedPlayers.map(mapHostPlayerRecord),
      bannedPlayers: bannedPlayers.map(mapHostPlayerRecord),
    });
  } catch (error) {
    console.error("Error getting host:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const getHostWithPlayers = async (
  request: Request<GetHostByIdParams>,
  response: Response,
) => {
  try {
    const { communityId, hostId } = request.params;
    const user = request.user;
    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    if (!communityId || !hostId)
      return response
        .status(400)
        .json({ success: false, message: "Missing required params" });

    const community = await prisma.community.findFirst({
      where: { id: communityId, adminId: user.sub },
      select: { id: true },
    });

    if (!community)
      return response
        .status(404)
        .json({ success: false, message: "Community not found" });

    const [host, acceptedPlayers] = await Promise.all([
      prisma.host.findFirst({
        where: { id: hostId, communityId: community.id },
        select: {
          id: true,
          hostName: true,
          sport: true,
          status: true,
          createdAt: true,
          community: {
            select: {
              profileUrl: true,
              communityName: true,
            },
          },
          _count: { select: { players: true } },
        },
      }),

      prisma.hostedPlayer.findMany({
        where: {
          hostId,
          status: HostedPlayerStatus.accepted,
        },
        select: {
          id: true,
          status: true,
          paymentStatus: true,
          timerStartedAt: true,
          ...hostedPlayerProfileSelect,
          queueEntry: {
            select: {
              id: true,
              queueId: true,
              position: true,
            },
          },
          courtAssignment: {
            select: {
              id: true,
              courtId: true,
              position: true,
              court: {
                select: {
                  startedAt: true,
                },
              },
            },
          },
        },
      }),
    ]);

    if (!host)
      return response
        .status(404)
        .json({ success: false, message: "Host not found" });

    return response.status(200).json({
      success: true,
      message: "Host retrieved successfully",
      ...host,
      acceptedPlayers: acceptedPlayers.map((acceptedPlayer) => ({
        id: acceptedPlayer.id,
        status: acceptedPlayer.status,
        paymentStatus: acceptedPlayer.paymentStatus,
        timerStartedAt: acceptedPlayer.timerStartedAt,
        player: toHostedPlayerProfile(acceptedPlayer),
        queueEntry: acceptedPlayer.queueEntry,
        courtAssignment: acceptedPlayer.courtAssignment
          ? {
              id: acceptedPlayer.courtAssignment.id,
              courtId: acceptedPlayer.courtAssignment.courtId,
              position: acceptedPlayer.courtAssignment.position,
            }
          : null,
        matchStatus: getMatchPlayerStatus(acceptedPlayer),
      })),
    });
  } catch (error) {
    console.error("Error getting host with players:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const deleteHost = async (
  request: Request<Params>,
  response: Response,
) => {
  try {
    const { communityId, hostId } = request.params;
    const user = request.user;
    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    const community = await prisma.community.findFirst({
      where: { id: communityId, adminId: user.sub },
    });

    if (!community)
      return response
        .status(404)
        .json({ success: false, message: "Community not found" });

    if (!hostId)
      return response
        .status(404)
        .json({ success: false, message: "Hosted match not found" });

    const host = await prisma.host.findFirst({
      where: { id: hostId, communityId: community.id },
    });

    if (!host)
      return response
        .status(404)
        .json({ success: false, message: "Hosted match not found" });

    const deletedHost = await prisma.host.deleteMany({
      where: { id: host.id, communityId: community.id },
    });

    return response.status(200).json({
      success: true,
      message: "Host deleted successfully",
      data: deletedHost,
    });
  } catch (error) {
    console.error("Error deleting host:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

type CreateStaticPlayerParams = {
  communityId: string;
  hostId: string;
};

type CreateStaticPlayerBody = {
  username?: string;
  skillLevel?: SkillLevel;
  profileUrl?: string;
};

export const createStaticPlayer = async (
  request: Request<CreateStaticPlayerParams, unknown, CreateStaticPlayerBody>,
  response: Response,
) => {
  try {
    const { communityId, hostId } = request.params;
    const { username, skillLevel, profileUrl } = request.body;
    const cleanUsername = username?.trim();
    const cleanProfileUrl = profileUrl?.trim();
    const user = request.user;

    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    if (!communityId || !hostId)
      return response
        .status(400)
        .json({ success: false, message: "Missing required params" });

    if (!cleanUsername)
      return response
        .status(400)
        .json({ success: false, message: "Player name is required" });

    if (skillLevel && !Object.values(SkillLevel).includes(skillLevel))
      return response
        .status(400)
        .json({ success: false, message: "Invalid skill level" });

    const community = await prisma.community.findFirst({
      where: { id: communityId, adminId: user.sub },
      select: { id: true },
    });

    if (!community)
      return response
        .status(404)
        .json({ success: false, message: "Community not found" });

    const host = await prisma.host.findFirst({
      where: { id: hostId, communityId: community.id },
      select: { id: true },
    });

    if (!host)
      return response
        .status(404)
        .json({ success: false, message: "Host not found" });

    const now = new Date();
    const staticPlayer = await prisma.hostedPlayer.create({
      data: {
        hostId: host.id,
        status: HostedPlayerStatus.accepted,
        timerStartedAt: now,
        staticName: cleanUsername,
        staticSkillLevel: skillLevel ?? SkillLevel.beginner,
        staticProfileUrl:
          cleanProfileUrl || DEFAULT_HOSTED_PLAYER_PROFILE_URL,
      },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        timerStartedAt: true,
        ...hostedPlayerProfileSelect,
      },
    });

    return response.status(201).json({
      success: true,
      message: "Static player created successfully",
      hostedPlayer: {
        id: staticPlayer.id,
        status: staticPlayer.status,
        paymentStatus: staticPlayer.paymentStatus,
        timerStartedAt: staticPlayer.timerStartedAt,
        matchStatus: "waiting",
        player: toHostedPlayerProfile(staticPlayer),
        queueEntry: null,
        courtAssignment: null,
      },
    });
  } catch (error) {
    console.error("Error creating static player:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};
