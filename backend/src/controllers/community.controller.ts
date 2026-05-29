import crypto from "node:crypto";
import bcrypt from "bcrypt";
import prisma from "../lib/prisma.js";
import type { Request, Response } from "express";
import { uploadImageToCloudinary } from "../lib/cloudinary.js";
import {
  MatchStatus,
  PaymentStatuses,
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
  status: PlayerHostStatuses;
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
  status: communityPlayer.status,
  addedAt: communityPlayer.addedAt,
  player: buildCommunityPlayerProfile(communityPlayer.account),
});

const getMatchPlayerStatus = (player: {
  queueAssignment: { id: string } | null;
  courtAssignment: {
    id: string;
    court: { startedAt: Date | null; endedAt: Date | null } | null;
  } | null;
}) => {
  const court = player.courtAssignment?.court;
  if (court?.startedAt && !court.endedAt) return "playing";
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
        endedAt: Date | null;
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

const MONTH_FILTER_PATTERN = /^\d{4}-\d{2}$/;
const DAY_FILTER_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const WIN_POINTS = 1;
const PAID_PAYMENT_POINTS = 3;

const getStringQueryValue = (value: unknown) =>
  typeof value === "string" ? value : undefined;

const getIsoDateRange = (startDate: string, endDate: string) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  if (start >= end) return null;

  return {
    gte: start,
    lt: end,
  };
};

const getMonthDateRange = (month: string) => {
  if (!MONTH_FILTER_PATTERN.test(month)) return null;

  const [yearText, monthText] = month.split("-");
  if (!yearText || !monthText) return null;

  const year = Number(yearText);
  const monthNumber = Number(monthText);
  if (!Number.isInteger(year) || !Number.isInteger(monthNumber)) return null;
  if (monthNumber < 1 || monthNumber > 12) return null;

  return {
    gte: new Date(Date.UTC(year, monthNumber - 1, 1)),
    lt: new Date(Date.UTC(year, monthNumber, 1)),
  };
};

const getDayDateRange = (day: string) => {
  if (!DAY_FILTER_PATTERN.test(day)) return null;

  const [yearText, monthText, dayText] = day.split("-");
  if (!yearText || !monthText || !dayText) return null;

  const year = Number(yearText);
  const monthNumber = Number(monthText);
  const dayNumber = Number(dayText);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(monthNumber) ||
    !Number.isInteger(dayNumber)
  ) {
    return null;
  }

  const start = new Date(Date.UTC(year, monthNumber - 1, dayNumber));

  if (
    start.getUTCFullYear() !== year ||
    start.getUTCMonth() !== monthNumber - 1 ||
    start.getUTCDate() !== dayNumber
  ) {
    return null;
  }

  return {
    gte: start,
    lt: new Date(Date.UTC(year, monthNumber - 1, dayNumber + 1)),
  };
};

type CreateCommunityStaticPlayerBody = {
  username?: string;
  skillLevel?: SkillLevels;
  profileUrl?: string;
  imageData?: string;
};

type CreateCommunityStaticPlayersBody = {
  usernames?: string[];
  skillLevel?: SkillLevels;
};

type CreateHostStaticPlayersBody = {
  usernames?: string[];
  skillLevel?: SkillLevels;
};

type AddCommunityPlayersToHostBody = {
  communityPlayerIds?: string[];
};

