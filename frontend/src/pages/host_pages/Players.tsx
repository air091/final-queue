import axios from "axios";
import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useParams } from "react-router-dom";
import { useHostData } from "../../hooks/useHostData";
import { api } from "../../lib/api";
import {
  EMPTY_MATCH_HISTORY_SUMMARY,
  buildPaymentsSummary,
  type AcceptedPlayers,
  type CommunityPlayerRecord,
  type HostPlayerRecord,
  type SkillLevelType,
} from "../../lib/host";
import {
  AArrowDown,
  AArrowUp,
  ChevronDown,
  ChevronUp,
  Gamepad,
  MoveDown,
  MoveUp,
  Plus,
  Search,
  X,
} from "lucide-react";
import {
  SKILL_LEVEL_OPTIONS,
  SkillLevelBadge,
} from "../../lib/skillLevels";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
type SortDirection = "asc" | "desc";
type PlayerSortField = "name" | "games";
type NewPlayerFormState = {
  names: string;
  skillLevel: SkillLevelType;
};

const INITIAL_NEW_PLAYER_FORM: NewPlayerFormState = {
  names: "",
  skillLevel: "beginner",
};

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

const formatWinTotalGames = (player?: AcceptedPlayers) => {
  const matchHistory = player?.matchHistory;
  if (!matchHistory) return "-";

  return `${matchHistory.winCount}/${matchHistory.matchCount}`;
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
  onRemovePlayerFromHost: (hostedPlayerId: string) => void;
  onUnbanPlayer: (hostedPlayerId: string) => void;
  onDeletePlayer: (hostedPlayerId: string) => void;
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
  headerActions?: ReactNode;
};

