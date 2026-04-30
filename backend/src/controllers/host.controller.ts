import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import type { Params } from "./community.controller.js";
import { HostedPlayerStatus } from "../generated/prisma/enums.js";

export const host = async (request: Request<Params>, response: Response) => {
  try {
    const { communityId } = request.params;
    const { sportName } = request.body;
    const cleanSportName = sportName?.trim();

    const user = request.user;
    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    if (!cleanSportName)
      return response
        .status(400)
        .json({ success: false, message: "Sport name is required" });

    const community = await prisma.community.findFirst({
      where: { id: communityId, adminId: user.id },
    });

    if (!community)
      return response
        .status(404)
        .json({ success: false, message: "Community not found" });

    const count = await prisma.host.count({
      where: { communityId: community.id },
    });

    const newHost = await prisma.host.create({
      data: {
        hostName: `Host ${count + 1}`,
        communityId: community.id,
        sport: cleanSportName,
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

    const community = await prisma.community.findFirst({
      where: { id: communityId, adminId: user.sub },
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
        status: true,
      },
    });

    return response.status(200).json({
      success: true,
      message: "Hosts retrieved successfully",
      hosts,
    });
  } catch (error) {
    console.error("Error getting hosts:", error);
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
      where: { id: communityId, adminId: user.sub },
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

      // requests
      prisma.hostedPlayer.findMany({
        where: {
          hostId,
          status: HostedPlayerStatus.requested,
        },
        select: {
          id: true,
          status: true,
          player: {
            select: {
              id: true,
              username: true,
              profileUrl: true,
            },
          },
        },
      }),

      // accepts
      prisma.hostedPlayer.findMany({
        where: {
          hostId,
          status: HostedPlayerStatus.accepted,
        },
        select: {
          id: true,
          status: true,
          player: {
            select: {
              id: true,
              username: true,
              profileUrl: true,
            },
          },
        },
      }),

      // rejects
      prisma.hostedPlayer.findMany({
        where: {
          hostId,
          status: HostedPlayerStatus.rejected,
        },
        select: {
          id: true,
          status: true,
          player: {
            select: {
              id: true,
              username: true,
              profileUrl: true,
            },
          },
        },
      }),

      // ban
      prisma.hostedPlayer.findMany({
        where: {
          hostId,
          status: HostedPlayerStatus.banned,
        },
        select: {
          id: true,
          status: true,
          player: {
            select: {
              id: true,
              username: true,
              profileUrl: true,
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
      requestedPlayers,
      acceptedPlayers,
      rejectedPlayers,
      bannedPlayers,
    });
  } catch (error) {
    console.error("Error getting host:", error);
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

    if (!communityId && !hostId)
      return response
        .status(400)
        .json({ success: false, message: "Missing required params" });

    const community = await prisma.community.findFirst({
      where: { id: communityId, adminId: user.sub },
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

      prisma.hostedPlayer.findMany({
        where: {
          hostId,
          status: "accepted",
        },
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
      acceptedPlayers,
    });
  } catch (error) {
    console.error("Error getting host with players:", error);
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
      where: { id: communityId, adminId: user.id },
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

// FOR PLAYERS