type UpdateCommunityPlayerBody = {
  username?: string;
  skillLevel?: SkillLevels;
  profileUrl?: string | null;
  imageData?: string;
  status?: PlayerHostStatuses;
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
        status: true,
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

export const getCommunityPlayerWinPoints = async (
  request: Request<CommunityPlayerParams>,
  response: Response,
) => {
  try {
    const { communityId } = request.params;
    const user = request.user;
    const filter = getStringQueryValue(request.query.filter) ?? "all";
    const month = getStringQueryValue(request.query.month);
    const day = getStringQueryValue(request.query.day);
    const startDate = getStringQueryValue(request.query.startDate);
    const endDate = getStringQueryValue(request.query.endDate);
    const filterMode =
      filter === "month" || filter === "day" || filter === "all"
        ? filter
        : "all";

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

    const pointDateRange =
      filterMode !== "all" && startDate && endDate
        ? getIsoDateRange(startDate, endDate)
        : filterMode === "month" && month
          ? getMonthDateRange(month)
          : filterMode === "day" && day
            ? getDayDateRange(day)
            : null;

    if (filterMode === "month" && !pointDateRange) {
      return response
        .status(400)
        .json({ success: false, message: "Invalid month filter" });
    }

    if (filterMode === "day" && !pointDateRange) {
      return response
        .status(400)
        .json({ success: false, message: "Invalid day filter" });
    }

    const hostDateFilter = pointDateRange
      ? {
          OR: [
            { startTime: pointDateRange },
            { startTime: null, createdAt: pointDateRange },
          ],
        }
      : {};

    const [communityPlayers, winParticipants, paidHostedPlayers] =
      await Promise.all([
      prisma.communityPlayer.findMany({
        where: { communityId: community.id },
        select: {
          id: true,
          accountId: true,
          account: {
            select: {
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
      }),
      prisma.matchParticipant.findMany({
        where: {
          result: "win",
          accountId: { not: null },
          match: {
            status: MatchStatus.finished,
            ...(pointDateRange ? { endedAt: pointDateRange } : {}),
            host: {
              communityId: community.id,
            },
          },
        },
        orderBy: {
          joinedAt: "desc",
        },
        select: {
          id: true,
          accountId: true,
          team: true,
          joinedAt: true,
          match: {
            select: {
              id: true,
              startedAt: true,
              endedAt: true,
              teamWinner: true,
              court: {
                select: {
                  id: true,
                  name: true,
                },
              },
              host: {
                select: {
                  id: true,
                  hostName: true,
                  startTime: true,
                },
              },
            },
          },
        },
      }),
      prisma.player.findMany({
        where: {
          paymentStatus: PaymentStatuses.paid,
          host: {
            communityId: community.id,
            ...hostDateFilter,
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
        select: {
          id: true,
          playerId: true,
          updatedAt: true,
          payments: {
            where: {
              amountPaid: {
                gt: 0,
              },
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
            select: {
              id: true,
              amountPaid: true,
              createdAt: true,
            },
          },
          host: {
            select: {
              id: true,
              hostName: true,
              startTime: true,
              createdAt: true,
            },
          },
        },
      }),
    ]);

    const pointHistoryByAccountId = winParticipants.reduce(
      (historyByAccountId, participant) => {
        if (!participant.accountId) return historyByAccountId;

        const currentHistory =
          historyByAccountId.get(participant.accountId) ?? [];

        currentHistory.push({
          id: participant.id,
          points: WIN_POINTS,
          reason: "win",
          team: participant.team,
          joinedAt: participant.joinedAt,
          match: {
            id: participant.match.id,
            startedAt: participant.match.startedAt,
            endedAt: participant.match.endedAt,
            teamWinner: participant.match.teamWinner,
            court: participant.match.court,
            host: participant.match.host,
          },
        });

        historyByAccountId.set(participant.accountId, currentHistory);
        return historyByAccountId;
      },
      new Map<
        string,
        Array<{
          id: string;
          points: number;
          reason: string;
          team: string | null;
          joinedAt: Date;
          match: {
            id: string;
            startedAt: Date | null;
            endedAt: Date | null;
            teamWinner: string;
            court: {
              id: string;
              name: string;
            } | null;
            host: {
              id: string;
              hostName: string;
              startTime: Date | null;
            };
          };
        }>>(),
    );

    paidHostedPlayers.forEach((hostedPlayer) => {
      const payment = hostedPlayer.payments[0] ?? null;
      const pointDate =
        hostedPlayer.host.startTime ??
        payment?.createdAt ??
        hostedPlayer.host.createdAt ??
        hostedPlayer.updatedAt;
      const currentHistory =
        pointHistoryByAccountId.get(hostedPlayer.playerId) ?? [];

      currentHistory.push({
        id: payment?.id ?? hostedPlayer.id,
        points: PAID_PAYMENT_POINTS,
        reason: "payment",
        team: null,
        joinedAt: pointDate,
        match: {
          id: hostedPlayer.host.id,
          startedAt: hostedPlayer.host.startTime,
          endedAt: pointDate,
          teamWinner: "",
          court: null,
          host: {
            id: hostedPlayer.host.id,
            hostName: hostedPlayer.host.hostName,
            startTime: hostedPlayer.host.startTime,
          },
        },
      });

      currentHistory.sort(
        (firstItem, secondItem) =>
          secondItem.joinedAt.getTime() - firstItem.joinedAt.getTime(),
      );
      pointHistoryByAccountId.set(hostedPlayer.playerId, currentHistory);
    });

    const winsByAccountId = winParticipants.reduce(
      (wins, participant) => {
        if (!participant.accountId) return wins;

        wins.set(
          participant.accountId,
          (wins.get(participant.accountId) ?? 0) + 1,
        );
        return wins;
      },
      new Map<string, number>(),
    );

    const paidPointsByAccountId = paidHostedPlayers.reduce(
      (pointsByAccountId, hostedPlayer) => {
        pointsByAccountId.set(
          hostedPlayer.playerId,
          (pointsByAccountId.get(hostedPlayer.playerId) ?? 0) +
            PAID_PAYMENT_POINTS,
        );
        return pointsByAccountId;
      },
      new Map<string, number>(),
    );

    const players = communityPlayers
      .map((communityPlayer) => {
        const winCount = winsByAccountId.get(communityPlayer.accountId) ?? 0;
        const winPoints = winCount * WIN_POINTS;
        const paidPoints =
          paidPointsByAccountId.get(communityPlayer.accountId) ?? 0;
        const pointsHistory =
          pointHistoryByAccountId.get(communityPlayer.accountId) ?? [];

        return {
          communityPlayerId: communityPlayer.id,
          accountId: communityPlayer.accountId,
          player: buildCommunityPlayerProfile({
            id: communityPlayer.accountId,
            ...communityPlayer.account,
          }),
          winCount,
          points: winPoints + paidPoints,
          pointsHistory,
        };
      })
      .sort((firstPlayer, secondPlayer) => {
        if (secondPlayer.points !== firstPlayer.points) {
          return secondPlayer.points - firstPlayer.points;
        }

        return firstPlayer.player.username.localeCompare(
          secondPlayer.player.username,
        );
      });

    return response.status(200).json({
      success: true,
      message: "Community player win points retrieved successfully",
      filter: {
        mode: filterMode,
        month: filterMode === "month" ? month : null,
        day: filterMode === "day" ? day : null,
      },
      players,
    });
  } catch (error) {
    console.error("Error getting community player win points:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const includeCommunityAdminAsPlayer = async (
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

    const communityPlayer = await prisma.communityPlayer.upsert({
      where: {
        communityId_accountId: {
          communityId: community.id,
          accountId: user.sub,
        },
      },
      update: {
        status: PlayerHostStatuses.accepted,
      },
      create: {
        communityId: community.id,
        accountId: user.sub,
        status: PlayerHostStatuses.accepted,
      },
      select: {
        id: true,
        status: true,
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
      message: "Admin added as community player",
      player: mapCommunityPlayerRecord(communityPlayer),
    });
  } catch (error) {
    console.error("Error adding admin as community player:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const removeCommunityAdminAsPlayer = async (
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

    const communityPlayer = await prisma.communityPlayer.findUnique({
      where: {
        communityId_accountId: {
          communityId: community.id,
          accountId: user.sub,
        },
      },
      select: {
        id: true,
      },
    });

    if (!communityPlayer)
      return response.status(200).json({
        success: true,
        message: "Admin is already removed from community players",
      });

    await prisma.communityPlayer.delete({
      where: { id: communityPlayer.id },
    });

    return response.status(200).json({
      success: true,
      message: "Admin removed from community players",
      communityPlayerId: communityPlayer.id,
    });
  } catch (error) {
    console.error("Error removing admin as community player:", error);
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
          status: PlayerHostStatuses.accepted,
        },
        select: {
          id: true,
          status: true,
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

export const createCommunityStaticPlayers = async (
  request: Request<
    CommunityPlayerParams,
    unknown,
    CreateCommunityStaticPlayersBody
  >,
  response: Response,
) => {
  try {
    const { communityId } = request.params;
    const usernames = Array.from(
      new Set(
        (request.body.usernames ?? [])
          .map((username) => username.trim())
          .filter(Boolean),
      ),
    );
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

    if (usernames.length === 0)
      return response
        .status(400)
        .json({ success: false, message: "Add at least one player name" });

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
    const accounts = usernames.map((username) => ({
      id: crypto.randomUUID(),
      username,
      email: `static-${crypto.randomUUID()}@queue-system.local`,
      password: accountPassword,
      role: UserRoles.static,
    }));

    await prisma.$transaction([
      prisma.account.createMany({
        data: accounts,
      }),
      prisma.userSport.createMany({
        data: accounts.map((account) => ({
          accountId: account.id,
          sport: Sports.badminton,
          skillLevel,
        })),
      }),
      prisma.communityPlayer.createMany({
        data: accounts.map((account) => ({
          communityId: community.id,
          accountId: account.id,
          status: PlayerHostStatuses.accepted,
        })),
      }),
    ]);

    const communityPlayers = await prisma.communityPlayer.findMany({
      where: {
        communityId: community.id,
        accountId: { in: accounts.map((account) => account.id) },
      },
      select: {
        id: true,
        status: true,
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

    return response.status(201).json({
      success: true,
      message: "Community players created successfully",
      players: communityPlayers.map(mapCommunityPlayerRecord),
    });
  } catch (error) {
    console.error("Error creating community players:", error);
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
        status: PlayerHostStatuses.accepted,
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
                endedAt: true,
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

export const createHostStaticPlayers = async (
  request: Request<CommunityPlayerParams, unknown, CreateHostStaticPlayersBody>,
  response: Response,
) => {
  try {
    const { communityId, hostId } = request.params;
    const usernames = Array.from(
      new Set(
        (request.body.usernames ?? [])
          .map((username) => username.trim())
          .filter(Boolean),
      ),
    );
    const skillLevel = request.body.skillLevel ?? SkillLevels.beginner;
    const user = request.user;

    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    if (!communityId || !hostId)
      return response
        .status(400)
        .json({ success: false, message: "Missing required params" });

    if (usernames.length === 0)
      return response
        .status(400)
        .json({ success: false, message: "Add at least one player name" });

    if (!Object.values(SkillLevels).includes(skillLevel))
      return response
        .status(400)
        .json({ success: false, message: "Invalid skill level" });

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
        sport: true,
      },
    });

    if (!host)
      return response
        .status(404)
        .json({ success: false, message: "Community or host not found" });

    const accountPassword = await bcrypt.hash(crypto.randomUUID(), 10);
    const now = new Date();
    const accounts = usernames.map((username) => ({
      id: crypto.randomUUID(),
      username,
      email: `static-${crypto.randomUUID()}@queue-system.local`,
      password: accountPassword,
      role: UserRoles.static,
    }));

    await prisma.$transaction([
      prisma.account.createMany({
        data: accounts,
      }),
      prisma.userSport.createMany({
        data: accounts.map((account) => ({
          accountId: account.id,
          sport: host.sport as Sports,
          skillLevel,
        })),
      }),
      prisma.communityPlayer.createMany({
        data: accounts.map((account) => ({
          communityId,
          accountId: account.id,
          status: PlayerHostStatuses.accepted,
        })),
      }),
      prisma.player.createMany({
        data: accounts.map((account) => ({
          hostId: host.id,
          playerId: account.id,
          hostStatus: PlayerHostStatuses.accepted,
          timerStartedAt: now,
        })),
      }),
    ]);

    const [communityPlayers, hostedPlayers] = await Promise.all([
      prisma.communityPlayer.findMany({
        where: {
          communityId,
          accountId: { in: accounts.map((account) => account.id) },
        },
        select: {
          id: true,
          status: true,
          addedAt: true,
          account: {
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
          },
        },
      }),
      prisma.player.findMany({
        where: {
          hostId: host.id,
          playerId: { in: accounts.map((account) => account.id) },
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
                  endedAt: true,
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
                where: { sport: host.sport as Sports },
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

    return response.status(201).json({
      success: true,
      message: "Static players created and added to host successfully",
      communityPlayers: communityPlayers.map(mapCommunityPlayerRecord),
      hostedPlayers: hostedPlayers.map(mapHostedPlayerForResponse),
    });
  } catch (error) {
    console.error("Error creating host static players:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const updateCommunityPlayer = async (
  request: Request<
    CommunityPlayerParams & { communityPlayerId: string },
    unknown,
    UpdateCommunityPlayerBody
  >,
  response: Response,
) => {
  try {
    const { communityId, communityPlayerId } = request.params;
    const { username, skillLevel, profileUrl, imageData, status } =
      request.body;
    const user = request.user;

    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    if (!communityId || !communityPlayerId)
      return response
        .status(400)
        .json({ success: false, message: "Missing required params" });

    const communityPlayer = await prisma.communityPlayer.findFirst({
      where: {
        id: communityPlayerId,
        community: {
          id: communityId,
          masterId: user.sub,
        },
      },
      select: {
        id: true,
        status: true,
        addedAt: true,
        account: {
          select: {
            id: true,
            role: true,
          },
        },
      },
    });

    if (!communityPlayer)
      return response
        .status(404)
        .json({ success: false, message: "Community player not found" });

    const isStaticPlayer = communityPlayer.account.role === UserRoles.static;

    if (status !== undefined) {
      if (!Object.values(PlayerHostStatuses).includes(status)) {
        return response
          .status(400)
          .json({ success: false, message: "Invalid player status" });
      }

      if (isStaticPlayer) {
        return response.status(400).json({
          success: false,
          message: "Static players do not use moderation status",
        });
      }
    }

    if (skillLevel !== undefined && !Object.values(SkillLevels).includes(skillLevel)) {
      return response
        .status(400)
        .json({ success: false, message: "Invalid skill level" });
    }

    if ((username !== undefined || profileUrl !== undefined || imageData || skillLevel) && !isStaticPlayer) {
      return response.status(400).json({
        success: false,
        message: "Only static players can be edited",
      });
    }

    const cleanUsername = username?.trim();
    if (username !== undefined && !cleanUsername) {
      return response
        .status(400)
        .json({ success: false, message: "Player name is required" });
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

    const uploadedProfileUrl = cleanedImageData
      ? await uploadImageToCloudinary({
          dataUri: cleanedImageData,
          publicId: `queue-system/static-player-images/${communityPlayer.account.id}`,
        })
      : null;
    const nextProfileUrl = uploadedProfileUrl ?? cleanedProfileUrl;

    await prisma.$transaction(async (transaction) => {
      if (status !== undefined) {
        await transaction.communityPlayer.update({
          where: { id: communityPlayer.id },
          data: { status },
        });
      }

      if (isStaticPlayer) {
        await transaction.account.update({
          where: { id: communityPlayer.account.id },
          data: {
            ...(cleanUsername ? { username: cleanUsername } : {}),
            ...(nextProfileUrl ? { profileUrl: nextProfileUrl } : {}),
          },
        });

        if (skillLevel !== undefined) {
          const sportRecord = await transaction.userSport.findFirst({
            where: {
              accountId: communityPlayer.account.id,
              sport: Sports.badminton,
            },
            select: { id: true },
          });

          if (sportRecord) {
            await transaction.userSport.update({
              where: { id: sportRecord.id },
              data: { skillLevel },
            });
          } else {
            await transaction.userSport.create({
              data: {
                accountId: communityPlayer.account.id,
                sport: Sports.badminton,
                skillLevel,
              },
            });
          }
        }
      }
    });

    const updatedCommunityPlayer = await prisma.communityPlayer.findUnique({
      where: { id: communityPlayer.id },
      select: {
        id: true,
        status: true,
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

    if (!updatedCommunityPlayer)
      return response
        .status(404)
        .json({ success: false, message: "Community player not found" });

    return response.status(200).json({
      success: true,
      message: "Community player updated successfully",
      player: mapCommunityPlayerRecord(updatedCommunityPlayer),
    });
  } catch (error) {
    console.error("Error updating community player:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const deleteCommunityPlayer = async (
  request: Request<CommunityPlayerParams & { communityPlayerId: string }>,
  response: Response,
) => {
  try {
    const { communityId, communityPlayerId } = request.params;
    const user = request.user;

    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    if (!communityId || !communityPlayerId)
      return response
        .status(400)
        .json({ success: false, message: "Missing required params" });

    const communityPlayer = await prisma.communityPlayer.findFirst({
      where: {
        id: communityPlayerId,
        community: {
          id: communityId,
          masterId: user.sub,
        },
      },
      select: {
        id: true,
        account: {
          select: {
            id: true,
            role: true,
          },
        },
      },
    });

    if (!communityPlayer)
      return response
        .status(404)
        .json({ success: false, message: "Community player not found" });

    if (communityPlayer.account.role === UserRoles.master) {
      return response.status(400).json({
        success: false,
        message: "Community admins cannot be removed from the roster",
      });
    }

    await prisma.$transaction([
      prisma.player.deleteMany({
        where: {
          playerId: communityPlayer.account.id,
          host: {
            communityId,
          },
        },
      }),
      prisma.communityPlayer.delete({
        where: { id: communityPlayer.id },
      }),
    ]);

    return response.status(200).json({
      success: true,
      message: "Community player removed successfully",
    });
  } catch (error) {
    console.error("Error deleting community player:", error);
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
