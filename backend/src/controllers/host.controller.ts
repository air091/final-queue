import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import prisma from "../lib/prisma.js";
import type { Params } from "./community.controller.js";
import {
  HostStatus,
  MatchStatus,
  PlayerHostStatuses,
  SkillLevels,
  Sports,
  UserRoles,
} from "../generated/prisma/enums.js";

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
    isAdmin: player?.role === UserRoles.master,
  };
};

const mapHostPlayerRecord = (player: {
  id: string;
  hostStatus: PlayerHostStatuses;
  paymentStatus: string;
  requestedAt?: Date;
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
  requestedAt: player.requestedAt?.toISOString(),
  player: buildPlayerProfile(player.player),
});

const communityMemberWhere = (communityId: string, accountId: string) => ({
  id: communityId,
  OR: [
    { masterId: accountId },
    { admins: { some: { accountId } } },
  ],
});

export const host = async (request: Request<Params>, response: Response) => {
  try {
    const { communityId } = request.params;
    let { hostName } = request.body;
    const { sportName, location, startTime, endTime, maxPlayers } =
      request.body;

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
      where: communityMemberWhere(communityId, user.sub),
    });

    if (!community)
      return response
        .status(404)
        .json({ success: false, message: "Community not found" });

    const count = await prisma.host.count({
      where: { communityId: community.id },
    });

    if (!hostName) {
      hostName = `Host ${count + 1}`;
    }

    const newHost = await prisma.host.create({
      data: {
        hostName,
        communityId: community.id,
        sport: sportName,
        location,
        startTime,
        endTime,
        maxPlayers,
      },
      select: {
        id: true,
        hostName: true,
        sport: true,
        location: true,
        startTime: true,
        endTime: true,
        maxPlayers: true,
        status: true,
        _count: { select: { players: true } },
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

export const updateHost = async (
  request: Request<{ communityId: string; hostId: string }>,
  response: Response,
) => {
  try {
    const { communityId, hostId } = request.params;
    const { hostName, sportName, location, startTime, endTime, maxPlayers } =
      request.body;

    const user = request.user;
    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    if (!communityId || !hostId)
      return response
        .status(400)
        .json({ success: false, message: "Missing required params" });

    if (sportName && !Object.values(Sports).includes(sportName as Sports))
      return response
        .status(400)
        .json({ success: false, message: "Sport unavailable" });

    if (
      maxPlayers !== undefined &&
      (typeof maxPlayers !== "number" || Number.isNaN(maxPlayers) || maxPlayers < 0)
    ) {
      return response
        .status(400)
        .json({ success: false, message: "Max players must be 0 or more" });
    }

    const community = await prisma.community.findFirst({
      where: communityMemberWhere(communityId, user.sub),
      select: { id: true },
    });

    if (!community)
      return response
        .status(404)
        .json({ success: false, message: "Community not found" });

    const existingHost = await prisma.host.findFirst({
      where: {
        id: hostId,
        communityId: community.id,
      },
      select: { id: true, hostName: true },
    });

    if (!existingHost)
      return response
        .status(404)
        .json({ success: false, message: "Host not found" });

    const updatedHost = await prisma.host.update({
      where: { id: existingHost.id },
      data: {
        hostName:
          typeof hostName === "string" && hostName.trim()
            ? hostName.trim()
            : existingHost.hostName,
        sport: sportName ?? undefined,
        location: location ?? null,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        maxPlayers: maxPlayers ?? 0,
      },
      select: {
        id: true,
        hostName: true,
        sport: true,
        location: true,
        startTime: true,
        endTime: true,
        maxPlayers: true,
        status: true,
        _count: { select: { players: true } },
      },
    });

    return response.status(200).json({
      success: true,
      message: "Host updated successfully",
      data: updatedHost,
    });
  } catch (error) {
    console.error("Error updating host:", error);
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

    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { id: true },
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
        location: true,
        startTime: true,
        endTime: true,
        maxPlayers: true,
        status: true,
        players: {
          where: { playerId: user.sub },
          select: { hostStatus: true },
        },
        _count: { select: { players: true } },
      },
    });

    return response.status(200).json({
      success: true,
      message: "Hosts retrieved successfully",
      hosts: hosts.map(({ players, ...host }) => ({
        ...host,
        currentUserStatus: players[0]?.hostStatus ?? null,
      })),
    });
  } catch (error) {
    console.error("Error getting hosts:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const requestCommunityPlayerToJoinHost = async (
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

    const communityPlayer = await prisma.communityPlayer.findUnique({
      where: {
        communityId_accountId: {
          communityId,
          accountId: user.sub,
        },
      },
      select: { status: true },
    });

    if (communityPlayer?.status !== PlayerHostStatuses.accepted) {
      return response.status(403).json({
        success: false,
        message: "Only accepted community players can join this session",
      });
    }

    const host = await prisma.host.findFirst({
      where: { id: hostId, communityId },
      select: {
        id: true,
        status: true,
        maxPlayers: true,
      },
    });

    if (!host)
      return response
        .status(404)
        .json({ success: false, message: "Host not found" });

    if (host.status !== HostStatus.available) {
      return response.status(400).json({
        success: false,
        message: "This session is no longer accepting requests",
      });
    }

    const existingPlayer = await prisma.player.findUnique({
      where: {
        hostId_playerId: {
          hostId: host.id,
          playerId: user.sub,
        },
      },
      select: {
        id: true,
        hostStatus: true,
      },
    });

    if (existingPlayer) {
      return response.status(409).json({
        success: false,
        message: "You already requested or joined this session",
      });
    }

    if (host.maxPlayers > 0) {
      const acceptedPlayersCount = await prisma.player.count({
        where: {
          hostId: host.id,
          hostStatus: PlayerHostStatuses.accepted,
        },
      });

      if (acceptedPlayersCount >= host.maxPlayers) {
        return response.status(400).json({
          success: false,
          message: "This session is already full",
        });
      }
    }

    const player = await prisma.player.create({
      data: {
        hostId: host.id,
        playerId: user.sub,
        hostStatus: PlayerHostStatuses.requested,
      },
      select: {
        id: true,
        hostStatus: true,
      },
    });

    return response.status(201).json({
      success: true,
      message: "Session join request sent",
      player,
    });
  } catch (error) {
    console.error("Error requesting to join host:", error);
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
      where: communityMemberWhere(communityId, user.sub),
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
          location: true,
          startTime: true,
          endTime: true,
          maxPlayers: true,
          status: true,
          createdAt: true,
          community: {
            select: {
              profileUrl: true,
              communityName: true,
              master: {
                select: {
                  id: true,
                  username: true,
                  profileUrl: true,
                },
              },
              admins: {
                select: {
                  account: {
                    select: {
                      id: true,
                      username: true,
                      profileUrl: true,
                    },
                  },
                },
              },
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
          requestedAt: true,
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
          requestedAt: true,
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
          requestedAt: true,
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
          requestedAt: true,
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

export const endHostSession = async (
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
      where: communityMemberWhere(communityId, user.sub),
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

    const updatedHost = await prisma.host.update({
      where: { id: host.id },
      data: { status: HostStatus.unavailable },
      select: {
        id: true,
        status: true,
      },
    });

    return response.status(200).json({
      success: true,
      message: "Host session ended successfully",
      host: updatedHost,
    });
  } catch (error) {
    console.error("Error ending host session:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const startHostSession = async (
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
      where: communityMemberWhere(communityId, user.sub),
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

    const updatedHost = await prisma.host.update({
      where: { id: host.id },
      data: { status: HostStatus.available },
      select: {
        id: true,
        status: true,
      },
    });

    return response.status(200).json({
      success: true,
      message: "Host session ended successfully",
      host: updatedHost,
    });
  } catch (error) {
    console.error("Error ending host session:", error);
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
      where: communityMemberWhere(communityId, user.sub),
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
          location: true,
          startTime: true,
          endTime: true,
          maxPlayers: true,
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
          gamesPlayed: true,
          timerStartedAt: true,
          requestedAt: true,
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

    const acceptedPlayerIds = acceptedPlayers.map((player) => player.id);

    const matchHistoryByPlayer = new Map<
      string,
      {
        matchCount: number;
        winCount: number;
        lossCount: number;
        lastMatch: {
          team: string | null;
          result: string | null;
          startedAt: Date | null;
          endedAt: Date | null;
          teamWinner: string;
          courtName: string | null;
        } | null;
      }
    >();
    const relationshipHistoryByPlayer = new Map<
      string,
      Map<string, { teammateCount: number; opponentCount: number }>
    >();

    if (acceptedPlayerIds.length > 0) {
      const matchParticipants = await prisma.matchParticipant.findMany({
        where: {
          playerId: { in: acceptedPlayerIds },
          match: {
            hostId: host.id,
            status: MatchStatus.finished,
          },
        },
        orderBy: { joinedAt: "desc" },
        select: {
          matchId: true,
          playerId: true,
          team: true,
          result: true,
          joinedAt: true,
          match: {
            select: {
              startedAt: true,
              endedAt: true,
              teamWinner: true,
              court: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      const matchParticipantsByMatch = new Map<
        string,
        Array<{ playerId: string; team: string | null }>
      >();

      for (const participant of matchParticipants) {
        const matchParticipantsForMatch =
          matchParticipantsByMatch.get(participant.matchId) ?? [];
        matchParticipantsForMatch.push({
          playerId: participant.playerId,
          team: participant.team,
        });
        matchParticipantsByMatch.set(
          participant.matchId,
          matchParticipantsForMatch,
        );

        const existing = matchHistoryByPlayer.get(participant.playerId);
        const matchScore = {
          matchCount: 1,
          winCount: participant.result === "win" ? 1 : 0,
          lossCount: participant.result === "loss" ? 1 : 0,
          lastMatch: {
            team: participant.team,
            result: participant.result,
            startedAt: participant.match.startedAt,
            endedAt: participant.match.endedAt,
            teamWinner: participant.match.teamWinner,
            courtName: participant.match.court?.name ?? null,
          },
        };

        if (!existing) {
          matchHistoryByPlayer.set(participant.playerId, matchScore);
          continue;
        }

        existing.matchCount += 1;
        existing.winCount += matchScore.winCount;
        existing.lossCount += matchScore.lossCount;
      }

      const ensureRelationship = (playerId: string, relatedPlayerId: string) => {
        const relationships =
          relationshipHistoryByPlayer.get(playerId) ?? new Map();
        const relationship = relationships.get(relatedPlayerId) ?? {
          teammateCount: 0,
          opponentCount: 0,
        };

        relationships.set(relatedPlayerId, relationship);
        relationshipHistoryByPlayer.set(playerId, relationships);

        return relationship;
      };

      for (const participants of matchParticipantsByMatch.values()) {
        for (let leftIndex = 0; leftIndex < participants.length; leftIndex += 1) {
          for (
            let rightIndex = leftIndex + 1;
            rightIndex < participants.length;
            rightIndex += 1
          ) {
            const left = participants[leftIndex];
            const right = participants[rightIndex];
            if (!left || !right) continue;

            const countKey =
              left.team && left.team === right.team
                ? "teammateCount"
                : "opponentCount";

            ensureRelationship(left.playerId, right.playerId)[countKey] += 1;
            ensureRelationship(right.playerId, left.playerId)[countKey] += 1;
          }
        }
      }
    }

    return response.status(200).json({
      success: true,
      message: "Host retrieved successfully",
      ...host,
      acceptedPlayers: acceptedPlayers.map((acceptedPlayer) => ({
        id: acceptedPlayer.id,
        status: acceptedPlayer.hostStatus,
        hostStatus: acceptedPlayer.hostStatus,
        paymentStatus: acceptedPlayer.paymentStatus,
        gamesPlayed: acceptedPlayer.gamesPlayed,
        timerStartedAt: acceptedPlayer.timerStartedAt,
        player: buildPlayerProfile(acceptedPlayer.player, host.sport),
        queueEntry: acceptedPlayer.queueAssignment,
        courtAssignment: acceptedPlayer.courtAssignment
          ? {
              id: acceptedPlayer.courtAssignment.id,
              courtId: acceptedPlayer.courtAssignment.courtId,
              position: acceptedPlayer.courtAssignment.position,
            }
          : null,
        matchStatus: getMatchPlayerStatus(acceptedPlayer),
        matchHistory: matchHistoryByPlayer.get(acceptedPlayer.id) ?? {
          matchCount: 0,
          winCount: 0,
          lossCount: 0,
          lastMatch: null,
        },
        matchRelationships: Array.from(
          relationshipHistoryByPlayer.get(acceptedPlayer.id)?.entries() ?? [],
        ).map(([playerId, relationship]) => ({
          playerId,
          teammateCount: relationship.teammateCount,
          opponentCount: relationship.opponentCount,
        })),
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

type GetPlayerMatchHistoryParams = {
  communityId: string;
  hostId: string;
  playerId: string;
};

export const getPlayerMatchHistory = async (
  request: Request<GetPlayerMatchHistoryParams>,
  response: Response,
) => {
  try {
    const { communityId, hostId, playerId } = request.params;
    const user = request.user;

    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    if (!communityId || !hostId || !playerId)
      return response
        .status(400)
        .json({ success: false, message: "Missing required params" });

    const community = await prisma.community.findFirst({
      where: communityMemberWhere(communityId, user.sub),
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
      where: { id: playerId, hostId: host.id },
      select: { id: true },
    });

    if (!player)
      return response
        .status(404)
        .json({ success: false, message: "Player not found" });

    const historyRecords = await prisma.matchParticipant.findMany({
      where: {
        playerId: player.id,
        match: {
          hostId: host.id,
          status: MatchStatus.finished,
        },
      },
      orderBy: { joinedAt: "desc" },
      select: {
        id: true,
        team: true,
        result: true,
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
            participants: {
              orderBy: [{ team: "asc" }, { joinedAt: "asc" }],
              select: {
                id: true,
                playerId: true,
                team: true,
                result: true,
                joinedAt: true,
                player: {
                  select: {
                    player: {
                      select: {
                        username: true,
                        profileUrl: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const history = historyRecords.map((entry) => ({
      ...entry,
      match: {
        ...entry.match,
        participants: entry.match.participants.map((participant) => ({
          id: participant.id,
          playerId: participant.playerId,
          team: participant.team,
          result: participant.result,
          joinedAt: participant.joinedAt,
          player: participant.player.player
            ? {
                username: participant.player.player.username,
                profileUrl: participant.player.player.profileUrl,
              }
            : null,
        })),
      },
    }));

    return response.status(200).json({
      success: true,
      message: "Player history retrieved successfully",
      history,
    });
  } catch (error) {
    console.error("Error getting player match history:", error);
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
      where: communityMemberWhere(communityId, user.sub),
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

type HostAdminPlayerBody = {
  accountId?: string;
};

const selectAcceptedPlayerForResponse = {
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
        select: {
          sport: true,
          skillLevel: true,
        },
      },
    },
  },
} as const;

type AcceptedPlayerForResponse = {
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
};

const mapAcceptedPlayerForResponse = (
  acceptedPlayer: AcceptedPlayerForResponse,
  sport: string,
) => ({
  id: acceptedPlayer.id,
  status: acceptedPlayer.hostStatus,
  hostStatus: acceptedPlayer.hostStatus,
  paymentStatus: acceptedPlayer.paymentStatus,
  gamesPlayed: acceptedPlayer.gamesPlayed,
  timerStartedAt: acceptedPlayer.timerStartedAt,
  player: buildPlayerProfile(acceptedPlayer.player, sport),
  queueEntry: acceptedPlayer.queueAssignment,
  courtAssignment: acceptedPlayer.courtAssignment
    ? {
        id: acceptedPlayer.courtAssignment.id,
        courtId: acceptedPlayer.courtAssignment.courtId,
        position: acceptedPlayer.courtAssignment.position,
      }
    : null,
  matchStatus: getMatchPlayerStatus(acceptedPlayer),
});

export const includeHostAsPlayer = async (
  request: Request<Params, unknown, HostAdminPlayerBody>,
  response: Response,
) => {
  try {
    const { communityId, hostId } = request.params;
    const user = request.user;
    const targetAccountId = request.body.accountId?.trim() || user?.sub;

    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    if (!communityId || !hostId)
      return response
        .status(400)
        .json({ success: false, message: "Missing required params" });

    const host = await prisma.host.findFirst({
      where: {
        id: hostId,
        community: communityMemberWhere(communityId, user.sub),
      },
      select: {
        id: true,
        sport: true,
        community: {
          select: {
            masterId: true,
            admins: {
              select: {
                accountId: true,
              },
            },
          },
        },
      },
    });

    if (!host)
      return response
        .status(404)
        .json({ success: false, message: "Host not found" });

    if (!targetAccountId)
      return response
        .status(400)
        .json({ success: false, message: "Missing required params" });

    const isCommunityOwner = host.community.masterId === user.sub;
    const isTargetCurrentUser = targetAccountId === user.sub;
    const isTargetCommunityOwner = targetAccountId === host.community.masterId;

    if (!isCommunityOwner && !isTargetCurrentUser && !isTargetCommunityOwner)
      return response.status(403).json({
        success: false,
        message: "Only the community owner can update other admins",
      });

    const isTargetCommunityAdmin =
      targetAccountId === host.community.masterId ||
      host.community.admins.some((admin) => admin.accountId === targetAccountId);

    if (!isTargetCommunityAdmin)
      return response.status(400).json({
        success: false,
        message: "Only community admins can be added as host players",
      });

    await prisma.player.upsert({
      where: {
        hostId_playerId: {
          hostId: host.id,
          playerId: targetAccountId,
        },
      },
      update: {
        hostStatus: PlayerHostStatuses.accepted,
        timerStartedAt: new Date(),
      },
      create: {
        hostId: host.id,
        playerId: targetAccountId,
        hostStatus: PlayerHostStatuses.accepted,
        timerStartedAt: new Date(),
      },
    });

    const hostedPlayer = await prisma.player.findFirst({
      where: {
        hostId: host.id,
        playerId: targetAccountId,
        hostStatus: PlayerHostStatuses.accepted,
      },
      select: selectAcceptedPlayerForResponse,
    });

    if (!hostedPlayer)
      return response
        .status(404)
        .json({ success: false, message: "Hosted player not found" });

    const matchParticipants = await prisma.matchParticipant.findMany({
      where: {
        playerId: hostedPlayer.id,
        match: {
          hostId: host.id,
          status: MatchStatus.finished,
        },
      },
      orderBy: { joinedAt: "desc" },
      select: {
        team: true,
        result: true,
        match: {
          select: {
            startedAt: true,
            endedAt: true,
            teamWinner: true,
            court: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
    const matchHistory = matchParticipants.reduce(
      (summary, participant, index) => ({
        matchCount: summary.matchCount + 1,
        winCount:
          summary.winCount + (participant.result === "win" ? 1 : 0),
        lossCount:
          summary.lossCount + (participant.result === "loss" ? 1 : 0),
        lastMatch:
          index === 0
            ? {
                team: participant.team,
                result: participant.result,
                startedAt: participant.match.startedAt,
                endedAt: participant.match.endedAt,
                teamWinner: participant.match.teamWinner,
                courtName: participant.match.court?.name ?? null,
              }
            : summary.lastMatch,
      }),
      {
        matchCount: 0,
        winCount: 0,
        lossCount: 0,
        lastMatch: null as {
          team: string | null;
          result: string | null;
          startedAt: Date | null;
          endedAt: Date | null;
          teamWinner: string;
          courtName: string | null;
        } | null,
      },
    );

    return response.status(200).json({
      success: true,
      message: "Host added as player",
      hostedPlayer: {
        ...mapAcceptedPlayerForResponse(hostedPlayer, host.sport),
        matchHistory,
      },
    });
  } catch (error) {
    console.error("Error adding host as player:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const removeHostAsPlayer = async (
  request: Request<Params, unknown, HostAdminPlayerBody>,
  response: Response,
) => {
  try {
    const { communityId, hostId } = request.params;
    const user = request.user;
    const targetAccountId = request.body.accountId?.trim() || user?.sub;

    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    if (!communityId || !hostId)
      return response
        .status(400)
        .json({ success: false, message: "Missing required params" });

    const host = await prisma.host.findFirst({
      where: {
        id: hostId,
        community: communityMemberWhere(communityId, user.sub),
      },
      select: {
        id: true,
        community: {
          select: {
            masterId: true,
            admins: {
              select: {
                accountId: true,
              },
            },
          },
        },
      },
    });

    if (!host)
      return response
        .status(404)
        .json({ success: false, message: "Host not found" });

    if (!targetAccountId)
      return response
        .status(400)
        .json({ success: false, message: "Missing required params" });

    const isCommunityOwner = host.community.masterId === user.sub;
    const isTargetCurrentUser = targetAccountId === user.sub;
    const isTargetCommunityOwner = targetAccountId === host.community.masterId;

    if (!isCommunityOwner && !isTargetCurrentUser && !isTargetCommunityOwner)
      return response.status(403).json({
        success: false,
        message: "Only the community owner can update other admins",
      });

    const isTargetCommunityAdmin =
      targetAccountId === host.community.masterId ||
      host.community.admins.some((admin) => admin.accountId === targetAccountId);

    if (!isTargetCommunityAdmin)
      return response.status(400).json({
        success: false,
        message: "Only community admins can be removed as host players",
      });

    const hostedPlayer = await prisma.player.findFirst({
      where: {
        hostId: host.id,
        playerId: targetAccountId,
        hostStatus: PlayerHostStatuses.accepted,
      },
      select: {
        id: true,
        courtAssignment: {
          select: {
            court: {
              select: {
                startedAt: true,
                endedAt: true,
              },
            },
          },
        },
      },
    });

    if (!hostedPlayer)
      return response.status(200).json({
        success: true,
        message: "Host is already hidden from players",
      });

    if (
      hostedPlayer.courtAssignment?.court.startedAt &&
      !hostedPlayer.courtAssignment.court.endedAt
    )
      return response.status(400).json({
        success: false,
        message: "Cannot hide the host while they are in an active game",
      });

    await prisma.$transaction([
      prisma.player.update({
        where: { id: hostedPlayer.id },
        data: {
          hostStatus: PlayerHostStatuses.rejected,
          timerStartedAt: null,
        },
      }),
      prisma.courtAssignment.deleteMany({
        where: { playerId: hostedPlayer.id },
      }),
      prisma.queueAssignment.deleteMany({
        where: { playerId: hostedPlayer.id },
      }),
    ]);

    return response.status(200).json({
      success: true,
      message: "Host hidden from players",
      hostedPlayerId: hostedPlayer.id,
    });
  } catch (error) {
    console.error("Error hiding host as player:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
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
      where: communityMemberWhere(communityId, user.sub),
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
        queueAssignment: null,
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
