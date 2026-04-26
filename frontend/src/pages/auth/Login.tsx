import axios from "axios";
import { useState } from "react";

type LoginCredentialsType = {
  email: string;
  password: string;
};

export default function Login() {
  const [credentials, setCredentials] = useState<LoginCredentialsType>({
    email: "",
    password: "",
  });

  const loginAPI = async () => {
    try {
      const response = await axios.post(
        "http://localhost:4000/api/auth/login",
        {
          email: credentials.email,
          password: credentials.password,
        },
        {
          withCredentials: true,
        },
      );

      console.log("Login", response);
    } catch (error) {
      console.error("Login api failed:", error);
    }
  };

  const handleOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  const handleOnSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    await loginAPI();
  };

  return (
    <div>
      <h1>Login</h1>
      <form onSubmit={handleOnSubmit}>
        <div>
          <label htmlFor="email">Email</label>
          <input
            type="email"
            name="email"
            id="email"
            value={credentials.email}
            onChange={handleOnChange}
            className="border block px-2 py-1 w-full"
          />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            type="password"
            name="password"
            id="password"
            value={credentials.password}
            onChange={handleOnChange}
            className="border block px-2 py-1 w-full"
          />
        </div>
        <button type="submit" className="border block px-2 py-1 w-full">
          Login
        </button>
      </form>
    </div>
  );
}
