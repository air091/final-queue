import axios from "axios";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { api } from "../../lib/api";

type RegisterCredentialsType = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export default function Register() {
  const [registerCredentials, setRegisterCredentials] =
    useState<RegisterCredentialsType>({
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    });

  const register = async () => {
    try {
      const response = await api.post("/api/auth/register", {
        username: registerCredentials.username,
        email: registerCredentials.email,
        password: registerCredentials.password,
      });

      console.log(response);
      setRegisterCredentials({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
    } catch (error) {
      if (axios.isAxiosError(error)) console.error(error);
      else console.error(error);
    }
  };

  const handleOnChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setRegisterCredentials((prev) => ({ ...prev, [name]: value }));
  };

  const handleOnSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (registerCredentials.password !== registerCredentials.confirmPassword) {
      console.error("Password not match");
      setRegisterCredentials((prev) => ({
        ...prev,
        password: "",
        confirmPassword: "",
      }));
      return;
    }

    await register();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <header className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Create Account</h2>
          <p className="text-gray-500 mt-2">
            Register and start your journey today
          </p>
        </header>

        <form onSubmit={handleOnSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700 mb-1"
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
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
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
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
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
              placeholder="Enter your password"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 mb-1"
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
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition duration-200 shadow-md cursor-pointer"
          >
            Register
          </button>
        </form>

        <p className="text-sm text-center text-gray-600 mt-6">
          Already have an account?{" "}
          <NavLink
            to="/login"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Log in
          </NavLink>
        </p>
      </div>
    </div>
  );
}
