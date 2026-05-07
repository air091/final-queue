import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { Outlet, useParams } from "react-router-dom";
import Sidebar from "../components/host_components/Sidebar";
import type { HostOutletContext } from "../hooks/useHostData";
import { api } from "../lib/api";
import {
  EMPTY_HOST_PAYMENTS_DATA,
  normalizeAcceptedPlayers,
  type AcceptedPlayers,
  type CourtType,
  type HostMeta,
  type HostPaymentsData,
  type HostPlayerRecord,
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

  const loadHostData = useCallback(async () => {
    if (!communityId || !hostId) return;

    setIsHostLoading(true);
    setHostLoadError(null);

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
      setPaymentsData({
        pricing: paymentsResponse.data.pricing,
        summary: paymentsResponse.data.summary,
        players: paymentsResponse.data.players,
      });
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
    refreshHostData: loadHostData,
  };

  return (
    <div className="w-full max-w-480 h-full border mx-auto my-0 flex gap-x-4 px-[32px]">
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
            {host ? (
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
            ) : null}
            <Outlet context={outletContext} />
          </>
        )}
      </main>
    </div>
  );
}
