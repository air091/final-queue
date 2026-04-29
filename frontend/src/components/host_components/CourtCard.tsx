import { useDroppable } from "@dnd-kit/core";
import { HiOutlineDotsVertical } from "react-icons/hi";
import PlayerCard from "./PlayerCard";
import type { AcceptedPlayers, CourtType } from "../../pages/host_pages/Match";

type CourtCardProps = {
  court: CourtType;
  players: AcceptedPlayers[];
};

const COURT_SLOTS = [
  { position: 1, label: "Team A" },
  { position: 2, label: "Team B" },
  { position: 3, label: "Team A" },
  { position: 4, label: "Team B" },
];

type CourtSlotProps = {
  courtId: string;
  position: number;
  label: string;
  player?: AcceptedPlayers;
};

function CourtSlot({ courtId, position, label, player }: CourtSlotProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `court-slot-${courtId}-${position}`,
    data: {
      type: "court-slot",
      courtId,
      position,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`border w-full min-h-[48px] flex items-center justify-center rounded-md transition-colors px-2 py-1 ${
        isOver ? "bg-stone-200 border-stone-500" : ""
      }`}
    >
      {player ? (
        <div className="w-full">
          <PlayerCard
            player={player}
            draggableId={`court-player-${courtId}-${position}-${player.id}`}
          />
        </div>
      ) : (
        <span>{label}</span>
      )}
    </div>
  );
}

export default function CourtCard({ court, players }: CourtCardProps) {
  const getAssignedPlayer = (position: number) => {
    const assignment = court.assignments.find(
      (item) => item.position === position,
    );

    if (!assignment) return undefined;
    return players.find((player) => player.id === assignment.hostedPlayerId);
  };

  const getSlotLabel = (position: number) => {
    return COURT_SLOTS.find((slot) => slot.position === position)?.label ?? "";
  };

  return (
    <div className="border w-[420px] p-2 rounded-md">
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
        {COURT_SLOTS.map((slot) => (
          <CourtSlot
            key={slot.position}
            courtId={court.id}
            position={slot.position}
            label={getSlotLabel(slot.position)}
            player={getAssignedPlayer(slot.position)}
          />
        ))}
      </main>
    </div>
  );
}
