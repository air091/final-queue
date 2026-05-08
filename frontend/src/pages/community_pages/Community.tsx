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
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#fbfbf9]">
      {/* HEADER */}
      <header className="px-6 py-5">
        <div className="flex items-center justify-between">
          {/* LEFT */}
          <div className="flex items-center gap-4">
            {/* COMMUNITY IMAGE */}
            <div className="h-16 w-16 overflow-hidden rounded-2xl border border-orange-100 bg-[#fff7e8]">
              <img
                src={community?.profileUrl}
                alt={community?.communityName}
                className="h-full w-full object-cover"
              />
            </div>

            {/* INFO */}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-[#0c090c]">
                  {community?.communityName}
                </h1>

                <span className="rounded-full bg-[#fff4df] px-3 py-1 text-xs font-medium text-[#ff6900]">
                  🏸 Badminton
                </span>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <div className="h-5 w-5 overflow-hidden rounded-full border border-orange-100">
                  <img
                    src={community?.master.profileUrl}
                    alt={community?.master.username}
                    className="h-full w-full object-cover"
                  />
                </div>

                <span className="text-sm text-stone-500">
                  Hosted by {community?.master.username}
                </span>
              </div>
            </div>
          </div>

          {/* STATUS */}
          <div className="hidden rounded-2xl border border-orange-100 bg-[#fffaf2] px-4 py-2 md:block">
            <p className="text-xs font-medium text-[#ff6900]">
              Active Community
            </p>

            <p className="mt-1 text-sm font-semibold text-[#0c090c]">
              Match Queue Open
            </p>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <section className="flex flex-1 flex-col gap-5 overflow-hidden p-6">
        {/* CREATE HOST */}
        <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff4df] text-xl text-[#ff6900]">
              🏸
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[#0c090c]">
                Create Match Host
              </h3>

              <p className="text-sm text-stone-500">
                Start a badminton queue for your community.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-stone-600">Select sport</span>

              <select
                name="sport"
                value={sportName}
                onChange={(event) => setSportName(event.target.value)}
                className="rounded-2xl border border-orange-100 bg-[#fbfbf9] px-4 py-3 text-sm outline-none transition focus:border-[#fd9a00] focus:ring-4 focus:ring-[#ffd230]/30"
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
              className={`rounded-2xl px-5 py-3 text-sm font-medium transition-all duration-200 cursor-pointer ${
                isCreatingHost
                  ? "cursor-not-allowed bg-stone-200 text-stone-400"
                  : "bg-[#fd9a00] text-white hover:bg-[#ff6900]"
              }`}
            >
              {isCreatingHost ? "Creating..." : "Create host"}
            </button>
          </div>

          {hostError && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {hostError}
            </div>
          )}
        </div>

        {/* HOST TABLE */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-sm">
          {/* TABLE HEADER */}
          <div className="flex items-center justify-between border-b border-orange-100 px-6 py-5">
            <div>
              <h3 className="text-lg font-semibold text-[#0c090c]">
                Active Hosts
              </h3>

              <p className="mt-1 text-sm text-stone-500">
                Manage badminton hosts and queues.
              </p>
            </div>

            <div className="rounded-full bg-[#fff4df] px-4 py-2 text-sm font-medium text-[#ff6900]">
              {communityHosts.length} Hosts
            </div>
          </div>

          {/* TABLE */}
          <div className="min-h-0 flex-1 overflow-auto">
            {communityHosts.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-[#fffaf2]">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Match Host
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Sport
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Status
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
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
                      className="cursor-pointer transition hover:bg-[#fffaf2]"
                    >
                      {/* HOST NAME */}
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-[#0c090c]">
                            {communityHost.hostName}
                          </p>

                          <p className="mt-1 text-xs text-stone-500">
                            Badminton queue session
                          </p>
                        </div>
                      </td>

                      {/* SPORT */}
                      <td className="px-6 py-4">
                        <span className="rounded-full bg-[#fff4df] px-3 py-1 text-xs font-medium text-[#ff6900]">
                          🏸 {communityHost.sport}
                        </span>
                      </td>

                      {/* STATUS */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                            communityHost.status === "available"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {communityHost.status}
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded-xl bg-sky-50 p-2 text-sky-600 transition hover:bg-sky-100"
                          >
                            <HiPencilAlt className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            className="rounded-xl bg-red-50 p-2 text-red-600 transition hover:bg-red-100"
                          >
                            <IoMdTrash className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-10 text-center">
                <div className="mb-4 flex h-18 w-18 items-center justify-center rounded-full bg-[#fff4df] text-3xl">
                  🏸
                </div>

                <h3 className="text-lg font-semibold text-[#0c090c]">
                  No hosts yet
                </h3>

                <p className="mt-2 max-w-sm text-sm text-stone-500">
                  Create your first badminton host and start organizing matches.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
