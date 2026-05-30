import axios from "axios";
import { Search, UserCheck, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { IconButton, PersonRow } from "../components/FriendPersonRow";
import type { FriendPerson } from "../components/FriendPersonRow";
import { api } from "../lib/api";

type AccountSummary = FriendPerson;

type FriendRequestItem = {
  id: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  updatedAt: string;
  direction: "incoming" | "outgoing";
  requester: AccountSummary;
  receiver: AccountSummary;
};

const USERS_PAGE_SIZE = 10;

const getErrorMessage = (error: unknown, fallback: string) =>
  axios.isAxiosError(error)
    ? (error.response?.data?.message ?? fallback)
    : fallback;

export default function Friends() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<AccountSummary[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequestItem[]>(
    [],
  );
  const [friendIds, setFriendIds] = useState<Set<string>>(() => new Set());
  const [isSearching, setIsSearching] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreUsers, setHasMoreUsers] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
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
  const loadFriendsData = async () => {
    setError(null);

    const [friendsResponse, requestsResponse] = await Promise.all([
      api.get("/api/friends"),
      api.get("/api/friends/requests"),
    ]);

    setFriendIds(
      new Set(
        (friendsResponse.data.friends as { friend: AccountSummary }[]).map(
          (friendship) => friendship.friend.id,
        ),
      ),
    );
    setOutgoingRequests(requestsResponse.data.outgoing as FriendRequestItem[]);
  };

  const loadSearchResults = async (
    query: string,
    offset = 0,
    append = false,
  ) => {
    const response = await api.get("/api/friends/search", {
      params: { query, limit: USERS_PAGE_SIZE, offset },
    });
    const users = response.data.users as AccountSummary[];

    setSearchResults((currentUsers) =>
      append ? [...currentUsers, ...users] : users,
    );
    setHasMoreUsers(Boolean(response.data.hasMore));
    setNextOffset(
      typeof response.data.nextOffset === "number"
        ? response.data.nextOffset
        : null,
    );
  };

  useEffect(() => {
    void (async () => {
      try {
        await loadFriendsData();
      } catch (loadError) {
        setError(getErrorMessage(loadError, "Unable to load friends."));
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

  const handleLoadMore = async () => {
    if (nextOffset === null || isLoadingMore) return;

    setIsLoadingMore(true);
    setError(null);

    try {
      await loadSearchResults(searchTerm.trim(), nextOffset, true);
    } catch (loadMoreError) {
      setError(getErrorMessage(loadMoreError, "Unable to load more users."));
    } finally {
      setIsLoadingMore(false);
    }
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

  const deleteRequest = async (requestId: string) => {
    const previousOutgoingRequests = outgoingRequests;

    setBusyId(requestId);
    setError(null);
    setOutgoingRequests((requests) =>
      requests.filter((request) => request.id !== requestId),
    );

    try {
      await api.delete(`/api/friends/requests/${requestId}`);
    } catch (requestError) {
      setOutgoingRequests(previousOutgoingRequests);
      setError(getErrorMessage(requestError, "Unable to remove friend request."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <header className="mb-5">
        <div>
          <h2 className="text-2xl font-bold text-stone-950">Find Friends</h2>
        </div>
      </header>

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {error}
        </div>
      ) : null}

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

        <div className="grid gap-3 bg-orange-50/25 p-3">
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
                  variant="card"
                  meta={
                    isFriend ? "Friend" : isPending ? "Request sent" : undefined
                  }
                  actions={
                    <IconButton
                      title={isPending ? "Remove friend request" : "Add friend"}
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
                      {isPending ? <UserCheck size={17} /> : <UserPlus size={17} />}
                    </IconButton>
                  }
                />
              );
            })
          )}
        </div>
        {!isSearching && hasMoreUsers ? (
          <div className="border-t border-orange-100 bg-white px-4 py-3 text-center">
            <button
              type="button"
              onClick={() => void handleLoadMore()}
              disabled={isLoadingMore}
              className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoadingMore ? "Loading..." : "Load more"}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
