import { NavLink, useParams } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa6";
import { MdSpaceDashboard } from "react-icons/md";
import { HiUsers } from "react-icons/hi2";
import { GiMatchHead } from "react-icons/gi";
import { MdOutlinePayment } from "react-icons/md";
import {
  ArrowLeft,
  CreditCard,
  Gamepad2,
  LayoutDashboard,
  Plus,
} from "lucide-react";

export default function Sidebar() {
  const { communityId, hostId } = useParams();
  return (
    <nav className="w-[274px] h-full py-2 pr-2">
      {/* NAVIGATION */}
      <ul className="flex w-full md:grid md:gap-2">
        {/* BACK */}
        <li>
          <NavLink
            to={`/community/${communityId}`}
            className="
              w-full
              flex items-center justify-center
              rounded-r-lg px-6 py-1 gap-x-2
              text-sm font-medium transition hover:bg-gray-100
              md:justify-start"
          >
            <div className="flex p-1 items-center justify-center rounded-xl transition">
              <ArrowLeft size={24} />
            </div>
            <span className="hidden lg:block">Back to Community</span>
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
            icon: <HiUsers size={24} />,
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
              flex items-center justify-center
              rounded-r-lg px-6 py-1 gap-x-2
              text-sm font-medium transition

            md:justify-start

            ${
              isActive
                ? "bg-primary/10 text-primary"
                : "text-text hover:bg-gray-100"
            }
          `
              }
            >
              <div className="flex p-1 items-center justify-center rounded-xl transition  text-primary">
                {item.icon}
              </div>
              <span className="hidden lg:block">{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
