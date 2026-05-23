import crypto from "node:crypto";
import bcrypt from "bcrypt";
import prisma from "../lib/prisma.js";
import type { Request, Response } from "express";
import { uploadImageToCloudinary } from "../lib/cloudinary.js";
import {
  PlayerHostStatuses,
  SkillLevels,
  Sports,
  UserRoles,
} from "../generated/prisma/enums.js";

export type Params = {
  communityId: string;
  hostId?: string;
  playerId?: string;
};

const IMAGE_DATA_URI_PATTERN =
  /^data:image\/(?:png|jpe?g|webp|gif|avif);base64,/i;

const resolveCommunityProfileUrl = async ({
  profileUrl,
  communityId,
}: {
  profileUrl?: string;
  communityId: string;
}) => {
  const cleanedProfileUrl = profileUrl?.trim() ?? "";

  if (!cleanedProfileUrl) {
    return cleanedProfileUrl;
  }

  if (!IMAGE_DATA_URI_PATTERN.test(cleanedProfileUrl)) {
    return cleanedProfileUrl;
  }

  return uploadImageToCloudinary({
    dataUri: cleanedProfileUrl,
    publicId: `queue-system/community-images/${communityId}`,
  });
};

const buildCommunityPlayerProfile = (
  account: {
    id: string;
    username: string;
    profileUrl: string;
    role: UserRoles;
    sports: { sport: string; skillLevel: SkillLevels }[];
  },
) => ({
  id: account.id,
  username: account.username,
  profileUrl: account.profileUrl,
  skillLevel: account.sports[0]?.skillLevel ?? SkillLevels.beginner,
  isStatic: account.role === UserRoles.static,
  isAdmin: account.role === UserRoles.master,
});

const mapCommunityPlayerRecord = (communityPlayer: {
  id: string;
  addedAt: Date;
  account: {
    id: string;
    username: string;
    profileUrl: string;
    role: UserRoles;
    sports: { sport: string; skillLevel: SkillLevels }[];
  };
}) => ({
  id: communityPlayer.id,
  addedAt: communityPlayer.addedAt,
  player: buildCommunityPlayerProfile(communityPlayer.account),
});

const getMatchPlayerStatus = (player: {
  queueAssignment: { id: string } | null;
  courtAssignment: {
    id: string;
    court: { startedAt: Date | null } | null;
  } | null;
}) => {
  if (player.courtAssignment?.court?.startedAt) return "playing";
  if (player.courtAssignment) return "inQueue";
  if (player.queueAssignment) return "inQueue";
  return "waiting";
};

const mapHostedPlayerForResponse = (
  hostedPlayer: {
    id: string;
    hostStatus: PlayerHostStatuses;
    paymentStatus: string;
    gamesPlayed: number;
    timerStartedAt: Date | null;
    queueAssignment: {
      id: string;
      queueId: string;
      position: number;
    } | null;
    courtAssignment: {
      id: string;
      courtId: string;
      position: number;
      court: {
        startedAt: Date | null;
      } | null;
    } | null;
    player: {
      id: string;
      username: string;
      profileUrl: string;
      role: UserRoles;
      sports: { sport: string; skillLevel: SkillLevels }[];
    } | null;
  },
) => ({
  id: hostedPlayer.id,
  status: hostedPlayer.hostStatus,
  hostStatus: hostedPlayer.hostStatus,
  paymentStatus: hostedPlayer.paymentStatus,
  gamesPlayed: hostedPlayer.gamesPlayed,
  timerStartedAt: hostedPlayer.timerStartedAt,
  player: hostedPlayer.player
    ? buildCommunityPlayerProfile(hostedPlayer.player)
    : {
        id: null,
        username: "",
        profileUrl: "",
        skillLevel: SkillLevels.beginner,
        isStatic: false,
        isAdmin: false,
      },
  queueEntry: hostedPlayer.queueAssignment,
  courtAssignment: hostedPlayer.courtAssignment
    ? {
        id: hostedPlayer.courtAssignment.id,
        courtId: hostedPlayer.courtAssignment.courtId,
        position: hostedPlayer.courtAssignment.position,
      }
    : null,
  matchStatus: getMatchPlayerStatus(hostedPlayer),
  matchHistory: {
    matchCount: 0,
    winCount: 0,
    lossCount: 0,
    lastMatch: null,
  },
});

