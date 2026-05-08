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
    <div className="flex h-screen w-full flex-col">
      {/* HEADER */}
      <header className="flex items-center gap-4 bg-white px-6 py-4">
        <div className="h-16 w-16 overflow-hidden rounded-full border border-stone-200 bg-stone-100">
          <img
            src={community?.profileUrl}
            alt={community?.communityName}
            className="h-full w-full object-cover"
          />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-stone-800">
            {community?.communityName}
          </h1>

          <div className="mt-1 flex items-center gap-2">
            <div className="h-5 w-5 overflow-hidden rounded-full border border-stone-200">
              <img
                src={community?.master.profileUrl}
                alt={community?.master.username}
                className="h-full w-full object-cover"
              />
            </div>

            <span className="text-sm font-medium text-stone-500">
              {community?.master.username}
            </span>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <section className="flex flex-1 flex-col gap-6 overflow-hidden px-6 pb-5 pt-0">
        {/* CREATE HOST */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-stone-800">
              Create host
            </h3>
            <p className="text-sm text-stone-500">
              Pick a sport and a new host will be added to this community.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-sm">
              <span className="text-stone-600">Sport</span>

              <select
                name="sport"
                value={sportName}
                onChange={(event) => setSportName(event.target.value)}
                className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-stone-300 focus:ring-2 focus:ring-stone-100"
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
            rounded-xl px-4 py-2 text-sm font-medium transition
            ${
              isCreatingHost
                ? "cursor-not-allowed bg-stone-200 text-stone-400"
                : "bg-stone-900 text-white hover:bg-stone-800"
            }
          `}
            >
              {isCreatingHost ? "Creating..." : "Create host"}
            </button>
          </div>

          {hostError && (
            <p className="mt-3 text-sm text-red-500">{hostError}</p>
          )}
        </div>

        {/* TABLE */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          {/* TABLE HEADER */}
          <div className="shrink-0 border-b border-stone-100 px-5 py-3">
            <h3 className="text-lg font-semibold text-stone-800">Hosts</h3>
          </div>

          {/* TABLE BODY (SCROLL FIX) */}
          <div className="min-h-0 flex-1 overflow-auto">
            {communityHosts.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-stone-50 text-stone-500">
                  <tr>
                    <th className="px-5 py-3 text-left font-medium">Name</th>
                    <th className="px-5 py-3 text-left font-medium">Sport</th>
                    <th className="px-5 py-3 text-left font-medium">Status</th>
                    <th className="px-5 py-3 text-left font-medium">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-stone-100">
                  {communityHosts.map((communityHost) => (
                    <tr
                      key={communityHost.id}
                      onClick={() =>
                        navigate(`/community/${id}/hosts/${communityHost.id}`)
                      }
                      className="cursor-pointer transition hover:bg-stone-50"
                    >
                      <td className="px-5 py-3 font-medium text-stone-800">
                        {communityHost.hostName}
                      </td>

                      <td className="px-5 py-3 text-stone-600">
                        {communityHost.sport}
                      </td>

                      <td className="px-5 py-3">
                        <span
                          className={`
                        inline-flex items-center rounded-full px-2 py-1 text-xs font-medium
                        ${
                          communityHost.status === "available"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }
                      `}
                        >
                          {communityHost.status}
                        </span>
                      </td>

                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3 text-stone-500">
                          <HiPencilAlt className="h-5 w-5 cursor-pointer hover:text-sky-600" />
                          <IoMdTrash className="h-5 w-5 cursor-pointer hover:text-red-600" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-sm text-stone-500">No hosts yet</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
