import axios from "axios";
import { useCallback, useEffect, useState } from "react";
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

  const loadHostData = useCallback(async () => {
    if (!communityId || !hostId) return;

    setIsHostLoading(true);
    setHostLoadError(null);

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
        success: _success,
        message: _message,
        requestedPlayers,
        acceptedPlayers: acceptedPlayersFromHost,
        rejectedPlayers,
        bannedPlayers,
        ...hostData
      } = hostResponse.data;

      setHost(hostData as HostMeta);
      setPlayersInHost([
        ...acceptedPlayersFromHost,
        ...requestedPlayers,
        ...rejectedPlayers,
        ...bannedPlayers,
      ]);
      setAcceptedPlayers(
        normalizeAcceptedPlayers(playersResponse.data.acceptedPlayers),
      );
      setCourts(courtsResponse.data.courts);
      setQueues(queuesResponse.data.queues);
      setPaymentsData(
        normalizePaymentsData(
          paymentsResponse.data.pricing,
          paymentsResponse.data.players,
        ),
      );
    } catch (error) {
      setHostLoadError("Unable to load host data.");

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    } finally {
      setIsHostLoading(false);
    }
  }, [communityId, hostId]);

  useEffect(() => {
    void loadHostData();
  }, [loadHostData]);

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

  const isHostIncludedAsPlayer = acceptedPlayers.some(
    (player) => player.player.id === user?.id,
  );

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
    },
    [],
  );

  const handleToggleHostPlayer = useCallback(async () => {
    if (!communityId || !hostId || isTogglingHostPlayer) return;

    setIsTogglingHostPlayer(true);

    try {
      if (isHostIncludedAsPlayer) {
        const response = await api.delete(
          `/api/community/${communityId}/hosts/${hostId}/host-player`,
        );
        const hostedPlayerId =
          response.data.hostedPlayerId ??
          acceptedPlayers.find(
            (player) => player.player.id === user?.id,
          )?.id;

        if (hostedPlayerId) {
          removeHostedPlayerFromLocalState(hostedPlayerId);
        }
      } else {
        const response = await api.post(
          `/api/community/${communityId}/hosts/${hostId}/host-player`,
        );
        if (response.data.hostedPlayer) {
          addHostedPlayerToLocalState(response.data.hostedPlayer);
        }
      }
    } catch (error) {
      window.alert(
        isHostIncludedAsPlayer
          ? "Unable to hide the host from players."
          : "Unable to add the host as a player.",
      );

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    } finally {
      setIsTogglingHostPlayer(false);
    }
  }, [
    acceptedPlayers,
    addHostedPlayerToLocalState,
    communityId,
    hostId,
    isHostIncludedAsPlayer,
    isTogglingHostPlayer,
    removeHostedPlayerFromLocalState,
    user?.id,
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
          isIncluded: isHostIncludedAsPlayer,
          isSaving: isTogglingHostPlayer,
          onToggle: () => void handleToggleHostPlayer(),
        }}
        centerSearch={{
          value: playerSearchTerm,
          placeholder: "Search player name",
          onChange: setPlayerSearchTerm,
        }}
      />

      <main className="relative flex flex-1 overflow-hidden bg-gradient-to-br from-white via-orange-50 to-white">
        {openSidebar && <Sidebar />}

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
          <div className="flex-1 overflow-y-auto">
            <Outlet context={outletContext} />

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
