import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import {
  Currencies,
  PaymentStatuses,
  UserRoles,
} from "../generated/prisma/enums.js";

type HostPaymentParams = {
  communityId: string;
  hostId: string;
};

type PlayerPaymentParams = HostPaymentParams & {
  playerId: string;
};

type UpdateHostPricingBody = {
  entranceFee?: number;
  perMatchFee?: number;
  currency?: Currencies;
};

type UpsertPlayerPaymentBody = {
  amountPaid?: number;
};

const isNonNegativeNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

const toMoneyNumber = (value: unknown) => Number(value ?? 0);

type HostPricingAmounts = {
  entranceFee: number;
  perMatchFee: number;
};

const getPricingAmounts = (pricing: {
  entranceFee: unknown;
  perMatchFee: unknown;
}) => ({
  entranceFee: toMoneyNumber(pricing.entranceFee),
  perMatchFee: toMoneyNumber(pricing.perMatchFee),
});

const getPlayerExpectedFee = (
  pricing: HostPricingAmounts,
  gamesPlayed: number,
) => pricing.entranceFee + pricing.perMatchFee * gamesPlayed;

const calculateExpectedFee = (
  pricing: HostPricingAmounts,
  players: Array<{ gamesPlayed: number }>,
) =>
  players.reduce(
    (total, player) =>
      total + getPlayerExpectedFee(pricing, player.gamesPlayed),
    0,
  );

const getAuthorizedHost = async (
  communityId: string,
  hostId: string,
  masterId: string,
) => {
  const community = await prisma.community.findFirst({
    where: { id: communityId, masterId },
    select: { id: true },
  });

  if (!community) return null;

  return prisma.host.findFirst({
    where: { id: hostId, communityId: community.id },
    select: {
      id: true,
      pricing: {
        select: {
          id: true,
          entranceFee: true,
          perMatchFee: true,
          expectedFee: true,
          currency: true,
        },
      },
    },
  });
};

const mapPricing = (
  pricing: {
    id: string;
    entranceFee: unknown;
    perMatchFee: unknown;
    expectedFee: unknown;
    currency: Currencies;
  } | null,
) => ({
  id: pricing?.id ?? null,
  entranceFee: toMoneyNumber(pricing?.entranceFee),
  perMatchFee: toMoneyNumber(pricing?.perMatchFee),
  expectedFee: toMoneyNumber(pricing?.expectedFee),
  currency: pricing?.currency ?? Currencies.PHP,
});

