import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { HiOutlineDotsVertical } from "react-icons/hi";
import { DndContext } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type PlayerType = {
  id: string;
  username: string;
  profileUrl: string;
};

type AcceptedPlayers = {
  id: string;
  player: PlayerType;
};

export default function Match() {
  const { communityId, hostId } = useParams();
  const [players, setPlayers] = useState<AcceptedPlayers[]>([]);

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

  useEffect(() => {
    getPlayersAPI();
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

  function PlayerCard({ p }: any) {
    const { setNodeRef, attributes, listeners, transform, transition } =
      useSortable({ id: p.id });

    return (
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
        }}
        className="border w-fit flex items-center gap-x-10 py-1 px-1 cursor-pointer hover:bg-stone-200 rounded-full"
      >
        <div className="flex items-center gap-x-2">
          <div className="w-[28px] h-[28px] rounded-full border">
            <img
              src={p.player.profileUrl}
              className="block w-full h-full object-contain rounded-full"
            />
          </div>
          <span>{p.player.username}</span>
        </div>
        <div className="cursor-pointer hover:bg-stone-400 p-1 rounded-full">
          <HiOutlineDotsVertical />
        </div>
      </div>
    );
  }

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
                  players.map((p) => <PlayerCard key={p.id} p={p} />)
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
            <div className="flex gap-3 flex-wrap p-2">
              <div className="border w-[420px] p-2 rounded-md">
                <header className="flex items-center justify-between">
                  <span>Court 1</span>
                  <div className="flex items-center gap-x-2">
                    <span>available</span>
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
              <button
                type="button"
                className="w-[420px] h-[92px] border cursor-pointer hover:bg-stone-200"
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
