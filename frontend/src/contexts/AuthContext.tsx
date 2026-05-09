import axios from "axios";
import { createContext, useEffect, useState, type ReactNode } from "react";

type User = {
  id: string;
  username: string;
  email: string;
  exp: number;
  iat: number;
};

type LoginPayload = {
  email: string;
  password: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  //   login: (payload: LoginPayload) => Promise<void>;
  //   logout: () => void;
};

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

type AuthProvideProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProvideProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get("/api/auth/check-auth", {
          withCredentials: true,
        });
        setUser(response.data.user);
      } catch (error) {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
