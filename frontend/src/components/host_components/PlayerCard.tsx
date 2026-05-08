import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { HiOutlineDotsVertical } from "react-icons/hi";
import PlayerSettingsDropdown from "./PlayerDropdown";
import { useEffect, useRef, useState } from "react";
import { TbArrowBack } from "react-icons/tb";
import type { AcceptedPlayers } from "../../lib/host";

type PlayerCardProps = {
  player: AcceptedPlayers;
  activeDropdown: string | null;
  onToggleDropdown: (hostedPlayerId: string) => void;
  draggableId?: string;
  isInSlot?: boolean;
  canDrag?: boolean;
  canRemoveFromCourt?: boolean;
  courtId?: string;
  onRemoveFromCourt?: (hostedPlayerId: string, courtId: string) => void;
  canRemoveFromQueue?: boolean;
  queueId?: string;
  onRemoveFromQueue?: (hostedPlayerId: string, queueId: string) => void;
};

export default function PlayerCard({
  player,
  activeDropdown,
  onToggleDropdown,
  draggableId = `player-list-${player.id}`,
  isInSlot = false,
  canDrag = true,
  canRemoveFromCourt = false,
  courtId,
  onRemoveFromCourt,
  canRemoveFromQueue = false,
  queueId,
  onRemoveFromQueue,
}: PlayerCardProps) {
  const { setNodeRef, attributes, listeners, transform, isDragging } =
    useDraggable({
      id: draggableId,
      disabled: !canDrag,
      data: {
        type: "player",
        hostedPlayerId: player.id,
        courtId,
      },
    });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => Date.now());

  const handleRemoveClick = () => {
    if (courtId && onRemoveFromCourt) {
      onRemoveFromCourt(player.id, courtId);
    } else if (queueId && onRemoveFromQueue) {
      onRemoveFromQueue(player.id, queueId);
    }
  };

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const formattedTimer = (() => {
    if (!player.timerStartedAt) return "00:00:00";

    const startedAt = new Date(player.timerStartedAt).getTime();
    const elapsedMs = Math.max(0, now - startedAt);
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(
      2,
      "0",
    );
    const seconds = String(totalSeconds % 60).padStart(2, "0");

    return `${hours}:${minutes}:${seconds}`;
  })();

  const statusClasses = {
    waiting: "border-green-500 bg-green-300",
    inQueue: "border-yellow-500 bg-yellow-300",
    playing: "border-red-500 bg-red-300",
  }[player.matchStatus];

  const hoverClasses = {
    waiting: "hover:bg-green-400",
    inQueue: "hover:bg-yellow-400",
    playing: "hover:bg-red-400",
  }[player.matchStatus];

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        opacity: isDragging ? 0 : 1,
      }}
      className={`relative flex w-full items-center justify-between rounded-2xl border px-2 py-2 shadow-sm transition-all duration-200
  ${statusClasses}
  ${
    canDrag
      ? `cursor-grab active:cursor-grabbing ${hoverClasses}`
      : "cursor-default"
  }
  ${
    activeDropdown === player.id
      ? "z-[120] border-[var(--color-primary)]"
      : "border-orange-100"
  }`}
    >
      {/* PLAYER */}
      <div className="flex items-center gap-2">
        <div className="h-[36px] w-[36px] overflow-hidden rounded-full border border-orange-100 bg-orange-50">
          <img
            src={player.player.profileUrl}
            alt={player.player.username}
            className="block h-full w-full rounded-full object-cover object-center"
          />
        </div>

        <div className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="truncate text-[12px] font-semibold text-[var(--color-text)]">
              {player.player.username}
            </span>

            {player.player.isStatic && (
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--color-accent)]">
                Static
              </span>
            )}
          </span>

          <span className="mt-0.5 block text-[11px] font-medium text-stone-500">
            {formattedTimer}
          </span>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex items-center gap-1">
        {isInSlot && (canRemoveFromCourt || canRemoveFromQueue) && (
          <button
            type="button"
            title="Remove slot"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleRemoveClick}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-stone-500 transition hover:bg-orange-50 hover:text-[var(--color-accent)]"
          >
            <TbArrowBack size={16} />
          </button>
        )}

        <div
          data-dropdown
          ref={dropdownRef}
          onPointerDown={(e) => e.stopPropagation()}
          className={`relative ${
            activeDropdown === player.id ? "z-[130]" : ""
          }`}
        >
          <button
            type="button"
            title="Player settings"
            onClick={() => onToggleDropdown(player.id)}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-stone-500 transition hover:bg-orange-50 hover:text-[var(--color-accent)]"
          >
            <HiOutlineDotsVertical size={16} />
          </button>

          {activeDropdown === player.id && (
            <PlayerSettingsDropdown
              player={player}
              anchorRef={dropdownRef}
              onCloseDropdown={() => onToggleDropdown(player.id)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
