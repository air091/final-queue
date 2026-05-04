import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IoMdTrash } from "react-icons/io";
import { HiPencilAlt } from "react-icons/hi";
import { api } from "../../lib/api";

type AdminType = {
  id: string;
  profileUrl: string;
  username: string;
};

type CommunityType = {
  id: string;
  profileUrl: string;
  communityName: string;
  description: string;
  admin: AdminType;
};

type HostsType = {
  id: string;
  hostName: string;
  sport: string;
  status: string;
};

const DEFAULT_SPORT_OPTIONS = ["Badminton"];

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
    <div className="w-full">
      <header className="flex items-center gap-x-4 w-full px-4 py-2">
        <div>
          <div className="w-16 h-16 border rounded-full">
            <img
              src={community?.profileUrl}
              alt={community?.communityName}
              className="block w-full h-full rounded-full object-contain"
            />
          </div>
        </div>
        <div>
          <span className="block font-bold text-[24px]">
            {community?.communityName}
          </span>
          <span className="flex items-center gap-x-1">
            <div className="w-4 h-4 border rounded-full">
              <img
                src={community?.admin.profileUrl}
                alt={community?.admin.username}
                className="block w-full h-full rounded-full object-contain"
              />
            </div>
            <span className="block font-semibold text-stone-400 text-[14px]">
              {community?.admin.username}
            </span>
          </span>
        </div>
      </header>
      <section className="w-full">
        <div className="mb-4 rounded-lg border border-stone-200 bg-white p-3">
          <div className="mb-2">
            <h3 className="font-semibold">Create host</h3>
            <p className="text-sm text-stone-500">
              Pick a sport and a new host will be added to this community.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="grid gap-1 text-sm">
              <span>Sport</span>
              <select
                name="sport"
                id="sport"
                value={sportName}
                onChange={(event) => setSportName(event.target.value)}
                className="rounded-md border px-3 py-2 text-sm"
              >
                {DEFAULT_SPORT_OPTIONS.map((sportOption) => (
                  <option key={sportOption} value={sportOption}>
                    {sportOption}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => void handleCreateHost()}
              disabled={isCreatingHost}
              className={`mt-5 rounded-md px-3 py-2 text-sm text-text border ${
                isCreatingHost
                  ? "cursor-not-allowed bg-stone-400"
                  : "cursor-pointer hover:bg-stone-400"
              }`}
            >
              {isCreatingHost ? "Creating..." : "Add host"}
            </button>
          </div>
          {hostError ? (
            <p className="mt-2 text-sm text-red-600">{hostError}</p>
          ) : null}
        </div>
        {communityHosts.length > 0 ? (
          <table className="border w-full table-auto border-collapse">
            <thead>
              <tr>
                <th className="text-start">Name</th>
                <th className="text-start">Sport</th>
                <th className="text-start">Status</th>
                <th className="text-start">Action</th>
              </tr>
            </thead>
            <tbody>
              {communityHosts.map((communityHost) => (
                <tr
                  key={communityHost.id}
                  onClick={() =>
                    navigate(`/community/${id}/hosts/${communityHost.id}`)
                  }
                  className="hover:bg-stone-300 cursor-pointer"
                >
                  <td>{communityHost.hostName}</td>
                  <td>{communityHost.sport}</td>
                  <td>
                    <span
                      className={`block w-fit px-2 py-0.5 rounded-md ${
                        communityHost.status == "available"
                          ? "bg-green-200 border border-green-500"
                          : "bg-rose-200 border border-rose-500"
                      }`}
                    >
                      {communityHost.status}
                    </span>
                  </td>
                  <td className="flex items-center gap-x-2">
                    <div>
                      <HiPencilAlt
                        size={20}
                        className="text-sky-500 hover:text-sky-700 cursor-pointer"
                      />
                    </div>
                    <div>
                      <IoMdTrash
                        size={20}
                        className="text-rose-500 hover:text-rose-700 cursor-pointer"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No host yet</p>
        )}
      </section>
    </div>
  );
}
