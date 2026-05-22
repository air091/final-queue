import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import type { Params } from "./community.controller.js";
import { MatchStatus } from "../generated/prisma/enums.js";

export const getMatchCourts = async (
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

    if (!communityId || !hostId)
      return response
        .status(400)
        .json({ success: false, message: "Missing params" });

    const community = await prisma.community.findFirst({
      where: { id: communityId },
    });

    if (!community)
      return response
        .status(404)
        .json({ success: false, message: "Community not found" });

    const host = await prisma.host.findFirst({
      where: { id: hostId, communityId: community.id },
    });

    if (!host)
      return response
        .status(404)
        .json({ success: false, message: "Host not found" });

    const courts = await prisma.court.findMany({
      where: { hostId: host.id },
      select: {
        id: true,
        name: true,
        startedAt: true,
        endedAt: true,
        assignments: {
          select: {
            id: true,
            playerId: true,
            position: true,
          },
        },
      },
    });
    return response
      .status(200)
      .json({ success: true, message: "Court fetched success", courts });
  } catch (error) {
    console.error("Error fetching match court host:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

type StartCourtParams = {
  communityId: string;
  hostId: string;
  courtId: string;
};

export const startMatchCourt = async (
  request: Request<StartCourtParams>,
  response: Response,
) => {
  try {
    const { communityId, hostId, courtId } = request.params;
    const user = request.user;
    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    if (!communityId || !hostId || !courtId)
      return response
        .status(400)
        .json({ success: false, message: "Missing params" });

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
      select: {
        id: true,
        startedAt: true,
        assignments: {
          select: {
            position: true,
            playerId: true,
          },
        },
      },
    });

    if (!court)
      return response
        .status(404)
        .json({ success: false, message: "Court not found" });

    if (court.startedAt)
      return response.status(400).json({
        success: false,
        message: "Game already started",
      });

    const hasTeamAPlayer = court.assignments.some(
      (assignment) => assignment.position === 1 || assignment.position === 3,
    );
    const hasTeamBPlayer = court.assignments.some(
      (assignment) => assignment.position === 2 || assignment.position === 4,
    );

    if (!hasTeamAPlayer || !hasTeamBPlayer)
      return response.status(400).json({
        success: false,
        message: "Court needs at least one player on Team A and Team B",
      });

    const now = new Date();
    const playerIds = court.assignments.map(
      (assignment) => assignment.playerId,
    );

    const [, startedCourt] = await prisma.$transaction([
      prisma.player.updateMany({
        where: { id: { in: playerIds } },
        data: { timerStartedAt: now },
      }),
      prisma.court.update({
        where: { id: court.id },
        data: {
          startedAt: now,
          endedAt: null,
        },
        select: {
          id: true,
          startedAt: true,
          endedAt: true,
        },
      }),
    ]);

    return response.status(200).json({
      success: true,
      message: "Game started",
      court: startedCourt,
    });
  } catch (error) {
    console.error("Error starting match court host:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

type EndMatchCourtBody = {
  teamWinner?: string;
};

const getMatchTeam = (position: number) =>
  position === 1 || position === 3 ? "A" : "B";

const getMatchResult = (team: string, teamWinner: string) => {
  if (teamWinner === "A") return team === "A" ? "win" : "loss";
  if (teamWinner === "B") return team === "B" ? "win" : "loss";
  return "played";
};

export const endMatchCourt = async (
  request: Request<StartCourtParams, unknown, EndMatchCourtBody>,
  response: Response,
) => {
  try {
    const { communityId, hostId, courtId } = request.params;
    const { teamWinner } = request.body;
    const winner = teamWinner?.trim() || "unknown";
    const user = request.user;
    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    if (!communityId || !hostId || !courtId)
      return response
        .status(400)
        .json({ success: false, message: "Missing params" });

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
      select: {
        id: true,
        startedAt: true,
        assignments: {
          select: {
            id: true,
            playerId: true,
            position: true,
            hostedPlayer: {
              select: {
                playerId: true,
              },
            },
          },
        },
      },
    });

    if (!court)
      return response
        .status(404)
        .json({ success: false, message: "Court not found" });

    if (!court.startedAt)
      return response.status(400).json({
        success: false,
        message: "Game has not started",
      });

    const now = new Date();
    const playerIds = court.assignments.map(
      (assignment) => assignment.playerId,
    );
    const assignmentIds = court.assignments.map((assignment) => assignment.id);

    const matchParticipantsData = court.assignments.map((assignment) => {
      const team = getMatchTeam(assignment.position);
      return {
        playerId: assignment.playerId,
        accountId: assignment.hostedPlayer?.playerId ?? undefined,
        team,
        result: getMatchResult(team, winner),
      };
    });

    const [, endedCourt, match] = await prisma.$transaction([
      prisma.player.updateMany({
        where: { id: { in: playerIds } },
        data: {
          timerStartedAt: now,
          gamesPlayed: {
            increment: 1,
          },
        },
      }),
      prisma.court.update({
        where: { id: court.id },
        data: {
          startedAt: null,
          endedAt: now,
        },
        select: {
          id: true,
          startedAt: true,
          endedAt: true,
        },
      }),
      prisma.match.create({
        data: {
          hostId: host.id,
          courtId: court.id,
          status: MatchStatus.finished,
          startedAt: court.startedAt ?? now,
          endedAt: now,
          teamWinner: winner,
          participants: {
            create: matchParticipantsData,
          },
        },
        select: {
          id: true,
          teamWinner: true,
          startedAt: true,
          endedAt: true,
          court: {
            select: {
              id: true,
              name: true,
            },
          },
          participants: {
            select: {
              id: true,
              playerId: true,
              team: true,
              result: true,
              joinedAt: true,
            },
          },
        },
      }),
      prisma.courtAssignment.deleteMany({
        where: { id: { in: assignmentIds } },
      }),
    ]);

    return response.status(200).json({
      success: true,
      message: "Game ended",
      court: endedCourt,
      playerIds,
      hostedPlayerIds: playerIds,
      match,
    });
  } catch (error) {
    console.error("Error ending match court host:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const createMatchCourt = async (
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

    if (!communityId || !hostId)
      return response
        .status(404)
        .json({ success: false, message: "Missing params" });

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

    const court = await prisma.court.create({
      data: {
        hostId: host.id,
        name: `Court ${
          (await prisma.court.count({ where: { hostId: host.id } })) + 1
        }`,
      },
    });

    return response
      .status(201)
      .json({ success: true, message: "Court created", court });
  } catch (error) {
    console.error("Error creating match court host:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

type DeleteCourtParams = {
  communityId: string;
  hostId: string;
  courtId: string;
};

export const renameMatchCourt = async (
  request: Request<DeleteCourtParams>,
  response: Response,
) => {
  try {
    const { communityId, hostId, courtId } = request.params;
    const { name } = request.body;
    const cleanName = name?.trim();
    const user = request.user;
    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    if (!communityId || !hostId || !courtId)
      return response
        .status(400)
        .json({ success: false, message: "Missing params" });

    if (!cleanName)
      return response
        .status(400)
        .json({ success: false, message: "Court name is required" });

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
      select: { id: true },
    });

    if (!court)
      return response
        .status(404)
        .json({ success: false, message: "Court not found" });

    const updatedCourt = await prisma.court.update({
      where: { id: court.id },
      data: { name: cleanName },
      select: {
        id: true,
        name: true,
        startedAt: true,
        endedAt: true,
      },
    });

    return response.status(200).json({
      success: true,
      message: "Court renamed successfully",
      court: updatedCourt,
    });
  } catch (error) {
    console.error("Error renaming match court host:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const deleteMatchCourt = async (
  request: Request<DeleteCourtParams>,
  response: Response,
) => {
  try {
    const { communityId, hostId, courtId } = request.params;
    const user = request.user;
    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    if (!communityId || !hostId || !courtId)
      return response
        .status(400)
        .json({ success: false, message: "Missing params" });

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
      select: {
        id: true,
        startedAt: true,
        assignments: {
          select: {
            playerId: true,
          },
        },
      },
    });

    if (!court)
      return response
        .status(404)
        .json({ success: false, message: "No court found" });

    if (court.startedAt)
      return response.status(400).json({
        success: false,
        message: "Cannot delete a court while a game is in progress",
      });

    await prisma.court.delete({
      where: { id: court.id },
    });

    return response.status(200).json({
      success: true,
      message: "Court deleted successfully",
      hostedPlayerIds: court.assignments.map(
        (assignment) => assignment.playerId,
      ),
    });
  } catch (error) {
    console.error("Error delete match court host:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const getQueueCourts = async (
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

    if (!communityId || !hostId)
      return response
        .status(400)
        .json({ success: false, message: "Missing params" });

    const community = await prisma.community.findFirst({
      where: { id: communityId },
    });

    if (!community)
      return response
        .status(404)
        .json({ success: false, message: "Community not found" });

    const host = await prisma.host.findFirst({
      where: { id: hostId, communityId: community.id },
    });

    if (!host)
      return response
        .status(404)
        .json({ success: false, message: "Host not found" });

    const queues = await prisma.queue.findMany({
      where: { hostId: host.id },
      include: { entries: true },
    });
    return response
      .status(200)
      .json({ success: true, message: "Queue fetched success", queues });
  } catch (error) {
    console.error("Error fetching queue court host:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const createQueueCourt = async (
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

    if (!communityId || !hostId)
      return response
        .status(404)
        .json({ success: false, message: "Community not found" });

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

    const queue = await prisma.queue.create({
      data: {
        hostId: host.id,
        name: `Queue ${
          (await prisma.queue.count({ where: { hostId: host.id } })) + 1
        }`,
      },
    });

    return response
      .status(201)
      .json({ success: true, message: "Court created", queue });
  } catch (error) {
    console.error("Error creating match court host:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const deleteQueueCourt = async (
  request: Request<Params & { queueId: string }>,
  response: Response,
) => {
  try {
    const { communityId, hostId, queueId } = request.params;
    const user = request.user;
    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    if (!communityId || !hostId || !queueId)
      return response
        .status(400)
        .json({ success: false, message: "Missing params" });

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
      include: { entries: true },
    });

    if (!queue)
      return response
        .status(404)
        .json({ success: false, message: "Queue not found" });

    if (queue.entries.length > 0) {
      await prisma.queueAssignment.deleteMany({
        where: { queueId: queue.id },
      });
    }

    await prisma.queue.delete({
      where: { id: queue.id },
    });

    return response.status(200).json({
      success: true,
      message: "Queue deleted successfully",
      hostedPlayerIds: queue.entries.map((entry) => entry.playerId),
    });
  } catch (error) {
    console.error("Error deleting queue court host:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const renameQueueCourt = async (
  request: Request<Params & { queueId: string }>,
  response: Response,
) => {
  try {
    const { communityId, hostId, queueId } = request.params;
    const { name } = request.body;
    const user = request.user;

    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    if (!communityId || !hostId || !queueId)
      return response
        .status(400)
        .json({ success: false, message: "Missing params" });

    if (typeof name !== "string" || !name.trim())
      return response
        .status(400)
        .json({ success: false, message: "Invalid queue name" });

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
      select: { id: true, name: true },
    });

    if (!queue)
      return response
        .status(404)
        .json({ success: false, message: "Queue not found" });

    const updatedQueue = await prisma.queue.update({
      where: { id: queue.id },
      data: { name: name.trim() },
    });

    return response.status(200).json({
      success: true,
      message: "Queue renamed successfully",
      queue: {
        id: updatedQueue.id,
        name: updatedQueue.name,
      },
    });
  } catch (error) {
    console.error("Error renaming queue court host:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

type TransferQueueToCourtParams = Params & {
  queueId: string;
};

type TransferQueueToCourtBody = {
  courtId?: string;
};

export const transferQueueToCourtAndStart = async (
  request: Request<TransferQueueToCourtParams, unknown, TransferQueueToCourtBody>,
  response: Response,
) => {
  try {
    const { communityId, hostId, queueId } = request.params;
    const { courtId } = request.body;
    const user = request.user;

    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    if (!communityId || !hostId || !queueId || !courtId)
      return response
        .status(400)
        .json({ success: false, message: "Missing params" });

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

    const [queue, court] = await Promise.all([
      prisma.queue.findFirst({
        where: { id: queueId, hostId: host.id },
        include: {
          entries: {
            orderBy: { position: "asc" },
          },
        },
      }),
      prisma.court.findFirst({
        where: { id: courtId, hostId: host.id },
        include: { assignments: true },
      }),
    ]);

    if (!queue)
      return response
        .status(404)
        .json({ success: false, message: "Queue not found" });

    if (!court)
      return response
        .status(404)
        .json({ success: false, message: "Court not found" });

    if (court.startedAt)
      return response.status(400).json({
        success: false,
        message: "Cannot transfer to a game in progress",
      });

    if (court.assignments.length > 0)
      return response.status(400).json({
        success: false,
        message: "Target court must be empty",
      });

    if (queue.entries.length === 0)
      return response.status(400).json({
        success: false,
        message: "Queue is empty",
      });

    const hasTeamAPlayer = queue.entries.some(
      (entry) => entry.position === 1 || entry.position === 3,
    );
    const hasTeamBPlayer = queue.entries.some(
      (entry) => entry.position === 2 || entry.position === 4,
    );

    if (!hasTeamAPlayer || !hasTeamBPlayer)
      return response.status(400).json({
        success: false,
        message: "Queue needs at least one player on Team A and Team B",
      });

    const now = new Date();
    const playerIds = queue.entries.map((entry) => entry.playerId);
    const activeQueuedPlayer = await prisma.queueAssignment.findFirst({
      where: {
        queueId: queue.id,
        playerId: { in: playerIds },
        hostedPlayer: {
          courtAssignment: {
            court: {
              startedAt: { not: null },
            },
          },
        },
      },
      select: { playerId: true },
    });

    if (activeQueuedPlayer)
      return response.status(400).json({
        success: false,
        message: "End active games before transferring queued players",
      });

    const [, , , startedCourt] = await prisma.$transaction([
      prisma.courtAssignment.createMany({
        data: queue.entries.map((entry) => ({
          playerId: entry.playerId,
          courtId: court.id,
          position: entry.position,
        })),
      }),
      prisma.queueAssignment.deleteMany({
        where: { queueId: queue.id, playerId: { in: playerIds } },
      }),
      prisma.player.updateMany({
        where: { id: { in: playerIds }, hostId: host.id },
        data: { timerStartedAt: now },
      }),
      prisma.court.update({
        where: { id: court.id },
        data: {
          startedAt: now,
          endedAt: null,
        },
        select: {
          id: true,
          name: true,
          startedAt: true,
          endedAt: true,
          assignments: {
            select: {
              id: true,
              playerId: true,
              position: true,
            },
          },
        },
      }),
    ]);

    return response.status(200).json({
      success: true,
      message: "Queue transferred and game started",
      court: startedCourt,
      queueId: queue.id,
      hostedPlayerIds: playerIds,
    });
  } catch (error) {
    console.error("Error transferring queue to court:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};
