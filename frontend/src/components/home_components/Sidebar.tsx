import { NavLink } from "react-router-dom";
import { RiHome9Fill } from "react-icons/ri";
import { RiUserCommunityLine } from "react-icons/ri";

const navLinks = [
  {
    icon: <RiHome9Fill size={24} />,
    path: "/home",
    name: "Home",
  },
  {
    icon: <RiUserCommunityLine size={24} />,
    path: "/community",
    name: "Community",
  },
];

export default function Sidebar() {
  return (
    <nav className="w-[274px] h-full py-2">
      {/* Navigation */}
      <ul className="flex w-full md:grid md:gap-2">
        {navLinks.map((link) => (
          <li key={link.name}>
            <NavLink
              to={link.path}
              className={({ isActive }) =>
                `
              w-full
              flex items-center justify-center
              rounded-2xl px-6 py-1 gap-x-2
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
              <div className="flex h-9 w-9 items-center justify-center rounded-xl transition">
                {link.icon}
              </div>
              <span className="hidden lg:block">{link.name}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
