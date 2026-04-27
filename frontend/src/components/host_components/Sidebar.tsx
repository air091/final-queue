import { NavLink, useParams } from "react-router-dom";
import { MdKeyboardArrowLeft } from "react-icons/md";

export default function Sidebar() {
  const { communityId, hostId } = useParams();
  return (
    <nav className="w-50">
      <ul>
        <li>
          <NavLink
            to={`/community/${communityId}`}
            className={`flex items-center gap-x-2 py-1 px-3 rounded-md hover:bg-amber-200`}
          >
            <MdKeyboardArrowLeft size={20} />
            Back to Community
          </NavLink>
        </li>
        <li>
          <NavLink
            to={`/community/${communityId}/hosts/${hostId}/dashboard`}
            className={({ isActive }) =>
              `flex items-center gap-x-3 py-1 px-3 rounded-md
                    ${isActive ? "bg-amber-300" : "hover:bg-amber-200"}`
            }
          >
            Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink
            to={`/community/${communityId}/hosts/${hostId}/players`}
            className={({ isActive }) =>
              `flex items-center gap-x-3 py-1 px-3 rounded-md
                    ${isActive ? "bg-amber-300" : "hover:bg-amber-200"}`
            }
          >
            Players
          </NavLink>
        </li>
        <li>
          <NavLink
            to={`/community/${communityId}/hosts/${hostId}/match`}
            className={({ isActive }) =>
              `flex items-center gap-x-3 py-1 px-3 rounded-md
                    ${isActive ? "bg-amber-300" : "hover:bg-amber-200"}`
            }
          >
            Match
          </NavLink>
        </li>
        <li>
          <NavLink
            to={`/community/${communityId}/hosts/${hostId}/payments`}
            className={({ isActive }) =>
              `flex items-center gap-x-3 py-1 px-3 rounded-md
                    ${isActive ? "bg-amber-300" : "hover:bg-amber-200"}`
            }
          >
            Payments
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}