export const getHostPricing = async (
  request: Request<HostPaymentParams>,
  response: Response,
) => {
  try {
    const { communityId, hostId } = request.params;
    const user = request.user as { sub?: string } | undefined;

    if (!user?.sub)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    if (!communityId || !hostId)
      return response
        .status(400)
        .json({ success: false, message: "Missing required parameters" });

    const host = await getAuthorizedHost(communityId, hostId, user.sub);

    if (!host)
      return response
        .status(404)
        .json({ success: false, message: "Community or host not found" });

    return response.status(200).json({
      success: true,
      message: "Host pricing retrieved successfully",
      pricing: mapPricing(host.pricing),
    });
  } catch (error) {
    console.error("Error getting host pricing:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const upsertHostPricing = async (
  request: Request<HostPaymentParams, unknown, UpdateHostPricingBody>,
  response: Response,
) => {
  try {
    const { communityId, hostId } = request.params;
    const { entranceFee, perMatchFee, currency } = request.body;
    const user = request.user as { sub?: string } | undefined;

    if (!user?.sub)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    if (!communityId || !hostId)
      return response
        .status(400)
        .json({ success: false, message: "Missing required parameters" });

    if (entranceFee !== undefined && !isNonNegativeNumber(entranceFee))
      return response
        .status(400)
        .json({ success: false, message: "Invalid entrance fee" });

    if (perMatchFee !== undefined && !isNonNegativeNumber(perMatchFee))
      return response
        .status(400)
        .json({ success: false, message: "Invalid per-match fee" });

    if (currency !== undefined && !Object.values(Currencies).includes(currency))
      return response
        .status(400)
        .json({ success: false, message: "Invalid currency" });

    const host = await getAuthorizedHost(communityId, hostId, user.sub);

    if (!host)
      return response
        .status(404)
        .json({ success: false, message: "Community or host not found" });

    const playerGames = await prisma.player.findMany({
      where: {
        hostId: host.id,
        hostStatus: {
          in: ["accepted", "banned"],
        },
      },
      select: {
        gamesPlayed: true,
      },
    });

    const pricingAmounts = getPricingAmounts({
      entranceFee: entranceFee ?? host.pricing?.entranceFee ?? 0,
      perMatchFee: perMatchFee ?? host.pricing?.perMatchFee ?? 0,
    });

    const expectedFeeToSave = calculateExpectedFee(pricingAmounts, playerGames);

    const pricing = await prisma.hostPricing.upsert({
      where: { hostId: host.id },
      update: {
        ...(entranceFee !== undefined ? { entranceFee } : {}),
        ...(perMatchFee !== undefined ? { perMatchFee } : {}),
        expectedFee: expectedFeeToSave,
        ...(currency !== undefined ? { currency } : {}),
      },
      create: {
        hostId: host.id,
        entranceFee: entranceFee ?? 0,
        perMatchFee: perMatchFee ?? 0,
        expectedFee: expectedFeeToSave,
        currency: currency ?? Currencies.PHP,
      },
      select: {
        id: true,
        entranceFee: true,
        perMatchFee: true,
        expectedFee: true,
        currency: true,
      },
    });

    return response.status(200).json({
      success: true,
      message: "Host pricing updated successfully",
      pricing: mapPricing(pricing),
    });
  } catch (error) {
    console.error("Error upserting host pricing:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const getHostPayments = async (
  request: Request<HostPaymentParams>,
  response: Response,
) => {
  try {
    const { communityId, hostId } = request.params;
    const user = request.user as { sub?: string } | undefined;

    if (!user?.sub)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    if (!communityId || !hostId)
      return response
        .status(400)
        .json({ success: false, message: "Missing required parameters" });

    const host = await getAuthorizedHost(communityId, hostId, user.sub);

    if (!host)
      return response
        .status(404)
        .json({ success: false, message: "Community or host not found" });

    const players = await prisma.player.findMany({
      where: {
        hostId: host.id,
        hostStatus: {
          in: ["accepted", "banned"],
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        hostStatus: true,
        paymentStatus: true,
        gamesPlayed: true,
        timerStartedAt: true,
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
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            amountPaid: true,
            createdAt: true,
          },
        },
      },
    });

    const responsePlayers = players.map((player) => ({
      id: player.id,
      hostStatus: player.hostStatus,
      paymentStatus: player.paymentStatus,
      gamesPlayed: player.gamesPlayed,
      timerStartedAt: player.timerStartedAt,
      player: {
        id: player.player?.id ?? null,
        username: player.player?.username ?? "",
        profileUrl: player.player?.profileUrl ?? "",
        isStatic: player.player?.role === UserRoles.static,
        isAdmin: player.player?.role === UserRoles.master,
        sports: player.player?.sports ?? [],
      },
      payment: player.payments[0] ?? null,
    }));

    const summary = responsePlayers.reduce(
      (accumulator, row) => {
        if (row.payment) {
          accumulator.totalPaid += Number(row.payment.amountPaid);
        }

        if (row.paymentStatus === PaymentStatuses.paid)
          accumulator.paidCount += 1;
        if (row.paymentStatus === PaymentStatuses.unpaid)
          accumulator.unpaidCount += 1;

        return accumulator;
      },
      {
        totalPlayers: responsePlayers.length,
        totalPaid: 0,
        paidCount: 0,
        unpaidCount: 0,
      },
    );

    const pricingAmounts = getPricingAmounts(
      host.pricing ?? { entranceFee: 0, perMatchFee: 0 },
    );
    const expectedFee = calculateExpectedFee(pricingAmounts, responsePlayers);

    return response.status(200).json({
      success: true,
      message: "Host payments retrieved successfully",
      pricing: mapPricing(host.pricing),
      summary: {
        ...summary,
        expectedFee,
      },
      players: responsePlayers,
    });
  } catch (error) {
    console.error("Error getting host payments:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const upsertPlayerPayment = async (
  request: Request<PlayerPaymentParams, unknown, UpsertPlayerPaymentBody>,
  response: Response,
) => {
  try {
    const { communityId, hostId, playerId } = request.params;
    const { amountPaid } = request.body;
    const user = request.user as { sub?: string } | undefined;

    if (!user?.sub)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    if (!communityId || !hostId || !playerId)
      return response
        .status(400)
        .json({ success: false, message: "Missing required parameters" });

    if (amountPaid !== undefined && !isNonNegativeNumber(amountPaid))
      return response
        .status(400)
        .json({ success: false, message: "Invalid paid amount" });

    const host = await getAuthorizedHost(communityId, hostId, user.sub);

    if (!host)
      return response
        .status(404)
        .json({ success: false, message: "Community or host not found" });

    const player = await prisma.player.findFirst({
      where: { id: playerId, hostId: host.id },
      select: {
        id: true,
      },
    });

    if (!player)
      return response
        .status(404)
        .json({ success: false, message: "Player not found" });

    const payment = await prisma.playerPayment.create({
      data: {
        playerId: player.id,
        amountPaid: amountPaid ?? 0,
      },
      select: {
        id: true,
        amountPaid: true,
        createdAt: true,
      },
    });

    const nextStatus =
      amountPaid && amountPaid > 0
        ? PaymentStatuses.paid
        : PaymentStatuses.unpaid;

    await prisma.player.update({
      where: { id: player.id },
      data: { paymentStatus: nextStatus },
    });

    return response.status(200).json({
      success: true,
      message: "Player payment recorded successfully",
      payment,
      paymentStatus: nextStatus,
    });
  } catch (error) {
    console.error("Error saving player payment:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};
