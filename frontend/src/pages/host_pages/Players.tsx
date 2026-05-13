import axios from "axios";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useParams } from "react-router-dom";
import { useHostData } from "../../hooks/useHostData";
import { api } from "../../lib/api";
import {
  EMPTY_MATCH_HISTORY_SUMMARY,
  buildPaymentsSummary,
  type AcceptedPlayers,
  type HostPlayerRecord,
  type SkillLevelType,
} from "../../lib/host";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Failed to read image file."));
    };

    reader.onerror = () => {
      reject(new Error("Failed to read image file."));
    };

    reader.readAsDataURL(file);
  });

const formatSkillLevel = (skillLevel: string) =>
  skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1);

const formatMatchResult = (result: string | null, team: string | null) => {
  if (!result) return "No result";

  const normalizedResult =
    result.charAt(0).toUpperCase() + result.slice(1).toLowerCase();

  return team ? `${normalizedResult} (${team})` : normalizedResult;
};

type PlayerSectionProps = {
  title: string;
  description: string;
  players: HostPlayerRecord[];
  acceptedPlayers: AcceptedPlayers[];
  historyLoadingPlayerId: string | null;
  staticProfileUrlDrafts: Record<string, string>;
  savingStaticProfileUrlId: string | null;
  onAcceptPlayer: (hostedPlayerId: string) => void;
  onRejectPlayer: (hostedPlayerId: string) => void;
  onBanPlayer: (hostedPlayerId: string) => void;
  onUnbanPlayer: (hostedPlayerId: string) => void;
  onViewHistory: (player: HostPlayerRecord) => void;
  onUpdateStaticPlayerSkillLevel?: (
    hostedPlayerId: string,
    skillLevel: SkillLevelType,
  ) => void;
  onStaticProfileUrlDraftChange?: (
    hostedPlayerId: string,
    profileUrl: string,
  ) => void;
  onStaticProfileImageChange?: (hostedPlayerId: string, file: File) => void;
  onUpdateStaticPlayerProfileUrl?: (hostedPlayerId: string) => void;
  onEditStaticPlayer?: (player: HostPlayerRecord) => void;
  emptyMessage: string;
  extraContent?: ReactNode;
};

