import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { HiOutlineDotsVertical } from "react-icons/hi";
import type { AcceptedPlayers } from "../../pages/host_pages/Match";
import PlayerSettingsDropdown from "./PlayerDropdown";
import { useRef } from "react";

type PlayerCardProps = {
  player: AcceptedPlayers;
  activeDropdown: string | null;
  onToggleDropdown: (hostedPlayerId: string) => void;
  draggableId?: string;
};

export default function PlayerCard({
  player,
  activeDropdown,
  onToggleDropdown,
  draggableId = `player-list-${player.id}`,
}: PlayerCardProps) {
  const { setNodeRef, attributes, listeners, transform, isDragging } =
    useDraggable({
      id: draggableId,
      data: {
        type: "player",
        hostedPlayerId: player.id,
      },
    });
  const dropdownRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        opacity: isDragging ? 0.6 : 1,
      }}
      className="border w-full flex items-center justify-between gap-x-10 py-1 px-1 cursor-grab active:cursor-grabbing hover:bg-stone-200 rounded-full"
    >
      <div className="flex items-center gap-x-2">
        <div className="w-[28px] h-[28px] rounded-full border">
          <img
            src={player.player.profileUrl}
            alt={player.player.username}
            className="block w-full h-full object-contain rounded-full"
          />
        </div>
        <span>{player.player.username}</span>
      </div>
      <div
        data-dropdown
        ref={dropdownRef}
        onPointerDown={(e) => e.stopPropagation()}
        className="relative"
      >
        <div className="hover:bg-stone-400 p-1 rounded-full cursor-pointer">
          <HiOutlineDotsVertical onClick={() => onToggleDropdown(player.id)} />
        </div>
        {activeDropdown === player.id && (
          <PlayerSettingsDropdown
            hostedPlayerId={player.id}
            player={player.player}
          />
        )}
      </div>
    </div>
  );
}
