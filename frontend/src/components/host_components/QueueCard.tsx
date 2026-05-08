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
  activeDropdown: string | null;
  activePlayerDropdown: string | null;
  onToggleDropdown: (queueId: string) => void;
  onOpenPlayerDropdown: () => void;
};

type QueueSlotProps = {
  queueId: string;
  position: number;
  player?: AcceptedPlayers;
  onRemovePlayerFromQueue: (hostedPlayerId: string, queueId: string) => void;
  activeQueueDropdown: string | null;
  activePlayerDropdown: string | null;
  onOpenPlayerDropdown: () => void;
};

function QueueSlot({
  queueId,
  position,
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
          <span>{position}</span>
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

  // Generate slots for positions 1 to 10 (or more if needed)
  const queueSlots = Array.from({ length: 10 }, (_, i) => i + 1);

  return (
    <div className="relative w-[420px] p-2 rounded-md bg-blue-800/80">
      <header className="relative z-[120] flex items-center justify-between">
        <div className="grid">
          <span className="leading-[12px] font-semibold text-background [text-shadow:0_1px_2px_rgba(0,0,0,1)]">
            {queue.name}
          </span>
        </div>
        <div className="flex items-center gap-x-2">
          <div
            data-dropdown
            onPointerDown={(e) => e.stopPropagation()}
            className={`relative ${activeDropdown === queue.id ? "z-[130]" : ""}`}
          >
            <div
              title="Queue settings"
              className="cursor-pointer text-background hover:bg-blue-700 p-1 rounded-full w-fit [text-shadow:0_1px_2px_rgba(0,0,0,1)]"
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
        {queueSlots.map((position) => (
          <QueueSlot
            key={position}
            queueId={queue.id}
            position={position}
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
