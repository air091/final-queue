import { NavLink, useParams } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa6";
import { MdSpaceDashboard } from "react-icons/md";
import { HiUsers } from "react-icons/hi2";
import { GiMatchHead } from "react-icons/gi";
import { MdOutlinePayment } from "react-icons/md";

export default function Sidebar() {
  const { communityId, hostId } = useParams();
  return (
    <nav className="w-[240px] rounded-3xl border border-orange-100 bg-white p-3 shadow-sm my-2">
      <ul className="grid gap-2">
        {/* BACK */}
        <li className="mb-1">
          <NavLink
            to={`/community/${communityId}`}
            className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-[#0c090c] transition-colors duration-200 hover:bg-[#fff7e8]"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#fff4df] text-[#ff6900]">
              <FaArrowLeft size={14} />
            </div>

            <span>Back to Community</span>
          </NavLink>
        </li>

        {/* DIVIDER */}
        <div className="my-1 border-t border-orange-100" />

        {/* DASHBOARD */}
        <li>
          <NavLink
            to={`/community/${communityId}/hosts/${hostId}/dashboard`}
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
                  <MdSpaceDashboard size={16} />
                </div>

                <span>Dashboard</span>
              </>
            )}
          </NavLink>
        </li>

        {/* PLAYERS */}
        <li>
          <NavLink
            to={`/community/${communityId}/hosts/${hostId}/players`}
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
                  <HiUsers size={16} />
                </div>

                <span>Players</span>
              </>
            )}
          </NavLink>
        </li>

        {/* MATCH */}
        <li>
          <NavLink
            to={`/community/${communityId}/hosts/${hostId}/match`}
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
                  <GiMatchHead size={16} />
                </div>

                <span>Match</span>
              </>
            )}
          </NavLink>
        </li>

        {/* PAYMENTS */}
        <li>
          <NavLink
            to={`/community/${communityId}/hosts/${hostId}/payments`}
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
                  <MdOutlinePayment size={16} />
                </div>

                <span>Payments</span>
              </>
            )}
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}