function PlayerSection({
  title,
  description,
  players,
  acceptedPlayers,
  historyLoadingPlayerId,
  onAcceptPlayer,
  onRejectPlayer,
  onRemovePlayerFromHost,
  onUnbanPlayer,
  onDeletePlayer,
  onViewHistory,
  savingStaticProfileUrlId,
  onStaticProfileImageChange,
  onEditStaticPlayer,
  emptyMessage,
  extraContent,
  headerActions,
}: PlayerSectionProps) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-visible">
      {/* HEADER */}
      <header className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
        <div>
          <h4 className="text-base font-semibold text-text">{title}</h4>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          {headerActions}

          <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-primary/10 px-3 text-xs font-semibold text-primary">
            {players.length}
          </span>
        </div>
      </header>

      {/* EXTRA CONTENT */}
      {extraContent ? (
        <div className="border-b border-gray-100 px-5 py-4">{extraContent}</div>
      ) : null}

      {/* ===================== MOBILE CARDS ===================== */}
      <div className="grid grid-cols-1 gap-3 p-3 min-[426px]:grid-cols-3 md:hidden">
        {players.length > 0 ? (
          players.map((playerRecord) => {
            const acceptedPlayer = acceptedPlayers.find(
              (a) => a.id === playerRecord.id,
            );

            const isRemoveDisabled = acceptedPlayer?.matchStatus === "playing";
            const canUpdateStaticProfile =
              playerRecord.player.isStatic && onStaticProfileImageChange;
            const isSavingProfile =
              savingStaticProfileUrlId === playerRecord.id;

            return (
              <div
                key={playerRecord.id}
                className="space-y-4 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm transition hover:shadow-md"
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
                      {playerRecord.player.isAdmin
                        ? "Admin"
                        : playerRecord.player.isStatic
                          ? "Static Player"
                          : "Dynamic"}
                    </span>
                  </div>
                </div>

                {/* Info Row */}
                <div className="flex flex-wrap gap-2">
                  <SkillLevelBadge skillLevel={playerRecord.player.skillLevel} />

                  {playerRecord.player.isAdmin ? (
                    <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-[var(--color-accent)]">
                      Admin
                    </span>
                  ) : null}

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
                  Games: {formatWinTotalGames(acceptedPlayer)}
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

                  {!playerRecord.player.isAdmin ? (
                    <details className="relative inline-block">
                      <summary
                        onClick={(event) => {
                          const currentDetails =
                            event.currentTarget.closest("details");
                          const currentSection =
                            currentDetails?.closest("section");
                          if (!currentDetails || !currentSection) return;

                          currentSection
                            .querySelectorAll("details")
                            .forEach((detailsElement) => {
                              if (detailsElement !== currentDetails) {
                                detailsElement.removeAttribute("open");
                              }
                            });
                        }}
                        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 cursor-pointer transition hover:bg-gray-50 [&>::-webkit-details-marker]:hidden"
                      >
                        Actions
                      </summary>

                      <div className="absolute right-0 z-50 mt-2 max-h-[60vh] overflow-auto min-w-[140px] rounded-2xl border border-gray-200 bg-white shadow-lg">
                        {playerRecord.status === "accepted" ? (
                          <button
                            type="button"
                            disabled={isRemoveDisabled}
                            onClick={(event) => {
                              event.preventDefault();
                              event.currentTarget
                                .closest("details")
                                ?.removeAttribute("open");
                              onRemovePlayerFromHost(playerRecord.id);
                            }}
                            className={`block w-full border-b border-gray-100 px-4 py-3 text-left text-xs font-medium transition ${
                              isRemoveDisabled
                                ? "cursor-not-allowed bg-gray-100 text-gray-400"
                                : "bg-white text-red-600 hover:bg-red-50"
                            }`}
                          >
                            Remove
                          </button>
                        ) : null}

                        {playerRecord.status === "banned" ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              event.currentTarget
                                .closest("details")
                                ?.removeAttribute("open");
                              onUnbanPlayer(playerRecord.id);
                            }}
                            className="block w-full border-b border-gray-100 px-4 py-3 text-left text-xs font-medium bg-white text-gray-900 hover:bg-gray-50"
                          >
                            Unban
                          </button>
                        ) : null}
                      </div>
                    </details>
                  ) : null}

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
          <div className="col-span-full p-10 text-center text-sm text-gray-500">
            {emptyMessage}
          </div>
        )}
      </div>

      {/* ===================== DESKTOP GRID ===================== */}
      <div className="hidden md:grid grid-cols-4 gap-4 p-5">
        {players.length > 0 ? (
          players.map((playerRecord) => {
            const acceptedPlayer = acceptedPlayers.find(
              (a) => a.id === playerRecord.id,
            );

            const isRemoveDisabled = acceptedPlayer?.matchStatus === "playing";

            const canUpdateStaticProfile =
              playerRecord.player.isStatic && onStaticProfileImageChange;

            const isSavingProfile =
              savingStaticProfileUrlId === playerRecord.id;

            return (
              <div
                key={playerRecord.id}
                className="rounded-2xl border border-gray-200 bg-white py-4 px-2 shadow-sm transition hover:shadow-md"
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

                  <h5 className="mt-3 font-semibold text-[18px] text-text">
                    {playerRecord.player.username}
                  </h5>

                  <p className="text-xs text-gray-500">
                    {playerRecord.player.isAdmin
                      ? "Admin"
                      : playerRecord.player.isStatic
                        ? "Static Player"
                        : "Registered Player"}
                  </p>
                </div>

                {/* TAGS */}
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <SkillLevelBadge skillLevel={playerRecord.player.skillLevel} />

                  {playerRecord.player.isAdmin ? (
                    <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-[var(--color-accent)]">
                      Admin
                    </span>
                  ) : null}

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
                <div className="mt-4 space-y-1 text-center text-gray-600">
                  <p>Games: {formatWinTotalGames(acceptedPlayer)}</p>
                </div>

                {/* ACTIONS */}
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {playerRecord.player.isAdmin ? (
                    <span className="rounded-xl bg-orange-100 px-3 py-2 text-xs font-semibold text-[var(--color-accent)]">
                      Admin
                    </span>
                  ) : null}

                  <button
                    onClick={() => onViewHistory(playerRecord)}
                    disabled={historyLoadingPlayerId === playerRecord.id}
                    className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium hover:bg-gray-50 cursor-pointer"
                  >
                    {historyLoadingPlayerId === playerRecord.id
                      ? "Loading..."
                      : "History"}
                  </button>

                  {!playerRecord.player.isAdmin ? (
                    <details className="relative inline-block">
                      <summary
                        onClick={(event) => {
                          const currentDetails =
                            event.currentTarget.closest("details");
                          const currentSection =
                            currentDetails?.closest("section");
                          if (!currentDetails || !currentSection) return;

                          currentSection
                            .querySelectorAll("details")
                            .forEach((detailsElement) => {
                              if (detailsElement !== currentDetails) {
                                detailsElement.removeAttribute("open");
                              }
                            });
                        }}
                        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 cursor-pointer transition hover:bg-gray-50 [&>::-webkit-details-marker]:hidden"
                      >
                        Actions
                      </summary>

                      <div className="absolute right-0 z-20 mt-2 min-w-[140px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
                        {playerRecord.status === "accepted" ? (
                          <button
                            type="button"
                            disabled={isRemoveDisabled}
                            onClick={(event) => {
                              event.preventDefault();
                              event.currentTarget
                                .closest("details")
                                ?.removeAttribute("open");
                              onRemovePlayerFromHost(playerRecord.id);
                            }}
                            className={`block w-full border-b border-gray-100 px-4 py-3 text-left text-xs font-medium transition ${
                              isRemoveDisabled
                                ? "cursor-not-allowed bg-gray-100 text-gray-400"
                                : "bg-white text-red-600 hover:bg-red-50"
                            }`}
                          >
                            Remove
                          </button>
                        ) : null}

                        {playerRecord.status === "banned" ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              event.currentTarget
                                .closest("details")
                                ?.removeAttribute("open");
                              onUnbanPlayer(playerRecord.id);
                            }}
                            className="block w-full border-b border-gray-100 px-4 py-3 text-left text-xs font-medium bg-white text-gray-900 hover:bg-gray-50"
                          >
                            Unban
                          </button>
                        ) : null}
                      </div>
                    </details>
                  ) : null}

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
    queues,
    setQueues,
    paymentsData,
    setPaymentsData,
    historyLoadingPlayerId,
    openPlayerHistory,
    playerSearchTerm,
    setPlayerSearchTerm,
    pauseHostLiveSync,
  } = useHostData();
  const [communityPlayers, setCommunityPlayers] = useState<
    CommunityPlayerRecord[]
  >([]);
  const [selectedCommunityPlayerIds, setSelectedCommunityPlayerIds] = useState<
    string[]
  >([]);
  const [isCommunityPickerMinimized, setIsCommunityPickerMinimized] =
    useState(false);
  const [isAddingCommunityPlayers, setIsAddingCommunityPlayers] =
    useState(false);
  const [communityPlayerError, setCommunityPlayerError] = useState<
    string | null
  >(null);
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
  const [newPlayerForm, setNewPlayerForm] = useState<NewPlayerFormState>(
    INITIAL_NEW_PLAYER_FORM,
  );
  const [isCreatingNewPlayer, setIsCreatingNewPlayer] = useState(false);
  const [newPlayerError, setNewPlayerError] = useState<string | null>(null);
  const [nameSortDirection, setNameSortDirection] =
    useState<SortDirection>("asc");
  const [gamesSortDirection, setGamesSortDirection] =
    useState<SortDirection>("desc");
  const [primarySortField, setPrimarySortField] =
    useState<PlayerSortField>("name");
  const [staticProfileUrlDrafts, setStaticProfileUrlDrafts] = useState<
    Record<string, string>
  >({});
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

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;

      const openDetails = Array.from(
        document.querySelectorAll("details[open]"),
      );
      if (openDetails.length === 0) return;

      const clickedInsideOpenDetails = openDetails.some((detailsElement) =>
        detailsElement.contains(target),
      );
      if (!clickedInsideOpenDetails) {
        openDetails.forEach((detailsElement) => {
          detailsElement.removeAttribute("open");
        });
      }
    };

    document.addEventListener("click", handleDocumentClick);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, []);

  useEffect(() => {
    if (!communityId) return;

    void (async () => {
      try {
        const response = await api.get(`/api/community/${communityId}/players`);
        setCommunityPlayers(response.data.players as CommunityPlayerRecord[]);
      } catch (error) {
        setCommunityPlayerError("Unable to load community players.");

        if (axios.isAxiosError(error))
          console.error(error.response?.data ?? error);
        else console.error(error);
      }
    })();
  }, [communityId]);

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

  const addCommunityPlayersToHostAPI = async (
    communityPlayerIds: string[],
  ) => {
    const response = await api.post(
      `/api/community/${communityId}/hosts/${hostId}/players/from-community`,
      {
        communityPlayerIds,
      },
    );

    return response.data.hostedPlayers as AcceptedPlayers[];
  };

  const createHostStaticPlayersAPI = async (
    usernames: string[],
    skillLevel: SkillLevelType,
  ) => {
    const response = await api.post(
      `/api/community/${communityId}/hosts/${hostId}/players/static/bulk`,
      {
        usernames,
        skillLevel,
      },
    );

    return response.data as {
      communityPlayers: CommunityPlayerRecord[];
      hostedPlayers: AcceptedPlayers[];
    };
  };

  const addHostedPlayersToState = (hostedPlayers: AcceptedPlayers[]) => {
    const normalizedHostedPlayers = hostedPlayers.map((player) => ({
      ...player,
      matchHistory: player.matchHistory ?? EMPTY_MATCH_HISTORY_SUMMARY,
    }));
    const hostPlayerRecords: HostPlayerRecord[] = normalizedHostedPlayers.map(
      (player) => ({
        id: player.id,
        status: player.hostStatus,
        player: player.player,
      }),
    );

    setPlayersInHost((currentPlayers) => {
      const nextPlayersById = new Map(
        currentPlayers.map((player) => [player.id, player]),
      );
      for (const player of hostPlayerRecords) nextPlayersById.set(player.id, player);
      return Array.from(nextPlayersById.values());
    });
    setAcceptedPlayers((currentPlayers) => {
      const nextPlayersById = new Map(
        currentPlayers.map((player) => [player.id, player]),
      );
      for (const player of normalizedHostedPlayers)
        nextPlayersById.set(player.id, player);
      return Array.from(nextPlayersById.values());
    });
    setPaymentsData((currentPaymentsData) => {
      const nextPaymentsById = new Map(
        currentPaymentsData.players.map((player) => [player.id, player]),
      );

      for (const player of normalizedHostedPlayers) {
        const amountExpected =
          currentPaymentsData.pricing.entranceFee +
          currentPaymentsData.pricing.perMatchFee * player.gamesPlayed;

        nextPaymentsById.set(player.id, {
          id: player.id,
          status: "accepted" as const,
          paymentStatus: "unpaid" as const,
          gamesPlayed: player.gamesPlayed,
          player: {
            id: player.player.id,
            username: player.player.username,
            profileUrl: player.player.profileUrl,
            isStatic: player.player.isStatic,
            isAdmin: player.player.isAdmin,
          },
          payment: {
            id: null,
            amountExpected,
            amountPaid: 0,
            balance: amountExpected,
            currency: currentPaymentsData.pricing.currency,
            status: "unpaid" as const,
            method: null,
          },
        });
      }

      const nextPlayers = Array.from(nextPaymentsById.values());

      return {
        ...currentPaymentsData,
        players: nextPlayers,
        summary: buildPaymentsSummary(nextPlayers),
      };
    });
    setStaticProfileUrlDrafts((currentDrafts) => ({
      ...currentDrafts,
      ...Object.fromEntries(
        normalizedHostedPlayers.map((player) => [
          player.id,
          player.player.profileUrl,
        ]),
      ),
    }));
  };

  const handleToggleCommunityPlayer = (communityPlayerId: string) => {
    setSelectedCommunityPlayerIds((currentIds) =>
      currentIds.includes(communityPlayerId)
        ? currentIds.filter((currentId) => currentId !== communityPlayerId)
        : [...currentIds, communityPlayerId],
    );
  };

  const handleAddCommunityPlayers = async () => {
    if (!communityId || !hostId) return;

    if (selectedCommunityPlayerIds.length === 0) {
      setCommunityPlayerError("Select at least one community player.");
      return;
    }

    setIsAddingCommunityPlayers(true);
    setCommunityPlayerError(null);
    const previousPlayers = players;
    const previousAcceptedPlayers = acceptedPlayers;
    const previousPaymentsData = paymentsData;
    const previousDrafts = staticProfileUrlDrafts;

    try {
      const hostedPlayers = await addCommunityPlayersToHostAPI(
        selectedCommunityPlayerIds,
      );
      addHostedPlayersToState(hostedPlayers);
      setSelectedCommunityPlayerIds([]);
    } catch (error) {
      setPlayersInHost(previousPlayers);
      setAcceptedPlayers(previousAcceptedPlayers);
      setPaymentsData(previousPaymentsData);
      setStaticProfileUrlDrafts(previousDrafts);
      setCommunityPlayerError("Unable to add selected players.");

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    } finally {
      setIsAddingCommunityPlayers(false);
    }
  };

  const closeAddPlayerModal = () => {
    if (isCreatingNewPlayer) return;

    setIsAddPlayerModalOpen(false);
    setNewPlayerForm(INITIAL_NEW_PLAYER_FORM);
    setNewPlayerError(null);
  };

  const handleCreateNewPlayer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!communityId || !hostId) return;

    const names = newPlayerForm.names
      .split(/\r?\n/)
      .map((name) => name.trim())
      .filter(Boolean);
    const uniqueNames = Array.from(new Set(names));

    if (uniqueNames.length === 0) {
      setNewPlayerError("Add at least one player name.");
      return;
    }

    setIsCreatingNewPlayer(true);
    setNewPlayerError(null);

    const previousCommunityPlayers = communityPlayers;
    const previousPlayers = players;
    const previousAcceptedPlayers = acceptedPlayers;
    const previousPaymentsData = paymentsData;
    const previousDrafts = staticProfileUrlDrafts;

    try {
      const { communityPlayers: createdCommunityPlayers, hostedPlayers } =
        await createHostStaticPlayersAPI(
          uniqueNames,
          newPlayerForm.skillLevel,
        );

      setCommunityPlayers((currentPlayers) => [
        ...createdCommunityPlayers,
        ...currentPlayers,
      ]);
      addHostedPlayersToState(hostedPlayers);
      setSelectedCommunityPlayerIds((currentIds) =>
        currentIds.filter(
          (currentId) =>
            !createdCommunityPlayers.some(
              (communityPlayer) => communityPlayer.id === currentId,
            ),
        ),
      );
      setNewPlayerForm(INITIAL_NEW_PLAYER_FORM);
      setIsAddPlayerModalOpen(false);
    } catch (error) {
      setCommunityPlayers(previousCommunityPlayers);
      setPlayersInHost(previousPlayers);
      setAcceptedPlayers(previousAcceptedPlayers);
      setPaymentsData(previousPaymentsData);
      setStaticProfileUrlDrafts(previousDrafts);
      setNewPlayerError(
        axios.isAxiosError(error)
          ? (error.response?.data?.message ?? "Unable to add players.")
          : "Unable to add players.",
      );

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    } finally {
      setIsCreatingNewPlayer(false);
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
          gamesPlayed: 0,
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
          id: nextAcceptedPlayer.player.id,
          username: nextAcceptedPlayer.player.username,
          profileUrl: nextAcceptedPlayer.player.profileUrl,
          isStatic: nextAcceptedPlayer.player.isStatic,
          isAdmin: nextAcceptedPlayer.player.isAdmin,
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

  const handleRemovePlayerFromHost = async (hostedPlayerId: string) => {
    const playerToRemove = players.find((player) => player.id === hostedPlayerId);
    const shouldRemove = window.confirm(
      `Remove ${playerToRemove?.player.username ?? "this player"} from this hosted match? This will also remove their match history for this session.`,
    );
    if (!shouldRemove) return;

    const resumeHostLiveSync = pauseHostLiveSync();
    const previousPlayers = players;
    const previousAcceptedPlayers = acceptedPlayers;
    const previousCourts = courts;
    const previousQueues = queues;
    const previousPaymentsData = paymentsData;

    setPlayersInHost((currentPlayers) =>
      currentPlayers.filter(
        (currentPlayer) => currentPlayer.id !== hostedPlayerId,
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
    setQueues((currentQueues) =>
      currentQueues.map((queue) => ({
        ...queue,
        entries: queue.entries.filter(
          (entry) => entry.playerId !== hostedPlayerId,
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
      await api.delete(
        `/api/private/actions/remove/community/${communityId}/hosts/${hostId}/players/${hostedPlayerId}`,
      );
    } catch (error) {
      setPlayersInHost(previousPlayers);
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

  const handleDeletePlayer = async (hostedPlayerId: string) => {
    const playerToDelete = players.find(
      (player) => player.id === hostedPlayerId,
    );
    const shouldDelete = window.confirm(
      `Delete ${playerToDelete?.player.username ?? "this player"}? This will remove them from community players and delete all history for this hosted match.`,
    );
    if (!shouldDelete) return;

    const resumeHostLiveSync = pauseHostLiveSync();
    const previousPlayers = players;
    const previousAcceptedPlayers = acceptedPlayers;
    const previousCourts = courts;
    const previousQueues = queues;
    const previousPaymentsData = paymentsData;
    const previousCommunityPlayers = communityPlayers;
    const previousSelectedCommunityPlayerIds = selectedCommunityPlayerIds;
    const playerAccountId = playerToDelete?.player.id;

    setPlayersInHost((currentPlayers) =>
      currentPlayers.filter(
        (currentPlayer) => currentPlayer.id !== hostedPlayerId,
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
    setQueues((currentQueues) =>
      currentQueues.map((queue) => ({
        ...queue,
        entries: queue.entries.filter(
          (entry) => entry.playerId !== hostedPlayerId,
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
    if (playerToDelete?.player.isStatic && playerAccountId) {
      setCommunityPlayers((currentPlayers) =>
        currentPlayers.filter(
          (communityPlayer) => communityPlayer.player.id !== playerAccountId,
        ),
      );
      setSelectedCommunityPlayerIds((currentIds) =>
        currentIds.filter(
          (currentId) =>
            !communityPlayers.some(
              (communityPlayer) =>
                communityPlayer.id === currentId &&
                communityPlayer.player.id === playerAccountId,
            ),
        ),
      );
    }

    try {
      await api.delete(
        `/api/private/actions/delete/community/${communityId}/hosts/${hostId}/players/${hostedPlayerId}`,
      );
    } catch (error) {
      setPlayersInHost(previousPlayers);
      setAcceptedPlayers(previousAcceptedPlayers);
      setCourts(previousCourts);
      setQueues(previousQueues);
      setPaymentsData(previousPaymentsData);
      setCommunityPlayers(previousCommunityPlayers);
      setSelectedCommunityPlayerIds(previousSelectedCommunityPlayerIds);

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    } finally {
      resumeHostLiveSync();
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
          gamesPlayed: 0,
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
          id: nextAcceptedPlayer.player.id,
          username: nextAcceptedPlayer.player.username,
          profileUrl: nextAcceptedPlayer.player.profileUrl,
          isStatic: nextAcceptedPlayer.player.isStatic,
          isAdmin: nextAcceptedPlayer.player.isAdmin,
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
      const imageData = editingStaticPlayerImage
        ? await readFileAsDataUrl(editingStaticPlayerImage)
        : undefined;
      const response = await api.patch(
        `/api/private/actions/static/community/${communityId}/hosts/${hostId}/${editingStaticPlayer.id}`,
        {
          username: cleanName,
          skillLevel: editingStaticPlayerSkillLevel,
          imageData,
        },
      );

      updateStaticPlayerInState(response.data.data as AcceptedPlayers);

      setEditingStaticPlayer(null);
      setEditingStaticPlayerName("");
      setEditingStaticPlayerSkillLevel("beginner");
      setEditingStaticPlayerImage(null);
      setEditingStaticPlayerImagePreview(null);
    } catch (error) {
      setPlayersInHost(previousPlayers);
      setAcceptedPlayers(previousAcceptedPlayers);
      setPaymentsData(previousPaymentsData);
      setStaticPlayerEditError(
        axios.isAxiosError(error)
          ? (error.response?.data?.message ?? "Unable to update static player.")
          : "Unable to update static player.",
      );

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    } finally {
      setSavingStaticProfileUrlId(null);
      setIsSavingStaticPlayerEdit(false);
    }
  };

  const visiblePlayers = players;
  const normalizedPlayerSearchTerm = playerSearchTerm.trim().toLowerCase();
  const searchedPlayers = visiblePlayers.filter(
    (player) =>
      normalizedPlayerSearchTerm === "" ||
      player.player.username.toLowerCase().includes(normalizedPlayerSearchTerm),
  );
  const hostedAccountIds = new Set(
    players.map((player) => player.player.id).filter(Boolean),
  );
  const selectableCommunityPlayers = communityPlayers.filter(
    (communityPlayer) =>
      communityPlayer.status === "accepted" &&
      communityPlayer.player.isStatic &&
      !hostedAccountIds.has(communityPlayer.player.id) &&
      (normalizedPlayerSearchTerm === "" ||
        communityPlayer.player.username
          .toLowerCase()
          .includes(normalizedPlayerSearchTerm)),
  ).sort((firstPlayer, secondPlayer) => {
    const nameMultiplier = nameSortDirection === "asc" ? 1 : -1;

    return (
      firstPlayer.player.username.localeCompare(
        secondPlayer.player.username,
        undefined,
        { sensitivity: "base" },
      ) * nameMultiplier
    );
  });

  const statusPriority: Record<string, number> = {
    accepted: 0,
    requested: 0,
    rejected: 1,
    banned: 2,
  };

  const togglePlayerSort = (field: PlayerSortField) => {
    setPrimarySortField(field);

    if (field === "name") {
      setNameSortDirection((currentDirection) =>
        currentDirection === "asc" ? "desc" : "asc",
      );
      return;
    }

    setGamesSortDirection((currentDirection) =>
      currentDirection === "asc" ? "desc" : "asc",
    );
  };

  const getPlayerGames = (playerRecord: HostPlayerRecord) =>
    acceptedPlayers.find((player) => player.id === playerRecord.id)
      ?.gamesPlayed ?? 0;

  const comparePlayers = (
    firstPlayer: HostPlayerRecord,
    secondPlayer: HostPlayerRecord,
    field: PlayerSortField,
  ) => {
    if (field === "games") {
      const gamesMultiplier = gamesSortDirection === "asc" ? 1 : -1;
      return (
        (getPlayerGames(firstPlayer) - getPlayerGames(secondPlayer)) *
        gamesMultiplier
      );
    }

    const nameMultiplier = nameSortDirection === "asc" ? 1 : -1;
    return (
      firstPlayer.player.username.localeCompare(
        secondPlayer.player.username,
        undefined,
        { sensitivity: "base" },
      ) * nameMultiplier
    );
  };

  const sortPlayers = (list: HostPlayerRecord[]) => {
    return [...list].sort((a, b) => {
      const secondarySortField = primarySortField === "name" ? "games" : "name";
      const primaryResult = comparePlayers(a, b, primarySortField);

      if (primaryResult !== 0) return primaryResult;

      const secondaryResult = comparePlayers(a, b, secondarySortField);

      if (secondaryResult !== 0) return secondaryResult;

      const statusDiff =
        (statusPriority[a.status] ?? 99) - (statusPriority[b.status] ?? 99);

      if (statusDiff !== 0) return statusDiff;

      const aTime = a.requestedAt ? new Date(a.requestedAt).getTime() : 0;
      const bTime = b.requestedAt ? new Date(b.requestedAt).getTime() : 0;

      return bTime - aTime;
    });
  };

  return (
    <div className="p-2">
      <header className="mb-4 flex flex-col gap-2 rounded-3xl border border-orange-100 bg-white px-6 py-5 shadow-sm w-full">
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
          Manage queue participation and walk-in badminton players.
        </p>
        {staticProfileImageError ? (
          <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {staticProfileImageError}
          </p>
        ) : null}
      </header>

      <div className="grid gap-5">
        <PlayerSection
          title="Players"
          description="Manage registered and walk-in badminton players."
          players={sortPlayers(searchedPlayers)}
          acceptedPlayers={acceptedPlayers}
          historyLoadingPlayerId={historyLoadingPlayerId}
          staticProfileUrlDrafts={staticProfileUrlDrafts}
          savingStaticProfileUrlId={savingStaticProfileUrlId}
          onAcceptPlayer={handleAcceptPlayer}
          onRejectPlayer={handleRejectPlayer}
          onRemovePlayerFromHost={handleRemovePlayerFromHost}
          onUnbanPlayer={handleUnbanPlayer}
          onDeletePlayer={handleDeletePlayer}
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
          headerActions={
            <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="flex min-w-[220px] items-center gap-2 rounded-2xl border border-orange-100 bg-orange-50 px-3 py-2">
              <Search size={18} className="shrink-0 text-stone-400" />
              <input
                type="text"
                value={playerSearchTerm}
                onChange={(event) => setPlayerSearchTerm(event.target.value)}
                placeholder="Search players"
                className="min-w-0 flex-1 bg-transparent text-sm text-stone-800 outline-none placeholder:text-stone-400"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setNewPlayerError(null);
                setIsAddPlayerModalOpen(true);
              }}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--color-primary)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--color-accent)]"
            >
              <Plus size={15} />
              Add players
            </button>

              <button
                type="button"
                title={`Sort players ${
                  nameSortDirection === "asc" ? "descending" : "ascending"
                }`}
                aria-pressed={primarySortField === "name"}
                onClick={() => togglePlayerSort("name")}
                className={`inline-flex items-center gap-1.5 rounded-xl border border-orange-100 px-3 py-2 text-xs font-semibold text-stone-600 outline-orange-100 transition hover:bg-orange-50 cursor-pointer ${
                  primarySortField === "name" ? "bg-orange-50" : "bg-white"
                }`}
              >
                {nameSortDirection === "asc" ? (
                  <AArrowUp size={22} />
                ) : (
                  <AArrowDown size={22} />
                )}
              </button>

              <button
                type="button"
                title="Sort by games played"
                aria-pressed={primarySortField === "games"}
                onClick={() => togglePlayerSort("games")}
                className={`flex items-center rounded-full border border-orange-100 px-3 py-1 outline-orange-100 transition hover:bg-orange-50 cursor-pointer ${
                  primarySortField === "games" ? "bg-orange-50" : "bg-white"
                }`}
              >
                <Gamepad size={22} />
                {gamesSortDirection === "desc" ? (
                  <MoveDown size={14} />
                ) : (
                  <MoveUp size={14} />
                )}
              </button>
            </div>
          }
          emptyMessage={
            normalizedPlayerSearchTerm
              ? "No players match your search."
              : "No players yet."
          }
          extraContent={
            <div className="grid gap-4 rounded-2xl border border-orange-100 bg-orange-50/40 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h5 className="text-sm font-semibold text-stone-800">
                    Add from community
                  </h5>
                  <p className="text-sm text-stone-500">
                    {isCommunityPickerMinimized
                      ? `${selectableCommunityPlayers.length} static community players hidden.`
                      : "Select static community players for this hosted match."}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setIsCommunityPickerMinimized(
                        (isMinimized) => !isMinimized,
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700 transition hover:bg-orange-50 cursor-pointer"
                    aria-expanded={!isCommunityPickerMinimized}
                  >
                    {isCommunityPickerMinimized ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronUp size={16} />
                    )}
                    {isCommunityPickerMinimized ? "Show" : "Minimize"}
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleAddCommunityPlayers()}
                    disabled={
                      isAddingCommunityPlayers ||
                      selectedCommunityPlayerIds.length === 0
                    }
                    className={`w-fit rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 cursor-pointer ${
                      isAddingCommunityPlayers ||
                      selectedCommunityPlayerIds.length === 0
                        ? "cursor-not-allowed bg-stone-200 text-stone-400"
                        : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-accent)] active:scale-[0.98]"
                    }`}
                  >
                    {isAddingCommunityPlayers
                      ? "Adding..."
                      : `Add selected (${selectedCommunityPlayerIds.length})`}
                  </button>
                </div>
              </div>

              {communityPlayerError ? (
                <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                  {communityPlayerError}
                </p>
              ) : null}

              {!isCommunityPickerMinimized ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {selectableCommunityPlayers.length > 0 ? (
                  selectableCommunityPlayers.map((communityPlayer) => {
                    const isSelected = selectedCommunityPlayerIds.includes(
                      communityPlayer.id,
                    );

                    return (
                      <button
                        key={communityPlayer.id}
                        type="button"
                        onClick={() =>
                          handleToggleCommunityPlayer(communityPlayer.id)
                        }
                        className={`flex min-w-0 items-center gap-3 rounded-2xl border p-3 text-left transition cursor-pointer ${
                          isSelected
                            ? "border-[var(--color-primary)] bg-white shadow-sm"
                            : "border-orange-100 bg-white/80 hover:border-orange-200"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-bold ${
                            isSelected
                              ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                              : "border-stone-300 bg-white text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                        <img
                          src={communityPlayer.player.profileUrl}
                          alt={communityPlayer.player.username}
                          className="h-9 w-9 shrink-0 rounded-full object-cover"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-stone-800">
                            {communityPlayer.player.username}
                          </span>
                          <SkillLevelBadge
                            skillLevel={communityPlayer.player.skillLevel}
                            showLabel
                            className="mt-1"
                          />
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-orange-200 bg-white/70 px-4 py-6 text-center text-sm text-stone-500 sm:col-span-2 lg:col-span-3 xl:col-span-4">
                    {normalizedPlayerSearchTerm
                      ? "No community players match your search."
                      : "All static community players are already in this host, or no static community players have been added yet."}
                  </div>
                )}
              </div>
              ) : null}
            </div>
          }
        />
      </div>

      {isAddPlayerModalOpen ? (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4"
          onClick={closeAddPlayerModal}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-orange-100 bg-white p-5 shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-lg font-semibold text-text">
                  Add players
                </h4>
                <p className="mt-1 text-sm text-stone-500">
                  Create community players and add them to this host.
                </p>
              </div>

              <button
                type="button"
                onClick={closeAddPlayerModal}
                disabled={isCreatingNewPlayer}
                className="rounded-full p-3 text-sm font-semibold text-stone-500 hover:bg-stone-100 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </header>

            <form
              onSubmit={(event) => void handleCreateNewPlayer(event)}
              className="mt-5 grid gap-4"
            >
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-stone-700">
                  Player names
                </span>
                <textarea
                  value={newPlayerForm.names}
                  onChange={(event) =>
                    setNewPlayerForm((currentForm) => ({
                      ...currentForm,
                      names: event.target.value,
                    }))
                  }
                  placeholder={"John\nJane\nDoe"}
                  rows={5}
                  disabled={isCreatingNewPlayer}
                  className="min-h-[130px] resize-y rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-stone-50"
                />
              </label>

              <label className="grid gap-2 text-sm">
                <span className="font-medium text-stone-700">Skill level</span>
                <select
                  value={newPlayerForm.skillLevel}
                  onChange={(event) =>
                    setNewPlayerForm((currentForm) => ({
                      ...currentForm,
                      skillLevel: event.target.value as SkillLevelType,
                    }))
                  }
                  disabled={isCreatingNewPlayer}
                  className="rounded-xl border border-orange-100 bg-white px-4 py-2.5 text-sm text-stone-700 outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-stone-50"
                >
                  {SKILL_LEVEL_OPTIONS.map((skillLevel) => (
                    <option key={skillLevel.value} value={skillLevel.value}>
                      {skillLevel.acronym} {skillLevel.label}
                    </option>
                  ))}
                </select>
              </label>

              {newPlayerError ? (
                <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                  {newPlayerError}
                </p>
              ) : null}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeAddPlayerModal}
                  disabled={isCreatingNewPlayer}
                  className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isCreatingNewPlayer}
                  className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    isCreatingNewPlayer
                      ? "cursor-not-allowed bg-stone-200 text-stone-400"
                      : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-accent)] active:scale-[0.98]"
                  }`}
                >
                  {isCreatingNewPlayer ? "Adding..." : "Add players"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editingStaticPlayer ? (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4"
          onClick={closeEditStaticPlayerModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-orange-100 bg-white p-5 shadow-2xl"
          >
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
                className="rounded-full p-3 text-sm font-semibold text-stone-500 hover:bg-stone-100 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Close modal"
              >
                <X size={18} />
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
                  {SKILL_LEVEL_OPTIONS.map((skillLevel) => (
                    <option key={skillLevel.value} value={skillLevel.value}>
                      {skillLevel.acronym} {skillLevel.label}
                    </option>
                  ))}
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

    </div>
  );
}
