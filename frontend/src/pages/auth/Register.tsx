import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import axios from "axios";
import { Eye, EyeClosed } from "lucide-react";

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
              Start playing.
              <span className="block text-primary">Join the community.</span>
            </h2>

            <p className="mt-6 text-gray-300 leading-relaxed">
              Create your account and connect with badminton players, matches,
              and queues nearby.
            </p>
          </div>

          <div className="mt-12 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-primary">•</span>

              <p className="text-gray-300">Join local badminton matches</p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-primary">•</span>

              <p className="text-gray-300">Manage queues in real-time</p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-primary">•</span>

              <p className="text-gray-300">Connect with nearby players</p>
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
              <h2 className="text-3xl font-bold text-text">Create Account</h2>

              <p className="mt-2 text-gray-500">Register to continue</p>
            </div>

            {/* Form */}
            <form onSubmit={handleOnSubmit} className="mt-8 space-y-5">
              <div>
                <label
                  htmlFor="username"
                  className="mb-2 block text-sm font-medium text-text"
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
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-text outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-text"
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

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    autoComplete="off"
                    value={registerCredentials.password}
                    onChange={handleOnChange}
                    placeholder="Create a password"
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-12 text-text outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />

                  <button
                    type="button"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute top-0 right-0 flex h-full items-center px-3 text-gray-500 transition hover:text-text"
                  >
                    {showPassword ? <Eye /> : <EyeClosed />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-medium text-text"
                >
                  Confirm Password
                </label>

                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    name="confirmPassword"
                    autoComplete="off"
                    value={registerCredentials.confirmPassword}
                    onChange={handleOnChange}
                    placeholder="Confirm your password"
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-12 text-text outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />

                  <button
                    type="button"
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute top-0 right-0 flex h-full items-center px-3 text-gray-500 transition hover:text-text"
                  >
                    {showConfirmPassword ? <Eye /> : <EyeClosed />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-primary py-3 font-semibold text-white transition hover:bg-accent"
              >
                Create Account
              </button>
            </form>

            {/* Login */}
            <p className="mt-6 text-center text-sm text-gray-600">
              Already have an account?{" "}
              <NavLink
                to="/login"
                className="font-semibold text-accent hover:text-primary"
              >
                Log in
              </NavLink>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
