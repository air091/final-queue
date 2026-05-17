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
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    isDragging,
  } = useDraggable({
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

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: isDragging ? undefined : CSS.Transform.toString(transform),
        opacity: isDragging ? 0 : 1,
      }}
      className={`
      relative flex items-center justify-between
      gap-1 rounded-2xl border bg-white w-full
      px-1 py-2 shadow-sm transition-all duration-200

      ${statusClasses}

      ${canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-default"}

      ${
        activeDropdown === player.id
          ? " border-primary"
          : "border-gray-200 hover:border-primary/30"
      }
    `}
    >
      {/* ================= PLAYER INFO ================= */}
      <div
        ref={canDrag ? setActivatorNodeRef : undefined}
        {...attributes}
        {...listeners}
        className={`flex min-w-0 flex-1 items-center gap-1 ${
          canDrag ? "touch-none" : ""
        }`}
        style={{
          touchAction: canDrag ? "none" : "auto",
        }}
      >
        {/* AVATAR */}
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-50">
          <img
            src={player.player.profileUrl}
            alt={player.player.username}
            className="h-full w-full object-cover"
          />
        </div>

        {/* TEXT */}
        <div className="min-w-0 flex flex-col">
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate text-[12px] font-semibold text-text">
              {player.player.username}
            </span>
          </div>

          <span className="mt-0.5 text-xs text-gray-500">{formattedTimer}</span>
        </div>
      </div>

      {/* ================= ACTIONS ================= */}
      <div className="flex items-center gap-1 shrink-0">
        {/* REMOVE */}
        {isInSlot && (canRemoveFromCourt || canRemoveFromQueue) && (
          <button
            type="button"
            title="Remove"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleRemoveClick}
            className="
            flex h-9 w-9 items-center justify-center cursor-pointer
            rounded-xl text-gray-500 transition
            hover:bg-gray-100 hover:text-primary
          "
          >
            <TbArrowBack size={16} />
          </button>
        )}

        {/* DROPDOWN */}
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
            title="Settings"
            onClick={() => onToggleDropdown(player.id)}
            className="
            flex h-9 w-9 items-center justify-center cursor-pointer
            rounded-xl text-gray-500 transition
            hover:bg-gray-100 hover:text-primary
          "
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
