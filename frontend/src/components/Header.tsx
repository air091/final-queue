import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import { NavLink } from "react-router-dom";
import { TextAlignJustify } from "lucide-react";
import { RiLogoutBoxLine } from "react-icons/ri";

import { useAuth } from "../hooks/useAuth";

type HeaderProps = {
  setOpenSidebar: Dispatch<SetStateAction<boolean>>;
};

export default function Header({ setOpenSidebar }: HeaderProps) {
  const { user } = useAuth();

  const [openProfileDropdown, setOpenProfileDropdown] =
    useState<boolean>(false);

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpenProfileDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="flex items-center justify-between border-b border-stone-200 px-6 py-3">
      <div className="flex items-center gap-x-2">
        <div
          onClick={() => setOpenSidebar((prev) => !prev)}
          className="cursor-pointer rounded-full p-1 hover:bg-stone-200"
        >
          <TextAlignJustify size={24} />
        </div>

        <h1 className="text-[18px] font-extrabold tracking-tight text-text">
          Queue<span className="text-primary">Tato</span> Sports Management
        </h1>
      </div>

      <div ref={dropdownRef} className="relative">
        <div
          onClick={() => setOpenProfileDropdown((prev) => !prev)}
          className="h-[28px] w-[28px] cursor-pointer rounded-full"
        >
          <img
            src={user?.profileUrl}
            alt={user?.username}
            className="block h-full w-full rounded-full object-cover object-center"
          />
        </div>

        {openProfileDropdown && <ProfileDropdown />}
      </div>
    </div>
  );
}

function ProfileDropdown() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="absolute top-8 -left-64 z-50 w-[280px] bg-white rounded-md border">
      <div className="flex gap-x-[16px] p-[16px]">
        <div className="h-[64px] w-[64px] rounded-full">
          <img
            src={user?.profileUrl}
            alt={user?.username}
            className="block h-full w-full rounded-full object-cover object-center"
          />
        </div>

        <div>
          <div>
            <span className="block text-[16px] font-semibold">
              {user?.username}
            </span>

            <span className="block text-[16px] font-semibold leading-3">
              {user?.email}
            </span>
          </div>

          <div>
            <NavLink
              to="/profile"
              className="text-[14px] font-medium text-blue-500"
            >
              Manage your Profile
            </NavLink>
          </div>
        </div>
      </div>

      <nav className="border-t py-1.5">
        <ul>
          <li>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full cursor-pointer items-center gap-x-[16px] px-[16px] py-1 text-[14px] font-medium hover:bg-stone-200"
            >
              <div>
                <RiLogoutBoxLine size={18} />
              </div>
              Logout
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
