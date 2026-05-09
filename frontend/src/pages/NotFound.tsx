import { NavLink } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fffaf3] px-6">
      <div className="w-full max-w-md rounded-3xl border border-orange-100 bg-white p-8 shadow-sm">
        {/* TITLE */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-[#0c090c]">404</h1>

          <p className="mt-2 text-sm text-stone-500">
            Oops! The page you are looking for does not exist.
          </p>
        </div>

        {/* ACTIONS */}
        <nav>
          <ul className="grid gap-3">
            <li>
              <NavLink
                to="/login"
                className="flex items-center justify-center rounded-2xl bg-[#fff4df] px-4 py-3 text-sm font-medium text-[#ff6900] transition-all duration-200 hover:bg-[#ffe8bf]"
              >
                Go to Login
              </NavLink>
            </li>

            <li>
              <NavLink
                to="/register"
                className="flex items-center justify-center rounded-2xl border border-orange-100 px-4 py-3 text-sm font-medium text-[#0c090c] transition-all duration-200 hover:bg-[#fff7e8]"
              >
                Create an Account
              </NavLink>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
