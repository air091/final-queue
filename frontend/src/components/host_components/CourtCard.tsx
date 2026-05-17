import { useDroppable } from "@dnd-kit/core";
import { HiOutlineDotsVertical } from "react-icons/hi";
import PlayerCard from "./PlayerCard";
import CourtDropdown from "./CourtDropdown";
import { useEffect, useState } from "react";
import type { AcceptedPlayers, CourtType } from "../../lib/host";

type CourtCardProps = {
  court: CourtType;
  players: AcceptedPlayers[];
  onRemovePlayerFromCourt: (hostedPlayerId: string, courtId: string) => void;
  onStartCourtGame: (courtId: string) => void;
  onEndCourtGame: (courtId: string) => void;
  onRenameCourt: (courtId: string, nextName: string) => void;
  onDeleteCourt: (courtId: string) => void;
  activeDropdown: string | null;
  activePlayerDropdown: string | null;
  onToggleDropdown: (courtId: string) => void;
  onOpenPlayerDropdown: () => void;
  busyAction?: "starting" | "ending";
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
  isInteractionDisabled: boolean;
  onRemovePlayerFromCourt: (hostedPlayerId: string, courtId: string) => void;
  activeCourtDropdown: string | null;
  activePlayerDropdown: string | null;
  onOpenPlayerDropdown: () => void;
};

function CourtSlot({
  courtId,
  position,
  label,
  player,
  isInteractionDisabled,
  onRemovePlayerFromCourt,
  activeCourtDropdown,
  activePlayerDropdown,
  onOpenPlayerDropdown,
}: CourtSlotProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `court-slot-${courtId}-${position}`,
    disabled: isInteractionDisabled,
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
    onOpenPlayerDropdown();
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

  useEffect(() => {
    if (activeCourtDropdown !== null || activePlayerDropdown !== null) {
      setPlayerActiveDropdown(null);
    }
  }, [activeCourtDropdown, activePlayerDropdown]);

  return (
    <div
      ref={setNodeRef}
      className={`relative border-2 border-white text-white w-full min-h-[56px] sm:min-h-[68px] flex items-center justify-center rounded-md overflow-hidden px-2 py-1 z-50`}
    >
      {/* Blurred background layer */}
      <div
        className={`absolute inset-0 transition-colors backdrop-blur-[1.5px] ${
          isOver ? "bg-stone-200/40 backdrop-blur-md" : ""
        }`}
      />

      {/* Content */}
      <div className="relative z-10 w-full flex items-center justify-center">
        {player ? (
          <PlayerCard
            player={player}
            draggableId={`court-player-${courtId}-${position}-${player.id}`}
            activeDropdown={playerActiveDropdown}
            onToggleDropdown={handlePlayerDropdown}
            isInSlot
            canDrag={!isInteractionDisabled}
            canRemoveFromCourt={!isInteractionDisabled}
            courtId={courtId}
            onRemoveFromCourt={onRemovePlayerFromCourt}
          />
        ) : (
          <span>{label}</span>
        )}
      </div>
    </div>
  );
}

