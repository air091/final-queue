import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { Trash } from "lucide-react";

type MasterType = {
  id: string;
  profileUrl: string;
  username: string;
};

type CommunityType = {
  id: string;
  profileUrl: string;
  communityName: string;
  description: string;
  master: MasterType;
};

type HostsType = {
  id: string;
  hostName: string;
  sport: string;
  location: string | null;
  startTime: string | null;
  endTime: string | null;
  maxPlayers: number;
  status: string;
  _count: {
    players: number;
  };
};

type HostFormState = {
  hostName: string;
  sportName: string;
  location: string;
  startTime: string;
  endTime: string;
  maxPlayers: string;
};

const DEFAULT_SPORT_OPTIONS = ["badminton"];

const INITIAL_HOST_FORM: HostFormState = {
  hostName: "",
  sportName: DEFAULT_SPORT_OPTIONS[0],
  location: "",
  startTime: "",
  endTime: "",
  maxPlayers: "",
};

const formatHostDateTime = (value: string | null) => {
  if (!value) return "Any time";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Any time";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export default function Community() {
  const { id } = useParams();
  const [community, setCommunity] = useState<CommunityType | null>(null);
  const [communityHosts, setCommunityHosts] = useState<HostsType[]>([]);
  const [hostForm, setHostForm] = useState<HostFormState>(INITIAL_HOST_FORM);
  const [isCreatingHost, setIsCreatingHost] = useState(false);
  const [deletingHostId, setDeletingHostId] = useState<string | null>(null);
  const [hostError, setHostError] = useState<string | null>(null);
  const navigate = useNavigate();

  const getCommunityAPI = async () => {
    try {
      const response = await api.get(`/api/community/${id}`);
      setCommunity(response.data.community);
    } catch (error) {
      if (axios.isAxiosError(error)) console.error(error);
      else console.error("Get community api failed", error);
    }
  };

  useEffect(() => {
    void getCommunityAPI();
  }, [id]);

  const getCommunityHostsAPI = async () => {
    try {
      const response = await api.get(`/api/community/${id}/hosts/`);
      setCommunityHosts(response.data.hosts);
    } catch (error) {
      if (axios.isAxiosError(error)) console.error(error);
      else console.error("Get community hosts api failed", error);
    }
  };

  useEffect(() => {
    void getCommunityHostsAPI();
  }, [id]);

  const handleHostFormChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setHostForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const handleCreateHost = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id || !hostForm.sportName.trim()) return;

    setIsCreatingHost(true);
    setHostError(null);

    try {
      const cleanedHostName = hostForm.hostName.trim();
      const cleanedLocation = hostForm.location.trim();
      const startTime = hostForm.startTime
        ? new Date(hostForm.startTime).toISOString()
        : undefined;
      const endTime = hostForm.endTime
        ? new Date(hostForm.endTime).toISOString()
        : undefined;
      const maxPlayers =
        hostForm.maxPlayers.trim() === ""
          ? undefined
          : Number(hostForm.maxPlayers);

      if (
        maxPlayers !== undefined &&
        (Number.isNaN(maxPlayers) || maxPlayers < 0)
      ) {
        setHostError("Max players must be 0 or more.");
        return;
      }

      const response = await api.post(`/api/community/${id}/host`, {
        hostName: cleanedHostName || undefined,
        sportName: hostForm.sportName,
        location: cleanedLocation || undefined,
        startTime,
        endTime,
        maxPlayers,
      });

      const newHost = response.data.data as HostsType;
      setCommunityHosts((currentHosts) => [...currentHosts, newHost]);
      setHostForm(INITIAL_HOST_FORM);
    } catch (error) {
      setHostError("Unable to create host.");

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error("Create host api failed", error);
    } finally {
      setIsCreatingHost(false);
    }
  };

  const handleDeleteHost = async (
    event: React.MouseEvent<HTMLButtonElement>,
    host: HostsType,
  ) => {
    event.stopPropagation();

    if (!id || deletingHostId) return;

    const confirmed = window.confirm(
      `Delete "${host.hostName}"? This will remove the host and its related queue data.`,
    );

    if (!confirmed) return;

    setDeletingHostId(host.id);
    setHostError(null);

    try {
      await api.delete(`/api/community/${id}/host/${host.id}`);
      setCommunityHosts((currentHosts) =>
        currentHosts.filter((currentHost) => currentHost.id !== host.id),
      );
    } catch (error) {
      setHostError("Unable to delete host.");

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error("Delete host api failed", error);
    } finally {
      setDeletingHostId(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-gray-200 bg-white px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 overflow-hidden rounded-2xl border border-gray-200">
              <img
                src={community?.profileUrl}
                alt={community?.communityName}
                className="h-full w-full object-cover"
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-text">
                  {community?.communityName}
                </h1>

                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  Badminton
                </span>
              </div>

              <p className="mt-1 text-sm text-gray-500">
                Hosted by{" "}
                <span className="font-medium text-text">
                  {community?.master.username}
                </span>
              </p>
            </div>
          </div>

          <div className="w-fit rounded-full bg-green-50 px-4 py-2 text-sm font-medium text-green-600">
            Active
          </div>
        </div>
      </header>

      <section className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
        <form
          onSubmit={handleCreateHost}
          className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
        >
          <label>
            <span className="mb-2 block text-sm font-medium text-text">
              Name
            </span>
            <input
              type="text"
              name="hostName"
              value={hostForm.hostName}
              onChange={handleHostFormChange}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-medium text-text">
              Sport
            </span>
            <select
              name="sportName"
              value={hostForm.sportName}
              onChange={handleHostFormChange}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            >
              {DEFAULT_SPORT_OPTIONS.map((sportOption) => (
                <option key={sportOption} value={sportOption}>
                  {sportOption.charAt(0).toUpperCase() + sportOption.slice(1)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-medium text-text">
              Location
            </span>
            <input
              type="text"
              name="location"
              value={hostForm.location}
              onChange={handleHostFormChange}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-medium text-text">
              Starts at
            </span>
            <input
              type="datetime-local"
              name="startTime"
              value={hostForm.startTime}
              onChange={handleHostFormChange}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-medium text-text">
              Ends at
            </span>
            <input
              type="datetime-local"
              name="endTime"
              value={hostForm.endTime}
              onChange={handleHostFormChange}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-medium text-text">
              Max players
            </span>
            <input
              type="number"
              name="maxPlayers"
              min="0"
              value={hostForm.maxPlayers}
              onChange={handleHostFormChange}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </label>

          <button
            type="submit"
            disabled={isCreatingHost}
            className={`
              h-[46px] w-full rounded-xl px-5 py-3 text-sm font-semibold transition
              ${
                isCreatingHost
                  ? "cursor-not-allowed bg-gray-100 text-gray-400"
                  : "bg-primary text-white hover:bg-accent"
              }
            `}
          >
            {isCreatingHost ? "Hosting..." : "Host"}
          </button>
        </form>

        {hostError ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {hostError}
          </p>
        ) : null}

        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <div>
              <h3 className="text-lg font-semibold text-text">Active Hosts</h3>
              <p className="text-sm text-gray-500">Manage match queues</p>
            </div>

            <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              {communityHosts.length}
            </div>
          </div>

          {/* DESKTOP TABLE (>=1024px) */}
          <div className="hidden lg:block overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                    Host
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                    Sport
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                    Location
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                    Schedule
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                    Players
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                    Capacity
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                    Status
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {communityHosts.map((communityHost) => (
                  <tr
                    key={communityHost.id}
                    onClick={() =>
                      navigate(`/community/${id}/hosts/${communityHost.id}`)
                    }
                    className="cursor-pointer transition hover:bg-gray-50"
                  >
                    <td className="px-5 py-4 font-medium text-text">
                      {communityHost.hostName}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        {communityHost.sport}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {communityHost.location?.trim() || "TBD"}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      <div className="min-w-[180px]">
                        <p>{formatHostDateTime(communityHost.startTime)}</p>
                        <p className="text-xs text-gray-400">
                          Ends {formatHostDateTime(communityHost.endTime)}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {communityHost._count.players}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {communityHost.maxPlayers > 0
                        ? `${communityHost.maxPlayers} players`
                        : "Open"}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          communityHost.status === "available"
                            ? "bg-green-50 text-green-600"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        {communityHost.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      <button
                        type="button"
                        onClick={(event) =>
                          void handleDeleteHost(event, communityHost)
                        }
                        disabled={deletingHostId === communityHost.id}
                        className="w-fit rounded-full p-1 text-gray-500 transition hover:bg-red-400 hover:text-stone-200 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                        aria-label={`Delete ${communityHost.hostName}`}
                      >
                        <Trash size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE / TABLET CARDS (<1024px) */}
          <div className="grid gap-3 p-4 lg:hidden">
            {communityHosts.map((communityHost) => (
              <div
                key={communityHost.id}
                onClick={() =>
                  navigate(`/community/${id}/hosts/${communityHost.id}`)
                }
                className="cursor-pointer rounded-2xl border border-gray-200 bg-white p-4 transition hover:bg-gray-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="w-full">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-x-3">
                        <p className="font-medium text-text">
                          {communityHost.hostName}
                        </p>
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-primary text-[12px]">
                          {communityHost.sport}
                        </span>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          communityHost.status === "available"
                            ? "bg-green-50 text-green-600"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        {communityHost.status}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-gray-600">
                      Location:{" "}
                      <span className="font-medium">
                        {communityHost.location?.trim() || "TBD"}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                  <span>{communityHost._count.players} players joined</span>
                  <span>
                    {communityHost.maxPlayers > 0
                      ? `${communityHost.maxPlayers} players`
                      : "Open"}
                  </span>
                </div>

                <div className="mt-2 text-xs text-gray-600">
                  <p>
                    Starts:{" "}
                    <span className="font-medium">
                      {formatHostDateTime(communityHost.startTime)}
                    </span>
                  </p>
                  <p>
                    Ends:{" "}
                    <span className="font-medium">
                      {formatHostDateTime(communityHost.endTime)}
                    </span>
                  </p>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={(event) =>
                      void handleDeleteHost(event, communityHost)
                    }
                    disabled={deletingHostId === communityHost.id}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={`Delete ${communityHost.hostName}`}
                  >
                    <Trash size={16} />
                    {deletingHostId === communityHost.id
                      ? "Deleting..."
                      : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* EMPTY STATE */}
          {communityHosts.length === 0 && (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="text-4xl">Host</div>
              <h3 className="mt-4 text-lg font-semibold text-text">
                No hosts yet
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Create your first match host.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
