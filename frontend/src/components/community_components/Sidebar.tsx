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
    <nav className="w-[260px] rounded-3xl border border-orange-100 bg-white/95 p-3 shadow-[0_10px_40px_rgba(253,154,0,0.08)] backdrop-blur">
      <ul className="grid gap-2">
        {/* BACK BUTTON */}
        <li className="mb-1">
          <NavLink
            to="/home"
            className="group flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-sm font-semibold text-[#0c090c] transition-all duration-200 hover:border-[#ffd230]/50 hover:bg-[#fff7e8]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff1d6] text-[#ff6900] transition group-hover:scale-105 group-hover:bg-[#fd9a00] group-hover:text-white">
              <FaArrowLeft size={15} />
            </div>

            <span>Back to Home</span>
          </NavLink>
        </li>

        {/* DIVIDER */}
        <div className="my-1 border-t border-orange-100" />

        {/* CREATE COMMUNITY */}
        <li>
          <NavLink
            to="/community/create"
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? "bg-gradient-to-r from-[#fd9a00] to-[#ff6900] text-white shadow-lg shadow-orange-200"
                  : "text-[#0c090c] hover:bg-[#fff7e8]"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-[#fff1d6] text-[#ff6900]"
                  }`}
                >
                  🏸
                </div>

                <span>Create Community</span>
              </>
            )}
          </NavLink>
        </li>

        {/* COMMUNITIES */}
        {communities.length > 0 ? (
          communities.map((community) => (
            <li key={community.id}>
              <NavLink
                to={`/community/${community.id}`}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-2xl px-3 py-3 transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-[#fd9a00] to-[#ff6900] text-white shadow-lg shadow-orange-200"
                      : "text-[#0c090c] hover:bg-[#fff7e8]"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {/* COMMUNITY IMAGE */}
                    <div
                      className={`relative h-8 w-8 overflow-hidden rounded-2xl border transition ${
                        isActive
                          ? "border-white/20"
                          : "border-orange-100 bg-[#fff7e8]"
                      }`}
                    >
                      <img
                        src={community.profileUrl}
                        alt={community.communityName}
                        className="block h-full w-full object-cover"
                      />

                      {/* ACTIVE GLOW */}
                      {isActive && (
                        <div className="absolute inset-0 bg-white/10" />
                      )}
                    </div>

                    {/* INFO */}
                    <div className="flex flex-1 flex-col overflow-hidden">
                      <span className="truncate text-sm font-semibold">
                        {community.communityName}
                      </span>
                    </div>

                    {/* ACTIVE INDICATOR */}
                    {isActive && (
                      <div className="h-2.5 w-2.5 rounded-full bg-[#ffd230]" />
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-orange-200 bg-[#fffaf0] px-4 py-8 text-center">
            <div className="mb-3 text-4xl">🏸</div>

            <p className="text-sm font-medium text-[#0c090c]">
              No communities yet
            </p>

            <p className="mt-1 text-xs text-stone-500">
              Create your first badminton community.
            </p>
          </div>
        )}
      </ul>
    </nav>
  );
}
