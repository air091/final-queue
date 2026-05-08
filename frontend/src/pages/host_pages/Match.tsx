import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
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
  type MatchPlayerStatus,
  type QueueType,
} from "../../lib/host";

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

type PlayerStatusFilter = "all" | MatchPlayerStatus;

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

  return currentPlayers.map((player) =>
    playerIds.includes(player.id)
      ? {
          ...player,
          courtAssignment:
            nextStatus === "playing" ? player.courtAssignment : null,
          matchStatus: nextStatus,
          timerStartedAt: now,
        }
      : player,
  );
};

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
    const entriesWithoutDraggedPlayer = queue.entries.filter(
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
    const existingEntry = queue.entries.find(
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

const getPlayersWithQueueAssignment = (
  currentPlayers: AcceptedPlayers[],
  playerId: string,
  queueId: string,
  position: number,
) =>
  currentPlayers.map((player) =>
    player.id === playerId
      ? {
          ...player,
          queueEntry: {
            id: player.queueEntry?.id ?? `${queueId}-${playerId}-${position}`,
            queueId,
            position,
          },
          matchStatus: "inQueue" as MatchPlayerStatus,
        }
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
      matchStatus: getDerivedMatchStatus(nextPlayer),
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
      matchStatus: getDerivedMatchStatus(nextPlayer),
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
];

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
    refreshHostData,
  } = useHostData();
  const [activePlayerStatus, setActivePlayerStatus] =
    useState<PlayerStatusFilter>("waiting");
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
  const pendingCourtPlayerOperationsRef = useRef<Map<string, Promise<void>>>(
    new Map(),
  );
  const pendingQueuePlayerOperationsRef = useRef<Map<string, Promise<void>>>(
    new Map(),
  );
  const sensors = useSensors(useSensor(PointerSensor));

  const activeDraggedPlayer = activeDraggedPlayerId
    ? (players.find((player) => player.id === activeDraggedPlayerId) ?? null)
    : null;

  const blurActiveElement = () => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) activeElement.blur();
  };

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

  const endCourtGameAPI = async (courtId: string) => {
    const response = await api.post(
      `/api/community/${communityId}/hosts/${hostId}/courts/${courtId}/end`,
      {},
    );

    return response.data as { hostedPlayerIds: string[] };
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

      if (sourceCourt?.startedAt || targetCourt?.startedAt) return;

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

      setCourts(updatedCourts);
      setPlayers(
        getPlayersWithCourtAssignment(
          players,
          hostedPlayerId,
          dropData.courtId,
          dropData.position,
          Boolean(updatedTargetCourt?.startedAt),
        ),
      );

      void queueCourtPlayerOperation(hostedPlayerId, async () => {
        try {
          await assignPlayerToCourtAPI(
            hostedPlayerId,
            dropData.courtId,
            dropData.position,
          );
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

      setQueues(updatedQueues);
      setPlayers(
        getPlayersWithQueueAssignment(
          players,
          hostedPlayerId,
          dropData.queueId,
          dropData.position,
        ),
      );

      void queueQueuePlayerOperation(hostedPlayerId, async () => {
        try {
          await assignPlayerToQueueAPI(
            hostedPlayerId,
            dropData.queueId,
            dropData.position,
          );
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
    const previousCourts = courts;
    const startedCourt = previousCourts.find((court) => court.id === courtId);
    const playerIds =
      startedCourt?.assignments.map((assignment) => assignment.playerId) ?? [];
    const previousPlayers = players;

    setCourts(getStartedCourt(previousCourts, courtId));
    setPlayers(getPlayersWithResetTimer(previousPlayers, playerIds, "playing"));

    try {
      await startCourtGameAPI(courtId);
    } catch (error) {
      setCourts(previousCourts);
      setPlayers(previousPlayers);

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    }
  };

  const handleEndCourtGame = async (courtId: string) => {
    const previousCourts = courts;
    const previousPlayers = players;
    const previousPaymentsData = paymentsData;
    const endedCourt = previousCourts.find((court) => court.id === courtId);
    const playerIds =
      endedCourt?.assignments.map((assignment) => assignment.playerId) ?? [];

    setCourts(getEndedCourt(previousCourts, courtId));
    setPlayers(getPlayersWithResetTimer(previousPlayers, playerIds, "waiting"));
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
      const response = await endCourtGameAPI(courtId);
      setPlayers((currentPlayers) =>
        getPlayersWithResetTimer(
          currentPlayers,
          response.hostedPlayerIds,
          "waiting",
        ),
      );
    } catch (error) {
      setCourts(previousCourts);
      setPlayers(previousPlayers);
      setPaymentsData(previousPaymentsData);

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
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

  const filteredPlayers = players.filter((player) =>
    activePlayerStatus === "all"
      ? true
      : player.matchStatus === activePlayerStatus,
  );

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDraggedPlayerId(null)}
      >
        <main className="flex">
          {/* players */}
          <div className="border w-full max-w-fit p-2">
            <header>
              <h5 className="font-semibold">Players</h5>
              <div className="flex items-center justify-between my-2">
                {PLAYER_STATUS_FILTERS.map((playerStatus) => (
                  <button
                    key={playerStatus.value}
                    type="button"
                    onClick={() => setActivePlayerStatus(playerStatus.value)}
                    className={`cursor-pointer px-2 py-1 text-[14px] w-full rounded-xs ${
                      activePlayerStatus === playerStatus.value
                        ? "bg-accent text-background"
                        : "hover:bg-secondary"
                    }`}
                  >
                    {playerStatus.label}
                  </button>
                ))}
              </div>
            </header>
            <main className="w-[360px] grid grid-cols-2 gap-1">
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
                <p>No players in this status</p>
              )}
            </main>
          </div>
          {/* court & queue */}
          <div className="border w-full">
            <main>
              {/* court */}
              <div className="p-2">
                <h3 className="text-lg font-semibold mb-2">Match Courts</h3>
                <div className="flex justify-center gap-3 flex-wrap">
                  {courts.map((court) => (
                    <CourtCard
                      key={court.id}
                      court={court}
                      players={players}
                      onRemovePlayerFromCourt={handleRemovePlayerFromCourt}
                      onStartCourtGame={handleStartCourtGame}
                      onEndCourtGame={handleEndCourtGame}
                      onRenameCourt={handleRenameCourt}
                      onDeleteCourt={handleDeleteCourt}
                      activeDropdown={courtActiveDropdown}
                      activePlayerDropdown={playerActiveDropdown}
                      onToggleDropdown={handleCourtDropdown}
                      onOpenPlayerDropdown={handleCourtPlayerDropdown}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => void handleAddCourt()}
                    className="w-[420px] h-[120px] border rounded-md cursor-pointer hover:bg-stone-200"
                  >
                    Add court
                  </button>
                </div>
              </div>
              {/* queue */}
              <div className="p-2 border-t">
                <h3 className="text-lg font-semibold mb-2">Queue Courts</h3>
                <div className="flex justify-center gap-3 flex-wrap">
                  {queues.map((queue) => (
                    <QueueCard
                      key={queue.id}
                      queue={queue}
                      players={players}
                      onRemovePlayerFromQueue={handleRemovePlayerFromQueue}
                      onRenameQueue={handleRenameQueue}
                      onDeleteQueue={handleDeleteQueue}
                      activeDropdown={queueActiveDropdown}
                      activePlayerDropdown={playerActiveDropdown}
                      onToggleDropdown={handleQueueDropdown}
                      onOpenPlayerDropdown={handleQueuePlayerDropdown}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => void handleAddQueue()}
                    className="w-[420px] h-[120px] border rounded-md cursor-pointer hover:bg-stone-200"
                  >
                    Add queue
                  </button>
                </div>
              </div>
            </main>
          </div>
        </main>
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
      </DndContext>
    </>
  );
}
