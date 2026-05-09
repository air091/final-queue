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
    <div className="w-full  px-4 py-6">
      <main className="mx-auto flex w-full max-w-[720px] flex-col gap-5">
        {availableHosts.map((availableHost) => {
          const isRequesting = requestingHostIds.includes(availableHost.id);

          return (
            <div
              key={availableHost.id}
              className="group relative overflow-hidden rounded-3xl border border-orange-100 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
            >
              {/* Background Accent */}
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/5 via-transparent to-[var(--color-accent)]/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              {/* TOP */}
              <div className="relative z-10 flex items-start justify-between gap-3">
                {/* LEFT */}
                <div className="flex items-center gap-4">
                  {/* COMMUNITY IMAGE */}
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-[var(--color-primary)] blur-md opacity-30" />

                    <div className="relative h-14 w-14 overflow-hidden rounded-full border-2 border-[var(--color-secondary)] bg-stone-100 shadow-md">
                      <img
                        src={
                          availableHost.community.profileUrl ??
                          fallbackProfileUrl
                        }
                        alt={availableHost.community.communityName}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>

                  {/* INFO */}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-[var(--color-text)]">
                        {availableHost.community.communityName}
                      </h2>

                      {/* SPORT BADGE */}
                      <span className="rounded-full bg-[var(--color-secondary)]/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-accent)]">
                        🏸 {availableHost.sport}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                      {/* HOST */}
                      <div className="flex items-center gap-1.5">
                        <div className="h-5 w-5 overflow-hidden rounded-full border border-orange-200">
                          <img
                            src={availableHost.community.master.profileUrl}
                            alt={availableHost.community.master.username}
                            className="h-full w-full object-cover"
                          />
                        </div>

                        <span className="font-medium text-stone-700">
                          {availableHost.community.master.username}
                        </span>
                      </div>

                      <span className="text-orange-300">•</span>

                      {/* STATUS */}
                      <span className="font-medium text-emerald-600">
                        Available now
                      </span>
                    </div>
                  </div>
                </div>

                {/* OPEN STATUS */}
                <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm">
                  OPEN
                </div>
              </div>

              {/* MATCH TITLE */}
              <div className="relative z-10 mt-5">
                <h3 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
                  {availableHost.hostName}
                </h3>

                <p className="mt-1 text-sm text-stone-500">
                  Join the queue and start playing badminton with nearby
                  players.
                </p>
              </div>

              {/* FOOTER */}
              <div className="relative z-10 mt-5 flex items-center justify-between gap-3">
                {/* PLAYERS */}
                <div className="flex items-center">
                  {availableHost.acceptedPlayers
                    .slice(0, 6)
                    .map(({ id, player }, index) => (
                      <div
                        key={id}
                        title={player.username}
                        className={`relative h-10 w-10 overflow-hidden rounded-full border-2 border-white shadow-md ${
                          index !== 0 ? "-ml-3" : ""
                        }`}
                      >
                        <img
                          src={player.profileUrl}
                          alt={player.username}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}

                  {availableHost.acceptedPlayers.length > 6 && (
                    <div className="-ml-3 flex h-10 min-w-10 items-center justify-center rounded-full border-2 border-white bg-[var(--color-primary)] text-xs font-bold text-white shadow-md">
                      +{availableHost.acceptedPlayers.length - 6}
                    </div>
                  )}
                </div>

                {/* BUTTON */}
                <button
                  type="button"
                  disabled={isButtonDisabled(availableHost, isRequesting)}
                  onClick={() => handleRequestToJoinHost(availableHost)}
                  className={`rounded-2xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                    isButtonDisabled(availableHost, isRequesting)
                      ? "cursor-not-allowed border border-stone-200 bg-stone-100 text-stone-400"
                      : "bg-[var(--color-primary)] text-white shadow-lg shadow-orange-200 hover:scale-[1.03] hover:bg-[var(--color-accent)] active:scale-[0.98]"
                  }`}
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
