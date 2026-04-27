import { NavLink } from "react-router-dom";

export default function Sidebar() {
  const navLinks = [
    {
      path: "/",
      name: "Home",
    },
    {
      path: "/community",
      name: "Community",
    },
  ];
  return (
    <nav className="w-50">
      <ul>
        {navLinks.map((link) => (
          <li key={link.name}>
            <NavLink
              to={link.path}
              className="block hover:bg-amber-200 px-4 py-1"
            >
              {link.name}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
