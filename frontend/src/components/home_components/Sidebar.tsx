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
      flex h-18 items-center justify-around
      border-t border-gray-200 bg-white px-2

      md:sticky md:top-4 md:h-[calc(100vh-2rem)]
      md:w-[88px] md:flex-col md:justify-between
      md:rounded-3xl md:border md:px-2 md:py-4

      lg:w-[220px]
    "
    >
      {/* Navigation */}
      <ul className="flex w-full md:grid md:gap-2">
        {/* Logo */}
        <div className="mb-4 hidden px-3 lg:block">
          <h2 className="text-lg font-bold text-text">SportQueue</h2>

          <p className="text-xs text-gray-500">Queue Management</p>
        </div>

        {navLinks.map((link) => (
          <li key={link.name}>
            <NavLink
              to={link.path}
              className={({ isActive }) =>
                `
              w-full
              flex items-center justify-center gap-3
              rounded-2xl px-3 py-3
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
              {({ isActive }) => (
                <>
                  {/* Icon */}
                  <div
                    className={`
                    flex h-9 w-9 items-center justify-center rounded-xl transition
                    ${
                      isActive
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-primary"
                    }
                  `}
                  >
                    {link.icon}
                  </div>

                  {/* Label */}
                  <span className="hidden lg:block">{link.name}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>

      {/* Profile */}
      <div className="flex items-center justify-center md:w-full">
        <ProfileBar />
      </div>
    </nav>
  );
}