function PlayerSection({
  title,
  description,
  players,
  acceptedPlayers,
  historyLoadingPlayerId,
  onAcceptPlayer,
  onRejectPlayer,
  onBanPlayer,
  onUnbanPlayer,
  onViewHistory,
  savingStaticProfileUrlId,
  onStaticProfileImageChange,
  onEditStaticPlayer,
  emptyMessage,
  extraContent,
}: PlayerSectionProps) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* HEADER */}
      <header className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
        <div>
          <h4 className="text-base font-semibold text-text">{title}</h4>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>

        <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-primary/10 px-3 text-xs font-semibold text-primary">
          {players.length}
        </span>
      </header>

      {/* EXTRA CONTENT */}
      {extraContent ? (
        <div className="border-b border-gray-100 px-5 py-4">{extraContent}</div>
      ) : null}

      {/* ===================== MOBILE CARDS ===================== */}
      <div className="md:hidden flex flex-col divide-y divide-gray-100">
        {players.length > 0 ? (
          players.map((playerRecord) => {
            const acceptedPlayer = acceptedPlayers.find(
              (a) => a.id === playerRecord.id,
            );

            const isBanDisabled = acceptedPlayer?.matchStatus === "playing";
            const canUpdateStaticProfile =
              playerRecord.player.isStatic && onStaticProfileImageChange;
            const isSavingProfile =
              savingStaticProfileUrlId === playerRecord.id;

            return (
              <div
                key={playerRecord.id}
                className="p-5 space-y-4 hover:bg-gray-50/40"
              >
                {/* Player */}
                <div className="flex items-center gap-3">
                  <label
                    className={`group relative h-10 w-10 overflow-hidden rounded-full border border-gray-200 bg-gray-50 ${
                      canUpdateStaticProfile ? "cursor-pointer" : ""
                    }`}
                    title={
                      canUpdateStaticProfile
                        ? "Change static player photo"
                        : undefined
                    }
                  >
                    <img
                      src={playerRecord.player.profileUrl}
                      alt={playerRecord.player.username}
                      className="h-full w-full object-cover"
                    />
                    {canUpdateStaticProfile ? (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-[10px] font-medium text-white opacity-0 transition group-hover:bg-black/45 group-hover:opacity-100">
                        {isSavingProfile ? "Saving" : "Change"}
                      </span>
                    ) : null}
                    {canUpdateStaticProfile ? (
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isSavingProfile}
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          if (file) {
                            onStaticProfileImageChange(playerRecord.id, file);
                          }
                        }}
                      />
                    ) : null}
                  </label>

                  <div className="flex flex-col">
                    <span className="font-medium text-text">
                      {playerRecord.player.username}
                    </span>

                    <span className="text-xs text-gray-500">
                      {playerRecord.player.isStatic
                        ? "Static Player"
                        : "Dynamic"}
                    </span>
                  </div>
                </div>

                {/* Info Row */}
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {formatSkillLevel(playerRecord.player.skillLevel)}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      playerRecord.status === "accepted"
                        ? "bg-green-100 text-green-700"
                        : playerRecord.status === "requested"
                          ? "bg-yellow-100 text-yellow-700"
                          : playerRecord.status === "banned"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {playerRecord.status}
                  </span>
                </div>

                {/* Matches */}
                <div className="text-sm text-gray-600">
                  Matches: {acceptedPlayer?.matchHistory?.matchCount ?? "-"}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={() => onViewHistory(playerRecord)}
                    disabled={historyLoadingPlayerId === playerRecord.id}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium hover:bg-gray-50 cursor-pointer"
                  >
                    {historyLoadingPlayerId === playerRecord.id
                      ? "Loading..."
                      : "History"}
                  </button>

                  {playerRecord.status !== "accepted" &&
                    playerRecord.status !== "banned" && (
                      <button
                        onClick={() => onAcceptPlayer(playerRecord.id)}
                        className="rounded-xl bg-green-100 px-3 py-2 text-xs font-medium text-green-700 cursor-pointer"
                      >
                        Accept
                      </button>
                    )}

                  {playerRecord.status === "requested" && (
                    <button
                      onClick={() => onRejectPlayer(playerRecord.id)}
                      className="rounded-xl bg-red-100 px-3 py-2 text-xs font-medium text-red-700 cursor-pointer"
                    >
                      Reject
                    </button>
                  )}

                  {playerRecord.status === "accepted" && (
                    <button
                      disabled={isBanDisabled}
                      onClick={() => onBanPlayer(playerRecord.id)}
                      className={`rounded-xl px-3 py-2 text-xs font-medium ${
                        isBanDisabled
                          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                          : "bg-red-500 text-white"
                      }`}
                    >
                      Ban
                    </button>
                  )}

                  {playerRecord.status === "banned" && (
                    <button
                      onClick={() => onUnbanPlayer(playerRecord.id)}
                      className="rounded-xl bg-gray-800 px-3 py-2 text-xs font-medium text-white cursor-pointer"
                    >
                      Unban
                    </button>
                  )}

                  {playerRecord.player.isStatic && onEditStaticPlayer ? (
                    <button
                      type="button"
                      onClick={() => onEditStaticPlayer(playerRecord)}
                      className="rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs font-medium text-[var(--color-primary)] hover:bg-orange-50 cursor-pointer"
                    >
                      Edit
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-10 text-center text-sm text-gray-500">
            {emptyMessage}
          </div>
        )}
      </div>

      {/* ===================== DESKTOP GRID ===================== */}
      <div className="hidden md:grid grid-cols-5 gap-4 p-5">
        {players.length > 0 ? (
          players.map((playerRecord) => {
            const acceptedPlayer = acceptedPlayers.find(
              (a) => a.id === playerRecord.id,
            );

            const isBanDisabled = acceptedPlayer?.matchStatus === "playing";

            const canUpdateStaticProfile =
              playerRecord.player.isStatic && onStaticProfileImageChange;

            const isSavingProfile =
              savingStaticProfileUrlId === playerRecord.id;

            return (
              <div
                key={playerRecord.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                {/* PLAYER */}
                <div className="flex flex-col items-center text-center">
                  <label
                    className={`group relative h-20 w-20 overflow-hidden rounded-full border border-gray-200 ${
                      canUpdateStaticProfile ? "cursor-pointer" : ""
                    }`}
                  >
                    <img
                      src={playerRecord.player.profileUrl}
                      alt={playerRecord.player.username}
                      className="h-full w-full object-cover"
                    />

                    {canUpdateStaticProfile ? (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-[10px] font-medium text-white opacity-0 transition group-hover:bg-black/45 group-hover:opacity-100">
                        {isSavingProfile ? "Saving" : "Change"}
                      </span>
                    ) : null}

                    {canUpdateStaticProfile ? (
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isSavingProfile}
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";

                          if (file) {
                            onStaticProfileImageChange(playerRecord.id, file);
                          }
                        }}
                      />
                    ) : null}
                  </label>

                  <h5 className="mt-3 font-semibold text-text">
                    {playerRecord.player.username}
                  </h5>

                  <p className="text-xs text-gray-500">
                    {playerRecord.player.isStatic
                      ? "Static Player"
                      : "Registered Player"}
                  </p>
                </div>

                {/* TAGS */}
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {formatSkillLevel(playerRecord.player.skillLevel)}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      playerRecord.status === "accepted"
                        ? "bg-green-100 text-green-700"
                        : playerRecord.status === "requested"
                          ? "bg-yellow-100 text-yellow-700"
                          : playerRecord.status === "banned"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {playerRecord.status}
                  </span>
                </div>

                {/* MATCH INFO */}
                <div className="mt-4 space-y-1 text-center text-sm text-gray-600">
                  <p>
                    Matches: {acceptedPlayer?.matchHistory?.matchCount ?? "-"}
                  </p>
                </div>

                {/* ACTIONS */}
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <button
                    onClick={() => onViewHistory(playerRecord)}
                    disabled={historyLoadingPlayerId === playerRecord.id}
                    className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium hover:bg-gray-50 cursor-pointer"
                  >
                    {historyLoadingPlayerId === playerRecord.id
                      ? "Loading..."
                      : "History"}
                  </button>

                  {playerRecord.player.isStatic && onEditStaticPlayer ? (
                    <button
                      type="button"
                      onClick={() => onEditStaticPlayer(playerRecord)}
                      className="rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs font-medium text-[var(--color-primary)] hover:bg-orange-50 cursor-pointer"
                    >
                      Edit
                    </button>
                  ) : null}

                  {playerRecord.status !== "accepted" &&
                    playerRecord.status !== "banned" && (
                      <button
                        onClick={() => onAcceptPlayer(playerRecord.id)}
                        className="rounded-xl bg-green-100 px-3 py-2 text-xs font-medium text-green-700 cursor-pointer"
                      >
                        Accept
                      </button>
                    )}

                  {playerRecord.status === "requested" && (
                    <button
                      onClick={() => onRejectPlayer(playerRecord.id)}
                      className="rounded-xl bg-red-100 px-3 py-2 text-xs font-medium text-red-700 cursor-pointer"
                    >
                      Reject
                    </button>
                  )}

                  {playerRecord.status === "accepted" && (
                    <button
                      disabled={isBanDisabled}
                      onClick={() => onBanPlayer(playerRecord.id)}
                      className={`rounded-xl px-3 py-2 text-xs font-medium ${
                        isBanDisabled
                          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                          : "bg-red-500 text-white"
                      }`}
                    >
                      Ban
                    </button>
                  )}

                  {playerRecord.status === "banned" && (
                    <button
                      onClick={() => onUnbanPlayer(playerRecord.id)}
                      className="rounded-xl bg-gray-800 px-3 py-2 text-xs font-medium text-white cursor-pointer"
                    >
                      Unban
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-5 py-10 text-center text-gray-500">
            {emptyMessage}
          </div>
        )}
      </div>
    </section>
  );
}

export default function Players() {
  const { communityId, hostId } = useParams();
  const {
    playersInHost: players,
    setPlayersInHost,
    acceptedPlayers,
    setAcceptedPlayers,
    courts,
    setCourts,
    paymentsData,
    setPaymentsData,
    historyLoadingPlayerId,
    openPlayerHistory,
  } = useHostData();
  const [staticPlayerName, setStaticPlayerName] = useState("");
  const [staticSkillLevel, setStaticSkillLevel] =
    useState<SkillLevelType>("beginner");
  const [staticProfileUrlDrafts, setStaticProfileUrlDrafts] = useState<
    Record<string, string>
  >({});
  const [isCreatingStaticPlayer, setIsCreatingStaticPlayer] = useState(false);
  const [isBulkStaticPlayerModalOpen, setIsBulkStaticPlayerModalOpen] =
    useState(false);
  const [bulkStaticPlayerNames, setBulkStaticPlayerNames] = useState("");
  const [isCreatingBulkStaticPlayers, setIsCreatingBulkStaticPlayers] =
    useState(false);
  const [bulkStaticPlayerError, setBulkStaticPlayerError] = useState<
    string | null
  >(null);
  const [savingStaticProfileUrlId, setSavingStaticProfileUrlId] = useState<
    string | null
  >(null);
  const [staticProfileImageError, setStaticProfileImageError] = useState<
    string | null
  >(null);
  const [editingStaticPlayer, setEditingStaticPlayer] =
    useState<HostPlayerRecord | null>(null);
  const [editingStaticPlayerName, setEditingStaticPlayerName] = useState("");
  const [editingStaticPlayerSkillLevel, setEditingStaticPlayerSkillLevel] =
    useState<SkillLevelType>("beginner");
  const [editingStaticPlayerImage, setEditingStaticPlayerImage] =
    useState<File | null>(null);
  const [editingStaticPlayerImagePreview, setEditingStaticPlayerImagePreview] =
    useState<string | null>(null);
  const [isSavingStaticPlayerEdit, setIsSavingStaticPlayerEdit] =
    useState(false);
  const [staticPlayerEditError, setStaticPlayerEditError] = useState<
    string | null
  >(null);
  const accountPlayers = players.filter((player) => !player.player.isStatic);
  const staticPlayers = players.filter((player) => player.player.isStatic);

  const updateStaticPlayerInState = (updatedPlayer: AcceptedPlayers) => {
    setPlayersInHost((currentPlayers) =>
      currentPlayers.map((currentPlayer) =>
        currentPlayer.id === updatedPlayer.id
          ? {
              ...currentPlayer,
              status: updatedPlayer.hostStatus,
              player: updatedPlayer.player,
            }
          : currentPlayer,
      ),
    );
    setAcceptedPlayers((currentPlayers) =>
      currentPlayers.map((currentPlayer) =>
        currentPlayer.id === updatedPlayer.id
          ? {
              ...currentPlayer,
              player: updatedPlayer.player,
            }
          : currentPlayer,
      ),
    );
    setPaymentsData((currentPaymentsData) => {
      const nextPlayers = currentPaymentsData.players.map((paymentPlayer) =>
        paymentPlayer.id === updatedPlayer.id
          ? {
              ...paymentPlayer,
              player: {
                ...paymentPlayer.player,
                username: updatedPlayer.player.username,
                profileUrl: updatedPlayer.player.profileUrl,
              },
            }
          : paymentPlayer,
      );

      return {
        ...currentPaymentsData,
        players: nextPlayers,
        summary: buildPaymentsSummary(nextPlayers),
      };
    });
    setStaticProfileUrlDrafts((currentDrafts) => ({
      ...currentDrafts,
      [updatedPlayer.id]: updatedPlayer.player.profileUrl,
    }));
  };

  const createStaticPlayerAPI = async (
    username: string,
    skillLevel: SkillLevelType,
  ) => {
    const response = await api.post(
      `/api/community/${communityId}/hosts/${hostId}/players/static`,
      {
        username,
        skillLevel,
      },
    );

    return response.data.hostedPlayer as AcceptedPlayers;
  };

  const addStaticPlayerToState = (player: AcceptedPlayers) => {
    const nextAcceptedPlayer: AcceptedPlayers = {
      ...player,
      matchHistory: player.matchHistory ?? EMPTY_MATCH_HISTORY_SUMMARY,
    };
    const hostPlayerRecord: HostPlayerRecord = {
      id: nextAcceptedPlayer.id,
      status: nextAcceptedPlayer.hostStatus,
      player: nextAcceptedPlayer.player,
    };

    setPlayersInHost((currentPlayers) => [hostPlayerRecord, ...currentPlayers]);
    setAcceptedPlayers((currentPlayers) => [
      nextAcceptedPlayer,
      ...currentPlayers,
    ]);
    setPaymentsData((currentPaymentsData) => {
      const newPaymentPlayer = {
        id: nextAcceptedPlayer.id,
        status: "accepted" as const,
        paymentStatus: "unpaid" as const,
        gamesPlayed: 0,
        player: {
          username: nextAcceptedPlayer.player.username,
          profileUrl: nextAcceptedPlayer.player.profileUrl,
          isStatic: nextAcceptedPlayer.player.isStatic,
        },
        payment: {
          id: null,
          amountExpected: currentPaymentsData.pricing.expectedFee,
          amountPaid: 0,
          balance: currentPaymentsData.pricing.expectedFee,
          currency: currentPaymentsData.pricing.currency,
          status: "unpaid" as const,
          method: null,
        },
      };

      const nextPlayers = [...currentPaymentsData.players, newPaymentPlayer];

      return {
        ...currentPaymentsData,
        players: nextPlayers,
        summary: buildPaymentsSummary(nextPlayers),
      };
    });
    setStaticProfileUrlDrafts((currentDrafts) => ({
      ...currentDrafts,
      [nextAcceptedPlayer.id]: nextAcceptedPlayer.player.profileUrl,
    }));
  };

  const handleCreateStaticPlayer = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const cleanName = staticPlayerName.trim();
    if (!communityId || !hostId || !cleanName) return;

    setIsCreatingStaticPlayer(true);

    const previousPaymentsData = paymentsData;

    try {
      const player = await createStaticPlayerAPI(cleanName, staticSkillLevel);
      addStaticPlayerToState(player);
      setStaticPlayerName("");
      setStaticSkillLevel("beginner");
    } catch (error) {
      setPaymentsData(previousPaymentsData);

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    } finally {
      setIsCreatingStaticPlayer(false);
    }
  };

  const handleCreateBulkStaticPlayers = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (!communityId || !hostId) return;

    const names = bulkStaticPlayerNames
      .split(/\r?\n/)
      .map((name) => name.trim())
      .filter(Boolean);
    const uniqueNames = Array.from(new Set(names));

    if (uniqueNames.length === 0) {
      setBulkStaticPlayerError("Add at least one player name.");
      return;
    }

    setIsCreatingBulkStaticPlayers(true);
    setBulkStaticPlayerError(null);

    const previousPlayers = players;
    const previousAcceptedPlayers = acceptedPlayers;
    const previousPaymentsData = paymentsData;
    const previousDrafts = staticProfileUrlDrafts;

    try {
      for (const name of uniqueNames) {
        const player = await createStaticPlayerAPI(name, staticSkillLevel);
        addStaticPlayerToState(player);
      }

      setBulkStaticPlayerNames("");
      setBulkStaticPlayerError(null);
      setIsBulkStaticPlayerModalOpen(false);
      setStaticSkillLevel("beginner");
    } catch (error) {
      setPlayersInHost(previousPlayers);
      setAcceptedPlayers(previousAcceptedPlayers);
      setPaymentsData(previousPaymentsData);
      setStaticProfileUrlDrafts(previousDrafts);
      setBulkStaticPlayerError("Unable to add all static players.");

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    } finally {
      setIsCreatingBulkStaticPlayers(false);
    }
  };

  const handleAcceptPlayer = async (hostedPlayerId: string) => {
    const previousPlayers = players;
    const previousAcceptedPlayers = acceptedPlayers;
    const previousPaymentsData = paymentsData;
    const nextAcceptedPlayer = previousPlayers.find(
      (player) => player.id === hostedPlayerId,
    );

    setPlayersInHost((currentPlayers) =>
      currentPlayers.map((player) =>
        player.id === hostedPlayerId
          ? { ...player, status: "accepted" }
          : player,
      ),
    );
    setAcceptedPlayers((currentPlayers) => {
      if (!nextAcceptedPlayer) return currentPlayers;
      if (
        currentPlayers.some(
          (currentPlayer) => currentPlayer.id === nextAcceptedPlayer.id,
        )
      ) {
        return currentPlayers;
      }

      return [
        ...currentPlayers,
        {
          id: nextAcceptedPlayer.id,
          hostStatus: "accepted",
          matchStatus: "waiting",
          timerStartedAt: new Date().toISOString(),
          player: nextAcceptedPlayer.player,
          queueEntry: null,
          courtAssignment: null,
          matchHistory: EMPTY_MATCH_HISTORY_SUMMARY,
        },
      ];
    });
    setPaymentsData((currentPaymentsData) => {
      if (!nextAcceptedPlayer) return currentPaymentsData;
      if (
        currentPaymentsData.players.some(
          (currentPlayer) => currentPlayer.id === nextAcceptedPlayer.id,
        )
      ) {
        return currentPaymentsData;
      }

      const newPaymentPlayer = {
        id: nextAcceptedPlayer.id,
        status: "accepted" as const,
        paymentStatus: "unpaid" as const,
        gamesPlayed: 0,
        player: {
          username: nextAcceptedPlayer.player.username,
          profileUrl: nextAcceptedPlayer.player.profileUrl,
          isStatic: nextAcceptedPlayer.player.isStatic,
        },
        payment: {
          id: null,
          amountExpected: currentPaymentsData.pricing.expectedFee,
          amountPaid: 0,
          balance: currentPaymentsData.pricing.expectedFee,
          currency: currentPaymentsData.pricing.currency,
          status: "unpaid" as const,
          method: null,
        },
      };

      const nextPlayers = [...currentPaymentsData.players, newPaymentPlayer];

      return {
        ...currentPaymentsData,
        players: nextPlayers,
        summary: buildPaymentsSummary(nextPlayers),
      };
    });

    try {
      await api.post(
        `/api/private/actions/accept/community/${communityId}/hosts/${hostId}/players/${hostedPlayerId}`,
        {},
      );
    } catch (error) {
      setPlayersInHost(previousPlayers);
      setAcceptedPlayers(previousAcceptedPlayers);
      setPaymentsData(previousPaymentsData);

      if (axios.isAxiosError(error)) console.error(error);
      else console.error(error);
    }
  };

  const handleRejectPlayer = async (hostedPlayerId: string) => {
    const previousPlayers = players;

    setPlayersInHost((currentPlayers) =>
      currentPlayers.map((player) =>
        player.id === hostedPlayerId
          ? { ...player, status: "rejected" }
          : player,
      ),
    );

    try {
      await api.post(
        `/api/private/actions/reject/community/${communityId}/hosts/${hostId}/players/${hostedPlayerId}`,
        {},
      );
    } catch (error) {
      setPlayersInHost(previousPlayers);

      if (axios.isAxiosError(error)) console.error(error);
      else console.error(error);
    }
  };

  const handleBanPlayer = async (hostedPlayerId: string) => {
    const previousPlayers = players;
    const previousAcceptedPlayers = acceptedPlayers;
    const previousCourts = courts;
    const previousPaymentsData = paymentsData;

    setPlayersInHost((currentPlayers) =>
      currentPlayers.map((currentPlayer) =>
        currentPlayer.id === hostedPlayerId
          ? { ...currentPlayer, status: "banned" }
          : currentPlayer,
      ),
    );
    setAcceptedPlayers((currentPlayers) =>
      currentPlayers.filter(
        (currentPlayer) => currentPlayer.id !== hostedPlayerId,
      ),
    );
    setCourts((currentCourts) =>
      currentCourts.map((court) => ({
        ...court,
        assignments: court.assignments.filter(
          (assignment) => assignment.playerId !== hostedPlayerId,
        ),
      })),
    );
    setPaymentsData((currentPaymentsData) => {
      const nextPlayers = currentPaymentsData.players.filter(
        (currentPlayer) => currentPlayer.id !== hostedPlayerId,
      );

      return {
        ...currentPaymentsData,
        players: nextPlayers,
        summary: buildPaymentsSummary(nextPlayers),
      };
    });

    try {
      await api.post(
        `/api/private/actions/ban/community/${communityId}/hosts/${hostId}/players/${hostedPlayerId}`,
        {},
      );
    } catch (error) {
      setPlayersInHost(previousPlayers);
      setAcceptedPlayers(previousAcceptedPlayers);
      setCourts(previousCourts);
      setPaymentsData(previousPaymentsData);

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    }
  };

  const handleUnbanPlayer = async (hostedPlayerId: string) => {
    const previousPlayers = players;
    const previousAcceptedPlayers = acceptedPlayers;
    const previousPaymentsData = paymentsData;
    const nextAcceptedPlayer = previousPlayers.find(
      (player) => player.id === hostedPlayerId,
    );

    setPlayersInHost((currentPlayers) =>
      currentPlayers.map((currentPlayer) =>
        currentPlayer.id === hostedPlayerId
          ? { ...currentPlayer, status: "accepted" }
          : currentPlayer,
      ),
    );
    setAcceptedPlayers((currentPlayers) => {
      if (!nextAcceptedPlayer) return currentPlayers;
      if (
        currentPlayers.some(
          (currentPlayer) => currentPlayer.id === nextAcceptedPlayer.id,
        )
      ) {
        return currentPlayers;
      }

      return [
        ...currentPlayers,
        {
          id: nextAcceptedPlayer.id,
          hostStatus: "accepted",
          matchStatus: "waiting",
          timerStartedAt: new Date().toISOString(),
          player: nextAcceptedPlayer.player,
          queueEntry: null,
          courtAssignment: null,
          matchHistory: EMPTY_MATCH_HISTORY_SUMMARY,
        },
      ];
    });
    setPaymentsData((currentPaymentsData) => {
      if (!nextAcceptedPlayer) return currentPaymentsData;
      if (
        currentPaymentsData.players.some(
          (currentPlayer) => currentPlayer.id === nextAcceptedPlayer.id,
        )
      ) {
        return currentPaymentsData;
      }

      const newPaymentPlayer = {
        id: nextAcceptedPlayer.id,
        status: "accepted" as const,
        paymentStatus: "unpaid" as const,
        gamesPlayed: 0,
        player: {
          username: nextAcceptedPlayer.player.username,
          profileUrl: nextAcceptedPlayer.player.profileUrl,
          isStatic: nextAcceptedPlayer.player.isStatic,
        },
        payment: {
          id: null,
          amountExpected: currentPaymentsData.pricing.expectedFee,
          amountPaid: 0,
          balance: currentPaymentsData.pricing.expectedFee,
          currency: currentPaymentsData.pricing.currency,
          status: "unpaid" as const,
          method: null,
        },
      };

      const nextPlayers = [...currentPaymentsData.players, newPaymentPlayer];

      return {
        ...currentPaymentsData,
        players: nextPlayers,
        summary: buildPaymentsSummary(nextPlayers),
      };
    });

    try {
      await api.post(
        `/api/private/actions/unban/community/${communityId}/hosts/${hostId}/players/${hostedPlayerId}`,
        {},
      );
    } catch (error) {
      setPlayersInHost(previousPlayers);
      setAcceptedPlayers(previousAcceptedPlayers);
      setPaymentsData(previousPaymentsData);

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    }
  };

  const handleUpdateStaticPlayerSkillLevel = async (
    hostedPlayerId: string,
    skillLevel: SkillLevelType,
  ) => {
    const previousPlayers = players;
    const previousAcceptedPlayers = acceptedPlayers;

    setPlayersInHost((currentPlayers) =>
      currentPlayers.map((currentPlayer) =>
        currentPlayer.id === hostedPlayerId
          ? {
              ...currentPlayer,
              player: {
                ...currentPlayer.player,
                skillLevel,
              },
            }
          : currentPlayer,
      ),
    );
    setAcceptedPlayers((currentPlayers) =>
      currentPlayers.map((currentPlayer) =>
        currentPlayer.id === hostedPlayerId
          ? {
              ...currentPlayer,
              player: {
                ...currentPlayer.player,
                skillLevel,
              },
            }
          : currentPlayer,
      ),
    );

    try {
      const updatedPlayer = await updateStaticPlayerSkillLevelAPI(
        hostedPlayerId,
        skillLevel,
      );
      updateStaticPlayerInState(updatedPlayer);
    } catch (error) {
      setPlayersInHost(previousPlayers);
      setAcceptedPlayers(previousAcceptedPlayers);

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    }
  };

  const handleUpdateStaticPlayerProfileUrl = async (hostedPlayerId: string) => {
    const nextProfileUrl = staticProfileUrlDrafts[hostedPlayerId] ?? "";
    const previousPlayers = players;
    const previousAcceptedPlayers = acceptedPlayers;

    setSavingStaticProfileUrlId(hostedPlayerId);

    setPlayersInHost((currentPlayers) =>
      currentPlayers.map((currentPlayer) =>
        currentPlayer.id === hostedPlayerId
          ? {
              ...currentPlayer,
              player: {
                ...currentPlayer.player,
                profileUrl:
                  nextProfileUrl.trim() || currentPlayer.player.profileUrl,
              },
            }
          : currentPlayer,
      ),
    );
    setAcceptedPlayers((currentPlayers) =>
      currentPlayers.map((currentPlayer) =>
        currentPlayer.id === hostedPlayerId
          ? {
              ...currentPlayer,
              player: {
                ...currentPlayer.player,
                profileUrl:
                  nextProfileUrl.trim() || currentPlayer.player.profileUrl,
              },
            }
          : currentPlayer,
      ),
    );

    try {
      const response = await api.patch(
        `/api/private/actions/static/community/${communityId}/hosts/${hostId}/${hostedPlayerId}/profile-url`,
        {
          profileUrl: nextProfileUrl.trim() || null,
        },
      );

      const updatedPlayer = response.data.data as AcceptedPlayers;

      setPlayersInHost((currentPlayers) =>
        currentPlayers.map((currentPlayer) =>
          currentPlayer.id === hostedPlayerId
            ? {
                ...currentPlayer,
                player: updatedPlayer.player,
              }
            : currentPlayer,
        ),
      );
      setAcceptedPlayers((currentPlayers) =>
        currentPlayers.map((currentPlayer) =>
          currentPlayer.id === hostedPlayerId
            ? {
                ...currentPlayer,
                player: updatedPlayer.player,
              }
            : currentPlayer,
        ),
      );
      setStaticProfileUrlDrafts((currentDrafts) => ({
        ...currentDrafts,
        [hostedPlayerId]: updatedPlayer.player.profileUrl,
      }));
    } catch (error) {
      setPlayersInHost(previousPlayers);
      setAcceptedPlayers(previousAcceptedPlayers);

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    } finally {
      setSavingStaticProfileUrlId(null);
    }
  };

  const updateStaticPlayerProfileImageAPI = async (
    hostedPlayerId: string,
    file: File,
  ) => {
    const imageData = await readFileAsDataUrl(file);
    const response = await api.patch(
      `/api/private/actions/static/community/${communityId}/hosts/${hostId}/${hostedPlayerId}/profile-url`,
      { imageData },
    );

    return response.data.data as AcceptedPlayers;
  };

  const updateStaticPlayerSkillLevelAPI = async (
    hostedPlayerId: string,
    skillLevel: SkillLevelType,
  ) => {
    const response = await api.patch(
      `/api/private/actions/static/community/${communityId}/hosts/${hostId}/${hostedPlayerId}/skill-level`,
      { skillLevel },
    );

    return response.data.data as AcceptedPlayers;
  };

  const handleUpdateStaticPlayerProfileImage = async (
    hostedPlayerId: string,
    file: File,
  ) => {
    if (!communityId || !hostId) return;

    if (!file.type.startsWith("image/")) {
      setStaticProfileImageError("Please choose an image file.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setStaticProfileImageError("Please choose an image smaller than 5 MB.");
      return;
    }

    const previousPlayers = players;
    const previousAcceptedPlayers = acceptedPlayers;
    const previousPaymentsData = paymentsData;

    try {
      setSavingStaticProfileUrlId(hostedPlayerId);
      setStaticProfileImageError(null);

      const updatedPlayer = await updateStaticPlayerProfileImageAPI(
        hostedPlayerId,
        file,
      );

      setPlayersInHost((currentPlayers) =>
        currentPlayers.map((currentPlayer) =>
          currentPlayer.id === hostedPlayerId
            ? {
                ...currentPlayer,
                player: updatedPlayer.player,
              }
            : currentPlayer,
        ),
      );
      setAcceptedPlayers((currentPlayers) =>
        currentPlayers.map((currentPlayer) =>
          currentPlayer.id === hostedPlayerId
            ? {
                ...currentPlayer,
                player: updatedPlayer.player,
              }
            : currentPlayer,
        ),
      );
      setPaymentsData((currentPaymentsData) => {
        const nextPlayers = currentPaymentsData.players.map((paymentPlayer) =>
          paymentPlayer.id === hostedPlayerId
            ? {
                ...paymentPlayer,
                player: {
                  ...paymentPlayer.player,
                  profileUrl: updatedPlayer.player.profileUrl,
                },
              }
            : paymentPlayer,
        );

        return {
          ...currentPaymentsData,
          players: nextPlayers,
          summary: buildPaymentsSummary(nextPlayers),
        };
      });
      setStaticProfileUrlDrafts((currentDrafts) => ({
        ...currentDrafts,
        [hostedPlayerId]: updatedPlayer.player.profileUrl,
      }));
    } catch (error) {
      setPlayersInHost(previousPlayers);
      setAcceptedPlayers(previousAcceptedPlayers);
      setPaymentsData(previousPaymentsData);
      setStaticProfileImageError("Unable to update static player photo.");

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    } finally {
      setSavingStaticProfileUrlId(null);
    }
  };

  const openEditStaticPlayerModal = (player: HostPlayerRecord) => {
    setEditingStaticPlayer(player);
    setEditingStaticPlayerName(player.player.username);
    setEditingStaticPlayerSkillLevel(player.player.skillLevel);
    setEditingStaticPlayerImage(null);
    setEditingStaticPlayerImagePreview(null);
    setStaticPlayerEditError(null);
  };

  const closeEditStaticPlayerModal = () => {
    if (isSavingStaticPlayerEdit) return;

    setEditingStaticPlayer(null);
    setEditingStaticPlayerName("");
    setEditingStaticPlayerSkillLevel("beginner");
    setEditingStaticPlayerImage(null);
    setEditingStaticPlayerImagePreview(null);
    setStaticPlayerEditError(null);
  };

  const handleEditStaticPlayerImageChange = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setStaticPlayerEditError("Please choose an image file.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setStaticPlayerEditError("Please choose an image smaller than 5 MB.");
      return;
    }

    try {
      const preview = await readFileAsDataUrl(file);
      setEditingStaticPlayerImage(file);
      setEditingStaticPlayerImagePreview(preview);
      setStaticPlayerEditError(null);
    } catch {
      setStaticPlayerEditError("Unable to preview that image.");
    }
  };

  const handleSaveStaticPlayerEdit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!communityId || !hostId || !editingStaticPlayer) return;

    const cleanName = editingStaticPlayerName.trim();
    if (!cleanName) {
      setStaticPlayerEditError("Player name is required.");
      return;
    }

    setIsSavingStaticPlayerEdit(true);
    setStaticPlayerEditError(null);

    const previousPlayers = players;
    const previousAcceptedPlayers = acceptedPlayers;
    const previousPaymentsData = paymentsData;

    try {
      const nameResponse = await api.patch(
        `/api/private/actions/static/community/${communityId}/hosts/${hostId}/${editingStaticPlayer.id}/name`,
        { username: cleanName },
      );

      updateStaticPlayerInState(nameResponse.data.data as AcceptedPlayers);

      if (
        editingStaticPlayerSkillLevel !== editingStaticPlayer.player.skillLevel
      ) {
        const skillResponse = await updateStaticPlayerSkillLevelAPI(
          editingStaticPlayer.id,
          editingStaticPlayerSkillLevel,
        );
        updateStaticPlayerInState(skillResponse);
      }

      if (editingStaticPlayerImage) {
        setSavingStaticProfileUrlId(editingStaticPlayer.id);
        const imageUpdatedPlayer = await updateStaticPlayerProfileImageAPI(
          editingStaticPlayer.id,
          editingStaticPlayerImage,
        );
        updateStaticPlayerInState(imageUpdatedPlayer);
      }

      setEditingStaticPlayer(null);
      setEditingStaticPlayerName("");
      setEditingStaticPlayerSkillLevel("beginner");
      setEditingStaticPlayerImage(null);
      setEditingStaticPlayerImagePreview(null);
    } catch (error) {
      setPlayersInHost(previousPlayers);
      setAcceptedPlayers(previousAcceptedPlayers);
      setPaymentsData(previousPaymentsData);
      setStaticPlayerEditError("Unable to update static player.");

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    } finally {
      setSavingStaticProfileUrlId(null);
      setIsSavingStaticPlayerEdit(false);
    }
  };

  const requestedPlayers = players.filter(
    (player) => player.status === "requested",
  );

  return (
    <div className="p-2">
      <header className="mb-4 flex flex-col gap-2 rounded-3xl border border-orange-100 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-2xl">
            🏸
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-500">
              Match Management
            </p>

            <h3 className="text-2xl font-bold text-[var(--color-text)]">
              Players Management
            </h3>
          </div>
        </div>

        <p className="text-sm text-stone-500">
          Manage player requests, queue participation, and walk-in badminton
          players.
        </p>
        {staticProfileImageError ? (
          <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {staticProfileImageError}
          </p>
        ) : null}
      </header>

      {requestedPlayers.length > 0 && (
        <div className="mb-5 rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
          <h4 className="text-sm font-semibold text-yellow-700">
            Pending Requests ({requestedPlayers.length})
          </h4>

          <div className="mt-3 flex flex-wrap gap-2">
            {requestedPlayers.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-2 rounded-xl border border-yellow-200 bg-white px-3 py-2"
              >
                <img
                  src={player.player.profileUrl}
                  alt={player.player.username}
                  className="h-6 w-6 rounded-full object-cover"
                />
                <span className="text-sm font-medium text-stone-700">
                  {player.player.username}
                </span>

                <button
                  onClick={() => handleAcceptPlayer(player.id)}
                  className="ml-2 rounded-lg bg-green-100 px-2 py-1 text-xs font-medium text-green-700"
                >
                  Accept
                </button>

                <button
                  onClick={() => handleRejectPlayer(player.id)}
                  className="rounded-lg bg-red-100 px-2 py-1 text-xs font-medium text-red-700"
                >
                  Reject
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-5">
        <PlayerSection
          title="Players"
          description="Manage registered and walk-in badminton players."
          players={players}
          acceptedPlayers={acceptedPlayers}
          historyLoadingPlayerId={historyLoadingPlayerId}
          staticProfileUrlDrafts={staticProfileUrlDrafts}
          savingStaticProfileUrlId={savingStaticProfileUrlId}
          onAcceptPlayer={handleAcceptPlayer}
          onRejectPlayer={handleRejectPlayer}
          onBanPlayer={handleBanPlayer}
          onUnbanPlayer={handleUnbanPlayer}
          onViewHistory={openPlayerHistory}
          onUpdateStaticPlayerSkillLevel={handleUpdateStaticPlayerSkillLevel}
          onStaticProfileUrlDraftChange={(hostedPlayerId, profileUrl) =>
            setStaticProfileUrlDrafts((currentDrafts) => ({
              ...currentDrafts,
              [hostedPlayerId]: profileUrl,
            }))
          }
          onStaticProfileImageChange={(hostedPlayerId, file) =>
            void handleUpdateStaticPlayerProfileImage(hostedPlayerId, file)
          }
          onUpdateStaticPlayerProfileUrl={handleUpdateStaticPlayerProfileUrl}
          onEditStaticPlayer={openEditStaticPlayerModal}
          emptyMessage="No players yet."
          extraContent={
            <form
              onSubmit={(event) => void handleCreateStaticPlayer(event)}
              className="flex flex-wrap items-end gap-3 rounded-2xl border border-orange-100 bg-orange-50/40 p-4"
            >
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-stone-700">
                  Static player
                </span>

                <input
                  type="text"
                  value={staticPlayerName}
                  onChange={(event) => setStaticPlayerName(event.target.value)}
                  placeholder="Player name"
                  className="block min-w-[220px] rounded-xl border border-orange-100 bg-white px-4 py-2.5 text-sm text-stone-700 outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-orange-100"
                />
              </label>

              <label className="grid gap-2 text-sm">
                <span className="font-medium text-stone-700">Skill level</span>

                <select
                  value={staticSkillLevel}
                  onChange={(event) =>
                    setStaticSkillLevel(event.target.value as SkillLevelType)
                  }
                  className="rounded-xl border border-orange-100 bg-white px-4 py-2.5 text-sm text-stone-700 outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-orange-100"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="elite">Elite</option>
                </select>
              </label>

              <button
                type="submit"
                disabled={isCreatingStaticPlayer}
                className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  isCreatingStaticPlayer
                    ? "cursor-not-allowed bg-stone-200 text-stone-400"
                    : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-accent)] active:scale-[0.98]"
                }`}
              >
                {isCreatingStaticPlayer ? "Adding..." : "Add player"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setBulkStaticPlayerError(null);
                  setIsBulkStaticPlayerModalOpen(true);
                }}
                className="rounded-xl border border-orange-200 bg-white px-5 py-2.5 text-sm font-semibold cursor-pointer text-[var(--color-primary)] transition-all duration-200 hover:border-[var(--color-primary)] hover:bg-orange-50"
              >
                Add multiple players
              </button>
            </form>
          }
        />
      </div>

      {editingStaticPlayer ? (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-3xl border border-orange-100 bg-white p-5 shadow-2xl">
            <header className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-lg font-semibold text-text">
                  Edit static player
                </h4>
                <p className="mt-1 text-sm text-stone-500">
                  Update this walk-in player's name and photo.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditStaticPlayerModal}
                disabled={isSavingStaticPlayerEdit}
                className="rounded-full px-3 py-1 text-sm font-semibold text-stone-500 hover:bg-stone-100 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Close modal"
              >
                X
              </button>
            </header>

            <form
              onSubmit={(event) => void handleSaveStaticPlayerEdit(event)}
              className="mt-5 grid gap-5"
            >
              <div className="flex justify-center">
                <label
                  className="group relative h-24 w-24 cursor-pointer overflow-hidden rounded-full border border-orange-100 bg-orange-50"
                  title="Change static player photo"
                >
                  <img
                    src={
                      editingStaticPlayerImagePreview ??
                      editingStaticPlayer.player.profileUrl
                    }
                    alt={editingStaticPlayer.player.username}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-xs font-semibold text-white opacity-0 transition group-hover:bg-black/45 group-hover:opacity-100">
                    Change
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isSavingStaticPlayerEdit}
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) void handleEditStaticPlayerImageChange(file);
                    }}
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm">
                <span className="font-medium text-stone-700">Player name</span>
                <input
                  type="text"
                  value={editingStaticPlayerName}
                  onChange={(event) =>
                    setEditingStaticPlayerName(event.target.value)
                  }
                  disabled={isSavingStaticPlayerEdit}
                  className="rounded-xl border border-orange-100 bg-white px-4 py-2.5 text-sm text-stone-700 outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-stone-50"
                />
              </label>

              <label className="grid gap-2 text-sm">
                <span className="font-medium text-stone-700">Skill level</span>
                <select
                  value={editingStaticPlayerSkillLevel}
                  onChange={(event) =>
                    setEditingStaticPlayerSkillLevel(
                      event.target.value as SkillLevelType,
                    )
                  }
                  disabled={isSavingStaticPlayerEdit}
                  className="rounded-xl border border-orange-100 bg-white px-4 py-2.5 text-sm text-stone-700 outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-stone-50"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="elite">Elite</option>
                </select>
              </label>

              {staticPlayerEditError ? (
                <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                  {staticPlayerEditError}
                </p>
              ) : null}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEditStaticPlayerModal}
                  disabled={isSavingStaticPlayerEdit}
                  className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSavingStaticPlayerEdit}
                  className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    isSavingStaticPlayerEdit
                      ? "cursor-not-allowed bg-stone-200 text-stone-400"
                      : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-accent)] active:scale-[0.98]"
                  }`}
                >
                  {isSavingStaticPlayerEdit ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isBulkStaticPlayerModalOpen ? (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-3xl border border-orange-100 bg-white p-5 shadow-2xl">
            <header className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-lg font-semibold text-text">
                  Add multiple static players
                </h4>
                <p className="mt-1 text-sm text-stone-500">
                  Enter one player name per line.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsBulkStaticPlayerModalOpen(false)}
                disabled={isCreatingBulkStaticPlayers}
                className="rounded-full px-3 py-1 text-sm font-semibold text-stone-500 hover:bg-stone-100 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Close modal"
              >
                X
              </button>
            </header>

            <form
              onSubmit={(event) => void handleCreateBulkStaticPlayers(event)}
              className="mt-5 grid gap-4"
            >
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-stone-700">Add players</span>
                <textarea
                  value={bulkStaticPlayerNames}
                  onChange={(event) =>
                    setBulkStaticPlayerNames(event.target.value)
                  }
                  placeholder={"John\nDoe\nJane\nRalph"}
                  rows={8}
                  className="min-h-[180px] resize-y rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-orange-100"
                />
              </label>

              <label className="grid gap-2 text-sm">
                <span className="font-medium text-stone-700">Skill level</span>
                <select
                  value={staticSkillLevel}
                  onChange={(event) =>
                    setStaticSkillLevel(event.target.value as SkillLevelType)
                  }
                  className="rounded-xl border border-orange-100 bg-white px-4 py-2.5 text-sm text-stone-700 outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-orange-100"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="elite">Elite</option>
                </select>
              </label>

              {bulkStaticPlayerError ? (
                <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                  {bulkStaticPlayerError}
                </p>
              ) : null}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsBulkStaticPlayerModalOpen(false)}
                  disabled={isCreatingBulkStaticPlayers}
                  className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isCreatingBulkStaticPlayers}
                  className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    isCreatingBulkStaticPlayers
                      ? "cursor-not-allowed bg-stone-200 text-stone-400"
                      : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-accent)] active:scale-[0.98]"
                  }`}
                >
                  {isCreatingBulkStaticPlayers ? "Adding..." : "Add players"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
