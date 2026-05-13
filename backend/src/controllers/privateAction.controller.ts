import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import {
  PlayerHostStatuses,
  SkillLevels,
  Sports,
  UserRoles,
} from "../generated/prisma/enums.js";
import { uploadImageToCloudinary } from "../lib/cloudinary.js";

// HOST ADMIN ACTION

type HostedPlayerParams = {
  communityId: string;
  hostId: string;
  playerId: string;
};

const getAuthorizedHost = async (
  communityId: string,
  hostId: string,
  masterId: string,
) => {
  const community = await prisma.community.findFirst({
    where: { id: communityId, masterId },
    select: { id: true },
  });

  if (!community) return null;

  return prisma.host.findFirst({
    where: { id: hostId, communityId: community.id },
    select: { id: true, sport: true },
  });
};

export const acceptPlayer = async (
  request: Request<HostedPlayerParams>,
  response: Response,
) => {
  try {
    const { communityId, hostId, playerId } = request.params;
    const user = request.user;
    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    if (!communityId || !hostId || !playerId) {
      return response
        .status(400)
        .json({ success: false, message: "Missing required parameters" });
    }

    const host = await getAuthorizedHost(communityId, hostId, user.sub);

    if (!host)
      return response
        .status(404)
        .json({ success: false, message: "Community or host not found" });

    const existing = await prisma.player.findFirst({
      where: {
        id: playerId,
        hostId: host.id,
      },
      select: { id: true },
    });

    if (!existing) {
      return response.status(404).json({
        success: false,
        message: "Player not found",
      });
    }

    await prisma.player.update({
      where: { id: existing.id },
      data: {
        hostStatus: PlayerHostStatuses.accepted,
        timerStartedAt: new Date(),
      },
    });

    return response
      .status(200)
      .json({ success: true, message: "Player accepted" });
  } catch (error) {
    console.error("Error accepting player to hosts:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const rejectPlayer = async (
  request: Request<HostedPlayerParams>,
  response: Response,
) => {
  try {
    const { communityId, hostId, playerId } = request.params;
    const user = request.user;
    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    if (!communityId || !hostId || !playerId) {
      return response
        .status(400)
        .json({ success: false, message: "Missing required parameters" });
    }

    const host = await getAuthorizedHost(communityId, hostId, user.sub);

    if (!host)
      return response
        .status(404)
        .json({ success: false, message: "Community or host not found" });

    const existing = await prisma.player.findFirst({
      where: {
        id: playerId,
        hostId: host.id,
        hostStatus: PlayerHostStatuses.requested,
      },
      select: { id: true },
    });

    if (!existing) {
      return response.status(404).json({
        success: false,
        message: "Player not found",
      });
    }

    await prisma.player.update({
      where: { id: existing.id },
      data: { hostStatus: PlayerHostStatuses.rejected },
    });

    return response
      .status(200)
      .json({ success: true, message: "Player rejected" });
  } catch (error) {
    console.error("Error accepting player to hosts:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

type BanPlayerParams = {
  communityId: string;
  hostId: string;
  playerId: string;
};

type UpdateStaticPlayerSkillLevelBody = {
  skillLevel?: SkillLevels;
};

type UpdateStaticPlayerProfileUrlBody = {
  profileUrl?: string | null;
  imageData?: string;
};

type UpdateStaticPlayerNameBody = {
  username?: string;
};

export const banPlayer = async (
  request: Request<BanPlayerParams>,
  response: Response,
) => {
  try {
    const { communityId, hostId, playerId } = request.params;
    if (!communityId || !hostId || !playerId) {
      return response
        .status(400)
        .json({ success: false, message: "Missing required parameters" });
    }

    const user = request.user;
    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    const host = await getAuthorizedHost(communityId, hostId, user.sub);
    if (!host)
      return response
        .status(404)
        .json({ success: false, message: "Community or host not found" });

    const existing = await prisma.player.findFirst({
      where: {
        id: playerId,
        hostId: host.id,
        hostStatus: PlayerHostStatuses.accepted,
      },
      select: {
        id: true,
        courtAssignment: {
          select: {
            court: {
              select: {
                startedAt: true,
              },
            },
          },
        },
      },
    });
    if (!existing)
      return response
        .status(404)
        .json({ success: false, message: "Player not found" });

    if (existing.courtAssignment?.court.startedAt)
      return response.status(400).json({
        success: false,
        message: "Cannot ban a player while they are in an active game",
      });

    await prisma.$transaction([
      prisma.player.update({
        where: { id: existing.id },
        data: { hostStatus: PlayerHostStatuses.banned },
      }),

      prisma.courtAssignment.deleteMany({
        where: { playerId: existing.id },
      }),

      prisma.queueAssignment.deleteMany({
        where: { playerId: existing.id },
      }),
    ]);

    return response
      .status(200)
      .json({ success: true, message: "Player banned" });
  } catch (error) {
    console.error("Error accepting player to hosts:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const deletePlayer = async (
  request: Request<BanPlayerParams>,
  response: Response,
) => {
  try {
    const { communityId, hostId, playerId } = request.params;
    if (!communityId || !hostId || !playerId) {
      return response
        .status(400)
        .json({ success: false, message: "Missing required parameters" });
    }

    const user = request.user;
    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    const host = await getAuthorizedHost(communityId, hostId, user.sub);
    if (!host)
      return response
        .status(404)
        .json({ success: false, message: "Community or host not found" });

    const existing = await prisma.player.findFirst({
      where: {
        id: playerId,
        hostId: host.id,
      },
      select: {
        id: true,
        courtAssignment: {
          select: {
            court: {
              select: {
                startedAt: true,
              },
            },
          },
        },
      },
    });

    if (!existing)
      return response
        .status(404)
        .json({ success: false, message: "Player not found" });

    if (existing.courtAssignment?.court.startedAt)
      return response.status(400).json({
        success: false,
        message: "Cannot delete a player while they are in an active game",
      });

    await prisma.player.delete({
      where: { id: existing.id },
    });

    return response.status(200).json({
      success: true,
      message: "Player deleted",
    });
  } catch (error) {
    console.error("Error deleting player from hosts:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const unbanPlayer = async (
  request: Request<BanPlayerParams>,
  response: Response,
) => {
  try {
    const { communityId, hostId, playerId } = request.params;
    if (!communityId || !hostId || !playerId) {
      return response
        .status(400)
        .json({ success: false, message: "Missing required parameters" });
    }

    const user = request.user;
    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    const host = await getAuthorizedHost(communityId, hostId, user.sub);
    if (!host)
      return response
        .status(404)
        .json({ success: false, message: "Community or host not found" });

    const existing = await prisma.player.findFirst({
      where: {
        id: playerId,
        hostId: host.id,
        hostStatus: PlayerHostStatuses.banned,
      },
      select: {
        id: true,
      },
    });

    if (!existing)
      return response
        .status(404)
        .json({ success: false, message: "Player not found" });

    await prisma.player.update({
      where: { id: existing.id },
      data: {
        hostStatus: PlayerHostStatuses.accepted,
        timerStartedAt: new Date(),
      },
    });

    return response.status(200).json({
      success: true,
      message: "Player unbanned",
    });
  } catch (error) {
    console.error("Error unbanning player from hosts:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

const buildStaticPlayerProfile = (
  account:
    | {
        id: string;
        username: string;
        profileUrl: string;
        role: UserRoles;
        sports: { sport: string; skillLevel: SkillLevels }[];
      }
    | null
    | undefined,
) => ({
  id: account?.id ?? null,
  username: account?.username ?? "",
  profileUrl: account?.profileUrl ?? "",
  skillLevel: account?.sports?.[0]?.skillLevel ?? SkillLevels.beginner,
  isStatic: account?.role === UserRoles.static,
});

type StaticPlayerParams = {
  communityId: string;
  hostId: string;
  hostedPlayerId: string;
};

export const updateStaticPlayerSkillLevel = async (
  request: Request<
    StaticPlayerParams,
    unknown,
    UpdateStaticPlayerSkillLevelBody
  >,
  response: Response,
) => {
  try {
    const { communityId, hostId, hostedPlayerId } = request.params;
    const { skillLevel } = request.body;

    if (!communityId || !hostId || !hostedPlayerId || !skillLevel) {
      return response
        .status(400)
        .json({ success: false, message: "Missing required parameters" });
    }

    if (!Object.values(SkillLevels).includes(skillLevel)) {
      return response
        .status(400)
        .json({ success: false, message: "Invalid skill level" });
    }

    const user = request.user;
    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    const host = await getAuthorizedHost(communityId, hostId, user.sub);
    if (!host)
      return response
        .status(404)
        .json({ success: false, message: "Community or host not found" });

    const existing = await prisma.player.findFirst({
      where: {
        id: hostedPlayerId,
        hostId: host.id,
        player: {
          role: UserRoles.static,
        },
      },
      select: {
        id: true,
        hostStatus: true,
        timerStartedAt: true,
        player: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!existing || !existing.player?.id)
      return response.status(404).json({
        success: false,
        message: "Static player not found",
      });

    const playerAccountId = existing.player.id;

    const sportRecord = await prisma.userSport.findFirst({
      where: {
        accountId: playerAccountId,
        sport: host.sport as Sports,
      },
      select: { id: true },
    });

    if (sportRecord) {
      await prisma.userSport.update({
        where: { id: sportRecord.id },
        data: { skillLevel },
      });
    } else {
      await prisma.userSport.create({
        data: {
          accountId: playerAccountId,
          sport: host.sport as Sports,
          skillLevel,
        },
      });
    }

    const account = await prisma.account.findUnique({
      where: { id: playerAccountId },
      select: {
        id: true,
        username: true,
        profileUrl: true,
        role: true,
        sports: {
          where: { sport: host.sport as Sports },
          select: {
            sport: true,
            skillLevel: true,
          },
        },
      },
    });

    return response.status(200).json({
      success: true,
      message: "Static player skill updated",
      data: {
        id: existing.id,
        status: existing.hostStatus,
        hostStatus: existing.hostStatus,
        timerStartedAt: existing.timerStartedAt,
        matchStatus: "waiting",
        player: buildStaticPlayerProfile(account),
        queueEntry: null,
        courtAssignment: null,
      },
    });
  } catch (error) {
    console.error("Error updating static player skill level:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const updateStaticPlayerProfileUrl = async (
  request: Request<
    StaticPlayerParams,
    unknown,
    UpdateStaticPlayerProfileUrlBody
  >,
  response: Response,
) => {
  try {
    const { communityId, hostId, hostedPlayerId } = request.params;
    const { profileUrl, imageData } = request.body;

    if (!communityId || !hostId || !hostedPlayerId) {
      return response
        .status(400)
        .json({ success: false, message: "Missing required parameters" });
    }

    const cleanedProfileUrl = profileUrl?.trim() ?? "";
    const cleanedImageData = imageData?.trim() ?? "";

    if (cleanedProfileUrl && cleanedImageData) {
      return response.status(400).json({
        success: false,
        message: "Choose either image upload or profile URL",
      });
    }

    if (profileUrl !== undefined && cleanedProfileUrl.length > 0) {
      try {
        const parsedUrl = new URL(cleanedProfileUrl);

        if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
          return response.status(400).json({
            success: false,
            message: "Profile URL must use http or https",
          });
        }
      } catch {
        return response
          .status(400)
          .json({ success: false, message: "Invalid profile URL" });
      }
    }

    const user = request.user;
    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    const host = await getAuthorizedHost(communityId, hostId, user.sub);
    if (!host)
      return response
        .status(404)
        .json({ success: false, message: "Community or host not found" });

    const existing = await prisma.player.findFirst({
      where: {
        id: hostedPlayerId,
        hostId: host.id,
        player: {
          role: UserRoles.static,
        },
      },
      select: {
        id: true,
        hostStatus: true,
        timerStartedAt: true,
        player: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!existing || !existing.player?.id)
      return response.status(404).json({
        success: false,
        message: "Static player not found",
      });

    const playerAccountId = existing.player.id;

    const selectAccount = {
      id: true,
      username: true,
      profileUrl: true,
      role: true,
      sports: {
        where: { sport: host.sport as Sports },
        select: {
          sport: true,
          skillLevel: true,
        },
      },
    };

    const uploadedProfileUrl = cleanedImageData
      ? await uploadImageToCloudinary({
          dataUri: cleanedImageData,
          publicId: `queue-system/static-player-images/${playerAccountId}`,
        })
      : null;

    const nextProfileUrl = uploadedProfileUrl ?? cleanedProfileUrl;

    const account = nextProfileUrl.length
      ? await prisma.account.update({
          where: { id: playerAccountId },
          data: { profileUrl: nextProfileUrl },
          select: selectAccount,
        })
      : await prisma.account.findUnique({
          where: { id: playerAccountId },
          select: selectAccount,
        });

    return response.status(200).json({
      success: true,
      message: "Static player profile updated",
      data: {
        id: existing.id,
        status: existing.hostStatus,
        hostStatus: existing.hostStatus,
        timerStartedAt: existing.timerStartedAt,
        matchStatus: "waiting",
        player: buildStaticPlayerProfile(account),
        queueEntry: null,
        courtAssignment: null,
      },
    });
  } catch (error) {
    console.error("Error updating static player profile URL:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const updateStaticPlayerName = async (
  request: Request<StaticPlayerParams, unknown, UpdateStaticPlayerNameBody>,
  response: Response,
) => {
  try {
    const { communityId, hostId, hostedPlayerId } = request.params;
    const cleanUsername = request.body.username?.trim() ?? "";

    if (!communityId || !hostId || !hostedPlayerId) {
      return response
        .status(400)
        .json({ success: false, message: "Missing required parameters" });
    }

    if (!cleanUsername) {
      return response
        .status(400)
        .json({ success: false, message: "Player name is required" });
    }

    const user = request.user;
    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    const host = await getAuthorizedHost(communityId, hostId, user.sub);
    if (!host)
      return response
        .status(404)
        .json({ success: false, message: "Community or host not found" });

    const existing = await prisma.player.findFirst({
      where: {
        id: hostedPlayerId,
        hostId: host.id,
        player: {
          role: UserRoles.static,
        },
      },
      select: {
        id: true,
        hostStatus: true,
        timerStartedAt: true,
        player: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!existing || !existing.player?.id)
      return response.status(404).json({
        success: false,
        message: "Static player not found",
      });

    const account = await prisma.account.update({
      where: { id: existing.player.id },
      data: { username: cleanUsername },
      select: {
        id: true,
        username: true,
        profileUrl: true,
        role: true,
        sports: {
          where: { sport: host.sport as Sports },
          select: {
            sport: true,
            skillLevel: true,
          },
        },
      },
    });

    return response.status(200).json({
      success: true,
      message: "Static player name updated",
      data: {
        id: existing.id,
        status: existing.hostStatus,
        hostStatus: existing.hostStatus,
        timerStartedAt: existing.timerStartedAt,
        matchStatus: "waiting",
        player: buildStaticPlayerProfile(account),
        queueEntry: null,
        courtAssignment: null,
      },
    });
  } catch (error) {
    console.error("Error updating static player name:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

type AssignPlayerParams = {
  communityId: string;
  hostId: string;
  courtId: string;
  playerId: string;
};

export const assignPlayerToCourt = async (
  request: Request<AssignPlayerParams>,
  response: Response,
) => {
  try {
    const user = request.user;
    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    const { communityId, hostId, courtId, playerId } = request.params;

    if (!communityId || !hostId || !courtId || !playerId) {
      return response
        .status(400)
        .json({ success: false, message: "Missing required parameters" });
    }

    const { position } = request.body;
    if (typeof position !== "number" || position < 1 || position > 4) {
      return response
        .status(400)
        .json({ success: false, message: "Invalid position" });
    }

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
      select: { id: true },
    });

    if (!host)
      return response
        .status(404)
        .json({ success: false, message: "Host not found" });

    const player = await prisma.player.findFirst({
      where: {
        id: playerId,
        hostId: host.id,
        hostStatus: PlayerHostStatuses.accepted,
      },
      select: { id: true },
    });

    if (!player)
      return response
        .status(404)
        .json({ success: false, message: "Player not found or not accepted" });

    const court = await prisma.court.findFirst({
      where: { id: courtId, hostId: host.id },
      select: { id: true, startedAt: true },
    });

    if (!court)
      return response
        .status(404)
        .json({ success: false, message: "Court not found" });

    if (court.startedAt)
      return response.status(400).json({
        success: false,
        message: "Cannot assign players to a game in progress",
      });

    const existingAssignment = await prisma.courtAssignment.findFirst({
      where: { playerId: player.id },
      select: {
        playerId: true,
        court: {
          select: {
            startedAt: true,
          },
        },
      },
    });

    if (existingAssignment?.court.startedAt)
      return response.status(400).json({
        success: false,
        message: "Cannot move players from a game in progress",
      });

    const occupied = await prisma.courtAssignment.findFirst({
      where: {
        courtId: court.id,
        position,
      },
    });

    if (occupied && occupied.playerId !== player.id) {
      return response.status(400).json({
        success: false,
        message: "Position already occupied",
      });
    }

    await prisma.courtAssignment.upsert({
      where: { playerId: player.id },
      update: {
        courtId: court.id,
        position,
      },
      create: {
        playerId: player.id,
        courtId: court.id,
        position,
      },
    });

    return response.status(200).json({
      success: true,
      message: "Player assigned to court successfully",
    });
  } catch (error) {
    console.error("Error assigning player to court:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

type RemovePlayerFromCourtParams = {
  communityId: string;
  hostId: string;
  courtId: string;
  playerId: string;
};

export const removePlayerFromCourt = async (
  request: Request<RemovePlayerFromCourtParams>,
  response: Response,
) => {
  try {
    const { communityId, hostId, courtId, playerId } = request.params;
    if (!communityId || !hostId || !courtId || !playerId) {
      return response
        .status(400)
        .json({ success: false, message: "Missing required parameters" });
    }

    const user = request.user;
    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

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
      select: { id: true },
    });

    if (!host)
      return response
        .status(404)
        .json({ success: false, message: "Host not found" });

    const court = await prisma.court.findFirst({
      where: { id: courtId, hostId: host.id },
      select: { id: true, startedAt: true },
    });

    if (!court)
      return response
        .status(404)
        .json({ success: false, message: "Court not found" });

    if (court.startedAt)
      return response.status(400).json({
        success: false,
        message: "Cannot remove players while the game is in progress",
      });

    const existing = await prisma.player.findFirst({
      where: {
        id: playerId,
        hostId: host.id,
        hostStatus: PlayerHostStatuses.accepted,
      },
      select: { id: true },
    });

    if (!existing)
      return response
        .status(404)
        .json({ success: false, message: "Player not found" });

    const assignment = await prisma.courtAssignment.findFirst({
      where: {
        courtId: court.id,
        playerId: existing.id,
      },
      select: { id: true },
    });

    if (!assignment)
      return response.status(200).json({
        success: true,
        message: "Player already removed from the slot",
      });

    await prisma.courtAssignment.delete({
      where: { id: assignment.id },
    });

    return response
      .status(200)
      .json({ success: true, message: "Player removed from the slot" });
  } catch (error) {
    console.error("Error removing player from court:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

type AssignPlayerToQueueParams = {
  communityId: string;
  hostId: string;
  queueId: string;
  playerId: string;
};

export const assignPlayerToQueue = async (
  request: Request<AssignPlayerToQueueParams>,
  response: Response,
) => {
  try {
    const user = request.user;
    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    const { communityId, hostId, queueId, playerId } = request.params;

    if (!communityId || !hostId || !queueId || !playerId) {
      return response
        .status(400)
        .json({ success: false, message: "Missing required parameters" });
    }

    const { position } = request.body;
    if (typeof position !== "number" || position < 1) {
      return response
        .status(400)
        .json({ success: false, message: "Invalid position" });
    }

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
      select: { id: true },
    });

    if (!host)
      return response
        .status(404)
        .json({ success: false, message: "Host not found" });

    const player = await prisma.player.findFirst({
      where: {
        id: playerId,
        hostId: host.id,
        hostStatus: PlayerHostStatuses.accepted,
      },
      select: { id: true },
    });

    if (!player)
      return response
        .status(404)
        .json({ success: false, message: "Player not found or not accepted" });

    const queue = await prisma.queue.findFirst({
      where: { id: queueId, hostId: host.id },
      select: { id: true },
    });

    if (!queue)
      return response
        .status(404)
        .json({ success: false, message: "Queue not found" });

    const existingAssignment = await prisma.queueAssignment.findFirst({
      where: { playerId: player.id },
      select: { playerId: true, queueId: true },
    });

    if (existingAssignment && existingAssignment.queueId !== queue.id)
      return response.status(400).json({
        success: false,
        message: "Player is already in a queue",
      });

    const occupied = await prisma.queueAssignment.findFirst({
      where: {
        queueId: queue.id,
        position,
      },
    });

    if (occupied && occupied.playerId !== player.id) {
      return response.status(400).json({
        success: false,
        message: "Position already occupied",
      });
    }

    await prisma.queueAssignment.upsert({
      where: { playerId: player.id },
      update: {
        queueId: queue.id,
        position,
      },
      create: {
        playerId: player.id,
        queueId: queue.id,
        position,
      },
    });

    return response.status(200).json({
      success: true,
      message: "Player assigned to queue successfully",
    });
  } catch (error) {
    console.error("Error assigning player to queue:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

type RemovePlayerFromQueueParams = {
  communityId: string;
  hostId: string;
  queueId: string;
  playerId: string;
};

export const removePlayerFromQueue = async (
  request: Request<RemovePlayerFromQueueParams>,
  response: Response,
) => {
  try {
    const { communityId, hostId, queueId, playerId } = request.params;
    if (!communityId || !hostId || !queueId || !playerId) {
      return response
        .status(400)
        .json({ success: false, message: "Missing required parameters" });
    }

    const user = request.user;
    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

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
      select: { id: true },
    });

    if (!host)
      return response
        .status(404)
        .json({ success: false, message: "Host not found" });

    const queue = await prisma.queue.findFirst({
      where: { id: queueId, hostId: host.id },
      select: { id: true },
    });

    if (!queue)
      return response
        .status(404)
        .json({ success: false, message: "Queue not found" });

    const existing = await prisma.player.findFirst({
      where: {
        id: playerId,
        hostId: host.id,
        hostStatus: PlayerHostStatuses.accepted,
      },
      select: { id: true },
    });

    if (!existing)
      return response
        .status(404)
        .json({ success: false, message: "Player not found" });

    const assignment = await prisma.queueAssignment.findFirst({
      where: {
        queueId: queue.id,
        playerId: existing.id,
      },
      select: { id: true },
    });

    if (!assignment)
      return response.status(200).json({
        success: true,
        message: "Player already removed from the queue",
      });

    await prisma.queueAssignment.delete({
      where: { id: assignment.id },
    });

    return response
      .status(200)
      .json({ success: true, message: "Player removed from the queue" });
  } catch (error) {
    console.error("Error removing player from queue:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};
