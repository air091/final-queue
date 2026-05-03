import { NavLink, useParams } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa6";
import { MdSpaceDashboard } from "react-icons/md";
import { HiUsers } from "react-icons/hi2";
import { GiMatchHead } from "react-icons/gi";
import { MdOutlinePayment } from "react-icons/md";

export default function Sidebar() {
  const { communityId, hostId } = useParams();
  return (
    <nav className="w-fit">
      <ul>
        <li>
          <NavLink
            to={`/community/${communityId}`}
            className={`flex items-center gap-x-[10px] px-[10px] y-[6px] rounded-md hover:bg-amber-200`}
          >
            <FaArrowLeft size={18} />
            Back to Community
          </NavLink>
        </li>
        <li>
          <NavLink
            to={`/community/${communityId}/hosts/${hostId}/dashboard`}
            className={({ isActive }) =>
              `flex items-center gap-x-3 py-1 px-3 rounded-md
                    ${isActive ? "bg-amber-300 font-semibold" : "hover:bg-amber-200"}`
            }
          >
            <MdSpaceDashboard size={18} />
            Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink
            to={`/community/${communityId}/hosts/${hostId}/players`}
            className={({ isActive }) =>
              `flex items-center gap-x-3 py-1 px-3 rounded-md
                    ${isActive ? "bg-amber-300 font-semibold" : "hover:bg-amber-200"}`
            }
          >
            <HiUsers size={18} />
            Players
          </NavLink>
        </li>
        <li>
          <NavLink
            to={`/community/${communityId}/hosts/${hostId}/match`}
            className={({ isActive }) =>
              `flex items-center gap-x-3 py-1 px-3 rounded-md
                    ${isActive ? "bg-amber-300 font-semibold" : "hover:bg-amber-200"}`
            }
          >
            <GiMatchHead size={18} />
            Match
          </NavLink>
        </li>
        <li>
          <NavLink
            to={`/community/${communityId}/hosts/${hostId}/payments`}
            className={({ isActive }) =>
              `flex items-center gap-x-3 py-1 px-3 rounded-md
                    ${isActive ? "bg-amber-300 font-semibold" : "hover:bg-amber-200"}`
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
