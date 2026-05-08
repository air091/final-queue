import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IoMdTrash } from "react-icons/io";
import { HiPencilAlt } from "react-icons/hi";
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
    <div className="flex h-screen w-full flex-col overflow-hidden ">
      {/* HEADER */}
      <header className="relative overflow-hidden border-b border-orange-100 bg-white px-6 py-5 shadow-sm">
        {/* Background Accent */}
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-primary)]/5 via-transparent to-[var(--color-accent)]/5" />

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* COMMUNITY IMAGE */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-[var(--color-primary)] blur-lg opacity-30" />

              <div className="relative h-18 w-18 overflow-hidden rounded-full border-4 border-[var(--color-secondary)] bg-stone-100 shadow-lg">
                <img
                  src={community?.profileUrl}
                  alt={community?.communityName}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            {/* INFO */}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black tracking-tight text-[var(--color-text)]">
                  {community?.communityName}
                </h1>

                <span className="rounded-full bg-[var(--color-secondary)]/30 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[var(--color-accent)]">
                  🏸 Badminton
                </span>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <div className="h-6 w-6 overflow-hidden rounded-full border border-orange-200 shadow-sm">
                  <img
                    src={community?.master.profileUrl}
                    alt={community?.master.username}
                    className="h-full w-full object-cover"
                  />
                </div>

                <span className="text-sm font-semibold text-stone-600">
                  Hosted by {community?.master.username}
                </span>
              </div>
            </div>
          </div>

          {/* STATUS CARD */}
          <div className="hidden rounded-2xl border border-orange-100 bg-orange-50 px-5 py-3 shadow-sm md:block">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-accent)]">
              Active Community
            </p>

            <p className="mt-1 text-sm font-bold text-[var(--color-text)]">
              Match Queue Open
            </p>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <section className="flex flex-1 flex-col gap-6 overflow-hidden px-6 py-6">
        {/* CREATE HOST */}
        <div className="relative overflow-hidden rounded-3xl border border-orange-100 bg-white p-6 shadow-lg">
          {/* Accent */}
          <div className="absolute top-0 left-0 h-full w-2 bg-gradient-to-b from-[var(--color-primary)] to-[var(--color-accent)]" />

          <div className="relative z-10">
            <div className="mb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-2xl text-white shadow-lg">
                  🏸
                </div>

                <div>
                  <h3 className="text-xl font-bold text-[var(--color-text)]">
                    Create Match Host
                  </h3>

                  <p className="text-sm text-stone-500">
                    Start a badminton queue and invite players to join.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-4">
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-stone-700">
                  Select sport
                </span>

                <select
                  name="sport"
                  value={sportName}
                  onChange={(event) => setSportName(event.target.value)}
                  className="rounded-2xl border border-orange-100 bg-[var(--color-background)] px-4 py-3 text-sm font-medium shadow-sm outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-secondary)]/40"
                >
                  {DEFAULT_SPORT_OPTIONS.map((sportOption) => (
                    <option key={sportOption} value={sportOption}>
                      {sportOption.charAt(0).toUpperCase() +
                        sportOption.slice(1)}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={() => void handleCreateHost()}
                disabled={isCreatingHost}
                className={`rounded-2xl px-6 py-3 text-sm font-bold transition-all duration-200 ${
                  isCreatingHost
                    ? "cursor-not-allowed bg-stone-200 text-stone-400"
                    : "bg-[var(--color-primary)] text-white shadow-lg cursor-pointer shadow-orange-200 hover:scale-[1.03] hover:bg-[var(--color-accent)] active:scale-[0.98]"
                }`}
              >
                {isCreatingHost ? "Creating..." : "Create host"}
              </button>
            </div>

            {hostError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                {hostError}
              </div>
            )}
          </div>
        </div>

        {/* HOST TABLE */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-lg">
          {/* HEADER */}
          <div className="flex items-center justify-between border-b border-orange-100 px-6 py-5">
            <div>
              <h3 className="text-xl font-bold text-[var(--color-text)]">
                Active Hosts
              </h3>

              <p className="mt-1 text-sm text-stone-500">
                Manage badminton hosts and player queues.
              </p>
            </div>

            <div className="rounded-full bg-orange-50 px-4 py-2 text-sm font-semibold text-[var(--color-accent)]">
              {communityHosts.length} Hosts
            </div>
          </div>

          {/* TABLE */}
          <div className="min-h-0 flex-1 overflow-auto">
            {communityHosts.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-orange-50/80 backdrop-blur">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-stone-500">
                      Match Host
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-stone-500">
                      Sport
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-stone-500">
                      Status
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-stone-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-orange-50">
                  {communityHosts.map((communityHost) => (
                    <tr
                      key={communityHost.id}
                      onClick={() =>
                        navigate(`/community/${id}/hosts/${communityHost.id}`)
                      }
                      className="group cursor-pointer transition-all duration-200 hover:bg-orange-50/40"
                    >
                      {/* HOST NAME */}
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-[var(--color-text)] transition group-hover:text-[var(--color-accent)]">
                            {communityHost.hostName}
                          </p>

                          <p className="mt-1 text-xs text-stone-500">
                            Badminton queue session
                          </p>
                        </div>
                      </td>

                      {/* SPORT */}
                      <td className="px-6 py-4">
                        <span className="rounded-full bg-[var(--color-secondary)]/30 px-3 py-1 text-xs font-bold text-[var(--color-accent)]">
                          🏸 {communityHost.sport}
                        </span>
                      </td>

                      {/* STATUS */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                            communityHost.status === "available"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          <span className="mr-1 text-sm">•</span>
                          {communityHost.status}
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="rounded-xl bg-sky-50 p-2 text-sky-600 transition hover:scale-110 hover:bg-sky-100"
                          >
                            <HiPencilAlt className="h-5 w-5" />
                          </button>

                          <button
                            type="button"
                            className="rounded-xl bg-red-50 p-2 text-red-600 transition hover:scale-110 hover:bg-red-100"
                          >
                            <IoMdTrash className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-10 text-center">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-orange-50 text-4xl">
                  🏸
                </div>

                <h3 className="text-lg font-bold text-[var(--color-text)]">
                  No hosts yet
                </h3>

                <p className="mt-2 max-w-sm text-sm text-stone-500">
                  Create your first badminton host and start organizing local
                  matches.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
