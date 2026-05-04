import axios from "axios";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import { useHostData } from "../../hooks/useHostData";
import type { AcceptedPlayers } from "../../lib/host";
import type { RefObject } from "react";
import { api } from "../../lib/api";

type PlayerDropdownProps = {
  player: AcceptedPlayers;
  anchorRef: RefObject<HTMLDivElement | null>;
};

const formatSkillLevel = (skillLevel: string) =>
  skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1);

export default function PlayerSettingsDropdown({
  player,
  anchorRef,
}: PlayerDropdownProps) {
  const { communityId, hostId } = useParams();
  const {
    playersInHost,
    setPlayersInHost,
    acceptedPlayers,
    setAcceptedPlayers,
    courts,
    setCourts,
  } = useHostData();
  const isPlayerInGame = player.matchStatus === "playing";
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const updatePosition = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const dropdownWidth = 168;
      const gap = 4;
      const maxLeft = Math.max(8, window.innerWidth - dropdownWidth - 8);

      setPosition({
        top: rect.bottom + gap,
        left: Math.min(rect.left, maxLeft),
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorRef]);

  const banAPI = async () => {
    await api.post(
      `/api/private/actions/ban/community/${communityId}/hosts/${hostId}/${player.id}`,
      {},
    );
  };

  const handleBanClick = async () => {
    if (isPlayerInGame) return;

    const previousPlayersInHost = playersInHost;
    const previousAcceptedPlayers = acceptedPlayers;
    const previousCourts = courts;
    const bannedPlayerRecord = {
      id: player.id,
      status: "banned" as const,
      player: player.player,
    };

    setPlayersInHost((currentPlayers) =>
      currentPlayers.map((currentPlayer) =>
        currentPlayer.id === player.id ? bannedPlayerRecord : currentPlayer,
      ),
    );
    setAcceptedPlayers((currentPlayers) =>
      currentPlayers.filter((currentPlayer) => currentPlayer.id !== player.id),
    );
    setCourts((currentCourts) =>
      currentCourts.map((court) => ({
        ...court,
        assignments: court.assignments.filter(
          (assignment) => assignment.hostedPlayerId !== player.id,
        ),
      })),
    );

    try {
      await banAPI();
    } catch (error) {
      setPlayersInHost(previousPlayersInHost);
      setAcceptedPlayers(previousAcceptedPlayers);
      setCourts(previousCourts);

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    }
  };

  return createPortal(
    <div
      data-dropdown
      className="fixed z-[4000] grid w-[168px] gap-y-2 rounded-md border bg-white p-2 cursor-default shadow-md"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <div>
        <h2 className="font-semibold text-[12px] text-stone-400 leading-[1  4px]">
          Player settings
        </h2>
        <div className="flex items-center gap-2">
          <h4 className="font-semibold">{player.player.username}</h4>
          {player.player.isStatic && (
            <span className="rounded-md bg-stone-200 px-1.5 text-[10px] text-stone-700 uppercase">
              Static
            </span>
          )}
        </div>
        <p className="text-[12px] text-stone-500">
          Level: {formatSkillLevel(player.player.skillLevel)}
        </p>
        {player.player.isStatic && (
          <p className="text-[12px] text-stone-500">Host-only player</p>
        )}
      </div>
      <div>
        <button
          type="button"
          onClick={handleBanClick}
          disabled={isPlayerInGame}
          className={`w-full block text-white border-none rounded py-1 px-2 ${
            isPlayerInGame
              ? "bg-stone-400 cursor-not-allowed"
              : "bg-red-500 cursor-pointer hover:bg-red-700"
          }`}
        >
          {isPlayerInGame ? "Ban unavailable" : "Ban"}
        </button>
      </div>
    </div>,
    document.body,
  );
}
