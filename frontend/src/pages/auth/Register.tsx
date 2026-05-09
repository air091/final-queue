import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import axios from "axios";

type RegisterCredentialsType = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [registerCredentials, setRegisterCredentials] =
    useState<RegisterCredentialsType>({
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    });

  const handleOnChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setRegisterCredentials((prev) => ({ ...prev, [name]: value }));
  };

  const handleOnSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      if (
        registerCredentials.password !== registerCredentials.confirmPassword
      ) {
        console.error("Passwords do not match");
        setRegisterCredentials((prev) => ({
          ...prev,
          password: "",
          confirmPassword: "",
        }));
        return;
      }
      await register({
        username: registerCredentials.username,
        email: registerCredentials.email,
        password: registerCredentials.password,
      });

      setRegisterCredentials({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
      });

      navigate("/home");
    } catch (error) {
      if (axios.isAxiosError(error)) console.error(error);
      else console.error(error);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#fbfbf9] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl grid md:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl border border-orange-100 bg-white">
        {/* Left Side */}
        <div className="hidden md:flex flex-col justify-center p-10 relative overflow-hidden bg-[#0c090c] text-white">
          {/* Background accents */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#fd9a00]/20 via-[#ff6900]/10 to-transparent" />
          <div className="absolute -top-16 -right-10 w-52 h-52 bg-[#ffd230]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-[#ff6900]/10 rounded-full blur-3xl" />

          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-2xl bg-[#fd9a00] flex items-center justify-center text-3xl shadow-lg">
                🏸
              </div>

              <div>
                <h1 className="text-3xl font-bold">SportQueue</h1>
                <p className="text-orange-100 text-sm">
                  Badminton Match & Queue Management
                </p>
              </div>
            </div>

            <h2 className="text-4xl font-bold leading-tight mb-5">
              Start your badminton journey today.
            </h2>

            <p className="text-gray-300 leading-relaxed text-lg">
              Create your account to join local badminton matches, manage player
              queues, and connect with nearby players.
            </p>

            <div className="mt-10 space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center">
                  🏸
                </div>

                <div>
                  <p className="font-semibold">Discover badminton matches</p>
                  <p className="text-sm text-gray-300">
                    Join games happening near you
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center">
                  ⚡
                </div>

                <div>
                  <p className="font-semibold">Queue players efficiently</p>
                  <p className="text-sm text-gray-300">
                    Organize matches in real-time
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center">
                  🏆
                </div>

                <div>
                  <p className="font-semibold">Build your sports community</p>
                  <p className="text-sm text-gray-300">
                    Connect with local badminton players
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side */}
        <div className="bg-[#fbfbf9] p-8 md:p-10 flex flex-col justify-center">
          <header className="text-center mb-8">
            <div className="md:hidden flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-[#fd9a00] flex items-center justify-center text-3xl text-white shadow-lg">
                🏸
              </div>
            </div>

            <h2 className="text-3xl font-bold text-[#0c090c]">
              Create Account
            </h2>

            <p className="text-gray-500 mt-2">
              Register and start joining badminton matches
            </p>
          </header>

          <form onSubmit={handleOnSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-[#0c090c] mb-2"
              >
                Username
              </label>

              <input
                type="text"
                id="username"
                name="username"
                autoComplete="off"
                value={registerCredentials.username}
                onChange={handleOnChange}
                placeholder="Enter your username"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#fd9a00] focus:ring-4 focus:ring-[#ffd230]/40"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[#0c090c] mb-2"
              >
                Email
              </label>

              <input
                type="email"
                id="email"
                name="email"
                autoComplete="off"
                value={registerCredentials.email}
                onChange={handleOnChange}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#fd9a00] focus:ring-4 focus:ring-[#ffd230]/40"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[#0c090c] mb-2"
              >
                Password
              </label>

              <input
                type="password"
                id="password"
                name="password"
                autoComplete="off"
                value={registerCredentials.password}
                onChange={handleOnChange}
                placeholder="Create a password"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#fd9a00] focus:ring-4 focus:ring-[#ffd230]/40"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-[#0c090c] mb-2"
              >
                Confirm Password
              </label>

              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                autoComplete="off"
                value={registerCredentials.confirmPassword}
                onChange={handleOnChange}
                placeholder="Confirm your password"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-[#fd9a00] focus:ring-4 focus:ring-[#ffd230]/40"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#fd9a00] hover:bg-[#ff6900] cursor-pointer text-white font-semibold py-3 rounded-xl transition duration-200 shadow-lg hover:shadow-orange-300"
            >
              Create Account
            </button>
          </form>

          <p className="text-sm text-center text-gray-600 mt-6">
            Already have an account?{" "}
            <NavLink
              to="/login"
              className="text-[#ff6900] hover:text-[#fd9a00] font-semibold"
            >
              Log in
            </NavLink>
          </p>
        </div>
      </div>
    </div>
  );
}
