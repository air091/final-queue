import axios from "axios";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

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

type AvailableHostType = {
  id: string;
  hostName: string;
  sport: string;
  status: string;
  community: CommunityType;
  currentUserStatus: JoinStatus;
  isOwnedByCurrentUser: boolean;
};

export default function Home() {
  const [availableHosts, setAvailableHost] = useState<AvailableHostType[]>([]);
  const [requestingHostIds, setRequestingHostIds] = useState<string[]>([]);
  const fallbackProfileUrl = "https://image.pngaaa.com/189/734189-middle.png";

  const getAvailableHosts = async () => {
    try {
      const response = await api.get("/api/public/actions/hosts/available");
      console.log(response);
      setAvailableHost(response.data.hosts);
    } catch (error) {
      if (axios.isAxiosError(error)) console.error(error);
      else console.error(error);
    }
  };

  useEffect(() => {
    getAvailableHosts();
  }, []);

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
    <div className="w-full px-4 py-6">
      <main className="mx-auto flex w-full max-w-[620px] flex-col gap-4">
        {availableHosts.map((availableHost) => {
          const isRequesting = requestingHostIds.includes(availableHost.id);

          return (
            <div
              key={availableHost.id}
              className="group overflow-hidden rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              {/* Top Section */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {/* Community Avatar */}
                  <div className="h-14 w-14 overflow-hidden rounded-full border border-stone-200 bg-stone-100">
                    <img
                      src={
                        availableHost.community.profileUrl ?? fallbackProfileUrl
                      }
                      alt={availableHost.community.communityName}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {/* Community Info */}
                  <div>
                    <h2 className="text-[15px] font-semibold text-stone-900">
                      {availableHost.community.communityName}
                    </h2>

                    <div className="mt-1 flex items-center gap-2 text-sm text-stone-500">
                      <div className="flex items-center gap-1.5">
                        <div className="h-5 w-5 overflow-hidden rounded-full border border-stone-200">
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

                      <span className="text-stone-300">•</span>

                      <span>0:00</span>
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  Open
                </div>
              </div>

              {/* Host Name */}
              <div className="mt-4">
                <h3 className="text-lg font-semibold tracking-tight text-stone-900">
                  {availableHost.hostName}
                </h3>

                <p className="mt-1 text-sm text-stone-500">
                  Looking for players to join this match.
                </p>
              </div>

              {/* Footer */}
              <div className="mt-5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-stone-500">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  Available now
                </div>

                <button
                  type="button"
                  disabled={isButtonDisabled(availableHost, isRequesting)}
                  onClick={() => handleRequestToJoinHost(availableHost)}
                  className={`rounded-xl px-5 py-2 text-sm font-medium transition-all duration-200 ${
                    isButtonDisabled(availableHost, isRequesting)
                      ? "cursor-not-allowed border border-stone-200 bg-stone-100 text-stone-400"
                      : "bg-stone-900 text-white hover:bg-stone-800 active:scale-[0.98]"
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
