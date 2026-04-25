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

type StartGameType = {
  hostId: string;
};

export const startCourtGame = async (
  request: Request<StartGameType>,
  response: Response,
) => {
  try {
    const { hostId } = request.params;
    if (!hostId)
      return response
        .status(400)
        .json({ success: false, message: "Missing params" });

    const courts = await prisma.court.findMany({
      where: { hostId },
      select: {
        id: true,
        assignments: {
          select: {
            hostedPlayerId: true,
            position: true,
          },
        },
      },
    });

    if (courts.length < 2) {
      return response.status(404).json({
        success: false,
        message: "Not enough courts",
      });
    }

    const [left, right] = courts;

    const leftValid =
      left?.assignments.some((assignment) => assignment.position === 1) &&
      left.assignments.some((assignment) => assignment.position === 2);

    const rightValid =
      right?.assignments.some((assignment) => assignment.position === 3) &&
      right.assignments.some((assignment) => assignment.position === 4);

    if (!leftValid || !rightValid)
      return response.status(400).json({
        success: false,
        message: "Both courts must have at least 2 players assigned",
      });

    await prisma.court.updateMany({
      where: { id: { in: [left?.id, right?.id] } },
      data: { startedAt: new Date() },
    });

    return response.status(200).json({
      success: true,
      message: "Game started successfully",
    });
  } catch (error) {
    console.error("Error start match court host:", error);
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
