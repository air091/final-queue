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
    <nav
      className="
      fixed bottom-0 left-0 right-0 z-50
      flex h-20 items-center justify-around
      border-t border-orange-100 bg-white px-2 shadow-lg

      md:sticky md:top-4 md:h-[calc(100vh-2rem)]
      md:w-[90px] md:flex-col md:justify-between
      md:rounded-3xl md:border md:p-3

      lg:w-[240px]
    "
    >
      {/* NAVIGATION */}
      <ul className="flex w-full justify-around md:grid md:gap-2">
        {/* LOGO */}
        <div className="mb-4 hidden px-3 pt-2 lg:block">
          <h2 className="text-lg font-bold text-[#0c090c]">SportQueue</h2>

          <p className="text-xs text-stone-500">Badminton Queue Management</p>
        </div>

        {navLinks.map((link) => (
          <li key={link.name}>
            <NavLink
              to={link.path}
              className={({ isActive }) =>
                `
                flex items-center justify-center gap-3
                rounded-2xl px-3 py-2.5
                text-sm font-medium transition-all duration-200

                md:justify-start

                ${
                  isActive
                    ? "bg-[#fff4df] text-[#ff6900]"
                    : "text-[#0c090c] hover:bg-[#fff7e8]"
                }
              `
              }
            >
              {({ isActive }) => (
                <>
                  {/* ICON */}
                  <div
                    className={`
                    flex h-8 w-8 items-center justify-center
                    rounded-xl transition
                    ${
                      isActive
                        ? "bg-[#fd9a00] text-white"
                        : "bg-[#fff4df] text-[#ff6900]"
                    }
                  `}
                  >
                    {link.icon}
                  </div>

                  {/* LABEL */}
                  <span className="hidden lg:block">{link.name}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>

      {/* PROFILE */}
      <div className="block md:w-full">
        <ProfileBar />
      </div>
    </nav>
  );
}
