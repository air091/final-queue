import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { api, setAuthToken } from "../lib/api";

type User = {
  id: string;
  username: string;
  email: string;
  profileUrl: string;
  exp: number;
  iat: number;
};

type LoginPayload = {
  email: string;
  password: string;
};

type AuthContextType = {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<string>;
};

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // =========================
  // REFRESH ACCESS TOKEN
  // =========================

  const refreshAccessToken = useCallback(async () => {
    try {
      const response = await api.post("/api/auth/refresh");
      const newAccessToken = response.data.accessToken;
      setAccessToken(newAccessToken);
      setAuthToken(newAccessToken);
      return newAccessToken;
    } catch (error) {
      setAccessToken(null);
      setUser(null);
      setAuthToken(null);
      throw error;
    }
  }, []);

  // =========================
  // CHECK AUTH
  // =========================

  const checkAuth = useCallback(async () => {
    try {
      let token = accessToken;
      // No access token?
      // Try refresh
      if (!token) {
        token = await refreshAccessToken();
      }
      const response = await api.get("/api/auth/check-auth", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setUser(response.data.user);
    } catch (error) {
      console.error(error);
      setUser(null);
      setAccessToken(null);
      setAuthToken(null);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, refreshAccessToken]);

  // =========================
  // INITIAL AUTH CHECK
  // =========================

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // =========================
  // LOGIN
  // =========================

  const login = useCallback(async ({ email, password }: LoginPayload) => {
    const response = await api.post("/api/auth/login", {
      email,
      password,
    });

    const token = response.data.accessToken;
    setAccessToken(token);
    setAuthToken(token);
    setUser(response.data.user);
  }, []);

  // =========================
  // LOGOUT
  // =========================

  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout");
    } catch (error) {
      console.error(error);
    } finally {
      setAccessToken(null);
      setUser(null);
      setAuthToken(null);
    }
  }, []);

  // =========================
  // CONTEXT VALUE
  // =========================

  const value = useMemo(
    () => ({
      user,
      accessToken,
      isLoading,
      login,
      logout,
      refreshAccessToken,
    }),
    [user, accessToken, isLoading, login, logout, refreshAccessToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
