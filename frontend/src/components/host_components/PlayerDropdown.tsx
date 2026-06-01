import axios from "axios";
import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import { useHostData } from "../../hooks/useHostData";
import { buildPaymentsSummary, type AcceptedPlayers } from "../../lib/host";
import type { RefObject } from "react";
import { api } from "../../lib/api";
import { SkillLevelBadge } from "../../lib/skillLevels";

type PlayerDropdownProps = {
  player: AcceptedPlayers;
  anchorRef: RefObject<HTMLDivElement | null>;
  onCloseDropdown: () => void;
};

const DROPDOWN_WIDTH = 220;
const DROPDOWN_MAX_HEIGHT = 360;
const DROPDOWN_ESTIMATED_HEIGHT = 260;
const VIEWPORT_GAP = 8;

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
    queues,
    setQueues,
    paymentsData,
    setPaymentsData,
    historyLoadingPlayerId,
    openPlayerHistory,
    pauseHostLiveSync,
  } = useHostData();
  const isPlayerInGame = player.matchStatus === "playing";
  const isHistoryLoading = historyLoadingPlayerId === player.id;
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  useLayoutEffect(() => {
    const updatePosition = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const gap = 4;
      const dropdownWidth = Math.min(
        DROPDOWN_WIDTH,
        window.innerWidth - VIEWPORT_GAP * 2,
      );
      const maxHeight = Math.min(
        DROPDOWN_MAX_HEIGHT,
        window.innerHeight - VIEWPORT_GAP * 2,
      );
      const dropdownHeight = Math.min(
        dropdownRef.current?.offsetHeight ?? DROPDOWN_ESTIMATED_HEIGHT,
        maxHeight,
      );
      const maxLeft = window.innerWidth - dropdownWidth - VIEWPORT_GAP;
      const preferredLeft = rect.right - dropdownWidth;
      const opensDown =
        rect.bottom + gap + dropdownHeight <= window.innerHeight - VIEWPORT_GAP;
      const preferredTop = opensDown
        ? rect.bottom + gap
        : rect.top - gap - dropdownHeight;
      const maxTop = window.innerHeight - dropdownHeight - VIEWPORT_GAP;

      setPosition({
        top: Math.min(Math.max(VIEWPORT_GAP, preferredTop), maxTop),
        left: Math.min(Math.max(VIEWPORT_GAP, preferredLeft), maxLeft),
        width: dropdownWidth,
        maxHeight,
      });
    };

    updatePosition();
    const animationFrameId = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorRef]);

  const removeFromHostAPI = async () => {
    await api.delete(
      `/api/private/actions/remove/community/${communityId}/hosts/${hostId}/players/${player.id}`,
    );
  };

  const handleRemoveClick = async () => {
    if (isPlayerInGame) return;

    const shouldRemove = window.confirm(
      `Remove ${player.player.username} from this hosted match? This will also remove their match history for this session.`,
    );
    if (!shouldRemove) return;

    const resumeHostLiveSync = pauseHostLiveSync();
    const previousPlayersInHost = playersInHost;
    const previousAcceptedPlayers = acceptedPlayers;
    const previousCourts = courts;
    const previousQueues = queues;
    const previousPaymentsData = paymentsData;

    setPlayersInHost((currentPlayers) =>
      currentPlayers.filter((currentPlayer) => currentPlayer.id !== player.id),
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
    setQueues((currentQueues) =>
      currentQueues.map((queue) => ({
        ...queue,
        entries: queue.entries.filter((entry) => entry.playerId !== player.id),
      })),
    );
    setPaymentsData((currentPaymentsData) => {
      const nextPlayers = currentPaymentsData.players.filter(
        (currentPlayer) => currentPlayer.id !== player.id,
      );

      return {
        ...currentPaymentsData,
        players: nextPlayers,
        summary: buildPaymentsSummary(nextPlayers),
      };
    });
    onCloseDropdown();

    try {
      await removeFromHostAPI();
    } catch (error) {
      setPlayersInHost(previousPlayersInHost);
      setAcceptedPlayers(previousAcceptedPlayers);
      setCourts(previousCourts);
      setQueues(previousQueues);
      setPaymentsData(previousPaymentsData);

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    } finally {
      resumeHostLiveSync();
    }
  };

  const handleViewHistoryClick = () => {
    onCloseDropdown();
    openPlayerHistory(player);
  };

  if (!position) return null;

  return createPortal(
    <div
      ref={dropdownRef}
      data-dropdown
      className="fixed z-[4000] w-[220px] rounded-3xl border border-orange-100 bg-white p-4 shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
        maxHeight: position.maxHeight,
        overflowY: "auto",
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

            <SkillLevelBadge
              skillLevel={player.player.skillLevel}
              showLabel
              className="mt-1"
            />
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
          onClick={handleRemoveClick}
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
          {isPlayerInGame ? "Remove unavailable" : "Remove Player"}
        </button>
      </div>
    </div>,
    document.body,
  );
}
