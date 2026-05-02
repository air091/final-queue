import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { Outlet, useParams } from "react-router-dom";
import Sidebar from "../components/host_components/Sidebar";
import type { HostOutletContext } from "../hooks/useHostData";
import {
  normalizeAcceptedPlayers,
  type AcceptedPlayers,
  type CourtType,
  type HostPlayerRecord,
  type QueueType,
} from "../lib/host";

export default function HostLayout() {
  const { communityId, hostId } = useParams();
  const [playersInHost, setPlayersInHost] = useState<HostPlayerRecord[]>([]);
  const [acceptedPlayers, setAcceptedPlayers] = useState<AcceptedPlayers[]>([]);
  const [courts, setCourts] = useState<CourtType[]>([]);
  const [queues, setQueues] = useState<QueueType[]>([]);
  const [isHostLoading, setIsHostLoading] = useState(true);
  const [hostLoadError, setHostLoadError] = useState<string | null>(null);

  const loadHostData = useCallback(async () => {
    if (!communityId || !hostId) return;

    setIsHostLoading(true);
    setHostLoadError(null);

    try {
      const [hostResponse, playersResponse, courtsResponse, queuesResponse] =
        await Promise.all([
          axios.get(
            `http://localhost:4000/api/community/${communityId}/hosts/${hostId}`,
            { withCredentials: true },
          ),
          axios.get(
            `http://localhost:4000/api/community/${communityId}/hosts/${hostId}/players`,
            { withCredentials: true },
          ),
          axios.get(
            `http://localhost:4000/api/community/${communityId}/hosts/${hostId}/courts`,
            { withCredentials: true },
          ),
          axios.get(
            `http://localhost:4000/api/community/${communityId}/hosts/${hostId}/queues`,
            { withCredentials: true },
          ),
        ]);

      setPlayersInHost([
        ...hostResponse.data.acceptedPlayers,
        ...hostResponse.data.requestedPlayers,
        ...hostResponse.data.rejectedPlayers,
      ]);
      setAcceptedPlayers(
        normalizeAcceptedPlayers(playersResponse.data.acceptedPlayers),
      );
      setCourts(courtsResponse.data.courts);
      setQueues(queuesResponse.data.queues);
    } catch (error) {
      setHostLoadError("Unable to load host data.");

      if (axios.isAxiosError(error)) console.error(error.response?.data ?? error);
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
    refreshHostData: loadHostData,
  };

  return (
    <div className="w-full max-w-480 border mx-auto my-0 flex gap-x-4">
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
          <Outlet context={outletContext} />
        )}
      </main>
    </div>
  );
}
