import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IoMdTrash } from "react-icons/io";
import { HiPencilAlt } from "react-icons/hi";

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

export default function Community() {
  const { id } = useParams();
  const [community, setCommunity] = useState<CommunityType | null>(null);
  const [communityHosts, setCommunityHosts] = useState<HostsType[]>([]);
  const navigate = useNavigate();
  // community info
  const getCommunityAPI = async () => {
    try {
      const response = await axios.get(
        `http://localhost:4000/api/community/${id}`,
        { withCredentials: true },
      );
      console.log(response);
      setCommunity(response.data.community);
    } catch (error) {
      if (axios.isAxiosError(error)) console.error(error);
      else console.error("Get community api failed", error);
    }
  };

  useEffect(() => {
    getCommunityAPI();
  }, []);

  // hosts info
  const getCommunityHostsAPI = async () => {
    try {
      const response = await axios.get(
        `http://localhost:4000/api/community/${id}/hosts/`,
        { withCredentials: true },
      );
      console.log(response);
      setCommunityHosts(response.data.hosts);
    } catch (error) {
      if (axios.isAxiosError(error)) console.error(error);
      else console.error("Get community hosts api failed", error);
    }
  };

  useEffect(() => {
    getCommunityHostsAPI();
  }, []);

  return (
    <div className="w-full">
      <header className="flex items-center gap-x-4 w-full px-4 py-2">
        <div>
          <div className="w-[64px] h-[64px] border rounded-full">
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
            <div className="w-[16px] h-[16px] border rounded-full">
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
                    navigate(`/community/${id}/host/${communityHost.id}`)
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
