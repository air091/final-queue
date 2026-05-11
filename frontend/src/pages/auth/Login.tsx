import { useState } from "react";
import { NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import axios from "axios";

type LoginCredentialsType = {
  email: string;
  password: string;
};

export default function Login() {
  const [credentials, setCredentials] = useState<LoginCredentialsType>({
    email: "",
    password: "",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { login, refreshAccessToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get("session") === "expired";

  const handleOnSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    try {
      if (!credentials.email && !credentials.password) {
        await refreshAccessToken();
      } else if (credentials.email && credentials.password) {
        await login({
          email: credentials.email,
          password: credentials.password,
        });
      } else {
        setErrorMessage(
          "Please enter both email and password, or leave both fields blank to reuse your saved session.",
        );
        return;
      }

      setCredentials({ email: "", password: "" });
      navigate("/home");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(
          error.response?.data?.message ?? "Login failed. Please try again.",
        );
        console.error(error.response?.data?.message);
      } else {
        setErrorMessage("Login failed. Please try again.");
        console.error(error);
      }
    }
  };

  const handleOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-orange-50 to-white flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl grid lg:grid-cols-2">
        {/* Left Side */}
        <div className="hidden lg:flex flex-col justify-center bg-text px-12 py-16 text-white">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-2xl">
              🏸
            </div>

            <div>
              <h1 className="text-3xl font-bold">SportQueue</h1>
              <p className="text-sm text-gray-300">
                Badminton Match Management
              </p>
            </div>
          </div>

          <div className="mt-14">
            <h2 className="text-5xl font-bold leading-tight">
              Your Next Match Starts Here
            </h2>

            <p className="mt-6 text-gray-300 leading-relaxed">
              Organize badminton matches, manage queues, and connect with
              players easily.
            </p>
          </div>

          <div className="mt-12 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-primary">•</span>
              <p className="text-gray-300">Real-time queue management</p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-primary">•</span>
              <p className="text-gray-300">Find local badminton players</p>
            </div>
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="mb-8 flex justify-center lg:hidden">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-3xl text-white">
                🏸
              </div>
            </div>

            {/* Header */}
            <div className="text-center lg:text-left">
              <h2 className="text-3xl font-bold text-text">Welcome Back</h2>

              <p className="mt-2 text-gray-500">Login to continue</p>
            </div>

            {/* Form */}
            <form onSubmit={handleOnSubmit} className="mt-8 space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-text"
                >
                  Email
                </label>

                <input
                  type="email"
                  name="email"
                  id="email"
                  value={credentials.email}
                  onChange={handleOnChange}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-text outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-text"
                >
                  Password
                </label>

                <input
                  type="password"
                  name="password"
                  id="password"
                  value={credentials.password}
                  onChange={handleOnChange}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-text outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>

              {errorMessage ? (
                <p className="text-sm text-red-500">{errorMessage}</p>
              ) : null}

              {sessionExpired && !errorMessage ? (
                <p className="rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-orange-700">
                  Your session expired. Please log in again.
                </p>
              ) : null}

              <button
                type="submit"
                className="w-full rounded-xl bg-primary py-3 font-semibold text-white transition hover:bg-accent"
              >
                Login
              </button>
            </form>

            {/* Register */}
            <p className="mt-6 text-center text-sm text-gray-600">
              Don&apos;t have an account yet?{" "}
              <NavLink
                to="/register"
                className="font-semibold text-accent hover:text-primary"
              >
                Register
              </NavLink>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
