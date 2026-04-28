import type { Request, Response } from "express";
import type { Params } from "./community.controller.js";
import prisma from "../lib/prisma.js";
import { HostedPlayerStatus } from "../generated/prisma/enums.js";

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
    const existing = await prisma.hostedPlayer.findUnique({
      where: {
        hostId_playerId: {
          hostId: host.id,
          playerId: playerId,
        },
      },
    });

    if (!existing) {
      return response.status(404).json({
        success: false,
        message: "Player not found",
      });
    }

    await prisma.hostedPlayer.update({
      where: {
        hostId_playerId: {
          hostId: host.id,
          playerId: playerId,
        },
      },
      data: {
        status: HostedPlayerStatus.accepted,
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
    const existing = await prisma.hostedPlayer.findUnique({
      where: {
        hostId_playerId: {
          hostId: host.id,
          playerId: playerId,
        },
      },
    });

    if (!existing) {
      return response.status(404).json({
        success: false,
        message: "Player not found",
      });
    }

    await prisma.hostedPlayer.update({
      where: {
        hostId_playerId: {
          hostId: host.id,
          playerId: playerId,
        },
      },
      data: {
        status: HostedPlayerStatus.rejected,
      },
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

type AssignPlayerParams = {
  communityId: string;
  hostId: string;
  courtId: string;
  hostedPlayerId: string;
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

    const { communityId, hostId, courtId, hostedPlayerId } = request.params;

    if (!communityId || !hostId || !courtId || !hostedPlayerId) {
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

    const player = await prisma.hostedPlayer.findFirst({
      where: { id: hostedPlayerId, hostId: host.id, acceptedAt: { not: null } },
      select: { id: true },
    });

    if (!player)
      return response
        .status(404)
        .json({ success: false, message: "Player not found or not accepted" });

    const court = await prisma.court.findFirst({
      where: { id: courtId, hostId: host.id },
      select: { id: true },
    });

    if (!court)
      return response
        .status(404)
        .json({ success: false, message: "Court not found" });

    const existingAssignment = await prisma.courtAssignment.findFirst({
      where: { hostedPlayerId: player.id },
    });

    const occupied = await prisma.courtAssignment.findFirst({
      where: {
        courtId: court.id,
        position,
      },
    });

    if (occupied && occupied.hostedPlayerId !== player.id) {
      return response.status(400).json({
        success: false,
        message: "Position already occupied",
      });
    }

    if (existingAssignment) {
      await prisma.courtAssignment.update({
        where: { id: existingAssignment.id },
        data: {
          courtId: court.id,
          position,
        },
      });
    } else {
      await prisma.courtAssignment.create({
        data: {
          hostedPlayerId: player.id,
          courtId: court.id,
          position,
        },
      });
    }

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
