import axios from "axios";
import { Check, Search, Trash2, UserCheck, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api } from "../lib/api";

type AccountSummary = {
  id: string;
  username: string;
  profileUrl: string;
};

type FriendRequestItem = {
  id: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  updatedAt: string;
  direction: "incoming" | "outgoing";
  requester: AccountSummary;
  receiver: AccountSummary;
};

type FriendItem = {
  friendshipId: string;
  friendsSince: string;
  friend: AccountSummary;
};

const getErrorMessage = (error: unknown, fallback: string) =>
  axios.isAxiosError(error)
    ? (error.response?.data?.message ?? fallback)
    : fallback;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

function PersonRow({
  person,
  meta,
  actions,
}: {
  person: AccountSummary;
  meta?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 border-b border-stone-100 px-4 py-3 last:border-b-0">
      <div className="flex min-w-0 items-center gap-3">
        <img
          src={person.profileUrl}
          alt={person.username}
          className="h-10 w-10 shrink-0 rounded-full border border-orange-100 object-cover"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-stone-900">
            {person.username}
          </p>
          {meta ? <p className="mt-0.5 text-xs text-stone-500">{meta}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

function IconButton({
  title,
  onClick,
  disabled,
  children,
  className = "",
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

export default function Friends() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<AccountSummary[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequestItem[]>(
    [],
  );
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequestItem[]>(
    [],
  );
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const outgoingReceiverIds = useMemo(
    () => new Set(outgoingRequests.map((request) => request.receiver.id)),
    [outgoingRequests],
  );
  const outgoingRequestByReceiverId = useMemo(
    () =>
      new Map(
        outgoingRequests.map((request) => [request.receiver.id, request]),
      ),
    [outgoingRequests],
  );
  const friendIds = useMemo(
    () => new Set(friends.map((friendship) => friendship.friend.id)),
    [friends],
  );

  const loadFriendsData = async () => {
    setError(null);

    const [friendsResponse, requestsResponse] = await Promise.all([
      api.get("/api/friends"),
      api.get("/api/friends/requests"),
    ]);

    setFriends(friendsResponse.data.friends as FriendItem[]);
    setIncomingRequests(requestsResponse.data.incoming as FriendRequestItem[]);
    setOutgoingRequests(requestsResponse.data.outgoing as FriendRequestItem[]);
  };

  const loadSearchResults = async (query: string) => {
    const response = await api.get("/api/friends/search", {
      params: { query, all: true },
    });
    setSearchResults(response.data.users as AccountSummary[]);
  };

  useEffect(() => {
    void (async () => {
      try {
        await Promise.all([loadFriendsData(), loadSearchResults("")]);
      } catch (loadError) {
        setError(getErrorMessage(loadError, "Unable to load friends."));
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const query = searchTerm.trim();

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        try {
          await loadSearchResults(query);
        } catch (searchError) {
          setError(getErrorMessage(searchError, "Unable to search users."));
        } finally {
          setIsSearching(false);
        }
      })();
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleSearchTermChange = (value: string) => {
    setSearchTerm(value);
    setIsSearching(true);
  };

  const sendRequest = async (receiver: AccountSummary) => {
    const previousOutgoingRequests = outgoingRequests;
    const now = new Date().toISOString();
    const optimisticRequest: FriendRequestItem = {
      id: `pending-${receiver.id}`,
      status: "pending",
      createdAt: now,
      updatedAt: now,
      direction: "outgoing",
      requester: receiver,
      receiver,
    };

    setBusyId(receiver.id);
    setError(null);
    setOutgoingRequests((requests) => [...requests, optimisticRequest]);

    try {
      const response = await api.post("/api/friends/requests", {
        receiverId: receiver.id,
      });
      const createdRequest = response.data.request as FriendRequestItem;

      setOutgoingRequests((requests) =>
        requests.map((request) =>
          request.id === optimisticRequest.id ? createdRequest : request,
        ),
      );
    } catch (requestError) {
      setOutgoingRequests(previousOutgoingRequests);
      setError(getErrorMessage(requestError, "Unable to send friend request."));
    } finally {
      setBusyId(null);
    }
  };

  const updateRequest = async (
    requestId: string,
    action: "accept" | "reject",
  ) => {
    setBusyId(requestId);
    setError(null);

    try {
      await api.patch(`/api/friends/requests/${requestId}/${action}`);
      await loadFriendsData();
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          action === "accept"
            ? "Unable to accept friend request."
            : "Unable to reject friend request.",
        ),
      );
    } finally {
      setBusyId(null);
    }
  };

  const deleteRequest = async (requestId: string) => {
    const previousIncomingRequests = incomingRequests;
    const previousOutgoingRequests = outgoingRequests;

    setBusyId(requestId);
    setError(null);
    setIncomingRequests((requests) =>
      requests.filter((request) => request.id !== requestId),
    );
    setOutgoingRequests((requests) =>
      requests.filter((request) => request.id !== requestId),
    );

    try {
      await api.delete(`/api/friends/requests/${requestId}`);
    } catch (requestError) {
      setIncomingRequests(previousIncomingRequests);
      setOutgoingRequests(previousOutgoingRequests);
      setError(getErrorMessage(requestError, "Unable to remove friend request."));
    } finally {
      setBusyId(null);
    }
  };

  const removeFriend = async (friendId: string) => {
    const previousFriends = friends;

    setBusyId(friendId);
    setError(null);
    setFriends((friendships) =>
      friendships.filter((friendship) => friendship.friend.id !== friendId),
    );

    try {
      await api.delete(`/api/friends/${friendId}`);
    } catch (requestError) {
      setFriends(previousFriends);
      setError(getErrorMessage(requestError, "Unable to remove friend."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-stone-950">Friends</h2>
          
        </div>
        <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-primary">
          {friends.length} friends
        </span>
      </header>

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <section className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
          <header className="border-b border-orange-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-stone-900">Search users</h3>
            <div className="mt-3 flex items-center gap-2 rounded-2xl border border-orange-100 bg-orange-50/40 px-3 py-2">
              <Search size={18} className="shrink-0 text-stone-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => handleSearchTermChange(event.target.value)}
                placeholder="Search by username"
                className="min-w-0 flex-1 bg-transparent text-sm text-stone-800 outline-none placeholder:text-stone-400"
              />
            </div>
          </header>

          <div>
            {isSearching ? (
              <div className="px-4 py-8 text-center text-sm text-stone-500">
                Searching...
              </div>
            ) : searchResults.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-stone-500">
                No users found.
              </div>
            ) : (
              searchResults.map((person) => {
                const isFriend = friendIds.has(person.id);
                const pendingRequest = outgoingRequestByReceiverId.get(person.id);
                const isPending = outgoingReceiverIds.has(person.id);

                return (
                  <PersonRow
                    key={person.id}
                    person={person}
                    meta={
                      isFriend ? "Friend" : isPending ? "Request sent" : undefined
                    }
                    actions={
                      <IconButton
                        title={
                          isPending ? "Remove friend request" : "Add friend"
                        }
                        onClick={() =>
                          pendingRequest
                            ? void deleteRequest(pendingRequest.id)
                            : void sendRequest(person)
                        }
                        disabled={
                          Boolean(busyId) ||
                          isFriend ||
                          (isPending && !pendingRequest)
                        }
                        className={
                          isPending
                            ? "border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                            : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                        }
                      >
                        {isPending ? (
                          <UserCheck size={17} />
                        ) : (
                          <UserPlus size={17} />
                        )}
                      </IconButton>
                    }
                  />
                );
              })
            )}
          </div>
        </section>

        <div className="grid gap-4">
          <section className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
            <header className="border-b border-orange-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-stone-900">
                Incoming requests
              </h3>
            </header>
            {isLoading ? (
              <div className="px-4 py-8 text-center text-sm text-stone-500">
                Loading...
              </div>
            ) : incomingRequests.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-stone-500">
                No incoming requests.
              </div>
            ) : (
              incomingRequests.map((friendRequest) => (
                <PersonRow
                  key={friendRequest.id}
                  person={friendRequest.requester}
                  meta={`Sent ${formatDate(friendRequest.createdAt)}`}
                  actions={
                    <>
                      <IconButton
                        title="Accept"
                        onClick={() =>
                          void updateRequest(friendRequest.id, "accept")
                        }
                        disabled={Boolean(busyId)}
                        className="border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                      >
                        <Check size={17} />
                      </IconButton>
                      <IconButton
                        title="Reject"
                        onClick={() =>
                          void updateRequest(friendRequest.id, "reject")
                        }
                        disabled={Boolean(busyId)}
                        className="border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                      >
                        <X size={17} />
                      </IconButton>
                    </>
                  }
                />
              ))
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
            <header className="border-b border-orange-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-stone-900">
                Sent pending
              </h3>
            </header>
            {isLoading ? (
              <div className="px-4 py-8 text-center text-sm text-stone-500">
                Loading...
              </div>
            ) : outgoingRequests.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-stone-500">
                No sent requests.
              </div>
            ) : (
              outgoingRequests.map((friendRequest) => (
                <PersonRow
                  key={friendRequest.id}
                  person={friendRequest.receiver}
                  meta={`Sent ${formatDate(friendRequest.createdAt)}`}
                  actions={
                    <IconButton
                      title="Remove friend request"
                      onClick={() => void deleteRequest(friendRequest.id)}
                      disabled={Boolean(busyId)}
                      className="border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                    >
                      <Trash2 size={17} />
                    </IconButton>
                  }
                />
              ))
            )}
          </section>
        </div>
      </div>

      <section className="mt-4 overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
        <header className="border-b border-orange-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-stone-900">Friends list</h3>
        </header>
        {isLoading ? (
          <div className="px-4 py-10 text-center text-sm text-stone-500">
            Loading...
          </div>
        ) : friends.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-stone-500">
            No friends yet.
          </div>
        ) : (
          friends.map((friendship) => (
            <PersonRow
              key={friendship.friendshipId}
              person={friendship.friend}
              meta={`Friends since ${formatDate(friendship.friendsSince)}`}
              actions={
                <IconButton
                  title="Remove friend"
                  onClick={() => void removeFriend(friendship.friend.id)}
                  disabled={Boolean(busyId)}
                  className="border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                >
                  <Trash2 size={17} />
                </IconButton>
              }
            />
          ))
        )}
      </section>
    </div>
  );
}
