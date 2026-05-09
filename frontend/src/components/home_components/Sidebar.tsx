// import axios from "axios";
import { NavLink } from "react-router-dom";
// import { api } from "../../lib/api";
import { RiHome9Fill } from "react-icons/ri";
import { RiUserCommunityLine } from "react-icons/ri";
import ProfileBar from "../ProfileBar";

const navLinks = [
  {
    icon: <RiHome9Fill size={16} />,
    path: "/home",
    name: "Home",
  },
  {
    icon: <RiUserCommunityLine size={16} />,
    path: "/community",
    name: "Community",
  },
];

export default function Sidebar() {
  return (
    <nav className="flex w-[240px] flex-col justify-between rounded-3xl border border-orange-100 bg-white p-3 shadow-sm">
      {/* NAVIGATION */}
      <ul className="grid gap-2">
        <div className="mb-4 px-3 pt-2">
          <h2 className="text-lg font-bold text-[#0c090c]">SportQueue</h2>

          <p className="text-xs text-stone-500">Badminton Queue Management</p>
        </div>

        {navLinks.map((link) => (
          <li key={link.name}>
            <NavLink
              to={link.path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-[#fff4df] text-[#ff6900]"
                    : "text-[#0c090c] hover:bg-[#fff7e8]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* ICON */}
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                      isActive
                        ? "bg-[#fd9a00] text-white"
                        : "bg-[#fff4df] text-[#ff6900]"
                    }`}
                  >
                    {link.icon}
                  </div>

                  {/* LABEL */}
                  <span>{link.name}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
      <ProfileBar />
    </nav>
  );
}
