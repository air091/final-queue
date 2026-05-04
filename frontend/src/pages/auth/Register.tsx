import axios from "axios";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { api } from "../../lib/api";

type RegisterCredentialsType = {
  username: string;
  skillLevel: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export default function Register() {
  const [registerCredentials, setRegisterCredentials] =
    useState<RegisterCredentialsType>({
      username: "",
      skillLevel: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
  const skillLevels = ["beginner", "intermediate", "advanced", "elite"];

  const register = async () => {
    try {
      const response = await api.post("/api/auth/register", {
        username: registerCredentials.username,
        skillLevel: registerCredentials.skillLevel,
        email: registerCredentials.email,
        password: registerCredentials.password,
      });

      console.log(response);
      setRegisterCredentials({
        username: "",
        skillLevel: "",
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
    <div>
      <header>
        <h2>Register your account</h2>
      </header>
      <form onSubmit={handleOnSubmit}>
        <div>
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            name="username"
            autoComplete="off"
            value={registerCredentials.username}
            onChange={handleOnChange}
            className="border block w-full"
          />
        </div>
        <div>
          <label htmlFor="skillLevel">Skill Level</label>
          <select
            name="skillLevel"
            id="skillLevel"
            value={registerCredentials.skillLevel}
            onChange={handleOnChange}
            className="border block w-full"
          >
            <option value="" disabled>
              Select skill level
            </option>
            {skillLevels.map((skillLevel) => (
              <option key={skillLevel} value={skillLevel}>
                {skillLevel}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            autoComplete="off"
            value={registerCredentials.email}
            onChange={handleOnChange}
            className="border block w-full"
          />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            autoComplete="off"
            value={registerCredentials.password}
            onChange={handleOnChange}
            className="border block w-full"
          />
        </div>
        <div>
          <label htmlFor="confirmPassword">Confirm password</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="off"
            value={registerCredentials.confirmPassword}
            onChange={handleOnChange}
            className="border block w-full"
          />
        </div>
        <button type="submit" className="border block w-full cursor-pointer">
          Register
        </button>
      </form>
      <p>
        Already have an account?{" "}
        <NavLink to="/login" className="text-blue-600">
          Log in
        </NavLink>
      </p>
    </div>
  );
}
