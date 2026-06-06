import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useParams } from "react-router-dom";
import PlayerHistoryModal, {
  summarizePlayerHistory,
} from "../components/host_components/PlayerHistoryModal";
import LoadingState from "../components/LoadingState";
import Sidebar from "../components/host_components/Sidebar";
import type { HostOutletContext } from "../hooks/useHostData";
import { api } from "../lib/api";
import {
  EMPTY_HOST_PAYMENTS_DATA,
  EMPTY_MATCH_HISTORY_SUMMARY,
  buildPaymentsSummary,
  getPaymentBalance,
  normalizeAcceptedPlayers,
  type AcceptedPlayers,
  type FinishedMatchHistoryPayload,
  type CourtType,
  type HostMeta,
  type HostPaymentsData,
  type HostPlayerRecord,
  type PaymentStatus,
  type PlayerHistoryTarget,
  type PlayerMatchHistoryItem,
  type QueueType,
} from "../lib/host";
import Header from "../components/Header";
import { useAuth } from "../hooks/useAuth";
import { X } from "lucide-react";

type HostAdminCandidate = {
  id: string;
  username: string;
  profileUrl: string;
  roleLabel: "Owner" | "Admin" | "Co-host";
};

const preserveCurrentOrder = <Item extends { id: string }>(
  currentItems: Item[],
  nextItems: Item[],
) => {
  if (currentItems.length === 0) return nextItems;

  const nextItemsById = new Map(nextItems.map((item) => [item.id, item]));
  const orderedExistingItems = currentItems
    .map((item) => nextItemsById.get(item.id))
    .filter((item): item is Item => Boolean(item));
  const newItems = nextItems.filter(
    (item) => !currentItems.some((currentItem) => currentItem.id === item.id),
  );

  return [...orderedExistingItems, ...newItems];
};

