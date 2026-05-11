import crypto from "node:crypto";
import prisma from "../lib/prisma.js";
import type { Request, Response } from "express";
import { uploadImageToCloudinary } from "../lib/cloudinary.js";

export type Params = {
  communityId: string;
  hostId?: string;
  playerId?: string;
};

const IMAGE_DATA_URI_PATTERN =
  /^data:image\/(?:png|jpe?g|webp|gif|avif);base64,/i;

const resolveCommunityProfileUrl = async ({
  profileUrl,
  communityId,
}: {
  profileUrl?: string;
  communityId: string;
}) => {
  const cleanedProfileUrl = profileUrl?.trim() ?? "";

  if (!cleanedProfileUrl) {
    return cleanedProfileUrl;
  }

  if (!IMAGE_DATA_URI_PATTERN.test(cleanedProfileUrl)) {
    return cleanedProfileUrl;
  }

  return uploadImageToCloudinary({
    dataUri: cleanedProfileUrl,
    publicId: `queue-system/community-images/${communityId}`,
  });
};

export const createCommunity = async (request: Request, response: Response) => {
  try {
    const { profileUrl, communityName, description } = request.body;
    const cleanCommunityName = communityName.trim();

    const user = request.user;
    if (!user) {
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });
    }

    if (!cleanCommunityName) {
      return response
        .status(400)
        .json({ success: false, message: "Community name is required" });
    }

    const communityId = crypto.randomUUID();
    const resolvedProfileUrl = await resolveCommunityProfileUrl({
      profileUrl,
      communityId,
    });

    const newCommunity = await prisma.community.create({
      data: {
        id: communityId,
        profileUrl: resolvedProfileUrl || undefined,
        communityName: cleanCommunityName,
        description,
        masterId: user.sub,
      },
    });

    return response
      .status(201)
      .json({ success: true, community: newCommunity });
  } catch (error) {
    console.error("Error creating community:", error);
    return response.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
    });
  }
};

export const getCommunities = async (request: Request, response: Response) => {
  try {
    const user = request.user;
    if (!user) {
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });
    }

    const communities = await prisma.community.findMany({
      where: { masterId: user.sub },
      select: {
        id: true,
        profileUrl: true,
        communityName: true,
        description: true,
      },
    });
    return response.json({ success: true, communities });
  } catch (error) {
    console.error("Error getting community:", error);
    return response.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
    });
  }
};

type GetCommunityByIdParams = {
  communityId: string;
};
export const getCommunityById = async (
  request: Request<GetCommunityByIdParams>,
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
        .status(400)
        .json({ success: false, message: "Missing required params" });

    const community = await prisma.community.findFirst({
      where: { id: communityId, masterId: user.sub },
      select: {
        id: true,
        profileUrl: true,
        communityName: true,
        description: true,
        master: {
          select: {
            id: true,
            profileUrl: true,
            username: true,
          },
        },
      },
    });

    if (!community)
      return response
        .status(404)
        .json({ success: false, message: "Community not found" });

    return response.status(200).json({
      success: true,
      message: "Community fetched successfully",
      community,
    });
  } catch (error) {
    console.error("Error getting community by id:", error);
    return response.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
    });
  }
};

export const updateCommunity = async (
  request: Request<Params>,
  response: Response,
) => {
  try {
    const { communityId } = request.params;
    const { profileUrl, communityName, description } = request.body;

    const user = request.user;
    if (!user) {
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });
    }

    const cleanCommunityName = communityName.trim();
    if (!cleanCommunityName) {
      return response
        .status(400)
        .json({ success: false, message: "Community name is required" });
    }

    const community = await prisma.community.findFirst({
      where: { id: communityId, masterId: user.sub },
      select: { id: true },
    });

    if (!community) {
      return response
        .status(404)
        .json({ success: false, message: "Community not found" });
    }

    const resolvedProfileUrl = await resolveCommunityProfileUrl({
      profileUrl,
      communityId: community.id,
    });

    const updatedCommunity = await prisma.community.update({
      where: { id: community.id },
      data: {
        profileUrl: resolvedProfileUrl,
        communityName: cleanCommunityName,
        description,
      },
    });

    return response.json({
      success: true,
      message: "Community updated",
      updatedCommunity,
    });
  } catch (error) {
    console.error("Error setting community:", error);
    return response.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
    });
  }
};

export const deleteCommunity = async (
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
      where: { id: communityId, masterId: user.sub },
    });

    if (!community)
      return response
        .status(404)
        .json({ success: false, message: "Community not found" });

    await prisma.community.delete({
      where: { id: community.id },
    });

    return response
      .status(200)
      .json({ success: true, message: "Community deleted" });
  } catch (error) {
    console.error("Error deleting community:", error);
    return response.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
    });
  }
};
