import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { HiOutlineDotsVertical } from "react-icons/hi";
import { DndContext } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import PlayerCard from "../../components/host_components/PlayerCard";

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

type CourtType = {
  id: string;
  name: string;
  assignments: PlayerAssignedInCourt;
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
                <div key={court.id} className="border w-[420px] p-2 rounded-md">
                  <header className="flex items-center justify-between">
                    <span>{court.name}</span>
                    <div className="flex items-center gap-x-2">
                      {/* <span>{court.}</span> */}
                      <div className="cursor-pointer hover:bg-stone-400 p-1 rounded-full w-fit">
                        <HiOutlineDotsVertical />
                      </div>
                    </div>
                  </header>
                  <main className="grid grid-cols-2 gap-x-2 gap-y-3 mt-3">
                    <div className="border w-full h-[46px] flex items-center justify-center rounded-md">
                      <span>Team A</span>
                    </div>
                    <div className="border w-full h-[46px] flex items-center justify-center rounded-md">
                      <span>Team B</span>
                    </div>
                    <div className="border w-full h-[46px] flex items-center justify-center rounded-md">
                      <span>Team A</span>
                    </div>
                    <div className="border w-full h-[46px] flex items-center justify-center rounded-md">
                      <span>Team B</span>
                    </div>
                  </main>
                </div>
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
