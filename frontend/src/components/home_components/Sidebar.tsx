import axios from "axios";
import { NavLink } from "react-router-dom";
import { api } from "../../lib/api";

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
    <nav className="w-50">
      <ul>
        {navLinks.map((link) => (
          <li key={link.name}>
            <NavLink
              to={link.path}
              className="block hover:bg-amber-200 px-4 py-1 w-full"
            >
              {link.name}
            </NavLink>
          </li>
        ))}
        <li>
          <button
            onClick={async () => await logout()}
            className="block hover:bg-amber-200 px-4 py-1 w-full cursor-pointer"
          >
            Log out
          </button>
        </li>
      </ul>
    </nav>
  );
}
