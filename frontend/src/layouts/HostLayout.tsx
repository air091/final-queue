import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { Outlet, useParams } from "react-router-dom";
import PlayerHistoryModal, {
  summarizePlayerHistory,
} from "../components/host_components/PlayerHistoryModal";
import Sidebar from "../components/host_components/Sidebar";
import type { HostOutletContext } from "../hooks/useHostData";
import { api } from "../lib/api";
import {
  EMPTY_HOST_PAYMENTS_DATA,
  buildPaymentsSummary,
  getPaymentBalance,
  normalizeAcceptedPlayers,
  type AcceptedPlayers,
  type CourtType,
  type HostMeta,
  type HostPaymentsData,
  type HostPlayerRecord,
  type PaymentStatus,
  type PlayerHistoryTarget,
  type PlayerMatchHistoryItem,
  type QueueType,
} from "../lib/host";

export default function HostLayout() {
  const { communityId, hostId } = useParams();
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
        player?: { username?: string } | null;
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
            username: player.player?.username ?? "",
            isStatic: false,
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
    historyLoadingPlayerId,
    openPlayerHistory,
    closePlayerHistory,
    refreshHostData: loadHostData,
  };

  return (
    <div className="w-full max-w-[1920px] h-screen border border-red-500 mx-auto my-0 flex gap-x-3 p-2">
      <Sidebar />
      <main className="w-full">
        {isHostLoading ? (
          <div className="p-4">
            <p className="text-sm text-stone-600">Loading host data...</p>
          </div>
        ) : hostLoadError ? (
          <div className="p-4 grid gap-y-3">
            <p className="text-sm text-red-600">{hostLoadError}</p>
            <button
              type="button"
              onClick={() => void loadHostData()}
              className="w-fit rounded-md bg-stone-800 px-3 py-1.5 text-sm text-white hover:bg-stone-700"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* {host ? (
              <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-stone-500">
                      Host overview
                    </p>
                    <h1 className="text-2xl font-semibold text-stone-900">
                      {host.hostName}
                    </h1>
                    <p className="text-sm text-stone-500">
                      {host.community.communityName} · {host.sport}
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="rounded-xl bg-stone-50 p-3 text-sm">
                      <div className="text-stone-500">Players</div>
                      <div className="mt-1 text-xl font-semibold text-stone-900">
                        {host._count.players}
                      </div>
                    </div>
                    <div className="rounded-xl bg-stone-50 p-3 text-sm">
                      <div className="text-stone-500">Status</div>
                      <div className="mt-1 text-xl font-semibold text-stone-900">
                        {host.status}
                      </div>
                    </div>
                    <div className="rounded-xl bg-stone-50 p-3 text-sm">
                      <div className="text-stone-500">Created</div>
                      <div className="mt-1 text-xl font-semibold text-stone-900">
                        {new Date(host.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null} */}
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
          </>
        )}
      </main>
    </div>
  );
}
