// import axios from "axios";
import { NavLink, useNavigate } from "react-router-dom";
// import { api } from "../../lib/api";
import { RiHome9Fill } from "react-icons/ri";
import { RiUserCommunityLine } from "react-icons/ri";
import { useAuth } from "../../hooks/useAuth";

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
  const { user } = useAuth();
  const [openProfile, setOpenProfile] = useState<boolean>(false);
  const profileRef = useRef<HTMLDivElement | null>(null);

  // CLOSE WHEN CLICK OUTSIDE
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setOpenProfile(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

      {/* PROFILE */}
      <div className="relative" ref={profileRef}>
        <button
          type="button"
          onClick={() => setOpenProfile((prev) => !prev)}
          className="flex w-full cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[#0c090c] transition-all duration-200 hover:bg-[#fff4df]"
        >
          <div className="h-8 w-8 overflow-hidden rounded-xl">
            <img
              src={user?.profileUrl}
              alt={user?.username}
              className="block h-full w-full object-cover object-center"
            />
          </div>

          <div>
            <span className="block text-sm font-medium">{user?.username}</span>
          </div>
        </button>

        <ProfileDropdown open={openProfile} />
      </div>
    </nav>
  );
}

import { RiLogoutBoxLine } from "react-icons/ri";
import { useEffect, useRef, useState } from "react";

type ProfileDropdownProps = {
  open: boolean;
};

export function ProfileDropdown({ open }: ProfileDropdownProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div
      className={`absolute bottom-16 left-0 w-full origin-bottom rounded-2xl border border-orange-100 bg-white p-2 shadow-lg transition-all duration-200 ${
        open
          ? "pointer-events-auto scale-100 opacity-100"
          : "pointer-events-none scale-95 opacity-0"
      }`}
    >
      <button
        type="button"
        onClick={handleLogout}
        className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#0c090c] transition-all duration-200 hover:bg-[#fff4df] hover:text-[#ff6900]"
      >
        {/* ICON */}
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#fff4df] text-[#ff6900]">
          <RiLogoutBoxLine size={16} />
        </div>

        {/* LABEL */}
        <span>Logout</span>
      </button>
    </div>
  );
}
