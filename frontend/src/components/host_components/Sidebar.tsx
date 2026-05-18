import { NavLink, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CreditCard,
  Gamepad2,
  LayoutDashboard,
  UsersRound,
} from "lucide-react";

export default function Sidebar() {
  const { communityId, hostId } = useParams();
  return (
    <nav
      className=" h-full w-[274px] bg-white py-2 z-999 max-xl:z-999 xl:relative max-xl:absolute max-xl:left-0 max-xl:top-0 max-xl:z-50
  "
    >
      {/* NAVIGATION */}
      <ul className="flex flex-col w-full gap-2">
        {/* BACK */}
        <li>
          <NavLink
            to={`/community/${communityId}`}
            className="
              w-full
              flex items-center
              rounded-r-lg px-6 py-1 gap-x-2
              text-sm font-medium transition hover:bg-gray-100
              "
          >
            <div className="flex p-1 items-center rounded-xl transition">
              <ArrowLeft size={24} />
            </div>
            <span className="block">Back to Community</span>
          </NavLink>
        </li>

        {[
          {
            path: `/community/${communityId}/hosts/${hostId}/dashboard`,
            label: "Dashboard",
            icon: <LayoutDashboard size={24} />,
          },
          {
            path: `/community/${communityId}/hosts/${hostId}/players`,
            label: "Players",
            icon: <UsersRound size={24} />,
          },
          {
            path: `/community/${communityId}/hosts/${hostId}/match`,
            label: "Match",
            icon: <Gamepad2 size={24} />,
          },
          {
            path: `/community/${communityId}/hosts/${hostId}/payments`,
            label: "Payments",
            icon: <CreditCard size={24} />,
          },
        ].map((item) => (
          <li key={item.label}>
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                `
              w-full
              flex items-center
              rounded-r-lg px-6 py-1 gap-x-2
              text-sm font-medium transition
            ${
              isActive
                ? "bg-primary/10 text-primary"
                : "text-text hover:bg-gray-100"
            }
          `
              }
            >
              <div className="flex p-1 items-center rounded-xl transition  text-primary">
                {item.icon}
              </div>
              <span className="block">{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