export default function HostLayout() {
  const { communityId, hostId } = useParams();
  const { user } = useAuth();
  const [playersInHost, setPlayersInHost] = useState<HostPlayerRecord[]>([]);
  const [acceptedPlayers, setAcceptedPlayers] = useState<AcceptedPlayers[]>([]);
  const [courts, setCourts] = useState<CourtType[]>([]);
  const [queues, setQueues] = useState<QueueType[]>([]);
  const [host, setHost] = useState<HostMeta | null>(null);
  const [paymentsData, setPaymentsData] = useState<HostPaymentsData>(
    EMPTY_HOST_PAYMENTS_DATA,
  );
  const [isHostLoading, setIsHostLoading] = useState(true);
  const [hostLoadError, setHostLoadError] = useState<string | null>(null);
  const [isEndingHostSession, setIsEndingHostSession] = useState(false);
  const [isStartingHostSession, setIsStartingHostSession] = useState(false);
  const [isTogglingHostPlayer, setIsTogglingHostPlayer] = useState(false);
  const [isHostAdminPlayerModalOpen, setIsHostAdminPlayerModalOpen] =
    useState(false);
  const [selectedHostAdminPlayerIds, setSelectedHostAdminPlayerIds] = useState<
    string[]
  >([]);
  const [hostAdminPlayerError, setHostAdminPlayerError] = useState<
    string | null
  >(null);
  const [playerSearchTerm, setPlayerSearchTerm] = useState("");
  const [historyLoadingPlayerId, setHistoryLoadingPlayerId] = useState<
    string | null
  >(null);
  const [selectedHistoryPlayer, setSelectedHistoryPlayer] =
    useState<PlayerHistoryTarget | null>(null);
  const [selectedHistoryError, setSelectedHistoryError] = useState<
    string | null
  >(null);
  const [playerHistoryById, setPlayerHistoryById] = useState<
    Record<string, PlayerMatchHistoryItem[]>
  >({});
  const [openSidebar, setOpenSidebar] = useState<boolean>(true);
  const isRefreshingHostDataRef = useRef(false);
  const hostLiveSyncPauseCountRef = useRef(0);
  const hostDataVersionRef = useRef(0);

  const pauseHostLiveSync = useCallback(() => {
    hostLiveSyncPauseCountRef.current += 1;
    hostDataVersionRef.current += 1;
    let isReleased = false;

    return () => {
      if (isReleased) return;

      isReleased = true;
      hostLiveSyncPauseCountRef.current = Math.max(
        0,
        hostLiveSyncPauseCountRef.current - 1,
      );
      hostDataVersionRef.current += 1;
    };
  }, []);

  const loadHostData = useCallback(async (options?: {
    silent?: boolean;
    force?: boolean;
  }) => {
    if (!communityId || !hostId) return;
    if (isRefreshingHostDataRef.current && !options?.force) return;

    const isSilent = options?.silent ?? false;
    const isForced = options?.force ?? false;
    if (isSilent && hostLiveSyncPauseCountRef.current > 0 && !isForced) return;

    const startedHostDataVersion = hostDataVersionRef.current;
    isRefreshingHostDataRef.current = true;

    if (!isSilent) {
      setIsHostLoading(true);
      setHostLoadError(null);
    }

    const normalizePaymentsData = (
      pricing: HostPaymentsData["pricing"],
      players: Array<{
        id: string;
        hostStatus: string;
        paymentStatus: string;
        gamesPlayed: number;
        player?: {
          id?: string | null;
          username?: string;
          profileUrl?: string;
          isStatic?: boolean;
          isAdmin?: boolean;
        } | null;
        payment?: { id: string; amountPaid: number } | null;
      }>,
    ): HostPaymentsData => {
      const normalizedPlayers = players.map((player) => {
        const amountPaid = Number(player.payment?.amountPaid ?? 0);
        const amountExpected =
          pricing.entranceFee + pricing.perMatchFee * player.gamesPlayed;
        const paymentStatus: PaymentStatus =
          player.paymentStatus === "paid" ? "paid" : "unpaid";

        return {
          id: player.id,
          status: player.hostStatus as "accepted" | "banned",
          paymentStatus,
          gamesPlayed: player.gamesPlayed,
          player: {
            id: player.player?.id ?? null,
            username: player.player?.username ?? "",
            profileUrl: player.player?.profileUrl ?? "",
            isStatic: player.player?.isStatic ?? false,
            isAdmin: player.player?.isAdmin ?? false,
          },
          payment: {
            id: player.payment?.id ?? null,
            amountExpected,
            amountPaid,
            balance: getPaymentBalance(amountExpected, amountPaid),
            currency: pricing.currency,
            status: paymentStatus,
            method: null,
          },
        };
      });

      return {
        pricing,
        players: normalizedPlayers,
        summary: buildPaymentsSummary(normalizedPlayers),
      };
    };

    try {
      const [
        hostResponse,
        playersResponse,
        courtsResponse,
        queuesResponse,
        paymentsResponse,
      ] = await Promise.all([
        api.get(`/api/community/${communityId}/hosts/${hostId}`),
        api.get(`/api/community/${communityId}/hosts/${hostId}/players`),
        api.get(`/api/community/${communityId}/hosts/${hostId}/courts`),
        api.get(`/api/community/${communityId}/hosts/${hostId}/queues`),
        api.get(`/api/community/${communityId}/hosts/${hostId}/payments`),
      ]);

      const {
        requestedPlayers,
        acceptedPlayers: acceptedPlayersFromHost,
        rejectedPlayers,
        bannedPlayers,
        ...hostData
      } = hostResponse.data;

      if (isSilent && startedHostDataVersion !== hostDataVersionRef.current) {
        return;
      }

      delete hostData.success;
      delete hostData.message;

      const nextHost = hostData as HostMeta;
      const hiddenRejectedHostAdminIds = new Set(
        [
          nextHost.community.master.id,
          ...nextHost.community.admins.map((admin) => admin.account.id),
          ...nextHost.hosts.map((hostPlayer) => hostPlayer.id),
        ].filter(Boolean),
      );
      const visibleRejectedPlayers = rejectedPlayers.filter(
        (player: HostPlayerRecord) =>
          !hiddenRejectedHostAdminIds.has(player.player.id ?? ""),
      );

      setHost(nextHost);
      setPlayersInHost([
        ...acceptedPlayersFromHost,
        ...requestedPlayers,
        ...visibleRejectedPlayers,
        ...bannedPlayers,
      ]);
      setAcceptedPlayers(
        normalizeAcceptedPlayers(playersResponse.data.acceptedPlayers),
      );
      setCourts((currentCourts) =>
        preserveCurrentOrder(currentCourts, courtsResponse.data.courts),
      );
      setQueues(queuesResponse.data.queues);
      setPaymentsData(
        normalizePaymentsData(
          paymentsResponse.data.pricing,
          paymentsResponse.data.players,
        ),
      );
    } catch (error) {
      if (!isSilent) {
        setHostLoadError("Unable to load host data.");
      }

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    } finally {
      isRefreshingHostDataRef.current = false;

      if (!isSilent) {
        setIsHostLoading(false);
      }
    }
  }, [communityId, hostId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadHostData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadHostData]);

  useEffect(() => {
    if (!communityId || !hostId) return;

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;

      void loadHostData({ silent: true });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [communityId, hostId, loadHostData]);

  const handleEndHostSession = useCallback(async () => {
    if (!communityId || !hostId || isEndingHostSession) return;

    const confirmed = window.confirm(
      "End this host session? Players will no longer be able to request to join.",
    );

    if (!confirmed) return;

    setIsEndingHostSession(true);

    try {
      const response = await api.patch(
        `/api/community/${communityId}/hosts/${hostId}/end-session`,
      );

      const updatedStatus = response.data.host?.status ?? "unavailable";
      setHost((currentHost) =>
        currentHost ? { ...currentHost, status: updatedStatus } : currentHost,
      );
    } catch (error) {
      window.alert("Unable to end this host session.");

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    } finally {
      setIsEndingHostSession(false);
    }
  }, [communityId, hostId, isEndingHostSession]);

  const handleStartHostSession = useCallback(async () => {
    if (!communityId || !hostId || isStartingHostSession) return;

    const confirmed = window.confirm(
      "Start this host session? Players will now be able to request to join.",
    );

    if (!confirmed) return;

    setIsStartingHostSession(true);

    try {
      const response = await api.patch(
        `/api/community/${communityId}/hosts/${hostId}/start-session`,
      );

      const updatedStatus = response.data.host?.status ?? "available";

      setHost((currentHost) =>
        currentHost ? { ...currentHost, status: updatedStatus } : currentHost,
      );
    } catch (error) {
      window.alert("Unable to start this host session.");

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    } finally {
      setIsStartingHostSession(false);
    }
  }, [communityId, hostId, isStartingHostSession]);

  const hostAdminCandidates = useMemo<HostAdminCandidate[]>(() => {
    if (!host) return [];

    const candidates: HostAdminCandidate[] = [
      {
        ...host.community.master,
        roleLabel: "Owner",
      },
    ];

    host.community.admins.forEach((admin) => {
      if (
        candidates.some((candidate) => candidate.id === admin.account.id)
      ) {
        return;
      }

      candidates.push({
        ...admin.account,
        roleLabel: "Admin",
      });
    });

    host.hosts.forEach((coHost) => {
      if (candidates.some((candidate) => candidate.id === coHost.id)) {
        return;
      }

      candidates.push({
        ...coHost,
        roleLabel: "Co-host",
      });
    });

    return candidates;
  }, [host]);
  const hostedAdminPlayerIds = useMemo(
    () =>
      new Set(
        acceptedPlayers
          .map((player) => player.player.id)
          .filter(
            (playerId): playerId is string =>
              typeof playerId === "string" &&
              hostAdminCandidates.some((admin) => admin.id === playerId),
          ),
      ),
    [acceptedPlayers, hostAdminCandidates],
  );
  const isAnyHostAdminIncludedAsPlayer = hostedAdminPlayerIds.size > 0;
  const hasHostAdminPlayerSelectionChanges = useMemo(() => {
    const selectedIds = new Set(selectedHostAdminPlayerIds);

    return hostAdminCandidates.some(
      (admin) => selectedIds.has(admin.id) !== hostedAdminPlayerIds.has(admin.id),
    );
  }, [
    hostAdminCandidates,
    hostedAdminPlayerIds,
    selectedHostAdminPlayerIds,
  ]);

  const removeHostedPlayerFromLocalState = useCallback(
    (hostedPlayerId: string) => {
      setPlayersInHost((currentPlayers) =>
        currentPlayers.filter((player) => player.id !== hostedPlayerId),
      );
      setAcceptedPlayers((currentPlayers) =>
        currentPlayers.filter((player) => player.id !== hostedPlayerId),
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
        const players = currentPaymentsData.players.filter(
          (player) => player.id !== hostedPlayerId,
        );

        return {
          ...currentPaymentsData,
          players,
          summary: buildPaymentsSummary(players),
        };
      });
    },
    [],
  );

  const addHostedPlayerToLocalState = useCallback(
    (hostedPlayer: AcceptedPlayers) => {
      const normalizedPlayer = normalizeAcceptedPlayers([
        {
          ...hostedPlayer,
          matchHistory:
            hostedPlayer.matchHistory ?? EMPTY_MATCH_HISTORY_SUMMARY,
        },
      ])[0];

      setPlayersInHost((currentPlayers) => {
        const nextPlayer: HostPlayerRecord = {
          id: normalizedPlayer.id,
          status: normalizedPlayer.hostStatus,
          paymentStatus: "unpaid",
          player: normalizedPlayer.player,
        };
        const playersWithoutHost = currentPlayers.filter(
          (player) => player.id !== normalizedPlayer.id,
        );

        return [nextPlayer, ...playersWithoutHost];
      });
      setAcceptedPlayers((currentPlayers) => [
        normalizedPlayer,
        ...currentPlayers.filter((player) => player.id !== normalizedPlayer.id),
      ]);
      setPaymentsData((currentPaymentsData) => {
        if (
          currentPaymentsData.players.some(
            (player) => player.id === normalizedPlayer.id,
          )
        ) {
          return currentPaymentsData;
        }

        const amountExpected =
          currentPaymentsData.pricing.entranceFee +
          currentPaymentsData.pricing.perMatchFee *
            normalizedPlayer.gamesPlayed;
        const players = [
          ...currentPaymentsData.players,
          {
            id: normalizedPlayer.id,
            status: "accepted" as const,
            paymentStatus: "unpaid" as const,
            gamesPlayed: normalizedPlayer.gamesPlayed,
            player: {
              id: normalizedPlayer.player.id,
              username: normalizedPlayer.player.username,
              profileUrl: normalizedPlayer.player.profileUrl,
              isStatic: normalizedPlayer.player.isStatic,
              isAdmin: normalizedPlayer.player.isAdmin,
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
          },
        ];

        return {
          ...currentPaymentsData,
          players,
          summary: buildPaymentsSummary(players),
        };
      });
      const accountId = normalizedPlayer.player.id;
      if (normalizedPlayer.isHost && accountId) {
        setHost((currentHost) => {
          if (!currentHost) return currentHost;
          if (
            currentHost.hosts.some(
              (hostPlayer) => hostPlayer.id === accountId,
            )
          ) {
            return currentHost;
          }

          return {
            ...currentHost,
            hosts: [
              ...currentHost.hosts,
              {
                id: accountId,
                username: normalizedPlayer.player.username,
                profileUrl: normalizedPlayer.player.profileUrl,
              },
            ],
          };
        });
      }
    },
    [],
  );

  const openHostAdminPlayerModal = useCallback(() => {
    if (isTogglingHostPlayer) return;

    setSelectedHostAdminPlayerIds(Array.from(hostedAdminPlayerIds));
    setHostAdminPlayerError(null);
    setIsHostAdminPlayerModalOpen(true);
  }, [hostedAdminPlayerIds, isTogglingHostPlayer]);

  const closeHostAdminPlayerModal = useCallback(() => {
    if (isTogglingHostPlayer) return;

    setIsHostAdminPlayerModalOpen(false);
    setHostAdminPlayerError(null);
    setSelectedHostAdminPlayerIds([]);
  }, [isTogglingHostPlayer]);

  const canManageHostAdminAsPlayer = useCallback(
    (_adminId: string) =>
      Boolean(
        user &&
          hostAdminCandidates.some((candidate) => candidate.id === user.id),
      ),
    [hostAdminCandidates, user],
  );

  const handleSelectHostAdminPlayer = useCallback(
    (adminId: string, isSelected: boolean) => {
      setSelectedHostAdminPlayerIds((currentIds) => {
        if (isSelected) {
          return currentIds.includes(adminId)
            ? currentIds
            : [...currentIds, adminId];
        }

        return currentIds.filter((currentId) => currentId !== adminId);
      });
      setHostAdminPlayerError(null);
    },
    [],
  );

  const handleApplyHostAdminPlayerSelection = useCallback(async () => {
    if (!communityId || !hostId || isTogglingHostPlayer) return;

    const selectedIds = new Set(selectedHostAdminPlayerIds);
    const manageableAdminIds = new Set(
      hostAdminCandidates
        .filter((admin) => canManageHostAdminAsPlayer(admin.id))
        .map((admin) => admin.id),
    );
    const adminIdsToAdd = hostAdminCandidates
      .filter(
        (admin) =>
          manageableAdminIds.has(admin.id) &&
          selectedIds.has(admin.id) &&
          !hostedAdminPlayerIds.has(admin.id),
      )
      .map((admin) => admin.id);
    const adminIdsToRemove = hostAdminCandidates
      .filter(
        (admin) =>
          manageableAdminIds.has(admin.id) &&
          !selectedIds.has(admin.id) &&
          hostedAdminPlayerIds.has(admin.id),
      )
      .map((admin) => admin.id);

    if (adminIdsToAdd.length === 0 && adminIdsToRemove.length === 0) {
      setHostAdminPlayerError("Select at least one change first.");
      return;
    }

    setIsTogglingHostPlayer(true);
    setHostAdminPlayerError(null);
    const resumeHostLiveSync = pauseHostLiveSync();

    try {
      const addedPlayers = await Promise.all(
        adminIdsToAdd.map(async (accountId) => {
          const response = await api.post(
            `/api/community/${communityId}/hosts/${hostId}/host-player`,
            { accountId, playerOnly: true },
          );

          return response.data.hostedPlayer as AcceptedPlayers | undefined;
        }),
      );
      const removedHostedPlayers = await Promise.all(
        adminIdsToRemove.map(async (accountId) => {
          const response = await api.delete(
            `/api/community/${communityId}/hosts/${hostId}/host-player`,
            {
              data: { accountId, playerOnly: true },
            },
          );

          const hostedPlayerId =
            response.data.hostedPlayerId ??
            acceptedPlayers.find((player) => player.player.id === accountId)?.id;

          return hostedPlayerId;
        }),
      );

      addedPlayers.forEach((hostedPlayer) => {
        if (hostedPlayer) {
          addHostedPlayerToLocalState(hostedPlayer);
        }
      });
      removedHostedPlayers.forEach((hostedPlayerId) => {
        if (hostedPlayerId) {
          removeHostedPlayerFromLocalState(hostedPlayerId);
        }
      });
      await loadHostData({ silent: true, force: true });
      setIsHostAdminPlayerModalOpen(false);
      setSelectedHostAdminPlayerIds([]);
    } catch (error) {
      setHostAdminPlayerError(
        axios.isAxiosError(error)
          ? (error.response?.data?.message ?? "Unable to update host players.")
          : "Unable to update host players.",
      );

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    } finally {
      resumeHostLiveSync();
      setIsTogglingHostPlayer(false);
    }
  }, [
    acceptedPlayers,
    addHostedPlayerToLocalState,
    canManageHostAdminAsPlayer,
    communityId,
    hostAdminCandidates,
    hostedAdminPlayerIds,
    hostId,
    isTogglingHostPlayer,
    loadHostData,
    pauseHostLiveSync,
    removeHostedPlayerFromLocalState,
    selectedHostAdminPlayerIds,
  ]);

  const openPlayerHistory = useCallback(
    (player: PlayerHistoryTarget) => {
      if (!communityId || !hostId) return;

      setSelectedHistoryPlayer(player);
      setSelectedHistoryError(null);

      if (playerHistoryById[player.id]) return;

      setHistoryLoadingPlayerId(player.id);

      void (async () => {
        try {
          const response = await api.get(
            `/api/community/${communityId}/hosts/${hostId}/players/${player.id}/history`,
          );

          setPlayerHistoryById((currentHistory) => ({
            ...currentHistory,
            [player.id]: response.data.history as PlayerMatchHistoryItem[],
          }));
        } catch (error) {
          setSelectedHistoryError(
            "Unable to load this player's match history.",
          );

          if (axios.isAxiosError(error))
            console.error(error.response?.data ?? error);
          else console.error(error);
        } finally {
          setHistoryLoadingPlayerId((currentId) =>
            currentId === player.id ? null : currentId,
          );
        }
      })();
    },
    [communityId, hostId, playerHistoryById],
  );

  const closePlayerHistory = useCallback(() => {
    setSelectedHistoryPlayer(null);
    setSelectedHistoryError(null);
  }, []);

  const addFinishedMatchToPlayerHistory = useCallback(
    (match: FinishedMatchHistoryPayload) => {
      setPlayerHistoryById((currentHistory) => {
        let hasUpdatedHistory = false;
        const nextHistory = { ...currentHistory };

        for (const participant of match.participants) {
          const playerHistory = currentHistory[participant.playerId];

          if (!playerHistory) continue;
          if (playerHistory.some((entry) => entry.match.id === match.id)) {
            continue;
          }

          hasUpdatedHistory = true;
          nextHistory[participant.playerId] = [
            {
              id: participant.id,
              team: participant.team,
              result: participant.result,
              joinedAt: participant.joinedAt,
              match: {
                id: match.id,
                startedAt: match.startedAt,
                endedAt: match.endedAt,
                teamWinner: match.teamWinner,
                court: match.court,
                participants: match.participants.map((matchParticipant) => ({
                  ...matchParticipant,
                  player: matchParticipant.player ?? null,
                })),
              },
            },
            ...playerHistory,
          ];
        }

        return hasUpdatedHistory ? nextHistory : currentHistory;
      });
    },
    [],
  );

  const selectedHistoryEntries = selectedHistoryPlayer
    ? (playerHistoryById[selectedHistoryPlayer.id] ?? [])
    : [];
  const hasLoadedSelectedHistory =
    selectedHistoryPlayer !== null &&
    Object.hasOwn(playerHistoryById, selectedHistoryPlayer.id);
  const selectedAcceptedPlayer = selectedHistoryPlayer
    ? acceptedPlayers.find((player) => player.id === selectedHistoryPlayer.id)
    : null;
  const selectedHistorySummary =
    hasLoadedSelectedHistory || !selectedAcceptedPlayer?.matchHistory
      ? summarizePlayerHistory(selectedHistoryEntries)
      : selectedAcceptedPlayer.matchHistory;

  const outletContext: HostOutletContext = {
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
    host,
    playerSearchTerm,
    setPlayerSearchTerm,
    historyLoadingPlayerId,
    openPlayerHistory,
    closePlayerHistory,
    addFinishedMatchToPlayerHistory,
    refreshHostData: loadHostData,
    pauseHostLiveSync,
  }; 
  
  return (
    <div className="mx-auto flex h-screen w-full max-w-[1920px] flex-col overflow-hidden">
      <Header
        setOpenSidebar={setOpenSidebar}
        hostSession={{
          isAvailable: host?.status === "available",

          isStarting: isStartingHostSession,
          isEnding: isEndingHostSession,

          onStart: () => void handleStartHostSession(),
          onEnd: () => void handleEndHostSession(),
        }}
        hostPlayer={{
          isIncluded: isAnyHostAdminIncludedAsPlayer,
          isSaving: isTogglingHostPlayer,
          onToggle: openHostAdminPlayerModal,
        }}
      />

      <main className="relative flex flex-1 overflow-hidden bg-gradient-to-br from-white via-orange-50 to-white">
        {openSidebar && (
            <Sidebar />
        )}

        {isHostLoading ? (
          <LoadingState
            className="flex-1"
            title="Loading host data"
            message="Fetching players, courts, queues, and payments..."
          />
        ) : hostLoadError ? (
          <div className="grid gap-3 rounded-3xl border border-red-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-red-600">{hostLoadError}</p>

            <button
              type="button"
              onClick={() => void loadHostData()}
              className="w-fit rounded-2xl bg-text px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              Retry
            </button>
          </div>
        ) : (
          <div
            className="flex-1 overflow-y-auto"
            onClick={(e) => {
              const target = e.target as HTMLElement;

              const isInteractive = target.closest(
                "button, a, input, textarea, select, [role='button']"
              );

              if (!isInteractive) {
                setOpenSidebar(false);
              }
            }}
          >
            <Outlet context={outletContext} />

            {isHostAdminPlayerModalOpen ? (
              <div
                className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4"
                onClick={closeHostAdminPlayerModal}
              >
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="host-admin-player-title"
                  onClick={(event) => event.stopPropagation()}
                  className="w-full max-w-2xl rounded-3xl border border-orange-100 bg-white p-5 shadow-2xl"
                >
                  <header className="flex items-start justify-between gap-4">
                    <div>
                      <h4
                        id="host-admin-player-title"
                        className="text-lg font-semibold text-text"
                      >
                        Host players
                      </h4>
                      <p className="mt-1 text-sm text-stone-500">
                        Select community admins and co-hosts to include in this match.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={closeHostAdminPlayerModal}
                      disabled={isTogglingHostPlayer}
                      className="rounded-full p-3 text-sm font-semibold text-stone-500 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                      aria-label="Close modal"
                    >
                      <X size={18} />
                    </button>
                  </header>

                  <div className="mt-5 overflow-hidden rounded-2xl border border-orange-100">
                    <table className="w-full text-sm">
                      <thead className="bg-orange-50/60">
                        <tr>
                          <th className="w-12 px-4 py-3 text-left text-xs font-semibold uppercase text-stone-500">
                            Player
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-stone-500">
                            Admin
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-stone-500">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-orange-100 bg-white">
                        {hostAdminCandidates.map((admin) => {
                          const isAlreadyPlayer = hostedAdminPlayerIds.has(
                            admin.id,
                          );
                          const isSelected =
                            selectedHostAdminPlayerIds.includes(admin.id);
                          const canToggleAdmin = canManageHostAdminAsPlayer(
                            admin.id,
                          );

                          return (
                            <tr
                              key={admin.id}
                              className="transition hover:bg-orange-50/40"
                            >
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(event) =>
                                    handleSelectHostAdminPlayer(
                                      admin.id,
                                      event.target.checked,
                                    )
                                  }
                                  disabled={
                                    isTogglingHostPlayer || !canToggleAdmin
                                  }
                                  className="h-4 w-4 accent-primary"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex min-w-0 items-center gap-3">
                                  <img
                                    src={admin.profileUrl}
                                    alt={admin.username}
                                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                                  />
                                  <p className="truncate font-semibold text-text">
                                    {admin.username}
                                  </p>
                                  <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                    {admin.roleLabel}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                    isAlreadyPlayer
                                      ? "bg-green-50 text-green-700"
                                      : isSelected
                                        ? "bg-blue-50 text-blue-700"
                                        : "bg-stone-100 text-stone-600"
                                  }`}
                                >
                                  {isTogglingHostPlayer
                                    ? "Saving..."
                                    : isAlreadyPlayer
                                      ? isSelected
                                        ? "Player"
                                        : "Will remove"
                                      : isSelected
                                        ? "Selected"
                                        : admin.roleLabel === "Co-host"
                                          ? "Co-host only"
                                          : "Admin only"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {hostAdminCandidates.length === 0 ? (
                      <p className="px-4 py-4 text-sm text-stone-500">
                        No community admins or co-hosts found.
                      </p>
                    ) : null}

                    {hostAdminPlayerError ? (
                      <p className="border-t border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                        {hostAdminPlayerError}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-5 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={closeHostAdminPlayerModal}
                      disabled={isTogglingHostPlayer}
                      className="rounded-xl border border-orange-100 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void handleApplyHostAdminPlayerSelection()
                      }
                      disabled={
                        isTogglingHostPlayer ||
                        !hasHostAdminPlayerSelectionChanges
                      }
                      className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 cursor-pointer"
                    >
                      {isTogglingHostPlayer ? "Saving..." : "Apply changes"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <PlayerHistoryModal
              player={selectedHistoryPlayer}
              summary={selectedHistorySummary}
              history={selectedHistoryEntries}
              isLoading={
                selectedHistoryPlayer !== null &&
                historyLoadingPlayerId === selectedHistoryPlayer.id
              }
              error={selectedHistoryError}
              onClose={closePlayerHistory}
            />
          </div>
        )}
      </main>
    </div>
  );
}
