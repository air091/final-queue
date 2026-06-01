import axios from "axios";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import LoadingState from "../components/LoadingState";

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
  location?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  maxPlayers?: number;
  status: string;
  community: CommunityType;
  currentUserStatus: JoinStatus;
  currentUserCommunityStatus: JoinStatus;
  isOwnedByCurrentUser: boolean;
  acceptedPlayers: AcceptedPlayerType[];
};

const formatHostDateTime = (value?: string | null) => {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const isHostFull = (
  host: Pick<AvailableHostType, "acceptedPlayers" | "maxPlayers">,
) =>
  Boolean(host.maxPlayers && host.maxPlayers > 0) &&
  host.acceptedPlayers.length >= (host.maxPlayers ?? 0);

export default function Home() {
  const [availableHosts, setAvailableHost] = useState<AvailableHostType[]>([]);
  const [isHostsLoading, setIsHostsLoading] = useState(true);
  const [hostsError, setHostsError] = useState<string | null>(null);
  const [requestingHostIds, setRequestingHostIds] = useState<string[]>([]);
  const fallbackProfileUrl = "https://image.pngaaa.com/189/734189-middle.png";
  const { accessToken, isLoading } = useAuth();

  const getAvailableHosts = async () => {
    if (!accessToken) {
      setIsHostsLoading(false);
      return;
    }

    setIsHostsLoading(true);
    setHostsError(null);
    try {
      const response = await api.get("/api/public/actions/hosts/available", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      setAvailableHost(response.data.hosts);
    } catch (error) {
      setHostsError("Unable to load available hosts.");
      if (axios.isAxiosError(error)) console.error(error);
      else console.error(error);
    } finally {
      setIsHostsLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading && accessToken) {
      void getAvailableHosts();
    }
  }, [accessToken, isLoading]);

  const handleRequestToJoinHost = async (host: AvailableHostType) => {
    if (
      host.currentUserCommunityStatus ||
      host.currentUserStatus ||
      host.isOwnedByCurrentUser ||
      isHostFull(host)
    ) {
      return;
    }

    setRequestingHostIds((currentHostIds) => [...currentHostIds, host.id]);
    setAvailableHost((currentHosts) =>
      currentHosts.map((currentHost) =>
        currentHost.community.id === host.community.id
          ? {
              ...currentHost,
              currentUserCommunityStatus: "requested",
              currentUserStatus:
                currentHost.id === host.id
                  ? "requested"
                  : currentHost.currentUserStatus,
            }
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
          currentHost.community.id === host.community.id
            ? {
                ...currentHost,
                currentUserCommunityStatus: null,
                currentUserStatus:
                  currentHost.id === host.id
                    ? null
                    : currentHost.currentUserStatus,
              }
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
    host: Pick<
      AvailableHostType,
      | "acceptedPlayers"
      | "currentUserCommunityStatus"
      | "currentUserStatus"
      | "isOwnedByCurrentUser"
      | "maxPlayers"
    >,
    isRequesting: boolean,
  ) => {
    if (isRequesting) return "Sending request...";
    if (host.isOwnedByCurrentUser) return "Host";
    if (host.currentUserCommunityStatus === "accepted")
      return "Community Member";
    if (host.currentUserCommunityStatus === "requested")
      return "Request Sent";
    if (host.currentUserCommunityStatus === "rejected")
      return "Request Rejected";
    if (host.currentUserCommunityStatus === "banned") return "Banned";
    if (host.currentUserStatus === "accepted") return "Joined";
    if (host.currentUserStatus === "requested") return "Request Sent";
    if (host.currentUserStatus === "rejected") return "Rejected";
    if (host.currentUserStatus === "banned") return "Banned";
    if (isHostFull(host)) return "Full";
    return "Join Community";
  };

  const isButtonDisabled = (
    host: Pick<
      AvailableHostType,
      | "acceptedPlayers"
      | "currentUserCommunityStatus"
      | "currentUserStatus"
      | "isOwnedByCurrentUser"
      | "maxPlayers"
    >,
    isRequesting: boolean,
  ) =>
    isRequesting ||
    host.isOwnedByCurrentUser ||
    host.currentUserCommunityStatus !== null ||
    host.currentUserStatus !== null ||
    isHostFull(host);

  return (
    <div className="w-full px-2 py-2 sm:px-4">
      <main className="mx-auto flex max-w-3xl flex-col gap-4 pb-24 md:pb-6">
        {isHostsLoading ? (
          <LoadingState
            title="Loading available games"
            message="Checking open hosts and player counts..."
          />
        ) : hostsError ? (
          <div className="rounded-3xl border border-red-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-red-600">{hostsError}</p>
            <button
              type="button"
              onClick={() => void getAvailableHosts()}
              className="mt-4 w-fit rounded-2xl bg-text px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              Retry
            </button>
          </div>
        ) : availableHosts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-orange-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-text">
              No open games right now
            </h2>
            <p className="mt-2 text-sm text-stone-500">
              Available hosts will show up here as soon as someone starts a
              session.
            </p>
          </div>
        ) : (
          availableHosts.map((availableHost) => {
          const isRequesting = requestingHostIds.includes(availableHost.id);
          const hostIsFull = isHostFull(availableHost);

          return (
            <div
              key={availableHost.id}
              className="
                rounded-3xl border border-gray-200
                bg-white p-5 transition
                hover:border-primary/30
              "
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 overflow-hidden rounded-full border border-gray-200">
                    <img
                      src={
                        availableHost.community.profileUrl ?? fallbackProfileUrl
                      }
                      alt={availableHost.community.communityName}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-text">
                        {availableHost.community.communityName}
                      </h2>

                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                        {availableHost.sport}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-x-[8px] text-sm text-gray-500">
                      <span>Hosted by</span>
                      <div className="flex items-center gap-x-[4px]">
                        <div className="w-[18px] h-[18px] rounded-full">
                          <img
                            src={availableHost.community.master.profileUrl}
                            alt={availableHost.community.master.username}
                            className="block w-full h-full object-center object-cover rounded-full"
                          />
                        </div>
                        <span className="font-medium text-text">
                          {availableHost.community.master.username}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${
                    hostIsFull
                      ? "bg-red-50 text-red-600"
                      : "bg-green-50 text-green-600"
                  }`}
                >
                  {hostIsFull ? "FULL" : "OPEN"}
                </div>
              </div>

              <div className="mt-5">
                <h3 className="text-xl font-bold text-text">
                  {availableHost.hostName}
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Join the queue and start playing with nearby players.
                </p>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                  {availableHost.location ? (
                    <span className="rounded-full bg-gray-100 px-3 py-1">
                      {availableHost.location}
                    </span>
                  ) : null}

                  {availableHost.startTime ? (
                    <span className="rounded-full bg-gray-100 px-3 py-1">
                      Starts {formatHostDateTime(availableHost.startTime)}
                    </span>
                  ) : null}

                  {availableHost.endTime ? (
                    <span className="rounded-full bg-gray-100 px-3 py-1">
                      Ends {formatHostDateTime(availableHost.endTime)}
                    </span>
                  ) : null}

                  {availableHost.maxPlayers && availableHost.maxPlayers > 0 ? (
                    <span className="rounded-full bg-gray-100 px-3 py-1">
                      {availableHost.acceptedPlayers.length}/
                      {availableHost.maxPlayers} players
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-3 py-1">
                      {availableHost.acceptedPlayers.length} players joined
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

                <button
                  type="button"
                  disabled={isButtonDisabled(availableHost, isRequesting)}
                  onClick={() => void handleRequestToJoinHost(availableHost)}
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
          })
        )}
      </main>
    </div>
  );
}
