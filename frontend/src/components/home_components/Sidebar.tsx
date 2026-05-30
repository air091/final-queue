import { NavLink } from "react-router-dom";
import { House, UserRoundPlus, UsersRound } from "lucide-react";

const navLinks = [
  {
    icon: <House size={24} />,
    path: "/home",
    name: "Home",
  },
  {
    icon: <UsersRound size={24} />,
    path: "/community",
    name: "Community",
  },
  {
    icon: <UserRoundPlus size={24} />,
    path: "/home/friends",
    name: "Find Friends",
  },
];

export default function Sidebar() {
  return (
    <nav
      className="
    h-full w-[274px] bg-white py-2

    xl:relative
    max-xl:absolute
    max-xl:left-0
    max-xl:top-0
    max-xl:z-50
  "
    >
      {/* Navigation */}
      <ul className="flex flex-col w-full gap-2">
        {navLinks.map((link) => (
          <li key={link.name}>
            <NavLink
              to={link.path}
              end={link.path === "/home"}
              className={({ isActive }) =>
                `
              w-full
              flex items-center
              rounded-r-lg px-6 py-1 gap-x-2
              text-sm font-medium transition

              ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-text hover:bg-gray-100"
              }
            `
              }
            >
              <div className="flex p-1 items-center rounded-xl transition">
                {link.icon}
              </div>
              <span className="block">{link.name}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
