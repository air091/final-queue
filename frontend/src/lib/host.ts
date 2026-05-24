import type { SkillLevelType } from "./skillLevels";

export type MatchPlayerStatus = "waiting" | "inQueue" | "playing";
export type { SkillLevelType };
export type PaymentCurrency = "PHP" | "USD" | "EUR";
export type PaymentStatus = "unpaid" | "paid";
export type PaymentMethod = "cash" | "ewallet";

export type PlayerType = {
  id: string | null;
  username: string;
  profileUrl: string;
  skillLevel: SkillLevelType;
  isStatic: boolean;
  isAdmin: boolean;
};

export type CommunityPlayerRecord = {
  id: string;
  status: HostPlayerStatus;
  addedAt: string;
  player: PlayerType;
};

export type HostPlayerStatus = "requested" | "accepted" | "rejected" | "banned";

export type HostPlayerRecord = {
  id: string;
  status: HostPlayerStatus;
  paymentStatus?: PaymentStatus | string;
  player: PlayerType;
  requestedAt?: string;
};

export type PlayerHistoryTarget = {
  id: string;
  player: Pick<
    PlayerType,
    "id" | "username" | "isStatic" | "isAdmin" | "profileUrl"
  >;
};

export type HostMeta = {
  id: string;
  hostName: string;
  sport: string;
  location: string | null;
  startTime: string | null;
  endTime: string | null;
  maxPlayers: number;
  status: string;
  createdAt: string;
  community: {
    profileUrl: string;
    communityName: string;
  };
  _count: {
    players: number;
  };
};

export type QueueAssignmentType = {
  id: string;
  queueId: string;
  position: number;
};

export type CourtAssignmentType = {
  id: string;
  courtId: string;
  position: number;
};

export type MatchHistorySummary = {
  matchCount: number;
  winCount: number;
  lossCount: number;
  lastMatch: {
    team: string | null;
    result: string | null;
    startedAt: string | null;
    endedAt: string | null;
    teamWinner: string;
    courtName: string | null;
  } | null;
};

export type MatchParticipantHistoryPlayer = {
  username: string;
  profileUrl: string;
};

export type MatchParticipantHistoryItem = {
  id: string;
  playerId: string;
  team: string | null;
  result: string | null;
  joinedAt: string;
  player: MatchParticipantHistoryPlayer | null;
};

export type PlayerMatchHistoryItem = {
  id: string;
  team: string | null;
  result: string | null;
  joinedAt: string;
  match: {
    id: string;
    startedAt: string | null;
    endedAt: string | null;
    teamWinner: string;
    court: {
      id: string;
      name: string;
    } | null;
    participants?: MatchParticipantHistoryItem[];
  };
};

export type FinishedMatchHistoryPayload = {
  id: string;
  teamWinner: string;
  startedAt: string | null;
  endedAt: string | null;
  court: {
    id: string;
    name: string;
  } | null;
  participants: Array<{
    id: string;
    playerId: string;
    team: string | null;
    result: string | null;
    joinedAt: string;
    player?: MatchParticipantHistoryPlayer | null;
  }>;
};

export const EMPTY_MATCH_HISTORY_SUMMARY: MatchHistorySummary = {
  matchCount: 0,
  winCount: 0,
  lossCount: 0,
  lastMatch: null,
};

export type AcceptedPlayers = {
  id: string;
  hostStatus: "accepted";
  matchStatus: MatchPlayerStatus;
  timerStartedAt: string | null;
  gamesPlayed: number;
  player: PlayerType;
  queueEntry: QueueAssignmentType | null;
  courtAssignment: CourtAssignmentType | null;
  matchHistory?: MatchHistorySummary;
};

export type PlayerAssignedInCourt = {
  id: string;
  playerId: string;
  position: number;
};

export type CourtType = {
  id: string;
  name: string;
  startedAt: string | null;
  endedAt: string | null;
  assignments: PlayerAssignedInCourt[];
};

export type QueueEntryType = {
  id: string;
  playerId: string;
  position: number;
};

export type QueueType = {
  id: string;
  hostId: string;
  name: string;
  entries: QueueEntryType[];
};

export type PlayerRecord = {
  id: string;
  status: "requested" | "accepted" | "rejected" | "banned";
  paymentStatus?: PaymentStatus;
  player: PlayerType;
};

export type PaymentRecord = {
  id: string | null;
  amountExpected: number;
  amountPaid: number;
  balance: number;
  currency: PaymentCurrency;
  status: PaymentStatus;
  method: PaymentMethod | null;
};

export type PaymentPlayer = {
  id: string;
  status: "accepted" | "banned";
  paymentStatus: PaymentStatus;
  gamesPlayed: number;
  player: Pick<
    PlayerType,
    "id" | "username" | "isStatic" | "isAdmin" | "profileUrl"
  >;
  payment: PaymentRecord;
};

export type PaymentsSummary = {
  totalPlayers: number;
  totalExpected: number;
  totalPaid: number;
  totalOutstanding: number;
  paidCount: number;
  unpaidCount: number;
};

export type HostPaymentsData = {
  pricing: {
    id: string | null;
    entranceFee: number;
    perMatchFee: number;
    expectedFee: number;
    currency: PaymentCurrency;
  };
  summary: PaymentsSummary;
  players: PaymentPlayer[];
};

export const EMPTY_PAYMENTS_SUMMARY: PaymentsSummary = {
  totalPlayers: 0,
  totalExpected: 0,
  totalPaid: 0,
  totalOutstanding: 0,
  paidCount: 0,
  unpaidCount: 0,
};

export const EMPTY_HOST_PAYMENTS_DATA: HostPaymentsData = {
  pricing: {
    id: null,
    entranceFee: 0,
    perMatchFee: 0,
    expectedFee: 0,
    currency: "PHP",
  },
  summary: EMPTY_PAYMENTS_SUMMARY,
  players: [],
};

export const getDerivedMatchStatus = (
  player: Pick<AcceptedPlayers, "queueEntry" | "courtAssignment">,
): MatchPlayerStatus => {
  if (player.courtAssignment) return "inQueue";
  if (player.queueEntry) return "inQueue";
  return "waiting";
};

type AcceptedPlayerPayload = AcceptedPlayers & {
  queueAssignment?: QueueAssignmentType | null;
};

export const normalizeAcceptedPlayers = (players: AcceptedPlayerPayload[]) =>
  players.map((player) => {
    const queueEntry = player.queueEntry ?? player.queueAssignment ?? null;
    const normalizedPlayer = {
      ...player,
      queueEntry,
      gamesPlayed: player.gamesPlayed ?? 0,
    };

    return {
      ...normalizedPlayer,
      matchStatus:
        normalizedPlayer.matchStatus ?? getDerivedMatchStatus(normalizedPlayer),
    };
  });

export const getPaymentBalance = (amountExpected: number, amountPaid: number) =>
  Math.max(0, amountExpected - amountPaid);

export const buildPaymentsSummary = (
  players: PaymentPlayer[],
): PaymentsSummary =>
  players.reduce(
    (accumulator, player) => {
      accumulator.totalPlayers += 1;
      accumulator.totalExpected += player.payment.amountExpected;
      accumulator.totalPaid += player.payment.amountPaid;
      accumulator.totalOutstanding += player.payment.balance;

      if (player.paymentStatus === "paid") accumulator.paidCount += 1;
      if (player.paymentStatus === "unpaid") {
        accumulator.unpaidCount += 1;
      }

      return accumulator;
    },
    {
      ...EMPTY_PAYMENTS_SUMMARY,
    },
  );