export const createCommunity = async (request: Request, response: Response) => {
  try {
    const { profileUrl, communityName, description } = request.body;
    const cleanCommunityName = communityName.trim();

    const user = request.user;
    if (!user) {
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });
    }

    if (!cleanCommunityName) {
      return response
        .status(400)
        .json({ success: false, message: "Community name is required" });
    }

    const communityId = crypto.randomUUID();
    const resolvedProfileUrl = await resolveCommunityProfileUrl({
      profileUrl,
      communityId,
    });

    const newCommunity = await prisma.community.create({
      data: {
        id: communityId,
        ...(resolvedProfileUrl ? { profileUrl: resolvedProfileUrl } : {}),
        communityName: cleanCommunityName,
        description,
        masterId: user.sub,
      },
    });

    return response
      .status(201)
      .json({ success: true, community: newCommunity });
  } catch (error) {
    console.error("Error creating community:", error);
    return response.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
    });
  }
};

export const getCommunities = async (request: Request, response: Response) => {
  try {
    const user = request.user;
    if (!user) {
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });
    }

    const communities = await prisma.community.findMany({
      where: { masterId: user.sub },
      select: {
        id: true,
        profileUrl: true,
        communityName: true,
        description: true,
      },
    });
    return response.json({ success: true, communities });
  } catch (error) {
    console.error("Error getting community:", error);
    return response.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
    });
  }
};

type GetCommunityByIdParams = {
  communityId: string;
};
export const getCommunityById = async (
  request: Request<GetCommunityByIdParams>,
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
        .status(400)
        .json({ success: false, message: "Missing required params" });

    const community = await prisma.community.findFirst({
      where: { id: communityId, masterId: user.sub },
      select: {
        id: true,
        profileUrl: true,
        communityName: true,
        description: true,
        master: {
          select: {
            id: true,
            profileUrl: true,
            username: true,
          },
        },
      },
    });

    if (!community)
      return response
        .status(404)
        .json({ success: false, message: "Community not found" });

    return response.status(200).json({
      success: true,
      message: "Community fetched successfully",
      community,
    });
  } catch (error) {
    console.error("Error getting community by id:", error);
    return response.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
    });
  }
};

type CommunityPlayerParams = {
  communityId: string;
  hostId?: string;
};

type CreateCommunityStaticPlayerBody = {
  username?: string;
  skillLevel?: SkillLevels;
  profileUrl?: string;
};

type AddCommunityPlayersToHostBody = {
  communityPlayerIds?: string[];
};

