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

export type PlayerType = {
  id: string;
  username: string;
  profileUrl: string;
};

export type AcceptedPlayers = {
  id: string;
  player: PlayerType;
};

type PlayerAssignedInCourt = {
  id: string;
  hostedPlayerId: string;
  position: number;
};

export type CourtType = {
  id: string;
  name: string;
  assignments: PlayerAssignedInCourt[];
};

type CourtDropData = {
  type: "court-slot";
  courtId: string;
  position: number;
};

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

export default function Match() {
  const { communityId, hostId } = useParams();
  const [players, setPlayers] = useState<AcceptedPlayers[]>([]);
  const [courts, setCourts] = useState<CourtType[]>([]);
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
      setPlayers(response.data.acceptedPlayers);
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const dropData = over.data.current as CourtDropData | undefined;
    if (dropData?.type !== "court-slot") return;

    const previousCourts = courts;
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

    try {
      await assignPlayerToCourtAPI(
        hostedPlayerId,
        dropData.courtId,
        dropData.position,
      );
    } catch (error) {
      setCourts(previousCourts);

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
    const updatedCourts = getCourtsWithoutPlayer(
      previousCourts,
      hostedPlayerId,
      courtId,
    );

    setCourts(updatedCourts);

    try {
      await removePlayerFromCourtAPI(hostedPlayerId, courtId);
    } catch (error) {
      setCourts(previousCourts);

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
                <button className="hover:bg-stone-400 cursor-pointer">
                  All
                </button>
                <button className="hover:bg-stone-400 cursor-pointer">
                  Waiting
                </button>
                <button className="hover:bg-stone-400 cursor-pointer">
                  In queue
                </button>
                <button className="hover:bg-stone-400 cursor-pointer">
                  Playing
                </button>
              </div>
            </header>
            <main className="border border-red-500 w-[360px] grid grid-cols-2 gap-2 p-2">
              {players.length > 0 ? (
                players.map((p) => (
                  <PlayerCard
                    key={p.id}
                    player={p}
                    activeDropdown={playerActiveDropdown}
                    onToggleDropdown={handlePlayerDropdown}
                  />
                ))
              ) : (
                <p>No players yet</p>
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
