import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import type { Params } from "./community.controller.js";

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
            hostedPlayerId: true,
            position: true,
            assignedAt: true,
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

    const court = await prisma.court.findFirst({
      where: { id: courtId, hostId: host.id },
      select: {
        id: true,
        startedAt: true,
        assignments: {
          select: {
            position: true,
            hostedPlayerId: true,
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
    const hostedPlayerIds = court.assignments.map(
      (assignment) => assignment.hostedPlayerId,
    );

    const [, startedCourt] = await prisma.$transaction([
      prisma.hostedPlayer.updateMany({
        where: { id: { in: hostedPlayerIds } },
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

export const endMatchCourt = async (
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

    const court = await prisma.court.findFirst({
      where: { id: courtId, hostId: host.id },
      select: {
        id: true,
        startedAt: true,
        assignments: {
          select: {
            id: true,
            hostedPlayerId: true,
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
    const hostedPlayerIds = court.assignments.map(
      (assignment) => assignment.hostedPlayerId,
    );
    const assignmentIds = court.assignments.map((assignment) => assignment.id);

    const [, endedCourt] = await prisma.$transaction([
      prisma.hostedPlayer.updateMany({
        where: { id: { in: hostedPlayerIds } },
        data: { timerStartedAt: now },
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
      prisma.courtAssignment.deleteMany({
        where: { id: { in: assignmentIds } },
      }),
    ]);

    return response.status(200).json({
      success: true,
      message: "Game ended",
      court: endedCourt,
      hostedPlayerIds,
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

    const court = await prisma.court.create({
      data: {
        hostId: host.id,
        name: `Court ${(await prisma.court.count()) + 1}`,
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

    const court = await prisma.court.findFirst({
      where: { id: courtId, hostId: host.id },
      select: {
        id: true,
        startedAt: true,
        assignments: {
          select: {
            hostedPlayerId: true,
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

    return response
      .status(200)
      .json({
        success: true,
        message: "Court deleted successfully",
        hostedPlayerIds: court.assignments.map(
          (assignment) => assignment.hostedPlayerId,
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

    const queue = await prisma.queue.create({
      data: {
        hostId: host.id,
        name: `Queue ${(await prisma.queue.count()) + 1}`,
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
