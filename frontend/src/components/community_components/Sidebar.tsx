import axios from "axios";
import { NavLink } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa6";
import ProfileBar from "../ProfileBar";
import { useCommunities } from "../../contexts/CommunitiesContext";

type CommunitiesType = {
  id: string;
  profileUrl: string;
  communityName: string;
  description: string;
};

export default function Sidebar() {
  const { communities, isLoading } = useCommunities();

  return (
    <nav className="flex w-[240px] flex-col justify-between w-[260px] rounded-3xl border border-orange-100 bg-white p-3 shadow-sm">
      <ul className="grid gap-2">
        {/* BACK BUTTON */}
        <li className="mb-1">
          <NavLink
            to="/home"
            className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-[#0c090c] transition-colors duration-200 hover:bg-[#fff7e8]"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#fff4df] text-[#ff6900]">
              <FaArrowLeft size={14} />
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
              `flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-[#fff4df] text-[#ff6900]"
                  : "text-[#0c090c] hover:bg-[#fff7e8]"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                    isActive
                      ? "bg-[#fd9a00] text-white"
                      : "bg-[#fff4df] text-[#ff6900]"
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
                  `flex items-center gap-3 rounded-2xl px-3 py-2 transition-all duration-200 ${
                    isActive
                      ? "bg-[#fff4df] text-[#ff6900]"
                      : "text-[#0c090c] hover:bg-[#fff7e8]"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {/* COMMUNITY IMAGE */}
                    <div
                      className={`h-9 w-9 overflow-hidden rounded-xl border ${
                        isActive ? "border-[#fd9a00]" : "border-orange-100"
                      }`}
                    >
                      <img
                        src={community.profileUrl}
                        alt={community.communityName}
                        className="block h-full w-full object-cover"
                      />
                    </div>

                    {/* INFO */}
                    <div className="flex flex-1 flex-col overflow-hidden">
                      <span className="truncate text-sm font-medium">
                        {community.communityName}
                      </span>
                    </div>
                  </>
                )}
              </NavLink>
            </li>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-orange-200 bg-[#fffaf0] px-4 py-8 text-center">
            <div className="mb-3 text-3xl">🏸</div>

            <p className="text-sm font-medium text-[#0c090c]">
              No communities yet
            </p>

            <p className="mt-1 text-xs text-stone-500">
              Create your first badminton community.
            </p>
          </div>
        )}
      </ul>
      <ProfileBar />
    </nav>
  );
}
