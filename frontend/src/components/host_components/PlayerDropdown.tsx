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
  onCloseDropdown: () => void;
};

const formatSkillLevel = (skillLevel: string) =>
  skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1);

export default function PlayerSettingsDropdown({
  player,
  anchorRef,
  onCloseDropdown,
}: PlayerDropdownProps) {
  const { communityId, hostId } = useParams();
  const {
    playersInHost,
    setPlayersInHost,
    acceptedPlayers,
    setAcceptedPlayers,
    courts,
    setCourts,
    historyLoadingPlayerId,
    openPlayerHistory,
  } = useHostData();
  const isPlayerInGame = player.matchStatus === "playing";
  const isHistoryLoading = historyLoadingPlayerId === player.id;
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
      `/api/private/actions/ban/community/${communityId}/hosts/${hostId}/players/${player.id}`,
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
          (assignment) => assignment.playerId !== player.id,
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

  const handleViewHistoryClick = () => {
    onCloseDropdown();
    openPlayerHistory(player);
  };

  return createPortal(
    <div
      data-dropdown
      className="fixed z-[4000] w-[200px] rounded-2xl border border-stone-200 bg-white p-3 shadow-lg"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      {/* Header */}
      <div className="mb-3 space-y-1">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
          Player settings
        </h2>

        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-stone-800">
            {player.player.username}
          </h4>

          {player.player.isStatic && (
            <span className="rounded-full border border-stone-200 bg-stone-100 px-2 py-[2px] text-[9px] font-semibold uppercase text-stone-600">
              Static
            </span>
          )}
        </div>

        <p className="text-xs text-stone-500">
          Level: {formatSkillLevel(player.player.skillLevel)}
        </p>

        {player.player.isStatic && (
          <p className="text-xs text-stone-400">Host-only player</p>
        )}
      </div>

      {/* Divider */}
      <div className="my-2 border-t border-stone-100" />

      {/* Actions */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleViewHistoryClick}
          disabled={isHistoryLoading}
          className={`
        w-full rounded-xl px-3 py-2 text-sm font-medium cursor-pointer transition
        ${
          isHistoryLoading
            ? "cursor-not-allowed bg-stone-100 text-stone-400"
            : "bg-white text-stone-700 hover:bg-stone-100"
        }
      `}
        >
          {isHistoryLoading ? "Loading..." : "View history"}
        </button>

        <button
          type="button"
          onClick={handleBanClick}
          disabled={isPlayerInGame}
          className={`
        w-full rounded-xl px-3 py-2 text-sm font-medium cursor-pointer text-white transition
        ${
          isPlayerInGame
            ? "cursor-not-allowed bg-stone-300"
            : "bg-red-500 hover:bg-red-600"
        }
      `}
        >
          {isPlayerInGame ? "Ban unavailable" : "Ban player"}
        </button>
      </div>
    </div>,
    document.body,
  );
}
