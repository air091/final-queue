import axios from "axios";
import { NavLink } from "react-router-dom";
import { api } from "../../lib/api";
import { RiHome9Fill } from "react-icons/ri";
import { RiUserCommunityLine } from "react-icons/ri";

export default function Sidebar() {
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
    <nav className="w-[240px] rounded-3xl border border-orange-100 bg-white/95 p-3 shadow-xl backdrop-blur">
      <div className="mb-4 px-3 pt-2">
        <h2 className="text-lg font-bold text-[var(--color-text)]">
          SportQueue
        </h2>

        <p className="text-xs text-stone-500">Badminton Queue Management</p>
      </div>

      <ul className="grid gap-2">
        {navLinks.map((link) => (
          <li key={link.name}>
            <NavLink
              to={link.path}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 overflow-hidden rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-300 ${
                  isActive
                    ? "bg-[var(--color-primary)] text-white shadow-lg shadow-orange-200"
                    : "text-stone-600 hover:bg-orange-50 hover:text-[var(--color-accent)]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Hover Glow */}
                  {!isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-primary)]/0 via-[var(--color-primary)]/5 to-[var(--color-accent)]/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  )}

                  {/* Icon */}
                  <span
                    className={`relative z-10 text-lg transition-transform duration-300 ${
                      isActive
                        ? "scale-110"
                        : "group-hover:scale-110 group-hover:text-[var(--color-primary)]"
                    }`}
                  >
                    {link.icon}
                  </span>

                  {/* Text */}
                  <span className="relative z-10">{link.name}</span>

                  {/* Active Indicator */}
                  {isActive && (
                    <div className="ml-auto h-2 w-2 rounded-full bg-white shadow-md" />
                  )}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
