import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import PlayerCard from "../../components/host_components/PlayerCard";
import CourtCard from "../../components/host_components/CourtCard";
import QueueCard from "../../components/host_components/QueueCard";
import { useHostData } from "../../hooks/useHostData";
import { api } from "../../lib/api";
import {
  buildPaymentsSummary,
  getDerivedMatchStatus,
  getPaymentBalance,
  type AcceptedPlayers,
  type CourtType,
  type FinishedMatchHistoryPayload,
  type MatchHistorySummary,
  type MatchPlayerStatus,
  type QueueType,
} from "../../lib/host";
import { X } from "lucide-react";

type CourtDropData = {
  type: "court-slot";
  courtId: string;
  position: number;
};

type QueueDropData = {
  type: "queue-slot";
  queueId: string;
  position: number;
};

type DropData = CourtDropData | QueueDropData;

type PlayerStatusFilter = "all" | "paid" | MatchPlayerStatus;
type RelationshipToastState = {
  id: number;
  messages: string[];
};

const RELATIONSHIP_WARNING_THRESHOLD = 2;
const MAX_RELATIONSHIP_TOAST_MESSAGES = 4;

const getMatchTeam = (position: number) =>
  position === 1 || position === 3 ? "A" : "B";

const getOrdinal = (value: number) => {
  const lastTwoDigits = value % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) return `${value}th`;

  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
};

const getPlayerName = (player: AcceptedPlayers) =>
  player.player.username.trim() || "Player";

const getRelationshipCount = (
  player: AcceptedPlayers,
  relatedPlayerId: string,
  relationshipKey: "teammateCount" | "opponentCount",
) =>
  player.matchRelationships?.find(
    (relationship) => relationship.playerId === relatedPlayerId,
  )?.[relationshipKey] ?? 0;

const getRelationshipWarnings = (
  currentPlayers: AcceptedPlayers[],
  assignments: Array<{ playerId: string; position: number }>,
) => {
  const assignedPlayers = assignments
    .map((assignment) => {
      const player = currentPlayers.find(
        (currentPlayer) => currentPlayer.id === assignment.playerId,
      );

      return player ? { ...assignment, player } : null;
    })
    .filter(
      (
        assignment,
      ): assignment is {
        playerId: string;
        position: number;
        player: AcceptedPlayers;
      } => Boolean(assignment),
    );
  const messages: string[] = [];

  for (let leftIndex = 0; leftIndex < assignedPlayers.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < assignedPlayers.length;
      rightIndex += 1
    ) {
      const left = assignedPlayers[leftIndex];
      const right = assignedPlayers[rightIndex];
      const isTeammate =
        getMatchTeam(left.position) === getMatchTeam(right.position);
      const relationshipKey = isTeammate ? "teammateCount" : "opponentCount";
      const nextCount =
        getRelationshipCount(left.player, right.playerId, relationshipKey) + 1;

      if (nextCount < RELATIONSHIP_WARNING_THRESHOLD) continue;

      messages.push(
        `${getPlayerName(left.player)} and ${getPlayerName(
          right.player,
        )} will ${isTeammate ? "be teammates" : "face each other"} for the ${getOrdinal(
          nextCount,
        )} time.`,
      );
    }
  }

  return messages;
};

const getUpdatedCourts = (
  currentCourts: CourtType[],
  playerId: string,
  courtId: string,
  position: number,
) =>
  currentCourts.map((court) => {
    const assignmentsWithoutDraggedPlayer = court.assignments.filter(
      (assignment) => assignment.playerId !== playerId,
    );

    if (court.id !== courtId) {
      return {
        ...court,
        assignments: assignmentsWithoutDraggedPlayer,
      };
    }

    const nextAssignments = assignmentsWithoutDraggedPlayer.filter(
      (assignment) => assignment.position !== position,
    );
    const existingAssignment = court.assignments.find(
      (assignment) => assignment.playerId === playerId,
    );

    return {
      ...court,
      assignments: [
        ...nextAssignments,
        {
          id: existingAssignment?.id ?? `${court.id}-${playerId}-${position}`,
          playerId,
          position,
        },
      ].sort((a, b) => a.position - b.position),
    };
  });

const getCourtsWithoutPlayer = (
  currentCourts: CourtType[],
  playerId: string,
  courtId: string,
) =>
  currentCourts.map((court) =>
    court.id === courtId
      ? {
          ...court,
          assignments: court.assignments.filter(
            (assignment) => assignment.playerId !== playerId,
          ),
        }
      : court,
  );

const getStartedCourt = (currentCourts: CourtType[], courtId: string) =>
  currentCourts.map((court) =>
    court.id === courtId
      ? {
          ...court,
          startedAt: new Date().toISOString(),
          endedAt: null,
        }
      : court,
  );

const getPausedCourt = (currentCourts: CourtType[], courtId: string) =>
  currentCourts.map((court) =>
    court.id === courtId
      ? {
          ...court,
          endedAt: new Date().toISOString(),
        }
      : court,
  );

const getResumedCourt = (currentCourts: CourtType[], courtId: string) =>
  currentCourts.map((court) =>
    court.id === courtId
      ? {
          ...court,
          endedAt: null,
        }
      : court,
  );

const getEndedCourt = (currentCourts: CourtType[], courtId: string) =>
  currentCourts.map((court) =>
    court.id === courtId
      ? {
          ...court,
          startedAt: null,
          endedAt: new Date().toISOString(),
          assignments: [],
        }
      : court,
  );

const isCourtActive = (
  court?: Pick<CourtType, "startedAt" | "endedAt"> | null,
) => Boolean(court?.startedAt && !court.endedAt);

const getPlayersWithCourtAssignment = (
  currentPlayers: AcceptedPlayers[],
  playerId: string,
  courtId: string,
  position: number,
  isCourtStarted: boolean,
) =>
  currentPlayers.map((player) =>
    player.id === playerId
      ? {
          ...player,
          queueEntry: null,
          courtAssignment: {
            id:
              player.courtAssignment?.id ??
              `${courtId}-${playerId}-${position}`,
            courtId,
            position,
          },
          matchStatus: isCourtStarted
            ? ("playing" as MatchPlayerStatus)
            : ("inQueue" as MatchPlayerStatus),
        }
      : player,
  );

const getPlayersWithResetTimer = (
  currentPlayers: AcceptedPlayers[],
  playerIds: string[],
  nextStatus: MatchPlayerStatus,
) => {
  if (!playerIds) return currentPlayers;
  const now = new Date().toISOString();

  return currentPlayers.map((player) => {
    if (!playerIds.includes(player.id)) return player;

    const nextPlayer = {
      ...player,
      courtAssignment: nextStatus === "playing" ? player.courtAssignment : null,
      timerStartedAt: now,
    };

    return {
      ...nextPlayer,
      matchStatus:
        nextStatus === "waiting"
          ? getDerivedMatchStatus(nextPlayer)
          : nextStatus,
    };
  });
};

const getPlayersWithMatchStatus = (
  currentPlayers: AcceptedPlayers[],
  playerIds: string[],
  nextStatus: MatchPlayerStatus,
) =>
  currentPlayers.map((player) =>
    playerIds.includes(player.id)
      ? {
          ...player,
          matchStatus: nextStatus,
        }
      : player,
  );

