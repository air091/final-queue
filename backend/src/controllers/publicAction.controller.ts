import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import type { Params } from "./community.controller.js";
import { HostStatus, PlayerHostStatuses } from "../generated/prisma/enums.js";

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

    // Return the current user's membership state per host so the frontend
    // can render Request / Requested / Joined correctly.
    // const hosts = await prisma.host.findMany({
    //   where: { status: HostStatus.available },
    //   select: {
    //     id: true,
    //     hostName: true,
    //     sport: true,
    //     status: true,
    //     community: {
    //       select: {
    //         id: true,
    //         profileUrl: true,
    //         communityName: true,
    //         master: {
    //           select: {
    //             id: true,
    //             profileUrl: true,
    //             username: true,
    //           },
    //         },
    //       },
    //     },
    //     players: {
    //       where: {
    //         playerId: user.sub,
    //       },
    //       select: {
    //         id: true,
    //         hostStatus: true,
    //       },
    //     },
    //   },
    // });

    const [hosts, acceptedPlayers] = await Promise.all([
      prisma.host.findMany({
        where: {
          status: HostStatus.available,
        },
        select: {
          id: true,
          hostName: true,
          sport: true,
          location: true,
          startTime: true,
          endTime: true,
          maxPlayers: true,
          status: true,
          community: {
            select: {
              id: true,
              profileUrl: true,
              communityName: true,
              master: {
                select: {
                  id: true,
                  profileUrl: true,
                  username: true,
                },
              },
            },
          },
          players: {
            where: {
              playerId: user.sub,
            },
            select: {
              id: true,
              hostStatus: true,
            },
          },
        },
      }),

      prisma.player.findMany({
        where: {
          hostStatus: PlayerHostStatuses.accepted,
        },
        select: {
          id: true,
          hostId: true,
          hostStatus: true,
          paymentStatus: true,
          player: {
            select: {
              id: true,
              username: true,
              profileUrl: true,
              role: true,
              sports: {
                select: {
                  sport: true,
                  skillLevel: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return response.status(200).json({
      success: true,

      hosts: hosts.map(({ players, ...host }) => ({
        ...host,
        currentUserStatus: players[0]?.hostStatus ?? null,
        isOwnedByCurrentUser: host.community.master.id === user.sub,

        acceptedPlayers: acceptedPlayers.filter(
          (player) => player.hostId === host.id,
        ),
      })),
    });
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

    if (community.masterId === user.sub) {
      return response.status(403).json({
        success: false,
        message: "Admin cannot request to join their own host",
      });
    }

    const host = await prisma.host.findFirst({
      where: { id: hostId, communityId: community.id },
    });

    if (!host)
      return response
        .status(404)
        .json({ success: false, message: "Host not found" });

    // 🚨 CHECK IF ALREADY EXISTS
    const existing = await prisma.player.findFirst({
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

    if (host.maxPlayers > 0) {
      const acceptedPlayersCount = await prisma.player.count({
        where: {
          hostId: host.id,
          hostStatus: PlayerHostStatuses.accepted,
        },
      });

      if (acceptedPlayersCount >= host.maxPlayers) {
        return response.status(400).json({
          success: false,
          message: "This host is already full",
        });
      }
    }

    const player = await prisma.player.create({
      data: {
        hostId: host.id,
        playerId: user.sub,
      },
      select: {
        id: true,
        hostStatus: true,
      },
    });

    return response.status(201).json({
      success: true,
      message: "Successfully requested to join",
      player,
    });
  } catch (error) {
    console.error("Error requesting to join hosts:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};
