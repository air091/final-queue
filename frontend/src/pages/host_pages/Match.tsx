import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import PlayerCard from "../../components/host_components/PlayerCard";
import CourtCard from "../../components/host_components/CourtCard";

export type MatchPlayerStatus = "waiting" | "inQueue" | "playing";

export type PlayerType = {
  id: string;
  username: string;
  profileUrl: string;
};

type QueueEntryType = {
  id: string;
  queueId: string;
  position: number;
};

type CourtAssignmentType = {
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

type PlayerAssignedInCourt = {
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

type CourtDropData = {
  type: "court-slot";
  courtId: string;
  position: number;
};

type PlayerStatusFilter = "all" | MatchPlayerStatus;

const getDerivedMatchStatus = (
  player: Pick<AcceptedPlayers, "queueEntry" | "courtAssignment">,
): MatchPlayerStatus => {
  if (player.courtAssignment) return "playing";
  if (player.queueEntry) return "inQueue";
  return "waiting";
};

const normalizeAcceptedPlayers = (players: AcceptedPlayers[]) =>
  players.map((player) => ({
    ...player,
    matchStatus: player.matchStatus ?? getDerivedMatchStatus(player),
  }));

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
) =>
  currentPlayers.map((player) =>
    player.id === hostedPlayerId
      ? {
          ...player,
          courtAssignment: {
            id: player.courtAssignment?.id ?? `${courtId}-${hostedPlayerId}-${position}`,
            courtId,
            position,
          },
          matchStatus: "playing" as MatchPlayerStatus,
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
  const [players, setPlayers] = useState<AcceptedPlayers[]>([]);
  const [courts, setCourts] = useState<CourtType[]>([]);
  const [activePlayerStatus, setActivePlayerStatus] =
    useState<PlayerStatusFilter>("waiting");
  const [playerActiveDropdown, setPlayerActiveDropdown] = useState<
    string | null
  >(null);
  const sensors = useSensors(useSensor(PointerSensor));

  const getPlayersAPI = async () => {
    try {
      const response = await axios.get(
        `http://localhost:4000/api/community/${communityId}/hosts/${hostId}/players`,
        { withCredentials: true },
      );
      setPlayers(normalizeAcceptedPlayers(response.data.acceptedPlayers));
    } catch (error) {
      if (axios.isAxiosError(error)) console.error(error);
      else console.error(error);
    }
  };

  const getCourtsAPI = async () => {
    try {
      const response = await axios.get(
        `http://localhost:4000/api/community/${communityId}/hosts/${hostId}/courts`,
        { withCredentials: true },
      );
      setCourts(response.data.courts);
    } catch (error) {
      if (axios.isAxiosError(error)) console.error(error);
      else console.error(error);
    }
  };

  useEffect(() => {
    getPlayersAPI();
    getCourtsAPI();
  }, []);

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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const dropData = over.data.current as CourtDropData | undefined;
    if (dropData?.type !== "court-slot") return;

    const previousCourts = courts;
    const previousPlayers = players;
    const hostedPlayerId =
      (active.data.current?.hostedPlayerId as string | undefined) ??
      String(active.id);
    const updatedCourts = getUpdatedCourts(
      previousCourts,
      hostedPlayerId,
      dropData.courtId,
      dropData.position,
    );

    setCourts(updatedCourts);
    setPlayers(
      getPlayersWithCourtAssignment(
        previousPlayers,
        hostedPlayerId,
        dropData.courtId,
        dropData.position,
      ),
    );

    try {
      await assignPlayerToCourtAPI(
        hostedPlayerId,
        dropData.courtId,
        dropData.position,
      );
    } catch (error) {
      setCourts(previousCourts);
      setPlayers(previousPlayers);

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    }
  };

  const handlePlayerDropdown = (playerHostedId: string) => {
    setPlayerActiveDropdown((prev) =>
      prev === playerHostedId ? null : playerHostedId,
    );
  };

  const handleRemovePlayerFromCourt = async (
    hostedPlayerId: string,
    courtId: string,
  ) => {
    const previousCourts = courts;
    const previousPlayers = players;
    const updatedCourts = getCourtsWithoutPlayer(
      previousCourts,
      hostedPlayerId,
      courtId,
    );

    setCourts(updatedCourts);
    setPlayers(getPlayersWithoutCourtAssignment(previousPlayers, hostedPlayerId));

    try {
      await removePlayerFromCourtAPI(hostedPlayerId, courtId);
    } catch (error) {
      setCourts(previousCourts);
      setPlayers(previousPlayers);

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    }
  };

  const handleStartCourtGame = async (courtId: string) => {
    const previousCourts = courts;
    const startedCourt = previousCourts.find((court) => court.id === courtId);
    const hostedPlayerIds =
      startedCourt?.assignments.map((assignment) => assignment.hostedPlayerId) ??
      [];
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
    const endedCourt = previousCourts.find((court) => court.id === courtId);
    const hostedPlayerIds =
      endedCourt?.assignments.map((assignment) => assignment.hostedPlayerId) ??
      [];

    setCourts(getEndedCourt(previousCourts, courtId));
    setPlayers(
      getPlayersWithResetTimer(previousPlayers, hostedPlayerIds, "waiting"),
    );

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

      if (!clickedInsideDropdown) setPlayerActiveDropdown(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredPlayers = players.filter((player) =>
    activePlayerStatus === "all"
      ? true
      : player.matchStatus === activePlayerStatus,
  );

  return (
    <>
      <header>
        <h3>Match</h3>
      </header>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <main className="flex">
          {/* players */}
          <div className="border w-full max-w-fit">
            <header>
              <h5>Players</h5>
              <div className="flex items-center justify-between border">
                {PLAYER_STATUS_FILTERS.map((playerStatus) => (
                  <button
                    key={playerStatus.value}
                    type="button"
                    onClick={() => setActivePlayerStatus(playerStatus.value)}
                    className={`cursor-pointer px-2 py-1 text-[14px] w-full ${
                      activePlayerStatus === playerStatus.value
                        ? "bg-stone-300"
                        : "hover:bg-stone-400"
                    }`}
                  >
                    {playerStatus.label}
                  </button>
                ))}
              </div>
            </header>
            <main className="border border-red-500 w-[360px] grid grid-cols-2 gap-2 p-2">
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
                  />
                ))}
                <button
                  type="button"
                  className="w-[420px] h-[120px] border cursor-pointer hover:bg-stone-200 rounded-md"
                >
                  Add court
                </button>
              </div>
            </main>
          </div>
        </main>
      </DndContext>
    </>
  );
}
