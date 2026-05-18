import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  api,
  onAccessTokenRefreshed,
  onSessionExpired,
  refreshAccessTokenRequest,
  setAuthToken,
} from "../lib/api";

type User = {
  id: string;
  username: string;
  email: string;
  profileUrl: string;
  role: string;
};

type LoginPayload = {
  email: string;
  password: string;
};

type RegisterPayload = {
  username: string;
  email: string;
  password: string;
};

type AuthContextType = {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  register: (payload: RegisterPayload) => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<string>;
  updateCurrentUser: (user: User, token?: string) => void;
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

  useEffect(() => {
    const removeSessionExpiredListener = onSessionExpired(() => {
      setUser(null);
      setAccessToken(null);
      setAuthToken(null);
    });

    const removeAccessTokenRefreshedListener = onAccessTokenRefreshed(
      (token) => {
        setAccessToken(token);
      },
    );

    return () => {
      removeSessionExpiredListener();
      removeAccessTokenRefreshedListener();
    };
  }, []);

  // =========================
  // REFRESH ACCESS TOKEN
  // =========================

  const refreshAccessToken = useCallback(async () => {
    try {
      const { accessToken: newAccessToken, user: refreshedUser } =
        await refreshAccessTokenRequest();

      setAccessToken(newAccessToken);

      if (refreshedUser) {
        setUser(refreshedUser);
      }

      return newAccessToken;
    } catch (error) {
      setAccessToken(null);
      setUser(null);
      setAuthToken(null);
      throw error;
    }
  }, []);

  // =========================
  // INITIAL AUTH CHECK
  // =========================

  useEffect(() => {
    let isCancelled = false;

    const checkAuth = async () => {
      try {
        await refreshAccessToken();

        if (isCancelled) return;
      } catch (error) {
        if (isCancelled) return;

        console.error(error);
        setUser(null);
        setAccessToken(null);
        setAuthToken(null);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    void checkAuth();

    return () => {
      isCancelled = true;
    };
  }, [refreshAccessToken]);

  // =========================
  // LOGIN
  // =========================

  const login = useCallback(async ({ email, password }: LoginPayload) => {
    if (!email || !password) {
      throw new Error("Email and password are required.");
    }

    const response = await api.post("/api/auth/login", {
      email,
      password,
    });

    const token = response.data.accessToken;
    setAccessToken(token);
    setAuthToken(token);
    setUser(response.data.user);
  }, []);

  const updateCurrentUser = useCallback((nextUser: User, token?: string) => {
    setUser(nextUser);

    if (token) {
      setAccessToken(token);
      setAuthToken(token);
    }
  }, []);

  // =========================
  // LOGIN
  // =========================

  const register = useCallback(
    async ({ username, email, password }: RegisterPayload) => {
      const response = await api.post("/api/auth/register", {
        username,
        email,
        password,
      });
      const token = response.data.accessToken;
      setAccessToken(token);
      setAuthToken(token);
      setUser(response.data.user);
    },
    [],
  );

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
      register,
      login,
      logout,
      refreshAccessToken,
      updateCurrentUser,
    }),
    [
      user,
      accessToken,
      isLoading,
      login,
      logout,
      refreshAccessToken,
      updateCurrentUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