export default function CourtCard({
  court,
  players,
  onRemovePlayerFromCourt,
  onStartCourtGame,
  onEndCourtGame,
  onRenameCourt,
  onDeleteCourt,
  activeDropdown,
  activePlayerDropdown,
  onToggleDropdown,
  onOpenPlayerDropdown,
  busyAction,
}: CourtCardProps) {
  const getAssignedPlayer = (position: number) => {
    const assignment = court.assignments.find(
      (item) => item.position === position,
    );

    if (!assignment) return undefined;
    return players.find((player) => player.id === assignment.playerId);
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
  const isBusy = Boolean(busyAction);
  const canStartGame =
    !isBusy && !court.startedAt && hasTeamAPlayer && hasTeamBPlayer;
  const isGameStarted = Boolean(court.startedAt);
  const isInteractionDisabled = isBusy || isGameStarted;
  const endButtonLabel =
    busyAction === "starting"
      ? "Starting..."
      : busyAction === "ending"
        ? "Ending..."
        : "End game";

  return (
    <div className="relative w-full max-w-[420px] rounded-2xl border border-stone-200 bg-white p-2 shadow-sm transition hover:shadow-md sm:max-w-[520px] sm:p-3">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 300 150"
        fill="none"
        stroke="rgba(200, 200, 200, 0.8)"
        strokeWidth="2"
        preserveAspectRatio="none"
        className="bg-green-800/80 absolute top-0 left-0 z-0 rounded-md"
      >
        <rect
          x="25"
          y="25"
          width="250"
          height="100"
          fill="none"
          stroke="rgba(200, 200, 200, 0.8)"
          strokeWidth="2"
        />
        <line
          x1="150"
          y1="25"
          x2="150"
          y2="125"
          stroke="rgba(200, 200, 200, 0.8)"
          strokeWidth="2"
          strokeDasharray="5,5"
        />
        <line
          x1="25"
          y1="50"
          x2="275"
          y2="50"
          stroke="rgba(200, 200, 200, 0.8)"
          strokeWidth="1.5"
        />
        <line
          x1="25"
          y1="100"
          x2="275"
          y2="100"
          stroke="rgba(200, 200, 200, 0.8)"
          strokeWidth="1.5"
        />
        <line
          x1="50"
          y1="25"
          x2="50"
          y2="125"
          stroke="rgba(200, 200, 200, 0.8)"
          strokeWidth="1.5"
        />
        <line
          x1="250"
          y1="25"
          x2="250"
          y2="125"
          stroke="rgba(200, 200, 200, 0.8)"
          strokeWidth="1.5"
        />
      </svg>
      <header className="relative z-[120] flex items-center justify-between">
        <div className="grid">
          <span className="leading-[12px] font-semibold text-background [text-shadow:0_1px_2px_rgba(0,0,0,1)]">
            {court.name}
          </span>
          {court.startedAt && (
            <span className="text-[12px] text-green-700">Game in progress</span>
          )}
        </div>
        <div className="flex items-center gap-x-2">
          {canStartGame && (
            <button
              type="button"
              onClick={() => onStartCourtGame(court.id)}
              disabled={isBusy}
              className="cursor-pointer rounded-md bg-stone-800 px-2 py-1 text-[12px] text-white hover:bg-stone-700 disabled:cursor-wait disabled:opacity-70"
            >
              Start game
            </button>
          )}
          {court.startedAt && (
            <button
              type="button"
              onClick={() => onEndCourtGame(court.id)}
              disabled={isBusy}
              className="cursor-pointer rounded-md bg-red-600 px-2 py-1 text-[12px] text-white hover:bg-red-500 disabled:cursor-wait disabled:opacity-70"
            >
              {endButtonLabel}
            </button>
          )}
          <div
            data-dropdown
            onPointerDown={(e) => e.stopPropagation()}
            className={`relative ${activeDropdown === court.id ? "z-[130]" : ""}`}
          >
            <div
              title="Court settings"
              className="cursor-pointer text-background hover:bg-green-800 p-1 rounded-full w-fit [text-shadow:0_1px_2px_rgba(0,0,0,1)]"
              onClick={() => onToggleDropdown(court.id)}
            >
              <HiOutlineDotsVertical />
            </div>
            {activeDropdown === court.id && (
              <CourtDropdown
                courtName={court.name}
                onRename={(nextName) => onRenameCourt(court.id, nextName)}
                onDelete={() => onDeleteCourt(court.id)}
                isDeleteDisabled={isInteractionDisabled}
              />
            )}
          </div>
        </div>
      </header>
      <main className="grid grid-cols-2 gap-x-2 gap-y-3 mt-3 z-10">
        {COURT_SLOTS.map((slot) => (
          <CourtSlot
            key={slot.position}
            courtId={court.id}
            position={slot.position}
            label={getSlotLabel(slot.position)}
            player={getAssignedPlayer(slot.position)}
            isInteractionDisabled={isInteractionDisabled}
            onRemovePlayerFromCourt={onRemovePlayerFromCourt}
            activeCourtDropdown={activeDropdown}
            activePlayerDropdown={activePlayerDropdown}
            onOpenPlayerDropdown={onOpenPlayerDropdown}
          />
        ))}
      </main>
    </div>
  );
}
