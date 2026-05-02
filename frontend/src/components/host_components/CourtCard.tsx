import { useDroppable } from "@dnd-kit/core";
import { HiOutlineDotsVertical } from "react-icons/hi";
import PlayerCard from "./PlayerCard";
import type { AcceptedPlayers, CourtType } from "../../pages/host_pages/Match";
import { useEffect, useState } from "react";

type CourtCardProps = {
  court: CourtType;
  players: AcceptedPlayers[];
  onRemovePlayerFromCourt: (hostedPlayerId: string, courtId: string) => void;
  onStartCourtGame: (courtId: string) => void;
  onEndCourtGame: (courtId: string) => void;
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
  isGameStarted: boolean;
  onRemovePlayerFromCourt: (hostedPlayerId: string, courtId: string) => void;
};

function CourtSlot({
  courtId,
  position,
  label,
  player,
  isGameStarted,
  onRemovePlayerFromCourt,
}: CourtSlotProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `court-slot-${courtId}-${position}`,
    disabled: isGameStarted,
    data: {
      type: "court-slot",
      courtId,
      position,
    },
  });
  const [playerActiveDropdown, setPlayerActiveDropdown] = useState<
    string | null
  >(null);

  const handlePlayerDropdown = (playerHostedId: string) => {
    setPlayerActiveDropdown((prev) =>
      prev === playerHostedId ? null : playerHostedId,
    );
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
            activeDropdown={playerActiveDropdown}
            onToggleDropdown={handlePlayerDropdown}
            isInSlot
            canDrag={!isGameStarted}
            canRemoveFromCourt={!isGameStarted}
            courtId={courtId}
            onRemoveFromCourt={onRemovePlayerFromCourt}
          />
        </div>
      ) : (
        <span>{label}</span>
      )}
    </div>
  );
}

export default function CourtCard({
  court,
  players,
  onRemovePlayerFromCourt,
  onStartCourtGame,
  onEndCourtGame,
}: CourtCardProps) {
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

  const hasTeamAPlayer = court.assignments.some(
    (assignment) => assignment.position === 1 || assignment.position === 3,
  );
  const hasTeamBPlayer = court.assignments.some(
    (assignment) => assignment.position === 2 || assignment.position === 4,
  );
  const canStartGame = !court.startedAt && hasTeamAPlayer && hasTeamBPlayer;
  const isGameStarted = Boolean(court.startedAt);

  return (
    <div className="border w-[420px] p-2 rounded-md">
      <header className="flex items-center justify-between">
        <div className="grid">
          <span className="leading-[12px] font-semibold">{court.name}</span>
          {court.startedAt && (
            <span className="text-[12px] text-green-700">Game in progress</span>
          )}
        </div>
        <div className="flex items-center gap-x-2">
          {canStartGame && (
            <button
              type="button"
              onClick={() => onStartCourtGame(court.id)}
              className="cursor-pointer rounded-md bg-stone-800 px-2 py-1 text-[12px] text-white hover:bg-stone-700"
            >
              Start game
            </button>
          )}
          {court.startedAt && (
            <button
              type="button"
              onClick={() => onEndCourtGame(court.id)}
              className="cursor-pointer rounded-md bg-red-600 px-2 py-1 text-[12px] text-white hover:bg-red-500"
            >
              End game
            </button>
          )}
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
            isGameStarted={isGameStarted}
            onRemovePlayerFromCourt={onRemovePlayerFromCourt}
          />
        ))}
      </main>
    </div>
  );
}