const getPlayersWithIncrementedGames = (
  currentPlayers: AcceptedPlayers[],
  playerIds: string[],
) =>
  currentPlayers.map((player) =>
    playerIds.includes(player.id)
      ? {
          ...player,
          gamesPlayed: player.gamesPlayed + 1,
        }
      : player,
  );

const getUpdatedPlayerMatchSummaries = (
  currentPlayers: AcceptedPlayers[],
  match: FinishedMatchPayload,
) =>
  currentPlayers.map((player) => {
    const participant = match.participants.find(
      (matchParticipant) => matchParticipant.playerId === player.id,
    );

    if (!participant) return player;

    const previousSummary: MatchHistorySummary = player.matchHistory ?? {
      matchCount: 0,
      winCount: 0,
      lossCount: 0,
      lastMatch: null,
    };
    const result = participant.result;

    return {
      ...player,
      matchHistory: {
        matchCount: previousSummary.matchCount + 1,
        winCount: previousSummary.winCount + (result === "win" ? 1 : 0),
        lossCount: previousSummary.lossCount + (result === "loss" ? 1 : 0),
        lastMatch: {
          team: participant.team,
          result,
          startedAt: match.startedAt,
          endedAt: match.endedAt,
          teamWinner: match.teamWinner,
          courtName: match.court?.name ?? null,
        },
      },
    };
  });

const getPlayersWithIncrementedMatchRelationships = (
  currentPlayers: AcceptedPlayers[],
  match: FinishedMatchPayload,
) =>
  currentPlayers.map((player) => {
    const participant = match.participants.find(
      (matchParticipant) => matchParticipant.playerId === player.id,
    );

    if (!participant) return player;

    const relationships = new Map(
      player.matchRelationships?.map((relationship) => [
        relationship.playerId,
        {
          teammateCount: relationship.teammateCount,
          opponentCount: relationship.opponentCount,
        },
      ]) ?? [],
    );

    for (const relatedParticipant of match.participants) {
      if (relatedParticipant.playerId === participant.playerId) continue;

      const relationship = relationships.get(relatedParticipant.playerId) ?? {
        teammateCount: 0,
        opponentCount: 0,
      };

      if (participant.team && participant.team === relatedParticipant.team) {
        relationship.teammateCount += 1;
      } else {
        relationship.opponentCount += 1;
      }

      relationships.set(relatedParticipant.playerId, relationship);
    }

    return {
      ...player,
      matchRelationships: Array.from(relationships.entries()).map(
        ([playerId, relationship]) => ({
          playerId,
          teammateCount: relationship.teammateCount,
          opponentCount: relationship.opponentCount,
        }),
      ),
    };
  });

type FinishedMatchPayload = FinishedMatchHistoryPayload;

const getPlayersWithoutCourtAssignment = (
  currentPlayers: AcceptedPlayers[],
  playerId: string,
) =>
  currentPlayers.map((player) => {
    if (player.id !== playerId) return player;

    const nextPlayer = {
      ...player,
      courtAssignment: null,
    };

    return {
      ...nextPlayer,
      matchStatus: getDerivedMatchStatus(nextPlayer),
    };
  });

const getPlayersWithoutCourtAssignments = (
  currentPlayers: AcceptedPlayers[],
  playerIds: string[],
) =>
  currentPlayers.map((player) => {
    if (!playerIds.includes(player.id)) return player;

    const nextPlayer = {
      ...player,
      courtAssignment: null,
    };

    return {
      ...nextPlayer,
      matchStatus: getDerivedMatchStatus(nextPlayer),
    };
  });

const getUpdatedQueues = (
  currentQueues: QueueType[],
  playerId: string,
  queueId: string,
  position: number,
) =>
  currentQueues.map((queue) => {
    const entriesWithoutDraggedPlayer = (queue.entries || []).filter(
      (entry) => entry.playerId !== playerId,
    );

    if (queue.id !== queueId) {
      return {
        ...queue,
        entries: entriesWithoutDraggedPlayer,
      };
    }

    const nextEntries = entriesWithoutDraggedPlayer.filter(
      (entry) => entry.position !== position,
    );
    const existingEntry = (queue.entries || []).find(
      (entry) => entry.playerId === playerId,
    );

    return {
      ...queue,
      entries: [
        ...nextEntries,
        {
          id: existingEntry?.id ?? `${queue.id}-${playerId}-${position}`,
          playerId,
          position,
        },
      ].sort((a, b) => a.position - b.position),
    };
  });

const getQueuesWithoutPlayer = (
  currentQueues: QueueType[],
  playerId: string,
  queueId: string,
) =>
  currentQueues.map((queue) =>
    queue.id === queueId
      ? {
          ...queue,
          entries: queue.entries.filter((entry) => entry.playerId !== playerId),
        }
      : queue,
  );

const getFirstAvailableEmptyCourt = (currentCourts: CourtType[]) =>
  currentCourts.find(
    (court) => !court.startedAt && court.assignments.length === 0,
  );

const getPlayersWithPlayersTransferredToCourt = (
  currentPlayers: AcceptedPlayers[],
  assignments: Array<{ playerId: string; courtId: string; position: number }>,
) =>
  assignments.reduce(
    (nextPlayers, assignment) =>
      getPlayersWithCourtAssignment(
        nextPlayers,
        assignment.playerId,
        assignment.courtId,
        assignment.position,
        false,
      ),
    currentPlayers,
  );

const getQueuesWithoutPlayers = (
  currentQueues: QueueType[],
  playerIds: string[],
  queueId: string,
) =>
  playerIds.reduce(
    (nextQueues, playerId) =>
      getQueuesWithoutPlayer(nextQueues, playerId, queueId),
    currentQueues,
  );

const getPlayersWithQueueAssignment = (
  currentPlayers: AcceptedPlayers[],
  playerId: string,
  queueId: string,
  position: number,
) =>
  currentPlayers.map((player) =>
    player.id === playerId
      ? (() => {
          const nextPlayer = {
            ...player,
            courtAssignment:
              player.matchStatus === "playing" ? player.courtAssignment : null,
            queueEntry: {
              id: player.queueEntry?.id ?? `${queueId}-${playerId}-${position}`,
              queueId,
              position,
            },
          };

          return {
            ...nextPlayer,
            matchStatus:
              player.matchStatus === "playing"
                ? ("playing" as MatchPlayerStatus)
                : getDerivedMatchStatus(nextPlayer),
          };
        })()
      : player,
  );

const getPlayersWithoutQueueAssignment = (
  currentPlayers: AcceptedPlayers[],
  playerId: string,
) =>
  currentPlayers.map((player) => {
    if (player.id !== playerId) return player;

    const nextPlayer = {
      ...player,
      queueEntry: null,
    };

    return {
      ...nextPlayer,
      matchStatus:
        player.matchStatus === "playing" && nextPlayer.courtAssignment
          ? ("playing" as MatchPlayerStatus)
          : getDerivedMatchStatus(nextPlayer),
    };
  });

