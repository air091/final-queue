import type { Request, Response } from "express";
import type { Params } from "./community.controller.js";
import prisma from "../lib/prisma.js";
import { HostStatus } from "../generated/prisma/enums.js";

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
        community: {
          select: {
            profileUrl: true,
            communityName: true,
          },
        },
        status: true,
        players: {
          select: {
            id: true,
            player: {
              select: {
                id: true,
                profileUrl: true,
                username: true,
              },
            },
            requestedAt: true,
            acceptedAt: true,
          },
        },
        createdAt: true,
      },
    });

    const formattedHostPlayer = hosts.map((host) => {
      const accepted = host.players.filter((player) => player.acceptedAt);
      return {
        id: host.id,
        hostName: host.hostName,
        sport: host.sport,
        status: host.status,
        community: host.community,
        createdAt: host.createdAt,

        acceptedPlayers: accepted,

        acceptedCount: accepted.length,
        totalPlayers: host.players.length,
      };
    });

    return response
      .status(200)
      .json({ success: true, hosts: formattedHostPlayer });
  } catch (error) {
    console.error("Error getting available hosts:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const playerRequestToJoinMatch = async (
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

    if (!communityId)
      return response
        .status(404)
        .json({ success: false, message: "Community not found" });

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

    if (!hostId)
      return response
        .status(404)
        .json({ success: false, message: "Host not found" });

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

export const acceptPlayer = async (
  request: Request<Params>,
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

    // community
    const community = await prisma.community.findFirst({
      where: { id: communityId, adminId: user.sub },
      select: { id: true },
    });

    if (!community)
      return response
        .status(404)
        .json({ success: false, message: "Community not found" });

    // host
    const host = await prisma.host.findFirst({
      where: { id: hostId, communityId: community.id },
      select: { id: true },
    });

    if (!host)
      return response
        .status(404)
        .json({ success: false, message: "Host not found" });

    // player
    const updatedPlayer = await prisma.hostedPlayer.updateMany({
      where: { hostId: host.id, playerId: playerId },
      data: { acceptedAt: new Date() },
    });

    if (updatedPlayer.count === 0) {
      return response.status(404).json({
        success: false,
        message: "Player not found or already accepted",
      });
    }

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

export const addPlayerToCourt = async (
  request: Request,
  response: Response,
) => {
  try {
  } catch (error) {
    console.error("Error adding player to court:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

type AssignParams = {
  hostedPlayerId: string;
};

type Body = {
  courtId: string;
  position: number;
};

export const assignPlayerPositionCourt = async (
  request: Request<AssignParams, {}, Body>,
  response: Response,
) => {
  try {
    const user = request.user;
    if (!user) {
      return response.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { hostedPlayerId } = request.params;
    const { courtId, position } = request.body;

    // -----------------------------------
    // 1. Validate input
    // -----------------------------------
    if (!courtId || position == null) {
      return response.status(400).json({
        success: false,
        message: "courtId and position are required",
      });
    }

    if (position < 1 || position > 4) {
      return response.status(400).json({
        success: false,
        message: "Position must be between 1 to 4",
      });
    }

    // -----------------------------------
    // 2. Validate player
    // -----------------------------------
    const hostedPlayer = await prisma.hostedPlayer.findUnique({
      where: { id: hostedPlayerId },
      select: { id: true, hostId: true },
    });

    if (!hostedPlayer) {
      return response.status(404).json({
        success: false,
        message: "Hosted player not found",
      });
    }

    // -----------------------------------
    // 3. Validate court
    // -----------------------------------
    const court = await prisma.court.findUnique({
      where: { id: courtId },
      select: { id: true, hostId: true },
    });

    if (!court) {
      return response.status(404).json({
        success: false,
        message: "Court not found",
      });
    }

    // -----------------------------------
    // 4. Ensure same host
    // -----------------------------------
    if (hostedPlayer.hostId !== court.hostId) {
      return response.status(400).json({
        success: false,
        message: "Player and court must belong to same host",
      });
    }

    // -----------------------------------
    // 5. Check position conflict
    // -----------------------------------
    const positionTaken = await prisma.courtAssignment.findFirst({
      where: {
        courtId,
        position,
        NOT: {
          hostedPlayerId,
        },
      },
    });

    if (positionTaken) {
      return response.status(400).json({
        success: false,
        message: "Position already taken",
      });
    }

    // -----------------------------------
    // 6. UPSERT (move or create)
    // -----------------------------------
    const assignment = await prisma.courtAssignment.upsert({
      where: {
        hostedPlayerId, // find existing assignment
      },
      update: {
        courtId,
        position,
        updatedAt: new Date(),
      },
      create: {
        hostedPlayerId,
        courtId,
        position,
      },
      select: {
        id: true,
        position: true,
        court: {
          select: {
            id: true,
            name: true,
          },
        },
        hostedPlayer: {
          select: {
            id: true,
            player: {
              select: {
                id: true,
                username: true,
                profileUrl: true,
              },
            },
          },
        },
      },
    });

    // -----------------------------------
    // 7. Response
    // -----------------------------------
    return response.status(200).json({
      success: true,
      message: "Player assigned successfully",
      data: assignment,
    });
  } catch (error) {
    console.error("Error assigning player to court:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};
