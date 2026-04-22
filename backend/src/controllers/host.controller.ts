import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { HostStatus } from "../generated/prisma/enums.js";
import type { Params } from "./community.controller.js";

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
        sportName: cleanSportName,
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

export const getHosts = async (
  request: Request<Params>,
  response: Response,
) => {
  try {
    const { communityId } = request.params;
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

    const hosts = await prisma.host.findMany({
      where: { communityId: community.id },
    });

    return response.status(200).json({
      success: true,
      message: "Hosts retrieved successfully",
      data: hosts,
    });
  } catch (error) {
    console.error("Error getting hosts:", error);
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
        status: true,
        hostName: true,
        sportName: true,
        community: {
          select: {
            profileUrl: true,
            communityName: true,
            adminId: true,
            admin: {
              select: {
                profileUrl: true,
                username: true,
              },
            },
          },
        },
      },
    });
    return response.status(200).json({ success: false, hosts });
  } catch (error) {
    console.error("Error getting available hosts:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};