const getPlayersWithoutQueueAssignments = (
  currentPlayers: AcceptedPlayers[],
  playerIds: string[],
) =>
  currentPlayers.map((player) => {
    if (!playerIds.includes(player.id)) return player;

    const nextPlayer = {
      ...player,
      queueEntry: null,
    };

    return {
      ...nextPlayer,
      matchStatus:
        player.matchStatus === "playing" && nextPlayer.courtAssignment
          ? ("playing" as MatchPlayerStatus)
          : getDerivedMatchStatus(nextPlayer),
    };
  });

const PLAYER_STATUS_FILTERS: Array<{
  label: string;
  value: PlayerStatusFilter;
}> = [
  { label: "All", value: "all" },
  { label: "Waiting", value: "waiting" },
  { label: "In queue", value: "inQueue" },
  { label: "Playing", value: "playing" },
  { label: "Paid", value: "paid" },
];

const DESKTOP_PLAYERS_LAYOUT_QUERY = "(min-width: 1023px)";
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const TWENTY_MINUTES_MS = 20 * 60 * 1000;

const getWaitingMs = (player: AcceptedPlayers, now: number) => {
  if (!player.timerStartedAt) return 0;

  return Math.max(0, now - new Date(player.timerStartedAt).getTime());
};

const getAllPlayersSortPriority = (player: AcceptedPlayers, now: number) => {
  if (player.matchStatus === "waiting") {
    const waitingMs = getWaitingMs(player, now);

    if (waitingMs >= TWENTY_MINUTES_MS) return 0;
    if (waitingMs >= FIFTEEN_MINUTES_MS) return 1;
    return 2;
  }

  if (player.matchStatus === "playing" && player.queueEntry) return 4;
  if (player.queueEntry || player.matchStatus === "inQueue") return 3;
  if (player.matchStatus === "playing") return 5;

  return 6;
};

const sortAllPlayersByPriority = (players: AcceptedPlayers[], now: number) =>
  players
    .map((player, index) => ({ player, index }))
    .sort((left, right) => {
      const leftPriority = getAllPlayersSortPriority(left.player, now);
      const rightPriority = getAllPlayersSortPriority(right.player, now);

      if (leftPriority !== rightPriority) return leftPriority - rightPriority;

      if (leftPriority <= 2) {
        return getWaitingMs(right.player, now) - getWaitingMs(left.player, now);
      }

      return left.index - right.index;
    })
    .map(({ player }) => player);

const sortPlayersByTimerBucket = (players: AcceptedPlayers[], now: number) =>
  players
    .map((player, index) => ({ player, index }))
    .sort((left, right) => {
      const leftWaitingMs = getWaitingMs(left.player, now);
      const rightWaitingMs = getWaitingMs(right.player, now);
      const leftPriority =
        leftWaitingMs >= TWENTY_MINUTES_MS
          ? 0
          : leftWaitingMs >= FIFTEEN_MINUTES_MS
            ? 1
            : 2;
      const rightPriority =
        rightWaitingMs >= TWENTY_MINUTES_MS
          ? 0
          : rightWaitingMs >= FIFTEEN_MINUTES_MS
            ? 1
            : 2;

      if (leftPriority !== rightPriority) return leftPriority - rightPriority;
      if (leftWaitingMs !== rightWaitingMs)
        return rightWaitingMs - leftWaitingMs;

      return left.index - right.index;
    })
    .map(({ player }) => player);

