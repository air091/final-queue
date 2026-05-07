import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import prisma from "../lib/prisma.js";
import type { Params } from "./community.controller.js";
import {
  PlayerHostStatuses,
  SkillLevels,
  Sports,
  UserRoles,
} from "../generated/prisma/enums.js";

const getMatchPlayerStatus = (player: {
  queueEntry: { id: string } | null;
  courtAssignment: {
    id: string;
    court: { startedAt: Date | null } | null;
  } | null;
}) => {
  if (player.courtAssignment?.court?.startedAt) return "playing";
  if (player.courtAssignment) return "inQueue";
  if (player.queueEntry) return "inQueue";
  return "waiting";
};

const buildPlayerProfile = (
  player:
    | {
        id: string;
        username: string;
        profileUrl: string;
        role: UserRoles;
        sports: { sport: string; skillLevel: SkillLevels }[];
      }
    | null
    | undefined,
  sport?: string,
) => {
  const skillLevel =
    player?.sports?.find((sportRecord) =>
      sport ? sportRecord.sport === sport : true,
    )?.skillLevel ?? SkillLevels.beginner;

  return {
    id: player?.id ?? null,
    username: player?.username ?? "",
    profileUrl: player?.profileUrl ?? "",
    skillLevel,
    isStatic: player?.role === UserRoles.static,
  };
};

const mapHostPlayerRecord = (player: {
  id: string;
  hostStatus: PlayerHostStatuses;
  paymentStatus: string;
  player: {
    id: string;
    username: string;
    profileUrl: string;
    role: UserRoles;
    sports: { sport: string; skillLevel: SkillLevels }[];
  } | null;
}) => ({
  id: player.id,
  status: player.hostStatus,
  paymentStatus: player.paymentStatus,
  player: buildPlayerProfile(player.player),
});

export const host = async (request: Request<Params>, response: Response) => {
  try {
    const { communityId } = request.params;
    const { sportName } = request.body;

    const user = request.user;
    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    if (!sportName)
      return response
        .status(400)
        .json({ success: false, message: "Sport is required" });

    if (!Object.values(Sports).includes(sportName as Sports))
      return response
        .status(400)
        .json({ success: false, message: "Sport unavailable" });

    const community = await prisma.community.findFirst({
      where: { id: communityId, masterId: user.sub },
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
        sport: sportName,
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
      where: { id: communityId, masterId: user.sub },
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
      where: { id: communityId, masterId: user.sub },
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
      prisma.player.findMany({
        where: {
          hostId,
          hostStatus: PlayerHostStatuses.requested,
        },
        select: {
          id: true,
          hostStatus: true,
          paymentStatus: true,
          player: {
            select: {
              id: true,
              username: true,
              profileUrl: true,
              role: true,
              sports: {
                select: {
                  sport: true,
                  skillLevel: true,
                },
              },
            },
          },
        },
      }),

      // accepts
      prisma.player.findMany({
        where: {
          hostId,
          hostStatus: PlayerHostStatuses.accepted,
        },
        select: {
          id: true,
          hostStatus: true,
          paymentStatus: true,
          player: {
            select: {
              id: true,
              username: true,
              profileUrl: true,
              role: true,
              sports: {
                select: {
                  sport: true,
                  skillLevel: true,
                },
              },
            },
          },
        },
      }),

      // rejects
      prisma.player.findMany({
        where: {
          hostId,
          hostStatus: PlayerHostStatuses.rejected,
        },
        select: {
          id: true,
          hostStatus: true,
          paymentStatus: true,
          player: {
            select: {
              id: true,
              username: true,
              profileUrl: true,
              role: true,
              sports: {
                select: {
                  sport: true,
                  skillLevel: true,
                },
              },
            },
          },
        },
      }),

      // ban
      prisma.player.findMany({
        where: {
          hostId,
          hostStatus: PlayerHostStatuses.banned,
        },
        select: {
          id: true,
          hostStatus: true,
          paymentStatus: true,
          player: {
            select: {
              id: true,
              username: true,
              profileUrl: true,
              role: true,
              sports: {
                select: {
                  sport: true,
                  skillLevel: true,
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
      where: { id: communityId, masterId: user.sub },
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

      prisma.player.findMany({
        where: {
          hostId,
          hostStatus: PlayerHostStatuses.accepted,
        },
        select: {
          id: true,
          hostStatus: true,
          paymentStatus: true,
          timerStartedAt: true,
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
          player: {
            select: {
              id: true,
              username: true,
              profileUrl: true,
              role: true,
              sports: {
                select: {
                  sport: true,
                  skillLevel: true,
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
        status: acceptedPlayer.hostStatus,
        hostStatus: acceptedPlayer.hostStatus,
        paymentStatus: acceptedPlayer.paymentStatus,
        timerStartedAt: acceptedPlayer.timerStartedAt,
        player: buildPlayerProfile(acceptedPlayer.player, host.sport),
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
      where: { id: communityId, masterId: user.sub },
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
  skillLevel?: SkillLevels;
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

    if (skillLevel && !Object.values(SkillLevels).includes(skillLevel))
      return response
        .status(400)
        .json({ success: false, message: "Invalid skill level" });

    const community = await prisma.community.findFirst({
      where: { id: communityId, masterId: user.sub },
      select: { id: true },
    });

    if (!community)
      return response
        .status(404)
        .json({ success: false, message: "Community not found" });

    const host = await prisma.host.findFirst({
      where: { id: hostId, communityId: community.id },
      select: { id: true, sport: true },
    });

    if (!host)
      return response
        .status(404)
        .json({ success: false, message: "Host not found" });

    const accountPassword = await bcrypt.hash(randomUUID(), 10);
    const account = await prisma.account.create({
      data: {
        username: cleanUsername,
        email: `static-${randomUUID()}@queue-system.local`,
        password: accountPassword,
        role: UserRoles.static,
        ...(cleanProfileUrl ? { profileUrl: cleanProfileUrl } : {}),
        sports: {
          create: {
            sport: host.sport as Sports,
            skillLevel: skillLevel ?? SkillLevels.beginner,
          },
        },
      },
    });

    const staticPlayer = await prisma.player.create({
      data: {
        hostId: host.id,
        playerId: account.id,
        hostStatus: PlayerHostStatuses.accepted,
        timerStartedAt: new Date(),
      },
      select: {
        id: true,
        hostStatus: true,
        paymentStatus: true,
        timerStartedAt: true,
        player: {
          select: {
            id: true,
            username: true,
            profileUrl: true,
            role: true,
            sports: {
              select: {
                sport: true,
                skillLevel: true,
              },
            },
          },
        },
      },
    });

    return response.status(201).json({
      success: true,
      message: "Static player created successfully",
      hostedPlayer: {
        id: staticPlayer.id,
        status: "accepted",
        hostStatus: staticPlayer.hostStatus,
        paymentStatus: staticPlayer.paymentStatus,
        timerStartedAt: staticPlayer.timerStartedAt,
        matchStatus: "waiting",
        player: buildPlayerProfile(staticPlayer.player, host.sport),
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
