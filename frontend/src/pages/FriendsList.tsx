import axios from "axios";
import { ArrowLeft, Check, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { IconButton, PersonRow } from "../components/FriendPersonRow";
import type { FriendPerson } from "../components/FriendPersonRow";
import { api } from "../lib/api";

type FriendItem = {
  friendshipId: string;
  friendsSince: string;
  friend: FriendPerson;
};

type FriendRequestItem = {
  id: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  updatedAt: string;
  direction: "incoming" | "outgoing";
  requester: FriendPerson;
  receiver: FriendPerson;
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

export default function FriendsList() {
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequestItem[]>(
    [],
  );
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequestItem[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [busyFriendId, setBusyFriendId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    void (async () => {
      try {
        await loadFriendsData();
      } catch (loadError) {
        setError(getErrorMessage(loadError, "Unable to load friends."));
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const updateRequest = async (
    requestId: string,
    action: "accept" | "reject",
  ) => {
    setBusyFriendId(requestId);
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
      setBusyFriendId(null);
    }
  };

  const deleteRequest = async (requestId: string) => {
    const previousIncomingRequests = incomingRequests;
    const previousOutgoingRequests = outgoingRequests;

    setBusyFriendId(requestId);
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
      setBusyFriendId(null);
    }
  };

  const removeFriend = async (friendId: string) => {
    const previousFriends = friends;

    setBusyFriendId(friendId);
    setError(null);
    setFriends((friendships) =>
      friendships.filter((friendship) => friendship.friend.id !== friendId),
    );

    try {
      await api.delete(`/api/friends/${friendId}`);
    } catch (removeError) {
      setFriends(previousFriends);
      setError(getErrorMessage(removeError, "Unable to remove friend."));
    } finally {
      setBusyFriendId(null);
    }
  };

  return (
    <div className="w-full px-2 py-2 sm:px-4">
      <div className="mx-auto max-w-4xl">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              to="/profile"
              className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-accent"
            >
              <ArrowLeft size={16} />
              Profile
            </Link>
            <h1 className="text-2xl font-bold text-stone-950">Friends-list</h1>
          </div>
          <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-primary">
            {friends.length} friends
          </span>
        </header>

        {error ? (
          <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        ) : null}

        <div className="mb-4 grid gap-4 lg:grid-cols-2">
          <section className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
            <header className="border-b border-orange-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-stone-900">
                Incoming requests
              </h2>
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
                        disabled={Boolean(busyFriendId)}
                        className="border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                      >
                        <Check size={17} />
                      </IconButton>
                      <IconButton
                        title="Reject"
                        onClick={() =>
                          void updateRequest(friendRequest.id, "reject")
                        }
                        disabled={Boolean(busyFriendId)}
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
              <h2 className="text-sm font-semibold text-stone-900">
                Sent requests
              </h2>
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
                      disabled={Boolean(busyFriendId)}
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

        <section className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
          <header className="border-b border-orange-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-stone-900">
              Friends list
            </h2>
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
                    disabled={Boolean(busyFriendId)}
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
  );
}
