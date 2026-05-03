import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import {
  Currency,
  HostedPlayerStatus,
  PaymentMethod,
  PaymentStatus,
} from "../generated/prisma/enums.js";
import {
  hostedPlayerProfileSelect,
  toHostedPlayerProfile,
} from "../lib/hostedPlayer.js";

type HostPaymentParams = {
  communityId: string;
  hostId: string;
};

type HostedPlayerPaymentParams = HostPaymentParams & {
  hostedPlayerId: string;
};

type UpdateHostPricingBody = {
  entranceFee?: number;
  perMatchFee?: number;
  currency?: Currency;
};

type UpsertPlayerPaymentBody = {
  amountExpected?: number;
  amountPaid?: number;
  currency?: Currency;
  method?: PaymentMethod | null;
  status?: PaymentStatus;
  providerReference?: string | null;
  notes?: string | null;
  paidAt?: string | null;
};

const isNonNegativeNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

const isNullableTrimmedString = (value: unknown) =>
  value === null || value === undefined || typeof value === "string";

const toMoneyNumber = (value: unknown) => Number(value ?? 0);

const getExpectedAmount = (
  pricing: {
  entranceFee: unknown;
  perMatchFee: unknown;
} | null,
  gamesPlayed: number,
) =>
  toMoneyNumber(pricing?.entranceFee) +
  toMoneyNumber(pricing?.perMatchFee) * gamesPlayed;

const resolvePaymentStatus = ({
  explicitStatus,
  amountExpected,
  amountPaid,
}: {
  explicitStatus: PaymentStatus | undefined;
  amountExpected: number;
  amountPaid: number;
}) => {
  if (
    explicitStatus === PaymentStatus.failed ||
    explicitStatus === PaymentStatus.refunded ||
    explicitStatus === PaymentStatus.waived ||
    explicitStatus === PaymentStatus.pending
  ) {
    return explicitStatus;
  }

  if (amountExpected <= 0 && amountPaid <= 0) {
    return explicitStatus ?? PaymentStatus.unpaid;
  }

  if (amountPaid <= 0) {
    return PaymentStatus.unpaid;
  }

  if (amountPaid < amountExpected) {
    return PaymentStatus.partial;
  }

  return PaymentStatus.paid;
};

