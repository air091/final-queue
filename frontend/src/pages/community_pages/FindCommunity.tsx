import axios from "axios";
import { Link } from "react-router-dom";
import { Search, X } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import LoadingState from "../../components/LoadingState";
import { api } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";

type CommunityType = {
  id: string;
  profileUrl: string;
  communityName: string;
  description: string;
  master: {
    id: string;
    username: string;
    sports?: Array<{
      sport: string;
    }>;
  };
  _count?: {
    players: number;
  };
};

type ActiveSessionType = {
  id: string;
  hostName: string;
  sport: string;
  location: string | null;
  startTime: string | null;
  maxPlayers: number;
  status: string;
  _count: {
    players: number;
  };
};

type TabType = "details" | "sessions";

export default function FindCommunity() {
  const { user } = useAuth();
  const [communities, setCommunities] = useState<CommunityType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCommunity, setSelectedCommunity] = useState<CommunityType | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("details");
  const [activeSessions, setActiveSessions] = useState<ActiveSessionType[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isRequestingJoin, setIsRequestingJoin] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);

  const filteredCommunities = useMemo(
    () => communities.filter((community) => community.master.id !== user?.id),
    [communities, user?.id],
  );

  useEffect(() => {
    const loadCommunities = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.get("/api/community/all");
        setCommunities(response.data.communities ?? []);
      } catch (loadError) {
        if (axios.isAxiosError(loadError)) {
          setError(
            loadError.response?.data?.message ??
              "Unable to load communities. Please try again.",
          );
        } else {
          setError("Unable to load communities. Please try again.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    void loadCommunities();
  }, []);

  const loadActiveSessions = async (communityId: string) => {
    setIsLoadingSessions(true);
    try {
      const response = await api.get(`/api/community/${communityId}/hosts`);
      setActiveSessions(response.data.hosts ?? []);
    } catch (loadError) {
      console.error("Failed to load active sessions:", loadError);
      setActiveSessions([]);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleOpenCommunityModal = (community: CommunityType) => {
    setSelectedCommunity(community);
    setActiveTab("details");
    setJoinError(null);
    setJoinSuccess(null);
    void loadActiveSessions(community.id);
  };

  const handleCloseCommunityModal = () => {
    setSelectedCommunity(null);
    setActiveSessions([]);
    setJoinError(null);
    setJoinSuccess(null);
  };

  const handleRequestJoin = async () => {
    if (!selectedCommunity) return;

    setIsRequestingJoin(true);
    setJoinError(null);
    setJoinSuccess(null);

    try {
      await api.post(`/api/community/${selectedCommunity.id}/players/invites`, {});
      setJoinSuccess("Join request sent successfully!");
    } catch (joinError) {
      if (axios.isAxiosError(joinError)) {
        setJoinError(
          joinError.response?.data?.message ??
            "Unable to send join request. Please try again.",
        );
      } else {
        setJoinError("Unable to send join request. Please try again.");
      }
    } finally {
      setIsRequestingJoin(false);
    }
  };

  if (isLoading) {
    return (
      <LoadingState
        title="Finding communities"
        message="Loading communities you can join..."
      />
    );
  }

  return (
    <div className="p-4">
      <div className="mb-6 rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Search size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-500">
              Community
            </p>
            <h1 className="mt-2 text-2xl font-bold text-text">Find Community</h1>
          </div>
        </div>
      </div>

      {filteredCommunities.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-orange-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-stone-700">
            No communities are available right now.
          </p>
          <p className="mt-2 text-sm text-stone-500">
            Check back later or create your own community.
          </p>
          <Link
            to="/community/create"
            className="mt-6 inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent"
          >
            Create community
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {filteredCommunities.map((community) => (
              <button
                key={community.id}
                onClick={() => handleOpenCommunityModal(community)}
                className="
                  w-full
                  md:w-[calc(50%-0.25rem)]
                  lg:w-fit
                  overflow-hidden rounded-3xl border border-orange-100
                  bg-white p-5 text-left transition hover:shadow-lg cursor-pointer
                "
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-14 w-14 overflow-hidden rounded-2xl bg-orange-50 shrink-0">
                    {community.profileUrl ? (
                      <img
                        src={community.profileUrl}
                        alt={community.communityName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-semibold uppercase text-orange-500">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-text">
                      {community.communityName}
                    </h2>

                    <p className="text-xs text-stone-500">
                      Owner:{" "}
                      <span className="font-bold">
                        {community.master.username}
                      </span>
                    </p>

                    <p className="mt-1 text-sm text-stone-500">
                      {community.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {selectedCommunity && (
            <div
              className="fixed inset-0 z-[900] flex items-center justify-center bg-black/40 px-4 py-6"
              onClick={handleCloseCommunityModal}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="community-details-title"
                className="w-full max-w-2xl rounded-3xl border border-gray-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)]"
                onClick={(event) => event.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-5 sm:p-6">
                  <div className="flex items-center gap-4">
                    <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-orange-50 shrink-0">
                      {selectedCommunity.profileUrl ? (
                        <img
                          src={selectedCommunity.profileUrl}
                          alt={selectedCommunity.communityName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-semibold uppercase text-orange-500">
                          No image
                        </div>
                      )}
                    </div>
                    <div>
                      <h2 id="community-details-title" className="text-xl font-semibold text-text">
                        {selectedCommunity.communityName}
                      </h2>
                      <p className="text-sm text-stone-500">
                        Hosted by{" "}
                        <span className="font-medium text-text">
                          {selectedCommunity.master.username}
                        </span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseCommunityModal}
                    className="rounded-full p-2 text-stone-500 hover:bg-stone-100 cursor-pointer"
                    aria-label="Close modal"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-0 border-b border-gray-200 px-5 sm:px-6">
                  <button
                    onClick={() => setActiveTab("details")}
                    className={`px-4 py-3 text-sm font-semibold transition cursor-pointer ${
                      activeTab === "details"
                        ? "border-b-2 border-primary text-primary"
                        : "text-stone-600 hover:text-text"
                    }`}
                  >
                    Details
                  </button>
                  <button
                    onClick={() => setActiveTab("sessions")}
                    className={`px-4 py-3 text-sm font-semibold transition cursor-pointer ${
                      activeTab === "sessions"
                        ? "border-b-2 border-primary text-primary"
                        : "text-stone-600 hover:text-text"
                    }`}
                  >
                    Sessions
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6">
                  {activeTab === "details" && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-sm font-semibold text-stone-600">Description</h3>
                        <p className="mt-2 text-sm text-text">
                          {selectedCommunity.description || "No description provided."}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-lg bg-orange-50 p-4 text-center">
                          <p className="text-xs font-semibold text-stone-600">Sport</p>
                          <p className="mt-3 text-2xl font-bold text-primary">
                            {selectedCommunity.master.sports?.[0]?.sport
                              ? selectedCommunity.master.sports[0].sport.charAt(0).toUpperCase() +
                                selectedCommunity.master.sports[0].sport.slice(1)
                              : "—"}
                          </p>
                        </div>

                        <div className="rounded-lg bg-orange-50 p-4 text-center">
                          <p className="text-xs font-semibold text-stone-600">Total Players</p>
                          <p className="mt-3 text-2xl font-bold text-primary">
                            {selectedCommunity._count?.players || 0}
                          </p>
                        </div>

                        <div className="rounded-lg bg-orange-50 p-4 text-center">
                          <p className="text-xs font-semibold text-stone-600">Total Sessions</p>
                          <p className="mt-3 text-2xl font-bold text-primary">
                            {activeSessions.length}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "sessions" && (
                    <div className="space-y-4">
                      {isLoadingSessions ? (
                        <p className="text-center text-sm text-stone-500">Loading sessions...</p>
                      ) : activeSessions.filter((session) => session.status === "available").length === 0 ? (
                        <p className="text-center text-sm text-stone-500">
                          No active sessions at the moment.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {activeSessions
                            .filter((session) => session.status === "available")
                            .map((session) => (
                            <div
                              key={session.id}
                              className="rounded-lg border border-orange-100 p-4"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <h4 className="font-semibold text-text">
                                    {session.hostName}
                                  </h4>
                                  <p className="text-xs text-stone-500">
                                    {session.sport.charAt(0).toUpperCase() +
                                      session.sport.slice(1)}
                                    {session.location && ` • ${session.location}`}
                                  </p>
                                </div>
                                <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary shrink-0">
                                  {session._count.players}/{session.maxPlayers || "∞"}
                                </div>
                              </div>
                              {session.startTime && (
                                <p className="mt-2 text-xs text-stone-500">
                                  {new Date(session.startTime).toLocaleString()}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Error/Success Messages */}
                {joinError && (
                  <div className="border-t border-gray-200 px-5 py-3 sm:px-6">
                    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                      {joinError}
                    </p>
                  </div>
                )}

                {joinSuccess && (
                  <div className="border-t border-gray-200 px-5 py-3 sm:px-6">
                    <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-600">
                      {joinSuccess}
                    </p>
                  </div>
                )}

                {/* Footer */}
                <div className="border-t border-gray-200 px-5 py-4 sm:px-6">
                  <button
                    onClick={() => void handleRequestJoin()}
                    disabled={isRequestingJoin || joinSuccess !== null}
                    className={`w-full rounded-xl px-5 py-3 text-sm cursor-pointer font-semibold transition ${
                      isRequestingJoin || joinSuccess
                        ? "cursor-not-allowed bg-gray-100 text-gray-400"
                        : "bg-primary text-white hover:bg-accent cursor-pointer"
                    }`}
                  >
                    {isRequestingJoin
                      ? "Sending request..."
                      : joinSuccess
                        ? "Request sent!"
                        : "Request to Join"}
                  </button>
                </div>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}
