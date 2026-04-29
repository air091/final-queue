import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { DndContext } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import PlayerCard from "../../components/host_components/PlayerCard";
import CourtCard from "../../components/host_components/CourtCard";

type PlayerType = {
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

export default function Match() {
  const { communityId, hostId } = useParams();
  const [players, setPlayers] = useState<AcceptedPlayers[]>([]);
  const [courts, setCourts] = useState<CourtType[]>([]);

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
      console.log(response.data.courts);
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

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    setPlayers((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);

      return arrayMove(items, oldIndex, newIndex);
    });
  };

  return (
    <>
      <header>
        <h3>Match</h3>
      </header>
      <main className="flex">
        {/* players */}
        <div className="border w-full max-w-fit">
          <header>
            <h5>Players</h5>
          </header>
          <DndContext onDragEnd={handleDragEnd}>
            <SortableContext
              items={players.map((p) => p.id)}
              strategy={rectSortingStrategy}
            >
              <main className="border border-red-500 w-full max-w-fit grid grid-cols-2 gap-2 p-2">
                {players.length > 0 ? (
                  players.map((p) => <PlayerCard key={p.id} player={p} />)
                ) : (
                  <p>No players yet</p>
                )}
              </main>
            </SortableContext>
          </DndContext>
        </div>
        {/* court & queue */}
        <div className="border w-full">
          <main>
            {/* court */}
            <div className="flex justify-center gap-3 flex-wrap p-2">
              {courts.map((court) => (
                <CourtCard key={court.id} court={court} players={players} />
              ))}
              <button
                type="button"
                className="w-[420px] h-[92px] border cursor-pointer hover:bg-stone-200 rounded-md"
              >
                Add court
              </button>
            </div>
          </main>
        </div>
      </main>
    </>
  );
}
