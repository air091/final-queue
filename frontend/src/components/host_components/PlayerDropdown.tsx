import axios from "axios";
import { useLayoutEffect, useState } from "react";
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
  const [position, setPosition] = useState<{ top: number; left: number } | null>(
    null,
  );

  useLayoutEffect(() => {
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

  if (!position) return null;

  return createPortal(
    <div
      data-dropdown
      className="fixed z-[4000] w-[220px] rounded-3xl border border-orange-100 bg-white p-4 shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      {/* HEADER */}
      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">
          Player settings
        </p>

        <div className="flex items-center gap-3">
          <div className="h-11 w-11 overflow-hidden rounded-full border border-orange-100 bg-orange-50">
            <img
              src={player.player.profileUrl}
              alt={player.player.username}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="truncate text-sm font-semibold text-[var(--color-text)]">
                {player.player.username}
              </h4>

              {player.player.isStatic && (
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--color-accent)]">
                  Static
                </span>
              )}
            </div>

            <p className="mt-1 text-xs text-stone-500">
              {formatSkillLevel(player.player.skillLevel)}
            </p>
          </div>
        </div>

        {player.player.isStatic && (
          <div className="rounded-2xl border border-orange-100 bg-orange-50 px-3 py-2 text-[11px] text-stone-600">
            Host-only player
          </div>
        )}
      </div>

      {/* DIVIDER */}
      <div className="my-4 border-t border-orange-100" />

      {/* ACTIONS */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleViewHistoryClick}
          disabled={isHistoryLoading}
          className={`
        w-full rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-200
        ${
          isHistoryLoading
            ? "cursor-not-allowed bg-stone-100 text-stone-400"
            : "cursor-pointer border border-orange-100 bg-orange-50 text-[var(--color-text)] hover:bg-orange-100"
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
        w-full rounded-2xl px-3 py-2.5 text-sm font-medium text-white transition-all duration-200
        ${
          isPlayerInGame
            ? "cursor-not-allowed bg-stone-300"
            : "cursor-pointer bg-[var(--color-accent)] hover:bg-[#e85f00]"
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
