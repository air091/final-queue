import { NavLink, useParams } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa6";
import { MdSpaceDashboard } from "react-icons/md";
import { HiUsers } from "react-icons/hi2";
import { GiMatchHead } from "react-icons/gi";
import { MdOutlinePayment } from "react-icons/md";

export default function Sidebar() {
  const { communityId, hostId } = useParams();
  return (
    <nav className="w-[220px] rounded-2xl bg-white p-2 shadow-sm">
      <ul className="grid gap-1">
        {/* Back */}
        <li className="mb-2">
          <NavLink
            to={`/community/${communityId}`}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
          >
            <FaArrowLeft size={16} />
            Back to Community
          </NavLink>
        </li>

        <div className="my-2 border-t border-stone-100" />

        {/* Dashboard */}
        <li>
          <NavLink
            to={`/community/${communityId}/hosts/${hostId}/dashboard`}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-stone-900 text-white shadow-sm"
                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
              }`
            }
          >
            <MdSpaceDashboard size={18} />
            Dashboard
          </NavLink>
        </li>

        {/* Players */}
        <li>
          <NavLink
            to={`/community/${communityId}/hosts/${hostId}/players`}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-stone-900 text-white shadow-sm"
                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
              }`
            }
          >
            <HiUsers size={18} />
            Players
          </NavLink>
        </li>

        {/* Match */}
        <li>
          <NavLink
            to={`/community/${communityId}/hosts/${hostId}/match`}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-stone-900 text-white shadow-sm"
                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
              }`
            }
          >
            <GiMatchHead size={18} />
            Match
          </NavLink>
        </li>

        {/* Payments */}
        <li>
          <NavLink
            to={`/community/${communityId}/hosts/${hostId}/payments`}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-stone-900 text-white shadow-sm"
                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
              }`
            }
          >
            <MdOutlinePayment size={18} />
            Payments
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}
