import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import type { Params } from "./community.controller.js";
import { HostedPlayerStatus } from "../generated/prisma/enums.js";

// PUBLIC ACTIONS
export const getAvailableHosts = async (
  request: Request,
  response: Response,
) => {
  try {
    const user = request.user;
    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    // get hosts
    const hosts = await prisma.host.findMany({
      select: {
        id: true,
        hostName: true,
        sport: true,
        status: true,
        community: {
          select: {
            id: true,
            profileUrl: true,
            communityName: true,
          },
        },
        players: {
          select: {
            id: true,
            status: HostedPlayerStatus.accepted === "accepted",
            player: {
              select: { id: true, profileUrl: true },
            },
          },
        },
      },
    });

    return response.status(200).json({ success: true, hosts });
  } catch (error) {
    console.error("Error getting available hosts:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const playerRequestToJoinHost = async (
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
        .json({ success: false, message: "Missing required params" });

    const community = await prisma.community.findFirst({
      where: { id: communityId },
    });

    if (!community)
      return response
        .status(404)
        .json({ success: false, message: "Community not found" });

    if (community.adminId === user.sub) {
      return response.status(403).json({
        success: false,
        message: "Admin cannot request to join their own host",
      });
    }

    const host = await prisma.host.findUnique({
      where: { id: hostId, communityId: community.id },
    });

    if (!host)
      return response
        .status(404)
        .json({ success: false, message: "Host not found" });

    // 🚨 CHECK IF ALREADY EXISTS
    const existing = await prisma.hostedPlayer.findFirst({
      where: {
        hostId: host.id,
        playerId: user.sub,
      },
      select: { id: true },
    });

    if (existing) {
      return response.status(400).json({
        success: false,
        message: "You already requested or joined this host",
      });
    }

    await prisma.hostedPlayer.create({
      data: {
        hostId: host.id,
        playerId: user.sub,
      },
    });

    return response
      .status(201)
      .json({ success: true, message: "Successfully requested to join" });
  } catch (error) {
    console.error("Error requesting to join hosts:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};
