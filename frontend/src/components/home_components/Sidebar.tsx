// import axios from "axios";
import { NavLink } from "react-router-dom";
// import { api } from "../../lib/api";
import { RiHome9Fill } from "react-icons/ri";
import { RiUserCommunityLine } from "react-icons/ri";
import { useAuth } from "../../hooks/useAuth";

export default function Sidebar() {
  const { user, isLoading, logout } = useAuth();
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

  return (
    <nav className="w-[240px] rounded-3xl border border-orange-100 bg-white p-3 shadow-sm flex flex-col justify-between">
      {/* HEADER */}

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
      <ul>
        <li>
          <div className="flex items-center gap-3 px-3 py-2.5 transition-all duration-200 hover:bg-[#fff4df] text-[#0c090c] rounded-2xl cursor-pointer">
            <div className="w-8 h-8 rounded-xl border ">
              <img
                src={user?.profileUrl}
                alt={user?.username}
                className="block object-cover object-center w-full h-full rounded-xl"
              />
            </div>
            <div>
              <span className="block text-sm font-medium">
                {user?.username}
              </span>
            </div>
          </div>
        </li>
      </ul>
    </nav>
  );
}
