import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import { NavLink } from "react-router-dom";
import { TextAlignJustify, UserRoundMinus, UserRoundPlus } from "lucide-react";
import { RiLogoutBoxLine } from "react-icons/ri";

import { useAuth } from "../hooks/useAuth";

type HeaderProps = {
  setOpenSidebar: Dispatch<SetStateAction<boolean>>;
  hostSession?: {
    isAvailable: boolean;
    isEnding: boolean;
    isStarting: boolean;
    onStart: () => void;
    onEnd: () => void;
  };
  hostPlayer?: {
    isIncluded: boolean;
    isSaving: boolean;
    onToggle: () => void;
  };
};

export default function Header({
  setOpenSidebar,
  hostSession,
  hostPlayer,
}: HeaderProps) {
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
          Que<span className="text-primary">Tato</span> Sports Management
        </h1>
      </div>
      <div className="flex items-center gap-x-[16px]">
        {hostSession && (
          <div>
            {hostSession.isAvailable ? (
              <button
                type="button"
                onClick={hostSession.onEnd}
                disabled={hostSession.isEnding}
                className="block w-full cursor-pointer rounded-md border border-red-200 px-4 py-0.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {hostSession.isEnding ? "Ending..." : "End session"}
              </button>
            ) : (
              <button
                type="button"
                onClick={hostSession.onStart}
                disabled={hostSession.isStarting}
                className="block w-full cursor-pointer rounded-md border border-green-200 px-4 py-0.5 text-sm font-medium text-green-600 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {hostSession.isStarting ? "Starting..." : "Start session"}
              </button>
            )}
          </div>
        )}
        {hostPlayer && (
          <button
            type="button"
            title={
              hostPlayer.isIncluded
                ? "Hide host from match players"
                : "Join this match as host"
            }
            onClick={hostPlayer.onToggle}
            disabled={hostPlayer.isSaving}
            className={`cursor-pointer rounded-full border-2 p-1 transition disabled:cursor-not-allowed disabled:opacity-60 ${
              hostPlayer.isIncluded
                ? "border-red-500 bg-red-50 text-red-600 hover:bg-red-100"
                : "border-green-500 text-green-500 hover:bg-green-50"
            }`}
          >
            {hostPlayer.isIncluded ? (
              <UserRoundMinus size={18} />
            ) : (
              <UserRoundPlus size={18} />
            )}
          </button>
        )}
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
