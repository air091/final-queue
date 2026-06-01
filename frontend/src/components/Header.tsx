import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import { NavLink } from "react-router-dom";
import {
  Bell,
  Check,
  TextAlignJustify,
  UserRoundMinus,
  UserRoundPlus,
  X,
} from "lucide-react";
import { RiLogoutBoxLine } from "react-icons/ri";

import { useAuth } from "../hooks/useAuth";
import { api } from "../lib/api";

type NotificationItem = {
  id: string;
  type: "community_admin_invite" | "community_player_request";
  status: "pending" | "requested" | "accepted" | "rejected";
  message: string;
  createdAt: string;
  community: {
    id: string;
    communityName: string;
    profileUrl: string;
  };
  actor: {
    id: string;
    username: string;
    profileUrl: string;
  };
};

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
  centerSearch?: {
    value: string;
    placeholder: string;
    onChange: (value: string) => void;
  };
};

export default function Header({
  setOpenSidebar,
  hostSession,
  hostPlayer,
  centerSearch,
}: HeaderProps) {
  const { user } = useAuth();

  const [openProfileDropdown, setOpenProfileDropdown] =
    useState<boolean>(false);
  const [openNotifications, setOpenNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [busyNotificationId, setBusyNotificationId] = useState<string | null>(
    null,
  );
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const notificationRef = useRef<HTMLDivElement | null>(null);

  const loadNotifications = async () => {
    try {
      const response = await api.get("/api/notifications");
      setNotifications(response.data.notifications as NotificationItem[]);
    } catch (error) {
      console.error("Unable to load notifications", error);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadNotifications();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpenProfileDropdown(false);
      }

      if (
        notificationRef.current &&
        !notificationRef.current.contains(e.target as Node)
      ) {
        setOpenNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const respondToNotification = async (
    notificationId: string,
    action: "accept" | "reject",
  ) => {
    setBusyNotificationId(notificationId);

    try {
      await api.patch(`/api/notifications/${notificationId}/${action}`);
      setNotifications((currentNotifications) =>
        currentNotifications.filter(
          (notification) => notification.id !== notificationId,
        ),
      );
    } catch (error) {
      console.error(`Unable to ${action} notification`, error);
    } finally {
      setBusyNotificationId(null);
    }
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,420px)_minmax(0,1fr)] items-center gap-4 border-b border-stone-200 px-6 py-3">
      <div className="flex min-w-0 items-center gap-x-2">
        <div
          onClick={() => setOpenSidebar((prev) => !prev)}
          className="cursor-pointer rounded-full p-1 hover:bg-stone-200"
        >
          <TextAlignJustify size={24} />
        </div>

        <h1 className="relative text-[18px] font-extrabold tracking-tight text-text">
          QUE<span className="text-primary">TATO</span> SPORTS
          <span className="absolute text-[10px] font-medium border top-1 -right-12 bg-red-200 text-red-500 border-red-500 px-2 py-0.5 rounded-full">
            BETA
          </span>
        </h1>
      </div>

      <div className="flex min-w-0 justify-center">
        {centerSearch ? (
          <input
            type="text"
            placeholder={centerSearch.placeholder}
            value={centerSearch.value}
            onChange={(event) => centerSearch.onChange(event.target.value)}
            className="w-[240px] min-[769px]:w-full rounded-full border border-orange-200 px-4 py-2 text-sm text-stone-700 outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-orange-100"
          />
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-x-[16px]">
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
        <div ref={notificationRef} className="relative">
          <button
            type="button"
            title="Notifications"
            onClick={() => {
              setOpenNotifications((currentValue) => !currentValue);
              setOpenProfileDropdown(false);
              void loadNotifications();
            }}
            className="relative flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full border border-stone-200 text-stone-600 transition hover:bg-stone-100"
          >
            <Bell size={17} />
            {notifications.length > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                {notifications.length}
              </span>
            ) : null}
          </button>

          {openNotifications ? (
            <div className="absolute right-0 top-9 z-50 w-[340px] overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl">
              <div className="border-b border-stone-100 px-4 py-3">
                <p className="text-sm font-semibold text-text">
                  Notifications
                </p>
              </div>

              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-stone-500">
                  No notifications.
                </div>
              ) : (
                <div className="max-h-[360px] overflow-y-auto">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="grid gap-3 border-b border-stone-100 px-4 py-3 last:border-b-0"
                    >
                      <div className="flex min-w-0 gap-3">
                        <img
                          src={notification.community.profileUrl}
                          alt={notification.community.communityName}
                          className="h-10 w-10 shrink-0 rounded-full object-cover"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-stone-800">
                            {notification.message}
                          </p>
                          <p className="mt-1 text-xs text-stone-500">
                            From {notification.actor.username}
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          title="Reject"
                          onClick={() =>
                            void respondToNotification(
                              notification.id,
                              "reject",
                            )
                          }
                          disabled={busyNotificationId === notification.id}
                          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <X size={15} />
                        </button>
                        <button
                          type="button"
                          title="Accept"
                          onClick={() =>
                            void respondToNotification(
                              notification.id,
                              "accept",
                            )
                          }
                          disabled={busyNotificationId === notification.id}
                          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-green-200 bg-green-50 text-green-700 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Check size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
        <div ref={dropdownRef} className="relative">
          <div
            onClick={() => {
              setOpenProfileDropdown((prev) => !prev);
              setOpenNotifications(false);
            }}
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
