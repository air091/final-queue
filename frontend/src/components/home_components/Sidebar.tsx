import axios from "axios";
import { NavLink } from "react-router-dom";
import { api } from "../../lib/api";
import { RiHome9Fill } from "react-icons/ri";
import { FaGamepad } from "react-icons/fa6";
import { RiUserCommunityLine } from "react-icons/ri";

export default function Sidebar() {
  const navLinks = [
    {
      icon: <RiHome9Fill size={16} />,
      path: "/home",
      name: "Home",
    },
    {
      icon: <FaGamepad size={16} />,
      path: "/find/match",
      name: "Find Match",
    },
    {
      icon: <RiUserCommunityLine size={16} />,
      path: "/community",
      name: "Community",
    },
  ];

  const logout = async () => {
    try {
      await api.post("/api/auth/logout", {});
      console.log("Logged out");
    } catch (error) {
      if (axios.isAxiosError(error)) console.error(error);
      else console.error(error);
    }
  };

  return (
    <nav className="w-[220px] rounded-2xl bg-white p-2 shadow-sm">
      <ul className="grid gap-1">
        {navLinks.map((link) => (
          <li key={link.name}>
            <NavLink
              to={link.path}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-stone-900 text-white shadow-sm"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                }`
              }
            >
              {link.icon}
              {link.name}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
