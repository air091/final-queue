import { NavLink } from "react-router-dom";

export default function Register() {
  const skillLevels = ["beginner", "intermediate", "advanced", "elite"];
  return (
    <div>
      <header>
        <h2>Register your account</h2>
      </header>
      <form>
        <div>
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            name="username"
            autoComplete="off"
            className="border block w-full"
          />
        </div>
        <div>
          <label htmlFor="skillLevel">Skill Level</label>
          <select
            name="skillLevel"
            id="skillLevel"
            className="border block w-full"
          >
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
