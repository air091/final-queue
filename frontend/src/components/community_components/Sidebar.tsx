import axios from "axios";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { api } from "../../lib/api";
import { FaArrowLeft } from "react-icons/fa6";

type CommunitiesType = {
  id: string;
  profileUrl: string;
  communityName: string;
  description: string;
};

export default function Sidebar() {
  const [communities, setCommunities] = useState<CommunitiesType[]>([]);

  const getCommunities = async () => {
    try {
      const response = await api.get("/api/community");
      setCommunities(response.data.communities);
    } catch (error) {
      if (axios.isAxiosError(error))
        console.error(error.response?.data?.message);
      else console.error("Login api failed:", error);
    }
  };

  useEffect(() => {
    getCommunities();
  }, []);

  return (
    <nav className="w-[220px] rounded-2xl bg-white p-2 shadow-sm">
      <ul className="grid gap-1">
        <li className="mb-2">
          <NavLink
            to="/home"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
          >
            <FaArrowLeft size={16} />
            Back to Home
          </NavLink>
        </li>

        <div className="my-2 border-t border-stone-100" />

        <li>
          <NavLink
            to="/community/create"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-stone-900 text-white shadow-sm"
                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
              }`
            }
          >
            Create community
          </NavLink>
        </li>
        {communities.length > 0 ? (
          communities.map((community) => (
            <li key={community.id}>
              <NavLink
                to={`/community/${community.id}`}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-stone-900 text-white shadow-sm"
                      : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                  }`
                }
              >
                <div className="border w-8 h-8 rounded-full">
                  <img
                    src={community.profileUrl}
                    alt={community.communityName}
                    className="block w-full h-full object-contain -z-10 rounded-full"
                  />
                </div>
                <span>{community.communityName}</span>
              </NavLink>
            </li>
          ))
        ) : (
          <p>No communities</p>
        )}
      </ul>
    </nav>
  );
}
