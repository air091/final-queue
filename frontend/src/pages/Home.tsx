import axios from "axios";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

type JoinStatus = "requested" | "accepted" | "rejected" | "banned" | null;

type CommunityType = {
  id: string;
  profileUrl: string | null;
  communityName: string;
  admin: {
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
      console.log(response.data.hosts);
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
    <div className="w-full p-2">
      <main className="w-full max-w-[520px] mx-auto">
        {availableHosts.map((availableHost) => {
          const isRequesting = requestingHostIds.includes(availableHost.id);

          return (
            <div
              key={availableHost.id}
              className="w-full p-2 rounded-md border"
            >
              <div className="flex items-center gap-x-1">
                <div className="rounded-full w-[42px] h-[42px]">
                  <img
                    src={
                      availableHost.community.profileUrl ?? fallbackProfileUrl
                    }
                    alt={availableHost.community.communityName}
                    className="block border w-full h-full rounded-full object-contain"
                  />
                </div>
                <div>
                  <div>
                    <span className="block font-semibold">
                      {availableHost.community.communityName}
                    </span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <div className="flex items-center gap-x-1">
                      <div className="rounded-full w-[20px] h-[20px]">
                        <img
                          src={availableHost.community.admin.profileUrl}
                          alt={availableHost.community.admin.username}
                          className="block border w-full h-full rounded-full object-contain"
                        />
                      </div>
                      <span className="block text-[14px] font-semibold">
                        {availableHost.community.admin.username}
                      </span>
                    </div>
                    <div>0:00</div>
                  </div>
                </div>
              </div>
              <div>{availableHost.hostName}</div>
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={isButtonDisabled(availableHost, isRequesting)}
                  onClick={() => handleRequestToJoinHost(availableHost)}
                  className={`block rounded px-6 py-1 border ${
                    isButtonDisabled(availableHost, isRequesting)
                      ? "cursor-not-allowed border-stone-300 bg-stone-100 text-stone-500"
                      : "cursor-pointer hover:bg-stone-200"
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
