import type { Request, Response } from "express";
import type { Params } from "./community.controller.js";
import prisma from "../lib/prisma.js";
import { HostedPlayerStatus } from "../generated/prisma/enums.js";

// HOST ADMIN ACTION

type HostedPlayerParams = {
  communityId: string;
  hostId: string;
  playerId: string; // requests
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
          playerId: existing.playerId,
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
    const existing = await prisma.hostedPlayer.findFirst({
      where: {
        hostId: host.id,
        playerId: playerId,
        status: HostedPlayerStatus.requested,
      },
    });

    if (!existing) {
      return response.status(404).json({
        success: false,
        message: "Player not found",
      });
    }

    await prisma.hostedPlayer.update({
      where: { id: existing.id },
      data: { status: HostedPlayerStatus.rejected },
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
        .json({ success: false, message: "Community not found" });

    const existing = await prisma.hostedPlayer.findFirst({
      where: {
        hostId: host.id,
        playerId: playerId,
        status: HostedPlayerStatus.accepted,
      },
      select: { id: true, playerId: true },
    });
    if (!existing)
      return response
        .status(404)
        .json({ success: false, message: "Player not found" });

    await prisma.$transaction([
      prisma.hostedPlayer.update({
        where: { id: existing.id, playerId: existing.playerId },
        data: { status: HostedPlayerStatus.banned },
      }),

      prisma.courtAssignment.deleteMany({
        where: { hostedPlayerId: existing.id },
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
      where: {
        id: hostedPlayerId,
        hostId: host.id,
        status: HostedPlayerStatus.accepted,
      },
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

type RemovePlayerFromCourtParams = {
  communityId: string;
  hostId: string;
  playerId: string;
};

export const removePlayerFromCourt = async (
  request: Request<RemovePlayerFromCourtParams>,
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
        .json({ success: false, message: "Community not found" });

    const existing = await prisma.hostedPlayer.findFirst({
      where: {
        hostId: host.id,
        playerId: playerId,
        status: HostedPlayerStatus.accepted,
      },
      select: { id: true, playerId: true },
    });

    if (!existing)
      return response
        .status(404)
        .json({ success: false, message: "Player not found" });

    await prisma.courtAssignment.deleteMany({
      where: { hostedPlayerId: existing.id },
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
