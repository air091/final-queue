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
};

export default function PlayerCard({
  player,
  activeDropdown,
  onToggleDropdown,
  draggableId = `player-list-${player.id}`,
  isInSlot = false,
  canDrag = true,
  canRemoveFromCourt = true,
  courtId,
  onRemoveFromCourt,
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
    if (!courtId || !onRemoveFromCourt) return;
    onRemoveFromCourt(player.id, courtId);
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
        opacity: isDragging ? 0.6 : 1,
      }}
      className={`relative w-full flex items-center justify-between py-1 px-1 rounded-full border ${statusClasses} ${
        canDrag
          ? `cursor-grab active:cursor-grabbing ${hoverClasses}`
          : "cursor-default"
      } ${activeDropdown === player.id ? "z-[120]" : ""}`}
    >
      <div className="flex items-center gap-x-2">
        <div className="w-[28px] h-[28px] rounded-full">
          <img
            src={player.player.profileUrl}
            alt={player.player.username}
            className="block w-full h-full object-contain rounded-full"
          />
        </div>
        <div>
          <span className="flex items-center gap-2 font-semibold leading-[12px]">
            <span className="text-[12px]">{player.player.username}</span>
            {player.player.isStatic && (
              <span className="rounded-md bg-stone-200 px-1.5 text-[8px] font-semibold uppercase  text-stone-700">
                Static
              </span>
            )}
          </span>
          <span className="block font-semibold text-[10px] text-stone-500">
            {formattedTimer}
          </span>
        </div>
      </div>
      <div className="flex items-center">
        {isInSlot && canRemoveFromCourt && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleRemoveClick}
            className="hover:bg-stone-400 p-1 rounded-full cursor-pointer"
          >
            <TbArrowBack />
          </button>
        )}
        <div
          data-dropdown
          ref={dropdownRef}
          onPointerDown={(e) => e.stopPropagation()}
          className={`relative w-full ${activeDropdown === player.id ? "z-[130]" : ""}`}
        >
          <div className="hover:bg-stone-400 p-1 rounded-full cursor-pointer">
            <HiOutlineDotsVertical
              onClick={() => onToggleDropdown(player.id)}
            />
          </div>
          {activeDropdown === player.id && (
            <PlayerSettingsDropdown player={player} />
          )}
        </div>
      </div>
    </div>
  );
}