const getAuthorizedHost = async (
  communityId: string,
  hostId: string,
  adminId: string,
) => {
  const community = await prisma.community.findFirst({
    where: { id: communityId, adminId },
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
    currency: Currency;
  } | null,
) => ({
  id: pricing?.id ?? null,
  entranceFee: toMoneyNumber(pricing?.entranceFee),
  perMatchFee: toMoneyNumber(pricing?.perMatchFee),
  currency: pricing?.currency ?? Currency.PHP,
});

const mapPaymentRecord = ({
  payment,
  fallbackCurrency,
  fallbackExpectedAmount,
}: {
  payment:
    | {
        id: string;
        amountExpected: unknown;
        amountPaid: unknown;
        currency: Currency;
        status: PaymentStatus;
        method: PaymentMethod | null;
        providerReference: string | null;
        notes: string | null;
        paidAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
      }
    | null
    | undefined;
  fallbackCurrency: Currency;
  fallbackExpectedAmount: number;
}) => {
  const amountExpected = payment
    ? toMoneyNumber(payment.amountExpected)
    : fallbackExpectedAmount;
  const amountPaid = payment ? toMoneyNumber(payment.amountPaid) : 0;

  return {
    id: payment?.id ?? null,
    amountExpected,
    amountPaid,
    balance: Math.max(0, amountExpected - amountPaid),
    currency: payment?.currency ?? fallbackCurrency,
    status: payment?.status ?? PaymentStatus.unpaid,
    method: payment?.method ?? null,
    providerReference: payment?.providerReference ?? null,
    notes: payment?.notes ?? null,
    paidAt: payment?.paidAt ?? null,
    createdAt: payment?.createdAt ?? null,
    updatedAt: payment?.updatedAt ?? null,
  };
};

export const getHostPricing = async (
  request: Request<HostPaymentParams>,
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
    const user = request.user;

    if (!user)
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

    if (currency !== undefined && !Object.values(Currency).includes(currency))
      return response
        .status(400)
        .json({ success: false, message: "Invalid currency" });

    const host = await getAuthorizedHost(communityId, hostId, user.sub);

    if (!host)
      return response
        .status(404)
        .json({ success: false, message: "Community or host not found" });

    const pricing = await prisma.hostPricing.upsert({
      where: { hostId: host.id },
      update: {
        ...(entranceFee !== undefined ? { entranceFee } : {}),
        ...(perMatchFee !== undefined ? { perMatchFee } : {}),
        ...(currency !== undefined ? { currency } : {}),
      },
      create: {
        hostId: host.id,
        entranceFee: entranceFee ?? 0,
        perMatchFee: perMatchFee ?? 0,
        currency: currency ?? Currency.PHP,
      },
      select: {
        id: true,
        entranceFee: true,
        perMatchFee: true,
        currency: true,
      },
    });

    return response.status(200).json({
      success: true,
      message: "Host pricing updated successfully",
      pricing: mapPricing(pricing),
    });
  } catch (error) {
    console.error("Error updating host pricing:", error);
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
    const user = request.user;

    if (!user)
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

    const pricing = mapPricing(host.pricing);

    const hostedPlayers = await prisma.hostedPlayer.findMany({
      where: {
        hostId: host.id,
        status: {
          in: [HostedPlayerStatus.accepted, HostedPlayerStatus.banned],
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        gamesPlayed: true,
        timerStartedAt: true,
        ...hostedPlayerProfileSelect,
        payments: {
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: {
            id: true,
            amountExpected: true,
            amountPaid: true,
            currency: true,
            status: true,
            method: true,
            providerReference: true,
            notes: true,
            paidAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    const players = hostedPlayers.map((hostedPlayer) => {
      const defaultExpectedAmount = getExpectedAmount(
        host.pricing,
        hostedPlayer.gamesPlayed,
      );
      const payment = mapPaymentRecord({
        payment: hostedPlayer.payments[0],
        fallbackCurrency: pricing.currency,
        fallbackExpectedAmount: defaultExpectedAmount,
      });

      return {
        id: hostedPlayer.id,
        status: hostedPlayer.status,
        paymentStatus: hostedPlayer.paymentStatus,
        gamesPlayed: hostedPlayer.gamesPlayed,
        timerStartedAt: hostedPlayer.timerStartedAt,
        player: toHostedPlayerProfile(hostedPlayer),
        payment,
      };
    });

    const summary = players.reduce(
      (accumulator, hostedPlayer) => {
        const { paymentStatus } = hostedPlayer;
        const { amountExpected, amountPaid, balance } = hostedPlayer.payment;

        accumulator.totalExpected += amountExpected;
        accumulator.totalPaid += amountPaid;
        accumulator.totalOutstanding += balance;

        if (paymentStatus === PaymentStatus.paid) accumulator.paidCount += 1;
        if (paymentStatus === PaymentStatus.partial)
          accumulator.partialCount += 1;
        if (
          paymentStatus === PaymentStatus.unpaid ||
          paymentStatus === PaymentStatus.pending
        ) {
          accumulator.unpaidCount += 1;
        }
        if (paymentStatus === PaymentStatus.waived)
          accumulator.waivedCount += 1;
        if (paymentStatus === PaymentStatus.refunded)
          accumulator.refundedCount += 1;

        return accumulator;
      },
      {
        totalPlayers: players.length,
        totalExpected: 0,
        totalPaid: 0,
        totalOutstanding: 0,
        paidCount: 0,
        partialCount: 0,
        unpaidCount: 0,
        waivedCount: 0,
        refundedCount: 0,
      },
    );

    return response.status(200).json({
      success: true,
      message: "Host payments retrieved successfully",
      pricing,
      summary,
      players,
    });
  } catch (error) {
    console.error("Error getting host payments:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const upsertHostedPlayerPayment = async (
  request: Request<HostedPlayerPaymentParams, unknown, UpsertPlayerPaymentBody>,
  response: Response,
) => {
  try {
    const { communityId, hostId, hostedPlayerId } = request.params;
    const {
      amountExpected,
      amountPaid,
      currency,
      method,
      status,
      providerReference,
      notes,
      paidAt,
    } = request.body;
    const user = request.user;

    if (!user)
      return response
        .status(401)
        .json({ success: false, message: "Unauthorized" });

    if (!communityId || !hostId || !hostedPlayerId)
      return response
        .status(400)
        .json({ success: false, message: "Missing required parameters" });

    if (amountExpected !== undefined && !isNonNegativeNumber(amountExpected))
      return response
        .status(400)
        .json({ success: false, message: "Invalid expected amount" });

    if (amountPaid !== undefined && !isNonNegativeNumber(amountPaid))
      return response
        .status(400)
        .json({ success: false, message: "Invalid paid amount" });

    if (currency !== undefined && !Object.values(Currency).includes(currency))
      return response
        .status(400)
        .json({ success: false, message: "Invalid currency" });

    if (
      method !== undefined &&
      method !== null &&
      !Object.values(PaymentMethod).includes(method)
    ) {
      return response
        .status(400)
        .json({ success: false, message: "Invalid payment method" });
    }

    if (
      status !== undefined &&
      !Object.values(PaymentStatus).includes(status)
    ) {
      return response
        .status(400)
        .json({ success: false, message: "Invalid payment status" });
    }

    if (!isNullableTrimmedString(providerReference) || !isNullableTrimmedString(notes))
      return response.status(400).json({
        success: false,
        message: "Invalid payment metadata",
      });

    if (paidAt !== undefined && paidAt !== null && Number.isNaN(Date.parse(paidAt)))
      return response
        .status(400)
        .json({ success: false, message: "Invalid paidAt value" });

    const host = await getAuthorizedHost(communityId, hostId, user.sub);

    if (!host)
      return response
        .status(404)
        .json({ success: false, message: "Community or host not found" });

    const hostedPlayer = await prisma.hostedPlayer.findFirst({
      where: {
        id: hostedPlayerId,
        hostId: host.id,
      },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        gamesPlayed: true,
        timerStartedAt: true,
        ...hostedPlayerProfileSelect,
        payments: {
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: {
            id: true,
            amountExpected: true,
            amountPaid: true,
            currency: true,
            status: true,
            method: true,
            providerReference: true,
            notes: true,
            paidAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!hostedPlayer)
      return response
        .status(404)
        .json({ success: false, message: "Hosted player not found" });

    const existingPayment = hostedPlayer.payments[0] ?? null;
    const defaultExpectedAmount = getExpectedAmount(
      host.pricing,
      hostedPlayer.gamesPlayed,
    );
    const nextAmountExpected =
      amountExpected ??
      (existingPayment
        ? toMoneyNumber(existingPayment.amountExpected)
        : defaultExpectedAmount);
    const nextAmountPaid =
      amountPaid ??
      (existingPayment ? toMoneyNumber(existingPayment.amountPaid) : 0);
    const nextCurrency =
      currency ??
      existingPayment?.currency ??
      host.pricing?.currency ??
      Currency.PHP;
    const nextStatus = resolvePaymentStatus({
      explicitStatus: status,
      amountExpected: nextAmountExpected,
      amountPaid: nextAmountPaid,
    });
    const nextPaidAt =
      paidAt === null
        ? null
        : paidAt
          ? new Date(paidAt)
          : nextAmountPaid > 0 &&
              (nextStatus === PaymentStatus.paid ||
                nextStatus === PaymentStatus.partial)
            ? (existingPayment?.paidAt ?? new Date())
            : (existingPayment?.paidAt ?? null);

    const savedPayment = existingPayment
      ? await prisma.playerPayment.update({
          where: { id: existingPayment.id },
          data: {
            amountExpected: nextAmountExpected,
            amountPaid: nextAmountPaid,
            currency: nextCurrency,
            status: nextStatus,
            method: method === undefined ? existingPayment.method : method,
            providerReference:
              providerReference === undefined
                ? existingPayment.providerReference
                : providerReference?.trim() || null,
            notes:
              notes === undefined ? existingPayment.notes : notes?.trim() || null,
            paidAt: nextPaidAt,
          },
          select: {
            id: true,
            amountExpected: true,
            amountPaid: true,
            currency: true,
            status: true,
            method: true,
            providerReference: true,
            notes: true,
            paidAt: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      : await prisma.playerPayment.create({
          data: {
            hostedPlayerId: hostedPlayer.id,
            amountExpected: nextAmountExpected,
            amountPaid: nextAmountPaid,
            currency: nextCurrency,
            status: nextStatus,
            method: method ?? null,
            providerReference: providerReference?.trim() || null,
            notes: notes?.trim() || null,
            paidAt: nextPaidAt,
          },
          select: {
            id: true,
            amountExpected: true,
            amountPaid: true,
            currency: true,
            status: true,
            method: true,
            providerReference: true,
            notes: true,
            paidAt: true,
            createdAt: true,
            updatedAt: true,
          },
        });

    await prisma.hostedPlayer.update({
      where: { id: hostedPlayer.id },
      data: { paymentStatus: nextStatus },
    });

    return response.status(200).json({
      success: true,
      message: "Hosted player payment saved successfully",
      hostedPlayer: {
        id: hostedPlayer.id,
        status: hostedPlayer.status,
        paymentStatus: nextStatus,
        gamesPlayed: hostedPlayer.gamesPlayed,
        timerStartedAt: hostedPlayer.timerStartedAt,
        player: toHostedPlayerProfile(hostedPlayer),
      },
      payment: mapPaymentRecord({
        payment: savedPayment,
        fallbackCurrency: nextCurrency,
        fallbackExpectedAmount: defaultExpectedAmount,
      }),
    });
  } catch (error) {
    console.error("Error saving hosted player payment:", error);
    return response.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};
