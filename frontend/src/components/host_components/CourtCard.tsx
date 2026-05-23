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
  onPauseCourtGame: (courtId: string) => void;
  onResumeCourtGame: (courtId: string) => void;
  onEndCourtGame: (courtId: string, teamWinner: "A" | "B") => void;
  onRenameCourt: (courtId: string, nextName: string) => void;
  onDeleteCourt: (courtId: string) => void;
  activeDropdown: string | null;
  activePlayerDropdown: string | null;
  onToggleDropdown: (courtId: string) => void;
  onOpenPlayerDropdown: () => void;
  busyAction?: "starting" | "pausing" | "resuming" | "ending";
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
      className={`relative border-2 border-white text-white w-full min-h-[56px] sm:min-h-[70px] flex items-center justify-center rounded-md overflow-hidden px-2 py-1`}
    >
      {/* Blurred background layer */}
      <div
        className={`absolute inset-0 transition-colors backdrop-blur-[1.5px] ${
          isOver ? "bg-stone-200/40 backdrop-blur-md" : ""
        }`}
      />

      {/* Content */}
      <div className="relative w-full flex items-center justify-center">
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
  onPauseCourtGame,
  onResumeCourtGame,
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
  const isGameActive = Boolean(court.startedAt && !court.endedAt);
  const isGamePaused = Boolean(court.startedAt && court.endedAt);
  const isGameStarted = Boolean(court.startedAt);
  const canResumeGame =
    !isBusy && isGamePaused && hasTeamAPlayer && hasTeamBPlayer;
  const isInteractionDisabled = isBusy || isGameActive;
  const isDeleteDisabled = isBusy || isGameStarted;

  return (
    <div className="relative w-full max-w-[520px] rounded-2xl border border-stone-200 bg-white p-2 shadow-sm transition hover:shadow-md sm:p-3 md:grid-cols-3">
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
      <header className="relative flex flex-col">
        <div className="flex items-center justify-between w-full">
          <div className="grid">
            <span className="leading-[12px] font-semibold text-background [text-shadow:0_1px_2px_rgba(0,0,0,1)]">
              {court.name}
            </span>
            {court.startedAt && (
              <span className="text-[12px] text-background [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">
                {isGamePaused ? "Game paused" : "Game in progress"}
              </span>
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
            {isGameActive && (
              <button
                type="button"
                onClick={() => onPauseCourtGame(court.id)}
                disabled={isBusy}
                className="cursor-pointer rounded-md bg-amber-500 px-2 py-1 text-[12px] font-medium text-white hover:bg-amber-600 disabled:cursor-wait disabled:opacity-70"
              >
                Pause
              </button>
            )}
            {isGamePaused && (
              <button
                type="button"
                onClick={() => onResumeCourtGame(court.id)}
                disabled={!canResumeGame}
                title={
                  canResumeGame
                    ? "Resume game"
                    : "Add at least one player to Team A and Team B to resume"
                }
                className="cursor-pointer rounded-md bg-stone-800 px-2 py-1 text-[12px] font-medium text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Resume
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
                  isDeleteDisabled={isDeleteDisabled}
                />
              )}
            </div>
          </div>
        </div>
        {isGameStarted && (
          <div className="flex items-center justify-between rounded-md border">
            <button
              type="button"
              onClick={() => onEndCourtGame(court.id, "A")}
              disabled={isBusy}
              className="block w-full py-1 cursor-pointer bg-blue-400 rounded-l-md text-[14px] font-medium hover:bg-blue-500 hover:text-white disabled:cursor-wait disabled:opacity-70"
            >
              WIN TEAM A
            </button>
            <button
              type="button"
              onClick={() => onEndCourtGame(court.id, "B")}
              disabled={isBusy}
              className="block w-full py-1 cursor-pointer bg-red-400 rounded-r-md text-[14px] font-medium hover:bg-red-500 hover:text-white disabled:cursor-wait disabled:opacity-70"
            >
              WIN TEAM B
            </button>
          </div>
        )}
      </header>
      <main className="grid grid-cols-2 gap-x-2 gap-y-3 mt-2 z-10">
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