export default function Match() {
  const { communityId, hostId } = useParams();
  const {
    acceptedPlayers: players,
    setAcceptedPlayers: setPlayers,
    courts,
    setCourts,
    queues,
    setQueues,
    paymentsData,
    setPaymentsData,
    addFinishedMatchToPlayerHistory,
    refreshHostData,
    playerSearchTerm,
  } = useHostData();
  const [activePlayerStatus, setActivePlayerStatus] =
    useState<PlayerStatusFilter>("all");
  const [playerSortNow, setPlayerSortNow] = useState(() => Date.now());
  const [isPlayersListHidden, setIsPlayersListHidden] = useState(false);
  const [playerActiveDropdown, setPlayerActiveDropdown] = useState<
    string | null
  >(null);
  const [courtActiveDropdown, setCourtActiveDropdown] = useState<string | null>(
    null,
  );
  const [queueActiveDropdown, setQueueActiveDropdown] = useState<string | null>(
    null,
  );
  const [activeDraggedPlayerId, setActiveDraggedPlayerId] = useState<
    string | null
  >(null);
  const [busyCourtActions, setBusyCourtActions] = useState<
    Record<string, "starting" | "pausing" | "resuming" | "ending">
  >({});
  const [busyQueueIds, setBusyQueueIds] = useState<string[]>([]);
  const [relationshipToast, setRelationshipToast] =
    useState<RelationshipToastState | null>(null);
  const pendingCourtPlayerOperationsRef = useRef<Map<string, Promise<void>>>(
    new Map(),
  );
  const pendingQueuePlayerOperationsRef = useRef<Map<string, Promise<void>>>(
    new Map(),
  );
  const relationshipToastTimeoutRef = useRef<number | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const activeDraggedPlayer = activeDraggedPlayerId
    ? (players.find((player) => player.id === activeDraggedPlayerId) ?? null)
    : null;

  const blurActiveElement = () => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) activeElement.blur();
  };

  const showRelationshipToast = (messages: string[]) => {
    if (messages.length === 0) return;

    if (relationshipToastTimeoutRef.current !== null) {
      window.clearTimeout(relationshipToastTimeoutRef.current);
    }

    setRelationshipToast({
      id: Date.now(),
      messages: messages.slice(0, MAX_RELATIONSHIP_TOAST_MESSAGES),
    });

    relationshipToastTimeoutRef.current = window.setTimeout(() => {
      setRelationshipToast(null);
      relationshipToastTimeoutRef.current = null;
    }, 6500);
  };

  const dismissRelationshipToast = () => {
    if (relationshipToastTimeoutRef.current !== null) {
      window.clearTimeout(relationshipToastTimeoutRef.current);
      relationshipToastTimeoutRef.current = null;
    }

    setRelationshipToast(null);
  };

  useEffect(
    () => () => {
      if (relationshipToastTimeoutRef.current !== null) {
        window.clearTimeout(relationshipToastTimeoutRef.current);
      }
    },
    [],
  );

  const queueCourtPlayerOperation = (
    hostedPlayerId: string,
    operation: () => Promise<void>,
  ) => {
    const previousOperation =
      pendingCourtPlayerOperationsRef.current.get(hostedPlayerId) ??
      Promise.resolve();

    const nextOperation = previousOperation
      .catch(() => undefined)
      .then(operation)
      .finally(() => {
        const currentOperation =
          pendingCourtPlayerOperationsRef.current.get(hostedPlayerId);
        if (currentOperation === nextOperation) {
          pendingCourtPlayerOperationsRef.current.delete(hostedPlayerId);
        }
      });

    pendingCourtPlayerOperationsRef.current.set(hostedPlayerId, nextOperation);
    return nextOperation;
  };

  const queueQueuePlayerOperation = (
    hostedPlayerId: string,
    operation: () => Promise<void>,
  ) => {
    const previousOperation =
      pendingQueuePlayerOperationsRef.current.get(hostedPlayerId) ??
      Promise.resolve();

    const nextOperation = previousOperation
      .catch(() => undefined)
      .then(operation)
      .finally(() => {
        const currentOperation =
          pendingQueuePlayerOperationsRef.current.get(hostedPlayerId);
        if (currentOperation === nextOperation) {
          pendingQueuePlayerOperationsRef.current.delete(hostedPlayerId);
        }
      });

    pendingQueuePlayerOperationsRef.current.set(hostedPlayerId, nextOperation);
    return nextOperation;
  };

  const waitForPendingPlayerOperations = async (hostedPlayerIds: string[]) => {
    const pendingOperations = hostedPlayerIds.flatMap((hostedPlayerId) => {
      const courtOperation =
        pendingCourtPlayerOperationsRef.current.get(hostedPlayerId);
      const queueOperation =
        pendingQueuePlayerOperationsRef.current.get(hostedPlayerId);

      return [courtOperation, queueOperation].filter(
        (operation): operation is Promise<void> => Boolean(operation),
      );
    });

    if (pendingOperations.length > 0) {
      await Promise.allSettled(pendingOperations);
    }
  };

  const waitForAllPendingPlayerOperations = async () => {
    const pendingOperations = [
      ...pendingCourtPlayerOperationsRef.current.values(),
      ...pendingQueuePlayerOperationsRef.current.values(),
    ];

    if (pendingOperations.length > 0) {
      await Promise.allSettled(pendingOperations);
    }
  };

  const setCourtBusy = (
    courtId: string,
    isBusy: boolean,
    action: "starting" | "pausing" | "resuming" | "ending" = "starting",
  ) => {
    setBusyCourtActions((currentActions) => {
      if (isBusy) return { ...currentActions, [courtId]: action };

      const nextActions = { ...currentActions };
      delete nextActions[courtId];
      return nextActions;
    });
  };

  const setQueueBusy = (queueId: string, isBusy: boolean) => {
    setBusyQueueIds((currentQueueIds) =>
      isBusy
        ? currentQueueIds.includes(queueId)
          ? currentQueueIds
          : [...currentQueueIds, queueId]
        : currentQueueIds.filter(
            (currentQueueId) => currentQueueId !== queueId,
          ),
    );
  };

  const assignPlayerToCourtAPI = async (
    hostedPlayerId: string,
    courtId: string,
    position: number,
  ) => {
    await api.post(
      `/api/private/actions/courts/assign/community/${communityId}/hosts/${hostId}/courts/${courtId}/players/${hostedPlayerId}`,
      { position },
    );
  };

  const removePlayerFromCourtAPI = async (
    hostedPlayerId: string,
    courtId: string,
  ) => {
    await api.post(
      `/api/private/actions/courts/remove/slot/community/${communityId}/hosts/${hostId}/courts/${courtId}/players/${hostedPlayerId}`,
      {},
    );
  };

  const startCourtGameAPI = async (courtId: string) => {
    await api.post(
      `/api/community/${communityId}/hosts/${hostId}/courts/${courtId}/start`,
      {},
    );
  };

  const pauseCourtGameAPI = async (courtId: string) => {
    await api.post(
      `/api/community/${communityId}/hosts/${hostId}/courts/${courtId}/pause`,
      {},
    );
  };

  const resumeCourtGameAPI = async (courtId: string) => {
    await api.post(
      `/api/community/${communityId}/hosts/${hostId}/courts/${courtId}/resume`,
      {},
    );
  };

  const endCourtGameAPI = async (courtId: string, teamWinner: "A" | "B") => {
    const response = await api.post(
      `/api/community/${communityId}/hosts/${hostId}/courts/${courtId}/end`,
      { teamWinner },
    );

    return response.data as {
      hostedPlayerIds?: string[];
      playerIds?: string[];
      match?: FinishedMatchPayload;
    };
  };

  const deleteCourtAPI = async (courtId: string) => {
    const response = await api.delete(
      `/api/community/${communityId}/hosts/${hostId}/courts/${courtId}`,
    );

    return response.data as { hostedPlayerIds: string[] };
  };

  const renameCourtAPI = async (courtId: string, name: string) => {
    const response = await api.patch(
      `/api/community/${communityId}/hosts/${hostId}/courts/${courtId}`,
      { name },
    );

    return response.data as {
      court: {
        id: string;
        name: string;
        startedAt: string | null;
        endedAt: string | null;
      };
    };
  };

  const createCourtAPI = async () => {
    const response = await api.post(
      `/api/community/${communityId}/hosts/${hostId}/courts/add`,
      {},
    );

    return response.data as {
      court: {
        id: string;
        name: string;
        startedAt: string | null;
        endedAt: string | null;
      };
    };
  };

  const assignPlayerToQueueAPI = async (
    hostedPlayerId: string,
    queueId: string,
    position: number,
  ) => {
    await api.post(
      `/api/private/actions/queues/assign/community/${communityId}/hosts/${hostId}/queues/${queueId}/players/${hostedPlayerId}`,
      { position },
    );
  };

  const removePlayerFromQueueAPI = async (
    hostedPlayerId: string,
    queueId: string,
  ) => {
    await api.post(
      `/api/private/actions/queues/remove/slot/community/${communityId}/hosts/${hostId}/queues/${queueId}/players/${hostedPlayerId}`,
      {},
    );
  };

  const deleteQueueAPI = async (queueId: string) => {
    const response = await api.delete(
      `/api/community/${communityId}/hosts/${hostId}/queues/${queueId}`,
    );

    return response.data as { hostedPlayerIds: string[] };
  };

  const renameQueueAPI = async (queueId: string, name: string) => {
    const response = await api.patch(
      `/api/community/${communityId}/hosts/${hostId}/queues/${queueId}`,
      { name },
    );

    return response.data as {
      queue: {
        id: string;
        name: string;
      };
    };
  };

  const createQueueAPI = async () => {
    const response = await api.post(
      `/api/community/${communityId}/hosts/${hostId}/queues/add`,
      {},
    );

    return response.data as {
      queue: {
        id: string;
        name: string;
      };
    };
  };

  const transferQueueToCourtAndStartAPI = async (
    queueId: string,
    courtId: string,
  ) => {
    const response = await api.post(
      `/api/community/${communityId}/hosts/${hostId}/queues/${queueId}/transfer-to-court`,
      { courtId },
    );

    return response.data as {
      court: CourtType;
      queueId: string;
      hostedPlayerIds: string[];
    };
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDraggedPlayerId(null);

    const { active, over } = event;
    if (!over) return;

    const dropData = over.data.current as DropData | undefined;
    if (!dropData) return;

    if (dropData.type === "court-slot") {
      const sourceCourtId = active.data.current?.courtId as string | undefined;
      const sourceCourt = sourceCourtId
        ? courts.find((court) => court.id === sourceCourtId)
        : null;
      const targetCourt = courts.find((court) => court.id === dropData.courtId);

      if (isCourtActive(sourceCourt) || isCourtActive(targetCourt)) return;

      const hostedPlayerId =
        (active.data.current?.hostedPlayerId as string | undefined) ??
        String(active.id);
      const updatedCourts = getUpdatedCourts(
        courts,
        hostedPlayerId,
        dropData.courtId,
        dropData.position,
      );
      const updatedTargetCourt = updatedCourts.find(
        (court) => court.id === dropData.courtId,
      );
      const relationshipWarnings = updatedTargetCourt
        ? getRelationshipWarnings(players, updatedTargetCourt.assignments)
        : [];
      const replacedAssignment = targetCourt?.assignments.find(
        (assignment) =>
          assignment.position === dropData.position &&
          assignment.playerId !== hostedPlayerId,
      );
      const replacedPlayerId = replacedAssignment?.playerId;

      // Check if player is coming from a queue and remove them from it
      const player = players.find((p) => p.id === hostedPlayerId);
      let updatedQueues = queues;
      if (player?.queueEntry) {
        updatedQueues = getQueuesWithoutPlayer(
          queues,
          hostedPlayerId,
          player.queueEntry.queueId,
        );
      }

      setCourts(updatedCourts);
      setQueues(updatedQueues);
      setPlayers(
        getPlayersWithCourtAssignment(
          replacedPlayerId
            ? getPlayersWithoutCourtAssignment(players, replacedPlayerId)
            : players,
          hostedPlayerId,
          dropData.courtId,
          dropData.position,
          isCourtActive(updatedTargetCourt),
        ),
      );
      showRelationshipToast(relationshipWarnings);

      void queueCourtPlayerOperation(hostedPlayerId, async () => {
        try {
          await assignPlayerToCourtAPI(
            hostedPlayerId,
            dropData.courtId,
            dropData.position,
          );
          // Remove from queue if they were in one
          if (player?.queueEntry) {
            await removePlayerFromQueueAPI(
              hostedPlayerId,
              player.queueEntry.queueId,
            );
          }
        } catch (error) {
          if (axios.isAxiosError(error))
            console.error(error.response?.data ?? error);
          else console.error(error);

          await refreshHostData();
        }
      });
    } else if (dropData.type === "queue-slot") {
      const hostedPlayerId =
        (active.data.current?.hostedPlayerId as string | undefined) ??
        String(active.id);
      const updatedQueues = getUpdatedQueues(
        queues,
        hostedPlayerId,
        dropData.queueId,
        dropData.position,
      );
      const updatedTargetQueue = updatedQueues.find(
        (queue) => queue.id === dropData.queueId,
      );
      const relationshipWarnings = updatedTargetQueue
        ? getRelationshipWarnings(players, updatedTargetQueue.entries ?? [])
        : [];

      // Check if player is coming from a court and remove them from it
      const player = players.find((p) => p.id === hostedPlayerId);
      const sourceCourt = player?.courtAssignment
        ? courts.find((court) => court.id === player.courtAssignment?.courtId)
        : null;
      const shouldKeepCourtAssignment = isCourtActive(sourceCourt);
      let updatedCourts = courts;
      if (player?.courtAssignment && !shouldKeepCourtAssignment) {
        updatedCourts = getCourtsWithoutPlayer(
          courts,
          hostedPlayerId,
          player.courtAssignment.courtId,
        );
      }

      setQueues(updatedQueues);
      setCourts(updatedCourts);
      setPlayers(
        getPlayersWithQueueAssignment(
          players,
          hostedPlayerId,
          dropData.queueId,
          dropData.position,
        ),
      );
      showRelationshipToast(relationshipWarnings);

      void queueQueuePlayerOperation(hostedPlayerId, async () => {
        try {
          await assignPlayerToQueueAPI(
            hostedPlayerId,
            dropData.queueId,
            dropData.position,
          );
          // Remove from court if they were in one
          if (player?.courtAssignment && !shouldKeepCourtAssignment) {
            await removePlayerFromCourtAPI(
              hostedPlayerId,
              player.courtAssignment.courtId,
            );
          }
        } catch (error) {
          if (axios.isAxiosError(error))
            console.error(error.response?.data ?? error);
          else console.error(error);

          await refreshHostData();
        }
      });
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const hostedPlayerId =
      (event.active.data.current?.hostedPlayerId as string | undefined) ??
      String(event.active.id);

    setActiveDraggedPlayerId(hostedPlayerId);
  };

  const handlePlayerDropdown = (playerHostedId: string) => {
    if (courtActiveDropdown !== null) blurActiveElement();
    setCourtActiveDropdown(null);
    setPlayerActiveDropdown((prev) =>
      prev === playerHostedId ? null : playerHostedId,
    );
  };

  const handleCourtDropdown = (courtId: string) => {
    if (courtActiveDropdown !== null) blurActiveElement();
    setPlayerActiveDropdown(null);
    setCourtActiveDropdown((prev) => (prev === courtId ? null : courtId));
  };

  const handleCourtPlayerDropdown = () => {
    if (courtActiveDropdown !== null) blurActiveElement();
    setPlayerActiveDropdown(null);
    setCourtActiveDropdown(null);
    setQueueActiveDropdown(null);
  };

  const handleQueueDropdown = (queueId: string) => {
    if (queueActiveDropdown !== null) blurActiveElement();
    setPlayerActiveDropdown(null);
    setCourtActiveDropdown(null);
    setQueueActiveDropdown((prev) => (prev === queueId ? null : queueId));
  };

  const handleQueuePlayerDropdown = () => {
    if (queueActiveDropdown !== null) blurActiveElement();
    setPlayerActiveDropdown(null);
    setCourtActiveDropdown(null);
    setQueueActiveDropdown(null);
  };

  const handleRemovePlayerFromQueue = (
    hostedPlayerId: string,
    queueId: string,
  ) => {
    const updatedQueues = getQueuesWithoutPlayer(
      queues,
      hostedPlayerId,
      queueId,
    );

    setQueues(updatedQueues);
    setPlayers(getPlayersWithoutQueueAssignment(players, hostedPlayerId));

    void queueQueuePlayerOperation(hostedPlayerId, async () => {
      try {
        await removePlayerFromQueueAPI(hostedPlayerId, queueId);
      } catch (error) {
        if (axios.isAxiosError(error))
          console.error(error.response?.data ?? error);
        else console.error(error);

        await refreshHostData();
      }
    });
  };

  const handleTransferQueueToCourt = async (queueId: string) => {
    if (busyQueueIds.includes(queueId)) return;

    const queue = queues.find((queueItem) => queueItem.id === queueId);
    const targetCourt = getFirstAvailableEmptyCourt(courts);
    if (!queue || !queue.entries.length || !targetCourt) return;

    const previousCourts = courts;
    const previousQueues = queues;
    const previousPlayers = players;

    const assignments = queue.entries.map((entry) => ({
      playerId: entry.playerId,
      courtId: targetCourt.id,
      position: entry.position,
    }));

    let nextCourts = courts;
    assignments.forEach((assignment) => {
      nextCourts = getUpdatedCourts(
        nextCourts,
        assignment.playerId,
        assignment.courtId,
        assignment.position,
      );
    });

    nextCourts = getStartedCourt(nextCourts, targetCourt.id);

    const transferredPlayerIds = assignments.map(
      (assignment) => assignment.playerId,
    );

    const nextPlayers = getPlayersWithResetTimer(
      getPlayersWithoutQueueAssignments(
        getPlayersWithPlayersTransferredToCourt(players, assignments),
        transferredPlayerIds,
      ),
      transferredPlayerIds,
      "playing",
    );

    const nextQueues = getQueuesWithoutPlayers(
      queues,
      transferredPlayerIds,
      queueId,
    );

    setQueueBusy(queueId, true);
    setCourtBusy(targetCourt.id, true, "starting");
    setCourts(nextCourts);
    setPlayers(nextPlayers);
    setQueues(nextQueues);

    try {
      await waitForPendingPlayerOperations(transferredPlayerIds);
      const response = await transferQueueToCourtAndStartAPI(
        queueId,
        targetCourt.id,
      );

      setCourts((currentCourts) =>
        currentCourts.map((court) =>
          court.id === response.court.id ? response.court : court,
        ),
      );
    } catch (error) {
      setCourts(previousCourts);
      setPlayers(previousPlayers);
      setQueues(previousQueues);

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);

      await refreshHostData();
    } finally {
      setQueueBusy(queueId, false);
      setCourtBusy(targetCourt.id, false);
    }
  };

  const handleDeleteQueue = async (queueId: string) => {
    const previousQueues = queues;
    const previousPlayers = players;
    const deletedQueue = previousQueues.find((queue) => queue.id === queueId);
    const playerIds =
      deletedQueue?.entries.map((entry) => entry.playerId) ?? [];

    setQueueActiveDropdown(null);
    setQueues((currentQueues) =>
      currentQueues.filter((queue) => queue.id !== queueId),
    );
    setPlayers(getPlayersWithoutQueueAssignments(previousPlayers, playerIds));

    try {
      const response = await deleteQueueAPI(queueId);
      setPlayers((currentPlayers) =>
        getPlayersWithoutQueueAssignments(
          currentPlayers,
          response.hostedPlayerIds,
        ),
      );
    } catch (error) {
      setQueues(previousQueues);
      setPlayers(previousPlayers);

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    }
  };

  const handleRenameQueue = async (queueId: string, nextName: string) => {
    const cleanName = nextName.trim();
    if (!cleanName) return;

    const previousQueues = queues;

    setQueues((currentQueues) =>
      currentQueues.map((queue) =>
        queue.id === queueId ? { ...queue, name: cleanName } : queue,
      ),
    );

    try {
      const response = await renameQueueAPI(queueId, cleanName);
      setQueues((currentQueues) =>
        currentQueues.map((queue) =>
          queue.id === queueId
            ? { ...queue, name: response.queue.name }
            : queue,
        ),
      );
    } catch (error) {
      setQueues(previousQueues);

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    }
  };

  const handleAddQueue = async () => {
    const tempQueueId = `temp-queue-${Date.now()}`;
    const optimisticQueue: QueueType = {
      id: tempQueueId,
      hostId: hostId ?? "",
      name: `Queue ${queues.length + 1}`,
      entries: [],
    };

    setQueues((currentQueues) => [...currentQueues, optimisticQueue]);

    try {
      const response = await createQueueAPI();
      setQueues((currentQueues) =>
        currentQueues.map((queue) =>
          queue.id === tempQueueId
            ? {
                id: response.queue.id,
                hostId: hostId ?? "",
                name: response.queue.name,
                entries: [],
              }
            : queue,
        ),
      );
    } catch (error) {
      setQueues((currentQueues) =>
        currentQueues.filter((queue) => queue.id !== tempQueueId),
      );

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    }
  };

  const handleRemovePlayerFromCourt = (
    hostedPlayerId: string,
    courtId: string,
  ) => {
    const updatedCourts = getCourtsWithoutPlayer(
      courts,
      hostedPlayerId,
      courtId,
    );

    setCourts(updatedCourts);
    setPlayers(getPlayersWithoutCourtAssignment(players, hostedPlayerId));

    void queueCourtPlayerOperation(hostedPlayerId, async () => {
      try {
        await removePlayerFromCourtAPI(hostedPlayerId, courtId);
      } catch (error) {
        if (axios.isAxiosError(error))
          console.error(error.response?.data ?? error);
        else console.error(error);

        await refreshHostData();
      }
    });
  };

  const handleStartCourtGame = async (courtId: string) => {
    if (busyCourtActions[courtId]) return;

    const previousCourts = courts;
    const startedCourt = previousCourts.find((court) => court.id === courtId);
    const playerIds =
      startedCourt?.assignments.map((assignment) => assignment.playerId) ?? [];
    const previousPlayers = players;

    setCourtBusy(courtId, true, "starting");
    setCourts(getStartedCourt(previousCourts, courtId));
    setPlayers(getPlayersWithResetTimer(previousPlayers, playerIds, "playing"));

    try {
      await waitForPendingPlayerOperations(playerIds);
      await startCourtGameAPI(courtId);
    } catch (error) {
      setCourts(previousCourts);
      setPlayers(previousPlayers);

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    } finally {
      setCourtBusy(courtId, false);
    }
  };

  const handlePauseCourtGame = async (courtId: string) => {
    if (busyCourtActions[courtId]) return;

    const previousCourts = courts;
    const previousPlayers = players;
    const pausedCourt = previousCourts.find((court) => court.id === courtId);
    const playerIds =
      pausedCourt?.assignments.map((assignment) => assignment.playerId) ?? [];

    setCourtBusy(courtId, true, "pausing");
    setCourts(getPausedCourt(previousCourts, courtId));
    setPlayers(
      getPlayersWithMatchStatus(previousPlayers, playerIds, "inQueue"),
    );

    try {
      await pauseCourtGameAPI(courtId);
    } catch (error) {
      setCourts(previousCourts);
      setPlayers(previousPlayers);

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    } finally {
      setCourtBusy(courtId, false);
    }
  };

  const handleResumeCourtGame = async (courtId: string) => {
    if (busyCourtActions[courtId]) return;

    const previousCourts = courts;
    const resumedCourt = previousCourts.find((court) => court.id === courtId);
    const playerIds =
      resumedCourt?.assignments.map((assignment) => assignment.playerId) ?? [];
    const previousPlayers = players;

    setCourtBusy(courtId, true, "resuming");
    setCourts(getResumedCourt(previousCourts, courtId));
    setPlayers(getPlayersWithResetTimer(previousPlayers, playerIds, "playing"));

    try {
      await waitForAllPendingPlayerOperations();
      await resumeCourtGameAPI(courtId);
    } catch (error) {
      setCourts(previousCourts);
      setPlayers(previousPlayers);

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    } finally {
      setCourtBusy(courtId, false);
    }
  };

  const handleEndCourtGame = async (courtId: string, teamWinner: "A" | "B") => {
    if (busyCourtActions[courtId]) return;

    const previousCourts = courts;
    const previousPlayers = players;
    const previousPaymentsData = paymentsData;
    const endedCourt = previousCourts.find((court) => court.id === courtId);
    const playerIds =
      endedCourt?.assignments.map((assignment) => assignment.playerId) ?? [];

    setCourtBusy(courtId, true, "ending");
    setCourts(getEndedCourt(previousCourts, courtId));
    setPlayers(
      getPlayersWithIncrementedGames(
        getPlayersWithResetTimer(previousPlayers, playerIds, "waiting"),
        playerIds,
      ),
    );
    setPaymentsData((currentPaymentsData) => {
      const nextPlayers = currentPaymentsData.players.map((player) => {
        if (!playerIds.includes(player.id)) return player;

        const nextGamesPlayed = player.gamesPlayed + 1;
        const nextAmountExpected =
          player.payment.id === null
            ? currentPaymentsData.pricing.entranceFee +
              currentPaymentsData.pricing.perMatchFee * nextGamesPlayed
            : player.payment.amountExpected;

        return {
          ...player,
          gamesPlayed: nextGamesPlayed,
          payment: {
            ...player.payment,
            amountExpected: nextAmountExpected,
            balance: getPaymentBalance(
              nextAmountExpected,
              player.payment.amountPaid,
            ),
          },
        };
      });

      return {
        ...currentPaymentsData,
        players: nextPlayers,
        summary: buildPaymentsSummary(nextPlayers),
      };
    });

    try {
      await waitForAllPendingPlayerOperations();
      const response = await endCourtGameAPI(courtId, teamWinner);
      const endedPlayerIds =
        response.hostedPlayerIds ?? response.playerIds ?? [];

      if (response.match) addFinishedMatchToPlayerHistory(response.match);

      setPlayers((currentPlayers) =>
        response.match
          ? getPlayersWithIncrementedMatchRelationships(
              getUpdatedPlayerMatchSummaries(
                getPlayersWithResetTimer(
                  currentPlayers,
                  endedPlayerIds,
                  "waiting",
                ),
                response.match,
              ),
              response.match,
            )
          : getPlayersWithResetTimer(currentPlayers, endedPlayerIds, "waiting"),
      );
    } catch (error) {
      setCourts(previousCourts);
      setPlayers(previousPlayers);
      setPaymentsData(previousPaymentsData);

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    } finally {
      setCourtBusy(courtId, false);
    }
  };

  const handleDeleteCourt = async (courtId: string) => {
    const previousCourts = courts;
    const previousPlayers = players;
    const deletedCourt = previousCourts.find((court) => court.id === courtId);
    const playerIds =
      deletedCourt?.assignments.map((assignment) => assignment.playerId) ?? [];

    setCourtActiveDropdown(null);
    setCourts((currentCourts) =>
      currentCourts.filter((court) => court.id !== courtId),
    );
    setPlayers(getPlayersWithoutCourtAssignments(previousPlayers, playerIds));

    try {
      const response = await deleteCourtAPI(courtId);
      setPlayers((currentPlayers) =>
        getPlayersWithoutCourtAssignments(
          currentPlayers,
          response.hostedPlayerIds,
        ),
      );
    } catch (error) {
      setCourts(previousCourts);
      setPlayers(previousPlayers);

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    }
  };

  const handleRenameCourt = async (courtId: string, nextName: string) => {
    const cleanName = nextName.trim();
    if (!cleanName) return;

    const previousCourts = courts;

    setCourts((currentCourts) =>
      currentCourts.map((court) =>
        court.id === courtId ? { ...court, name: cleanName } : court,
      ),
    );

    try {
      const response = await renameCourtAPI(courtId, cleanName);
      setCourts((currentCourts) =>
        currentCourts.map((court) =>
          court.id === courtId
            ? { ...court, name: response.court.name }
            : court,
        ),
      );
    } catch (error) {
      setCourts(previousCourts);

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    }
  };

  const handleAddCourt = async () => {
    const tempCourtId = `temp-court-${Date.now()}`;
    const optimisticCourt: CourtType = {
      id: tempCourtId,
      name: `Court ${courts.length + 1}`,
      startedAt: null,
      endedAt: null,
      assignments: [],
    };

    setCourts((currentCourts) => [...currentCourts, optimisticCourt]);

    try {
      const response = await createCourtAPI();
      setCourts((currentCourts) =>
        currentCourts.map((court) =>
          court.id === tempCourtId
            ? {
                id: response.court.id,
                name: response.court.name,
                startedAt: response.court.startedAt,
                endedAt: response.court.endedAt,
                assignments: [],
              }
            : court,
        ),
      );
    } catch (error) {
      setCourts((currentCourts) =>
        currentCourts.filter((court) => court.id !== tempCourtId),
      );

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    }
  };

  useEffect(() => {
    const desktopPlayersLayout = window.matchMedia(
      DESKTOP_PLAYERS_LAYOUT_QUERY,
    );

    const showPlayersOnDesktop = () => {
      if (desktopPlayersLayout.matches) setIsPlayersListHidden(false);
    };

    showPlayersOnDesktop();
    desktopPlayersLayout.addEventListener("change", showPlayersOnDesktop);

    return () =>
      desktopPlayersLayout.removeEventListener("change", showPlayersOnDesktop);
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setPlayerSortNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const dropdowns = document.querySelectorAll("[data-dropdown]");
      const clickedInsideDropdown = Array.from(dropdowns).some((el) =>
        el.contains(target),
      );

      if (!clickedInsideDropdown) {
        if (courtActiveDropdown !== null) blurActiveElement();
        setPlayerActiveDropdown(null);
        setCourtActiveDropdown(null);
        setQueueActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [courtActiveDropdown, queueActiveDropdown]);

  const normalizedPlayerSearchTerm = playerSearchTerm.trim().toLowerCase();
  const paidPlayerIds = new Set(
    paymentsData.players
      .filter((player) => player.paymentStatus === "paid")
      .map((player) => player.id),
  );
  const filteredPlayers = (() => {
    const matchingPlayers = players.filter((player) => {
      const matchesStatus =
        activePlayerStatus === "all"
          ? !paidPlayerIds.has(player.id)
          : activePlayerStatus === "paid"
            ? paidPlayerIds.has(player.id)
            : activePlayerStatus === "waiting"
              ? player.matchStatus === activePlayerStatus &&
                !paidPlayerIds.has(player.id)
              : activePlayerStatus === "inQueue"
                ? player.matchStatus === activePlayerStatus ||
                  Boolean(player.queueEntry)
                : player.matchStatus === activePlayerStatus;
      const matchesSearch =
        normalizedPlayerSearchTerm === "" ||
        player.player.username
          .toLowerCase()
          .includes(normalizedPlayerSearchTerm);

      return matchesStatus && matchesSearch;
    });

    if (activePlayerStatus === "all") {
      return sortAllPlayersByPriority(matchingPlayers, playerSortNow);
    }

    if (
      activePlayerStatus === "waiting" ||
      activePlayerStatus === "inQueue" ||
      activePlayerStatus === "playing"
    ) {
      return sortPlayersByTimerBucket(matchingPlayers, playerSortNow);
    }

    return matchingPlayers;
  })();

  const isEmptyCourtAvailable = Boolean(getFirstAvailableEmptyCourt(courts));

  return (
    <>
      {relationshipToast ? (
        <div
          key={relationshipToast.id}
          role="status"
          className="fixed right-3 top-3 z-[3000] w-[min(420px,calc(100vw-1.5rem))] rounded-lg border border-red-300 bg-red-200 p-4 text-sm text-red-900 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <ul>
              {relationshipToast.messages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
            <button
              type="button"
              aria-label="Dismiss pair history warning"
              onClick={dismissRelationshipToast}
              className="flex shrink-0 cursor-pointer items-center justify-center rounded-full text-red-700 transition hover:bg-red-100 hover:text-red-950 p-1"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : null}
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDraggedPlayerId(null)}
      >
        <main className="flex min-h-full w-full flex-col gap-4 px-2 py-2 min-[1024px]:flex-row">
          {/* PLAYERS */}
          {isPlayersListHidden ? (
            <button
              type="button"
              onClick={() => setIsPlayersListHidden(false)}
              className="sticky top-2 z-40 ml-auto w-fit cursor-pointer self-end rounded-2xl border border-orange-100 bg-white px-4 py-2 text-sm font-semibold text-[var(--color-text)] shadow-sm transition hover:bg-orange-50"
            >
              Show players
            </button>
          ) : (
            <div className="sticky top-2 z-40 flex w-full flex-none flex-col self-start rounded-3xl border border-orange-100 bg-white p-3 shadow-sm max-h-[45dvh] lg:h-[calc(100dvh-5rem)] lg:max-h-[calc(100dvh-5rem)] lg:w-[440px] lg:p-4">
              <header className="mb-3 min-[1280px]:mb-4">
                <div className="">
                  <div className="w-full flex items-center justify-between">
                    <h5 className="text-base font-bold tracking-tight text-[var(--color-text)] min-[1280px]:text-xl">
                      Players
                    </h5>
                    <button
                      type="button"
                      onClick={() => setIsPlayersListHidden(true)}
                      className="cursor-pointer rounded-xl border border-orange-100 bg-orange-50 px-2.5 py-2 text-xs font-semibold text-[var(--color-text)] lg:hidden transition hover:bg-orange-100 min-[1280px]:block min-[1280px]:px-3 min-[1280px]:py-2 min-[1280px]:text-sm"
                    >
                      Hide
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-1 rounded-2xl border border-orange-100 bg-orange-50 p-1 min-[1280px]:mt-3">
                  {PLAYER_STATUS_FILTERS.map((playerStatus) => (
                    <button
                      key={playerStatus.value}
                      type="button"
                      onClick={() => setActivePlayerStatus(playerStatus.value)}
                      className={`w-full rounded-xl px-2 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer min-[1280px]:px-3 min-[1280px]:py-2 min-[1024px]:text-[10px] min-[1280px]:text-[12px] ${
                        activePlayerStatus === playerStatus.value
                          ? "bg-white text-[var(--color-text)] shadow-sm"
                          : "text-stone-500 hover:bg-white hover:text-[var(--color-accent)]"
                      }`}
                    >
                      {playerStatus.label}
                    </button>
                  ))}
                </div>
              </header>

              <main className="grid min-h-0 w-full  gap-2 overflow-y-auto rounded-2xl border border-orange-100 bg-orange-50/40 p-4 min-[768px]:grid-cols-2 sm:gap-3 min-[1280px]:gap-3 min-[1280px]:p-3">
                {filteredPlayers.length > 0 ? (
                  filteredPlayers.map((p) => (
                    <PlayerCard
                      key={p.id}
                      player={p}
                      activeDropdown={playerActiveDropdown}
                      onToggleDropdown={handlePlayerDropdown}
                    />
                  ))
                ) : (
                  <div className="col-span-full flex items-center justify-center rounded-2xl border border-dashed border-orange-200 bg-white py-12 text-sm text-stone-500">
                    {normalizedPlayerSearchTerm
                      ? "No players match your search"
                      : "No players in this status"}
                  </div>
                )}
              </main>
            </div>
          )}

          {/* COURTS & QUEUES */}
          <div className="order-2 min-[1280px]:order-none flex-1 min-w-0">
            <main className="flex h-full flex-col overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-sm">
              <header className="flex items-center justify-between border-b border-orange-100 px-5 py-4">
                <div>
                  <h3 className="text-lg font-bold text-[var(--color-text)]">
                    Courts & queues
                  </h3>
                  <p className="mt-1 text-sm text-stone-500">
                    Set up games, stage players, and transfer queues into open
                    courts.
                  </p>
                </div>
              </header>

              <div className="flex-1 overflow-auto p-4">
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-wide text-[var(--color-text)]">
                        Match Courts
                      </h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 max-[1240px]:grid-cols-1 gap-3">
                    {courts.map((court) => (
                      <CourtCard
                        key={court.id}
                        court={court}
                        players={players}
                        onRemovePlayerFromCourt={handleRemovePlayerFromCourt}
                        onStartCourtGame={handleStartCourtGame}
                        onPauseCourtGame={handlePauseCourtGame}
                        onResumeCourtGame={handleResumeCourtGame}
                        onEndCourtGame={handleEndCourtGame}
                        onRenameCourt={handleRenameCourt}
                        onDeleteCourt={handleDeleteCourt}
                        activeDropdown={courtActiveDropdown}
                        activePlayerDropdown={playerActiveDropdown}
                        onToggleDropdown={handleCourtDropdown}
                        onOpenPlayerDropdown={handleCourtPlayerDropdown}
                        busyAction={busyCourtActions[court.id]}
                      />
                    ))}

                    <button
                      type="button"
                      onClick={() => void handleAddCourt()}
                      className="
                    flex h-[100px] w-full max-w-[520px] items-center justify-center cursor-pointer sm:h-[120px]
                    rounded-2xl border border-dashed border-orange-200
                    bg-orange-50/40 text-sm font-semibold text-stone-500
                    transition-all duration-200
                    hover:border-[var(--color-primary)]
                    hover:bg-orange-50
                    hover:text-[var(--color-accent)]
                  "
                    >
                      + Add court
                    </button>
                  </div>
                </section>

                <section className="mt-6 border-t border-orange-100 pt-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-wide text-[var(--color-text)]">
                        Queue Courts
                      </h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 max-[1240px]:grid-cols-1 gap-3">
                    {queues.map((queue) => (
                      <QueueCard
                        key={queue.id}
                        queue={queue}
                        players={players}
                        onRemovePlayerFromQueue={handleRemovePlayerFromQueue}
                        onRenameQueue={handleRenameQueue}
                        onDeleteQueue={handleDeleteQueue}
                        onTransferToCourt={handleTransferQueueToCourt}
                        canTransferToCourt={isEmptyCourtAvailable}
                        isTransferring={busyQueueIds.includes(queue.id)}
                        activeDropdown={queueActiveDropdown}
                        activePlayerDropdown={playerActiveDropdown}
                        onToggleDropdown={handleQueueDropdown}
                        onOpenPlayerDropdown={handleQueuePlayerDropdown}
                      />
                    ))}

                    <button
                      type="button"
                      onClick={() => void handleAddQueue()}
                      className="
                    flex h-[120px] w-full max-w-[520px] items-center justify-center cursor-pointer
                    rounded-2xl border border-dashed border-orange-200
                    bg-orange-50/40 text-sm font-semibold text-stone-500
                    transition-all duration-200
                    hover:border-[var(--color-primary)]
                    hover:bg-orange-50
                    hover:text-[var(--color-accent)]
                  "
                    >
                      + Add queue
                    </button>
                  </div>
                </section>
              </div>
            </main>
          </div>
          {/* DRAG OVERLAY */}
          <DragOverlay zIndex={2000}>
            {activeDraggedPlayer ? (
              <div className="w-[176px]">
                <PlayerCard
                  player={activeDraggedPlayer}
                  activeDropdown={null}
                  onToggleDropdown={() => undefined}
                  canDrag={false}
                  canRemoveFromCourt={false}
                />
              </div>
            ) : null}
          </DragOverlay>
        </main>
      </DndContext>
    </>
  );
}
