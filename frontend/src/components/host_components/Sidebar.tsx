import { NavLink, useParams } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa6";
import { MdSpaceDashboard } from "react-icons/md";
import { HiUsers } from "react-icons/hi2";
import { GiMatchHead } from "react-icons/gi";
import { MdOutlinePayment } from "react-icons/md";

export default function Sidebar() {
  const { communityId, hostId } = useParams();
  return (
    <nav className="w-full max-w-[220px]">
      <ul className="grid">
        <li>
          <NavLink
            to={`/community/${communityId}`}
            className={`flex items-center gap-x-[10px] px-[10px] py-[6px] rounded-sm hover:bg-secondary/40`}
          >
            <FaArrowLeft size={18} />
            Back to Community
          </NavLink>
        </li>
        <li>
          <NavLink
            to={`/community/${communityId}/hosts/${hostId}/dashboard`}
            className={({ isActive }) =>
              `flex items-center gap-x-[10px] px-[10px] py-[6px] rounded-sm
                    ${isActive ? "bg-accent text-background font-semibold" : "hover:bg-secondary/40"}`
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
              `flex items-center gap-x-[10px] px-[10px] py-[6px] rounded-sm
                    ${isActive ? "bg-accent text-background font-semibold" : "hover:bg-secondary/40"}`
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
              `flex items-center gap-x-[10px] px-[10px] py-[6px] rounded-sm
                    ${isActive ? "bg-accent text-background font-semibold" : "hover:bg-secondary/40"}`
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
              `flex items-center gap-x-[10px] px-[10px] py-[6px] rounded-sm
                    ${isActive ? "bg-accent text-background font-semibold" : "hover:bg-secondary/40"}`
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
