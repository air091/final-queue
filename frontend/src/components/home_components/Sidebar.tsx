import { NavLink } from "react-router-dom";
import { RiHome9Fill } from "react-icons/ri";
import { RiUserCommunityLine } from "react-icons/ri";

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
  return (
    <nav className="border px-2 w-[274px] h-full">
      {/* Navigation */}
      <ul className="flex w-full md:grid md:gap-2">
        {navLinks.map((link) => (
          <li key={link.name}>
            <NavLink
              to={link.path}
              className={({ isActive }) =>
                `
              w-full
              flex items-center justify-center gap-3
              rounded-2xl px-3 py-3
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
              {({ isActive }) => (
                <>
                  {/* Icon */}
                  <div
                    className={`
                    flex h-9 w-9 items-center justify-center rounded-xl transition
                    ${
                      isActive
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-primary"
                    }
                  `}
                  >
                    {link.icon}
                  </div>

                  {/* Label */}
                  <span className="hidden lg:block">{link.name}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
