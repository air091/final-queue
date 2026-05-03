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
import { useHostData } from "../../hooks/useHostData";
import {
  buildPaymentsSummary,
  getDerivedMatchStatus,
  getPaymentBalance,
  type AcceptedPlayers,
  type CourtType,
  type MatchPlayerStatus,
} from "../../lib/host";

type CourtDropData = {
  type: "court-slot";
  courtId: string;
  position: number;
};

type PlayerStatusFilter = "all" | MatchPlayerStatus;

const getUpdatedCourts = (
  currentCourts: CourtType[],
  hostedPlayerId: string,
  courtId: string,
  position: number,
) =>
  currentCourts.map((court) => {
    const assignmentsWithoutDraggedPlayer = court.assignments.filter(
      (assignment) => assignment.hostedPlayerId !== hostedPlayerId,
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
      (assignment) => assignment.hostedPlayerId === hostedPlayerId,
    );

    return {
      ...court,
      assignments: [
        ...nextAssignments,
        {
          id:
            existingAssignment?.id ??
            `${court.id}-${hostedPlayerId}-${position}`,
          hostedPlayerId,
          position,
        },
      ].sort((a, b) => a.position - b.position),
    };
  });

const getCourtsWithoutPlayer = (
  currentCourts: CourtType[],
  hostedPlayerId: string,
  courtId: string,
) =>
  currentCourts.map((court) =>
    court.id === courtId
      ? {
          ...court,
          assignments: court.assignments.filter(
            (assignment) => assignment.hostedPlayerId !== hostedPlayerId,
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
  hostedPlayerId: string,
  courtId: string,
  position: number,
  isCourtStarted: boolean,
) =>
  currentPlayers.map((player) =>
    player.id === hostedPlayerId
      ? {
          ...player,
          courtAssignment: {
            id:
              player.courtAssignment?.id ??
              `${courtId}-${hostedPlayerId}-${position}`,
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
  hostedPlayerIds: string[],
  nextStatus: MatchPlayerStatus,
) => {
  const now = new Date().toISOString();

  return currentPlayers.map((player) =>
    hostedPlayerIds.includes(player.id)
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
  hostedPlayerId: string,
) =>
  currentPlayers.map((player) => {
    if (player.id !== hostedPlayerId) return player;

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
  hostedPlayerIds: string[],
) =>
  currentPlayers.map((player) => {
    if (!hostedPlayerIds.includes(player.id)) return player;

    const nextPlayer = {
      ...player,
      courtAssignment: null,
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
  const [activeDraggedPlayerId, setActiveDraggedPlayerId] = useState<
    string | null
  >(null);
  const pendingCourtPlayerOperationsRef = useRef<Map<string, Promise<void>>>(
    new Map(),
  );
  const sensors = useSensors(useSensor(PointerSensor));

  const activeDraggedPlayer = activeDraggedPlayerId
    ? players.find((player) => player.id === activeDraggedPlayerId) ?? null
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

  const assignPlayerToCourtAPI = async (
    hostedPlayerId: string,
    courtId: string,
    position: number,
  ) => {
    await axios.post(
      `http://localhost:4000/api/private/actions/courts/assign/community/${communityId}/hosts/${hostId}/courts/${courtId}/${hostedPlayerId}`,
      { position },
      { withCredentials: true },
    );
  };

  const removePlayerFromCourtAPI = async (
    hostedPlayerId: string,
    courtId: string,
  ) => {
    await axios.post(
      `http://localhost:4000/api/private/actions/courts/remove/slot/community/${communityId}/hosts/${hostId}/courts/${courtId}/${hostedPlayerId}`,
      {},
      { withCredentials: true },
    );
  };

  const startCourtGameAPI = async (courtId: string) => {
    await axios.post(
      `http://localhost:4000/api/community/${communityId}/hosts/${hostId}/courts/${courtId}/start`,
      {},
      { withCredentials: true },
    );
  };

  const endCourtGameAPI = async (courtId: string) => {
    const response = await axios.post(
      `http://localhost:4000/api/community/${communityId}/hosts/${hostId}/courts/${courtId}/end`,
      {},
      { withCredentials: true },
    );

    return response.data as { hostedPlayerIds: string[] };
  };

  const deleteCourtAPI = async (courtId: string) => {
    const response = await axios.delete(
      `http://localhost:4000/api/community/${communityId}/hosts/${hostId}/courts/${courtId}`,
      { withCredentials: true },
    );

    return response.data as { hostedPlayerIds: string[] };
  };

  const renameCourtAPI = async (courtId: string, name: string) => {
    const response = await axios.patch(
      `http://localhost:4000/api/community/${communityId}/hosts/${hostId}/courts/${courtId}`,
      { name },
      { withCredentials: true },
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
    const response = await axios.post(
      `http://localhost:4000/api/community/${communityId}/hosts/${hostId}/courts/add`,
      {},
      { withCredentials: true },
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

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDraggedPlayerId(null);

    const { active, over } = event;
    if (!over) return;

    const dropData = over.data.current as CourtDropData | undefined;
    if (dropData?.type !== "court-slot") return;

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
    const hostedPlayerIds =
      startedCourt?.assignments.map(
        (assignment) => assignment.hostedPlayerId,
      ) ?? [];
    const previousPlayers = players;

    setCourts(getStartedCourt(previousCourts, courtId));
    setPlayers(
      getPlayersWithResetTimer(previousPlayers, hostedPlayerIds, "playing"),
    );

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
    const hostedPlayerIds =
      endedCourt?.assignments.map((assignment) => assignment.hostedPlayerId) ??
      [];

    setCourts(getEndedCourt(previousCourts, courtId));
    setPlayers(
      getPlayersWithResetTimer(previousPlayers, hostedPlayerIds, "waiting"),
    );
    setPaymentsData((currentPaymentsData) => {
      const nextPlayers = currentPaymentsData.players.map((player) => {
        if (!hostedPlayerIds.includes(player.id)) return player;

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
    const hostedPlayerIds =
      deletedCourt?.assignments.map(
        (assignment) => assignment.hostedPlayerId,
      ) ?? [];

    setCourtActiveDropdown(null);
    setCourts((currentCourts) =>
      currentCourts.filter((court) => court.id !== courtId),
    );
    setPlayers(
      getPlayersWithoutCourtAssignments(previousPlayers, hostedPlayerIds),
    );

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
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [courtActiveDropdown]);

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
              <div className="flex justify-center gap-3 flex-wrap p-2">
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
