import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";

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
  status: string;
};

const DEFAULT_SPORT_OPTIONS = ["badminton"];

export default function Community() {
  const { id } = useParams();
  const [community, setCommunity] = useState<CommunityType | null>(null);
  const [communityHosts, setCommunityHosts] = useState<HostsType[]>([]);
  const [sportName, setSportName] = useState(DEFAULT_SPORT_OPTIONS[0]);
  const [isCreatingHost, setIsCreatingHost] = useState(false);
  const [hostError, setHostError] = useState<string | null>(null);
  const navigate = useNavigate();
  // community info
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

  // hosts info
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

  const handleCreateHost = async () => {
    if (!id || !sportName.trim()) return;

    setIsCreatingHost(true);
    setHostError(null);

    try {
      const response = await api.post(`/api/community/${id}/host`, {
        sportName,
      });

      const newHost = response.data.data as HostsType;
      setCommunityHosts((currentHosts) => [...currentHosts, newHost]);
    } catch (error) {
      setHostError("Unable to create host.");

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error("Create host api failed", error);
    } finally {
      setIsCreatingHost(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Left */}
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
                  🏸 Badminton
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

          {/* Status */}
          <div className="w-fit rounded-full bg-green-50 px-4 py-2 text-sm font-medium text-green-600">
            Active
          </div>
        </div>
      </header>

      {/* Main */}
      <section className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
        {/* Create Host */}
        <div className="rounded-3xl border border-gray-200 bg-white p-5">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-text">
              Create Match Host
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Start a badminton queue session.
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <label className="flex-1">
              <span className="mb-2 block text-sm font-medium text-text">
                Sport
              </span>

              <select
                name="sport"
                value={sportName}
                onChange={(event) => setSportName(event.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              >
                {DEFAULT_SPORT_OPTIONS.map((sportOption) => (
                  <option key={sportOption} value={sportOption}>
                    {sportOption.charAt(0).toUpperCase() + sportOption.slice(1)}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => void handleCreateHost()}
              disabled={isCreatingHost}
              className={`
              rounded-xl px-5 py-3 text-sm font-semibold transition

              ${
                isCreatingHost
                  ? "cursor-not-allowed bg-gray-100 text-gray-400"
                  : "bg-primary text-white hover:bg-accent"
              }
            `}
            >
              {isCreatingHost ? "Hosting..." : "Host"}
            </button>
          </div>

          {hostError && (
            <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {hostError}
            </div>
          )}
        </div>

        {/* Hosts */}
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <div>
              <h3 className="text-lg font-semibold text-text">Active Hosts</h3>

              <p className="text-sm text-gray-500">Manage match queues</p>
            </div>

            <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              {communityHosts.length}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-auto">
            {communityHosts.length > 0 ? (
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
                      Status
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
                      <td className="px-5 py-4">
                        <p className="font-medium text-text">
                          {communityHost.hostName}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                          🏸 {communityHost.sport}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`
                          rounded-full px-3 py-1 text-xs font-medium
                          ${
                            communityHost.status === "available"
                              ? "bg-green-50 text-green-600"
                              : "bg-red-50 text-red-600"
                          }
                        `}
                        >
                          {communityHost.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="text-4xl">🏸</div>

                <h3 className="mt-4 text-lg font-semibold text-text">
                  No hosts yet
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  Create your first match host.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Left */}
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
                  🏸 Badminton
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

          {/* Status */}
          <div className="w-fit rounded-full bg-green-50 px-4 py-2 text-sm font-medium text-green-600">
            Active
          </div>
        </div>
      </header>

      {/* Main */}
      <section className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
        {/* Create Host */}
        <div className="rounded-3xl border border-gray-200 bg-white p-5">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-text">
              Create Match Host
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Start a badminton queue session.
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <label className="flex-1">
              <span className="mb-2 block text-sm font-medium text-text">
                Sport
              </span>

              <select
                name="sport"
                value={sportName}
                onChange={(event) => setSportName(event.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              >
                {DEFAULT_SPORT_OPTIONS.map((sportOption) => (
                  <option key={sportOption} value={sportOption}>
                    {sportOption.charAt(0).toUpperCase() + sportOption.slice(1)}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => void handleCreateHost()}
              disabled={isCreatingHost}
              className={`
              rounded-xl px-5 py-3 text-sm font-semibold transition

              ${
                isCreatingHost
                  ? "cursor-not-allowed bg-gray-100 text-gray-400"
                  : "bg-primary text-white hover:bg-accent"
              }
            `}
            >
              {isCreatingHost ? "Hosting..." : "Host"}
            </button>
          </div>

          {hostError && (
            <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {hostError}
            </div>
          )}
        </div>

        {/* Hosts */}
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <div>
              <h3 className="text-lg font-semibold text-text">Active Hosts</h3>

              <p className="text-sm text-gray-500">Manage match queues</p>
            </div>

            <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              {communityHosts.length}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-auto">
            {communityHosts.length > 0 ? (
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
                      Status
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
                      <td className="px-5 py-4">
                        <p className="font-medium text-text">
                          {communityHost.hostName}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                          🏸 {communityHost.sport}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`
                          rounded-full px-3 py-1 text-xs font-medium
                          ${
                            communityHost.status === "available"
                              ? "bg-green-50 text-green-600"
                              : "bg-red-50 text-red-600"
                          }
                        `}
                        >
                          {communityHost.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="text-4xl">🏸</div>

                <h3 className="mt-4 text-lg font-semibold text-text">
                  No hosts yet
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  Create your first match host.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
