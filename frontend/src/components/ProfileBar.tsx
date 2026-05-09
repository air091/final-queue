import { useEffect, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";

export default function ProfileBar() {
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
    <div className="relative w-full" ref={profileRef}>
      <button
        type="button"
        onClick={() => setOpenProfile((prev) => !prev)}
        className="
        flex w-full items-center gap-3
        rounded-2xl px-3 py-2.5
        text-left text-[#0c090c]
        transition-all duration-200
        hover:bg-[#fff4df]
      "
      >
        <div className="h-8 w-8 overflow-hidden rounded-xl">
          <img
            src={user?.profileUrl}
            alt={user?.username}
            className="block h-full w-full object-cover object-center"
          />
        </div>

        <div className="hidden lg:block">
          <span className="block text-sm font-medium">{user?.username}</span>
        </div>
      </button>

      <ProfileDropdown open={openProfile} />
    </div>
  );
}

import { RiLogoutBoxLine } from "react-icons/ri";
import { useNavigate } from "react-router-dom";

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
      className={`
      absolute z-50

      bottom-20 left-1/2 w-[220px] -translate-x-1/2
      origin-bottom

      rounded-2xl border border-orange-100
      bg-white p-2 shadow-xl

      transition-all duration-200

      md:bottom-16 md:left-0 md:w-full md:translate-x-0
      md:origin-bottom

      lg:w-full

      ${
        open
          ? "pointer-events-auto scale-100 opacity-100"
          : "pointer-events-none scale-95 opacity-0"
      }
    `}
    >
      <button
        type="button"
        onClick={handleLogout}
        className="
        flex w-full items-center gap-3
        rounded-xl px-3 py-2.5
        text-sm font-medium text-[#0c090c]

        transition-all duration-200

        hover:bg-[#fff4df]
        hover:text-[#ff6900]
      "
      >
        {/* ICON */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#fff4df] text-[#ff6900]">
          <RiLogoutBoxLine size={16} />
        </div>

        {/* LABEL */}
        <span className="truncate">Logout</span>
      </button>
    </div>
  );
}
