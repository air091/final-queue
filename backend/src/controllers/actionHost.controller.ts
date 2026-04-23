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
      where: { status: HostStatus.available },
      select: {
        id: true,
        community: {
          select: {
            id: true,
            profileUrl: true,
            communityName: true,
            admin: {
              select: {
                id: true,
                profileUrl: true,
                username: true,
              },
            },
          },
        },
        hostName: true,
        sport: true,
        status: true,
        players: {
          select: {
            player: {
              select: {
                id: true,
                profileUrl: true,
                username: true,
              },
            },
            status: true,
            addedAt: true,
            requestedAt: true,
            acceptedAt: true,
          },
        },
      },
    });

    const formattedHosts = hosts.map((host) => {
      const requested = host.players.filter(
        (player) => player.requestedAt && !player.acceptedAt,
      );

      const accepted = host.players.filter((player) => player.acceptedAt);

      return {
        ...host,
        requestedPlayers: requested,
        acceptedPlayers: accepted,
        requestedCounts: requested.length,
        acceptedCounts: accepted.length,
        totalPlayers: host.players.length,
      };
    });

    const count = await prisma.hostedPlayer.count();
    return response
      .status(200)
      .json({ success: true, formattedHosts, playersCount: count });
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
