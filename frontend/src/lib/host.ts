export type MatchPlayerStatus = "waiting" | "inQueue" | "playing";
export type SkillLevelType = "beginner" | "intermediate" | "advanced" | "elite";
export type PaymentCurrency = "PHP" | "USD" | "EUR";
export type PaymentStatus = "unpaid" | "paid";
export type PaymentMethod = "cash" | "ewallet";

export type PlayerType = {
  id: string | null;
  username: string;
  profileUrl: string;
  skillLevel: SkillLevelType;
  isStatic: boolean;
};

export type HostPlayerStatus = "requested" | "accepted" | "rejected" | "banned";

export type HostPlayerRecord = {
  id: string;
  status: HostPlayerStatus;
  paymentStatus?: PaymentStatus | string;
  player: PlayerType;
};

export type HostMeta = {
  id: string;
  hostName: string;
  sport: string;
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

export type AcceptedPlayers = {
  id: string;
  hostStatus: "accepted";
  matchStatus: MatchPlayerStatus;
  timerStartedAt: string | null;
  player: PlayerType;
  queueEntry: QueueAssignmentType | null;
  courtAssignment: CourtAssignmentType | null;
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

export type QueueType = {
  id: string;
  hostId: string;
  name: string;
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
  player: Pick<PlayerType, "username" | "isStatic">;
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

export const normalizeAcceptedPlayers = (players: AcceptedPlayers[]) =>
  players.map((player) => ({
    ...player,
    matchStatus: player.matchStatus ?? getDerivedMatchStatus(player),
  }));

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
