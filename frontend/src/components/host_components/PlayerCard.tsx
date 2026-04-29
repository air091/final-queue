import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { HiOutlineDotsVertical } from "react-icons/hi";
import type { AcceptedPlayers } from "../../pages/host_pages/Match";

type PlayerCardProps = {
  player: AcceptedPlayers;
};

export default function PlayerCard({ player }: PlayerCardProps) {
  const { setNodeRef, attributes, listeners, transform, isDragging } =
    useDraggable({
      id: player.id,
      data: {
        type: "player",
        hostedPlayerId: player.id,
      },
    });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        opacity: isDragging ? 0.6 : 1,
      }}
      className="border w-fit flex items-center gap-x-10 py-1 px-1 cursor-grab active:cursor-grabbing hover:bg-stone-200 rounded-full"
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
      <div className="cursor-pointer hover:bg-stone-400 p-1 rounded-full">
        <HiOutlineDotsVertical />
      </div>
    </div>
  );
}
