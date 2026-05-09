import axios from "axios";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../hooks/useAuth";

type JoinStatus = "requested" | "accepted" | "rejected" | "banned" | null;

type CommunityType = {
  id: string;
  profileUrl: string | null;
  communityName: string;
  master: {
    id: string;
    profileUrl: string;
    username: string;
  };
};

type AcceptedPlayerType = {
  id: string;
  player: {
    id: string;
    profileUrl: string;
    username: string;
  };
};

type AvailableHostType = {
  id: string;
  hostName: string;
  sport: string;
  status: string;
  community: CommunityType;
  currentUserStatus: JoinStatus;
  isOwnedByCurrentUser: boolean;
  acceptedPlayers: AcceptedPlayerType[];
};

export default function Home() {
  const [availableHosts, setAvailableHost] = useState<AvailableHostType[]>([]);
  const [requestingHostIds, setRequestingHostIds] = useState<string[]>([]);
  const fallbackProfileUrl = "https://image.pngaaa.com/189/734189-middle.png";
  const { accessToken, isLoading } = useAuth();

  const getAvailableHosts = async () => {
    if (!accessToken) return;

    try {
      const response = await api.get("/api/public/actions/hosts/available", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      setAvailableHost(response.data.hosts);
    } catch (error) {
      if (axios.isAxiosError(error)) console.error(error);
      else console.error(error);
    }
  };

  useEffect(() => {
    if (!isLoading && accessToken) {
      getAvailableHosts();
    }
  }, [accessToken, isLoading]);

  const handleRequestToJoinHost = async (host: AvailableHostType) => {
    if (host.currentUserStatus || host.isOwnedByCurrentUser) return;

    setRequestingHostIds((currentHostIds) => [...currentHostIds, host.id]);
    setAvailableHost((currentHosts) =>
      currentHosts.map((currentHost) =>
        currentHost.id === host.id
          ? { ...currentHost, currentUserStatus: "requested" }
          : currentHost,
      ),
    );

    try {
      await api.post(
        `/api/public/actions/request/community/${host.community.id}/hosts/${host.id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
    } catch (error) {
      setAvailableHost((currentHosts) =>
        currentHosts.map((currentHost) =>
          currentHost.id === host.id
            ? { ...currentHost, currentUserStatus: null }
            : currentHost,
        ),
      );

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    } finally {
      setRequestingHostIds((currentHostIds) =>
        currentHostIds.filter((currentHostId) => currentHostId !== host.id),
      );
    }
  };

  const getButtonLabel = (
    host: Pick<AvailableHostType, "currentUserStatus" | "isOwnedByCurrentUser">,
    isRequesting: boolean,
  ) => {
    if (isRequesting) return "Requesting...";
    if (host.isOwnedByCurrentUser) return "Host";
    if (host.currentUserStatus === "accepted") return "Joined";
    if (host.currentUserStatus === "requested") return "Requested";
    if (host.currentUserStatus === "rejected") return "Rejected";
    if (host.currentUserStatus === "banned") return "Banned";
    return "Request";
  };

  const isButtonDisabled = (
    host: Pick<AvailableHostType, "currentUserStatus" | "isOwnedByCurrentUser">,
    isRequesting: boolean,
  ) =>
    isRequesting ||
    host.isOwnedByCurrentUser ||
    host.currentUserStatus !== null;

  return (
    <div className="w-full px-2 py-4 sm:px-4">
      <main className="mx-auto flex max-w-3xl flex-col gap-4 pb-24 md:pb-6">
        {availableHosts.map((availableHost) => {
          const isRequesting = requestingHostIds.includes(availableHost.id);

          return (
            <div
              key={availableHost.id}
              className="
              rounded-3xl border border-gray-200
              bg-white p-5 transition
              hover:border-primary/30
            "
            >
              {/* Top */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                {/* Left */}
                <div className="flex items-start gap-4">
                  {/* Image */}
                  <div className="h-14 w-14 overflow-hidden rounded-full border border-gray-200">
                    <img
                      src={
                        availableHost.community.profileUrl ?? fallbackProfileUrl
                      }
                      alt={availableHost.community.communityName}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-text">
                        {availableHost.community.communityName}
                      </h2>

                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                        🏸 {availableHost.sport}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-gray-500">
                      Hosted by{" "}
                      <span className="font-medium text-text">
                        {availableHost.community.master.username}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Status */}
                <div className="w-fit rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-600">
                  OPEN
                </div>
              </div>

              {/* Title */}
              <div className="mt-5">
                <h3 className="text-xl font-bold text-text">
                  {availableHost.hostName}
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Join the queue and start playing with nearby players.
                </p>
              </div>

              {/* Footer */}
              <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Players */}
                <div className="flex items-center">
                  {availableHost.acceptedPlayers
                    .slice(0, 5)
                    .map(({ id, player }, index) => (
                      <div
                        key={id}
                        className={`
                        h-9 w-9 overflow-hidden rounded-full
                        border-2 border-white
                        ${index !== 0 ? "-ml-2" : ""}
                      `}
                      >
                        <img
                          src={player.profileUrl}
                          alt={player.username}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}

                  {availableHost.acceptedPlayers.length > 5 && (
                    <div className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                      +{availableHost.acceptedPlayers.length - 5}
                    </div>
                  )}
                </div>

                {/* Button */}
                <button
                  type="button"
                  disabled={isButtonDisabled(availableHost, isRequesting)}
                  onClick={() => handleRequestToJoinHost(availableHost)}
                  className={`
                  w-full rounded-xl px-5 py-3
                  text-sm font-semibold transition

                  sm:w-auto

                  ${
                    isButtonDisabled(availableHost, isRequesting)
                      ? "cursor-not-allowed bg-gray-100 text-gray-400"
                      : "bg-primary text-white hover:bg-accent"
                  }
                `}
                >
                  {getButtonLabel(availableHost, isRequesting)}
                </button>
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
