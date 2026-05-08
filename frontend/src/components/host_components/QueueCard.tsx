import { useDroppable } from "@dnd-kit/core";
import { HiOutlineDotsVertical } from "react-icons/hi";
import PlayerCard from "./PlayerCard";
import QueueDropdown from "./QueueDropdown";
import { useEffect, useState } from "react";
import type { AcceptedPlayers, QueueType } from "../../lib/host";

type QueueCardProps = {
  queue: QueueType;
  players: AcceptedPlayers[];
  onRemovePlayerFromQueue: (hostedPlayerId: string, queueId: string) => void;
  onRenameQueue: (queueId: string, nextName: string) => void;
  onDeleteQueue: (queueId: string) => void;
  onTransferToCourt: (queueId: string) => void;
  canTransferToCourt: boolean;
  activeDropdown: string | null;
  activePlayerDropdown: string | null;
  onToggleDropdown: (queueId: string) => void;
  onOpenPlayerDropdown: () => void;
};

type QueueSlotProps = {
  queueId: string;
  position: number;
  label: string;
  player?: AcceptedPlayers;
  onRemovePlayerFromQueue: (hostedPlayerId: string, queueId: string) => void;
  activeQueueDropdown: string | null;
  activePlayerDropdown: string | null;
  onOpenPlayerDropdown: () => void;
};

const QUEUE_SLOTS = [
  { position: 1, label: "Team A" },
  { position: 2, label: "Team B" },
  { position: 3, label: "Team A" },
  { position: 4, label: "Team B" },
];

function QueueSlot({
  queueId,
  position,
  label,
  player,
  onRemovePlayerFromQueue,
  activeQueueDropdown,
  activePlayerDropdown,
  onOpenPlayerDropdown,
}: QueueSlotProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `queue-slot-${queueId}-${position}`,
    data: {
      type: "queue-slot",
      queueId,
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
    if (activeQueueDropdown !== null || activePlayerDropdown !== null) {
      setPlayerActiveDropdown(null);
    }
  }, [activeQueueDropdown, activePlayerDropdown]);

  return (
    <div
      ref={setNodeRef}
      className={`relative border-2 border-white text-white w-full min-h-[48px] flex items-center justify-center rounded-md overflow-hidden px-2 py-1 z-50`}
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
            draggableId={`queue-player-${queueId}-${position}-${player.id}`}
            activeDropdown={playerActiveDropdown}
            onToggleDropdown={handlePlayerDropdown}
            isInSlot
            canDrag={true}
            canRemoveFromQueue={true}
            queueId={queueId}
            onRemoveFromQueue={onRemovePlayerFromQueue}
          />
        ) : (
          <span>{label}</span>
        )}
      </div>
    </div>
  );
}

export default function QueueCard({
  queue,
  players,
  onRemovePlayerFromQueue,
  onRenameQueue,
  onDeleteQueue,
  onTransferToCourt,
  canTransferToCourt,
  activeDropdown,
  activePlayerDropdown,
  onToggleDropdown,
  onOpenPlayerDropdown,
}: QueueCardProps) {
  const getAssignedPlayer = (position: number) => {
    if (!queue.entries) return undefined;
    const entry = queue.entries.find((item) => item.position === position);
    if (!entry) return undefined;
    return players.find((player) => player.id === entry.playerId);
  };

  const hasTeamAPlayer = queue.entries?.some(
    (entry) => entry.position === 1 || entry.position === 3,
  );
  const hasTeamBPlayer = queue.entries?.some(
    (entry) => entry.position === 2 || entry.position === 4,
  );
  const canShowTransferButton = Boolean(hasTeamAPlayer && hasTeamBPlayer);

  const queueSlots = QUEUE_SLOTS;

  return (
    <div className="relative w-[405px] rounded-2xl border border-stone-200 bg-white p-3 shadow-sm transition hover:shadow-md">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 300 150"
        fill="none"
        stroke="rgba(200, 200, 200, 0.8)"
        strokeWidth="2"
        preserveAspectRatio="none"
        className="bg-yellow-500 absolute top-0 left-0 z-0 rounded-md"
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
            {queue.name}
          </span>
        </div>
        <div className="flex items-center gap-x-2">
          {canShowTransferButton && (
            <button
              type="button"
              disabled={!canTransferToCourt}
              onClick={() => onTransferToCourt(queue.id)}
              className="rounded-md bg-blue-600 px-2 py-1 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              Transfer to court
            </button>
          )}
          <div
            data-dropdown
            onPointerDown={(e) => e.stopPropagation()}
            className={`relative ${activeDropdown === queue.id ? "z-[130]" : ""}`}
          >
            <div
              title="Queue settings"
              className="cursor-pointer text-background hover:bg-yellow-700 p-1 rounded-full w-fit [text-shadow:0_1px_2px_rgba(0,0,0,1)]"
              onClick={() => onToggleDropdown(queue.id)}
            >
              <HiOutlineDotsVertical />
            </div>
            {activeDropdown === queue.id && (
              <QueueDropdown
                queueName={queue.name}
                onRename={(nextName) => onRenameQueue(queue.id, nextName)}
                onDelete={() => onDeleteQueue(queue.id)}
              />
            )}
          </div>
        </div>
      </header>
      <main className="grid grid-cols-2 gap-x-2 gap-y-3 mt-3 z-10">
        {queueSlots.map(({ position, label }) => (
          <QueueSlot
            key={position}
            queueId={queue.id}
            position={position}
            label={label}
            player={getAssignedPlayer(position)}
            onRemovePlayerFromQueue={onRemovePlayerFromQueue}
            activeQueueDropdown={activeDropdown}
            activePlayerDropdown={activePlayerDropdown}
            onOpenPlayerDropdown={onOpenPlayerDropdown}
          />
        ))}
      </main>
    </div>
  );
}