export const getCommunityPlayers = async (
  request: Request<CommunityPlayerParams>,
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

    const players = await prisma.communityPlayer.findMany({
      where: { communityId: community.id },
      orderBy: { addedAt: "desc" },
      select: {
        id: true,
        addedAt: true,
        account: {
          select: {
            id: true,
            username: true,
            profileUrl: true,
            role: true,
            sports: {
              where: { sport: Sports.badminton },
              select: {
                sport: true,
                skillLevel: true,
              },
            },
          },
        },
      },
    });

    return response.status(200).json({
      success: true,
      message: "Community players retrieved successfully",
      players: players.map(mapCommunityPlayerRecord),
    });
  } catch (error) {
    console.error("Error getting community players:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const createCommunityStaticPlayer = async (
  request: Request<
    CommunityPlayerParams,
    unknown,
    CreateCommunityStaticPlayerBody
  >,
  response: Response,
) => {
  try {
    const { communityId } = request.params;
    const cleanUsername = request.body.username?.trim() ?? "";
    const cleanProfileUrl = request.body.profileUrl?.trim() ?? "";
    const skillLevel = request.body.skillLevel ?? SkillLevels.beginner;
    const user = request.user;

    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    if (!communityId)
      return response
        .status(400)
        .json({ success: false, message: "Missing required params" });

    if (!cleanUsername)
      return response
        .status(400)
        .json({ success: false, message: "Player name is required" });

    if (!Object.values(SkillLevels).includes(skillLevel))
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

    const accountPassword = await bcrypt.hash(crypto.randomUUID(), 10);

    const communityPlayer = await prisma.$transaction(async (transaction) => {
      const account = await transaction.account.create({
        data: {
          username: cleanUsername,
          email: `static-${crypto.randomUUID()}@queue-system.local`,
          password: accountPassword,
          role: UserRoles.static,
          ...(cleanProfileUrl ? { profileUrl: cleanProfileUrl } : {}),
          sports: {
            create: {
              sport: Sports.badminton,
              skillLevel,
            },
          },
        },
      });

      return transaction.communityPlayer.create({
        data: {
          communityId: community.id,
          accountId: account.id,
        },
        select: {
          id: true,
          addedAt: true,
          account: {
            select: {
              id: true,
              username: true,
              profileUrl: true,
              role: true,
              sports: {
                where: { sport: Sports.badminton },
                select: {
                  sport: true,
                  skillLevel: true,
                },
              },
            },
          },
        },
      });
    });

    return response.status(201).json({
      success: true,
      message: "Community player created successfully",
      player: mapCommunityPlayerRecord(communityPlayer),
    });
  } catch (error) {
    console.error("Error creating community player:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const addCommunityPlayersToHost = async (
  request: Request<CommunityPlayerParams, unknown, AddCommunityPlayersToHostBody>,
  response: Response,
) => {
  try {
    const { communityId, hostId } = request.params;
    const communityPlayerIds = Array.from(
      new Set(request.body.communityPlayerIds ?? []),
    );
    const user = request.user;

    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    if (!communityId || !hostId)
      return response
        .status(400)
        .json({ success: false, message: "Missing required params" });

    if (communityPlayerIds.length === 0)
      return response
        .status(400)
        .json({ success: false, message: "Select at least one player" });

    const host = await prisma.host.findFirst({
      where: {
        id: hostId,
        community: {
          id: communityId,
          masterId: user.sub,
        },
      },
      select: {
        id: true,
      },
    });

    if (!host)
      return response
        .status(404)
        .json({ success: false, message: "Community or host not found" });

    const communityPlayers = await prisma.communityPlayer.findMany({
      where: {
        id: { in: communityPlayerIds },
        communityId,
      },
      select: {
        accountId: true,
      },
    });

    if (communityPlayers.length === 0)
      return response
        .status(404)
        .json({ success: false, message: "No community players found" });

    const now = new Date();

    await prisma.$transaction(
      communityPlayers.map((communityPlayer) =>
        prisma.player.upsert({
          where: {
            hostId_playerId: {
              hostId: host.id,
              playerId: communityPlayer.accountId,
            },
          },
          update: {
            hostStatus: PlayerHostStatuses.accepted,
            timerStartedAt: now,
          },
          create: {
            hostId: host.id,
            playerId: communityPlayer.accountId,
            hostStatus: PlayerHostStatuses.accepted,
            timerStartedAt: now,
          },
        }),
      ),
    );

    const hostedPlayers = await prisma.player.findMany({
      where: {
        hostId: host.id,
        playerId: {
          in: communityPlayers.map((communityPlayer) => communityPlayer.accountId),
        },
      },
      select: {
        id: true,
        hostStatus: true,
        paymentStatus: true,
        gamesPlayed: true,
        timerStartedAt: true,
        queueAssignment: {
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
              where: { sport: Sports.badminton },
              select: {
                sport: true,
                skillLevel: true,
              },
            },
          },
        },
      },
    });

    return response.status(200).json({
      success: true,
      message: "Players added to host successfully",
      hostedPlayers: hostedPlayers.map(mapHostedPlayerForResponse),
    });
  } catch (error) {
    console.error("Error adding community players to host:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const updateCommunity = async (
  request: Request<Params>,
  response: Response,
) => {
  try {
    const { communityId } = request.params;
    const { profileUrl, communityName, description } = request.body;

    const user = request.user;
    if (!user) {
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });
    }

    const cleanCommunityName = communityName.trim();
    if (!cleanCommunityName) {
      return response
        .status(400)
        .json({ success: false, message: "Community name is required" });
    }

    const community = await prisma.community.findFirst({
      where: { id: communityId, masterId: user.sub },
      select: { id: true },
    });

    if (!community) {
      return response
        .status(404)
        .json({ success: false, message: "Community not found" });
    }

    const resolvedProfileUrl = await resolveCommunityProfileUrl({
      profileUrl,
      communityId: community.id,
    });

    const updatedCommunity = await prisma.community.update({
      where: { id: community.id },
      data: {
        profileUrl: resolvedProfileUrl,
        communityName: cleanCommunityName,
        description,
      },
    });

    return response.json({
      success: true,
      message: "Community updated",
      updatedCommunity,
    });
  } catch (error) {
    console.error("Error setting community:", error);
    return response.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
    });
  }
};

export const deleteCommunity = async (
  request: Request<Params>,
  response: Response,
) => {
  try {
    const { communityId } = request.params;
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

    await prisma.community.delete({
      where: { id: community.id },
    });

    return response
      .status(200)
      .json({ success: true, message: "Community deleted" });
  } catch (error) {
    console.error("Error deleting community:", error);
    return response.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
    });
  }
};
