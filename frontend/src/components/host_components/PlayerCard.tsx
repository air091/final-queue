import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { HiOutlineDotsVertical } from "react-icons/hi";
import PlayerSettingsDropdown from "./PlayerDropdown";
import { useEffect, useRef, useState } from "react";
import { TbArrowBack } from "react-icons/tb";
import type { AcceptedPlayers } from "../../lib/host";
import { Gamepad, TriangleAlert } from "lucide-react";

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

const formatSkillLevel = (skillLevel: string) =>
  skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1);

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

  const { formattedTimer, timerStyle, isOverWaitThreshold } = (() => {
    if (!player.timerStartedAt) {
      return {
        formattedTimer: "00:00:00",
        timerStyle: "text-gray-500",
        isOverWaitThreshold: false,
      };
    }

    const startedAt = new Date(player.timerStartedAt).getTime();
    const elapsedMs = Math.max(0, now - startedAt);

    const totalSeconds = Math.floor(elapsedMs / 1000);

    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");

    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(
      2,
      "0",
    );

    const seconds = String(totalSeconds % 60).padStart(2, "0");

    let timerStyle = "text-gray-500";

    // >= 20 minutes
    if (totalSeconds >= 1200) {
      timerStyle = "text-red-500 font-bold text-[11px]";
    }

    // >= 15 minutes
    else if (totalSeconds >= 900) {
      timerStyle = "text-yellow-500 font-medium";
    }

    return {
      formattedTimer: `${hours}:${minutes}:${seconds}`,
      timerStyle,
      isOverWaitThreshold:
        player.matchStatus !== "playing" && totalSeconds >= 1200,
    };
  })();

  const statusClasses = {
    waiting: "border-green-500",
    inQueue: "border-yellow-500",
    playing: "border-red-500",
  }[player.matchStatus];
  const cardStateClasses = isOverWaitThreshold
    ? `${statusClasses} bg-red-200 shadow-red-100`
    : `${statusClasses} bg-white`;
  const gamesPlayed = player.gamesPlayed ?? 0;
  const skillLevel = player.player.skillLevel
    ? formatSkillLevel(player.player.skillLevel)
    : "Beginner";

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: isDragging ? undefined : CSS.Transform.toString(transform),
        opacity: isDragging ? 0 : 1,
      }}
      className={`
      relative flex items-center justify-between
      gap-1 rounded-2xl border-2 w-full
      px-1 py-2 shadow-sm transition-all duration-200

      ${cardStateClasses}

      ${canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-default"}

      ${
        activeDropdown === player.id
          ? " border-primary"
          : isOverWaitThreshold
            ? ""
            : "border-gray-200 hover:border-primary/30"
      }
    `}
    >
      {/* PLAYER GAMES */}
      <div className="absolute text-[10px] -top-2 left-1.5 px-1 bg-white text-stone-700 flex items-center gap-x-1 rounded-full">
        <span className="flex items-center gap-x-1">
          <Gamepad size={12} /> {gamesPlayed}
        </span>
        <span>{skillLevel}</span>
      </div>

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
        <div className="lg:h-7 lg:w-7 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-50 md:h-8 md:w-8">
          <img
            src={player.player.profileUrl}
            alt={player.player.username}
            className="h-full w-full object-cover"
          />
        </div>

        {/* TEXT */}
        <div className="min-w-0 flex flex-col">
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate lg:text-[10px] md:text-[10px] font-semibold text-text">
              {player.player.username}
            </span>
          </div>

          <span className={`mt-0.5 text-[10px] ${timerStyle}`}>
            {formattedTimer}
          </span>
        </div>
      </div>

      {/* ================= ACTIONS ================= */}
      <div className="flex items-center gap-1 shrink-0">
        {isOverWaitThreshold && !isInSlot && (
          <TriangleAlert
            size={16}
            className="shrink-0 text-red-500"
            aria-label="Waiting over 20 minutes"
          />
        )}

        {/* REMOVE */}
        {isInSlot && (canRemoveFromCourt || canRemoveFromQueue) && (
          <button
            type="button"
            title="Remove"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleRemoveClick}
            className="
            flex h-8 w-8 items-center justify-center cursor-pointer md:h-6 md:w-6 lg:h-7 lg:w-7
            rounded-xl text-gray-500 transition
            hover:bg-gray-100 hover:text-primary
          "
          >
            <TbArrowBack className="h-4 w-4 md:h-3.5 md:w-3.5 lg:h-4 lg:w-4" />
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
            flex h-8 w-8 items-center justify-center cursor-pointer md:h-6 md:w-6 lg:h-7 lg:w-7
            rounded-xl text-gray-500 transition
            hover:bg-gray-100 hover:text-primary
          "
          >
            <HiOutlineDotsVertical className="h-4 w-4 md:h-3.5 md:w-3.5 lg:h-4 lg:w-4" />
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
