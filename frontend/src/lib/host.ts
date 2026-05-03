export type MatchPlayerStatus = "waiting" | "inQueue" | "playing";
export type SkillLevelType = "beginner" | "intermediate" | "advanced" | "elite";

export type PlayerType = {
  id: string | null;
  username: string;
  profileUrl: string;
  skillLevel: SkillLevelType;
  isStatic: boolean;
};

export type QueueEntryType = {
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
  status: "accepted";
  matchStatus: MatchPlayerStatus;
  timerStartedAt: string | null;
  player: PlayerType;
  queueEntry: QueueEntryType | null;
  courtAssignment: CourtAssignmentType | null;
};

export type PlayerAssignedInCourt = {
  id: string;
  hostedPlayerId: string;
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

export type HostPlayerRecord = {
  id: string;
  status: "requested" | "accepted" | "rejected" | "banned";
  player: PlayerType;
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
