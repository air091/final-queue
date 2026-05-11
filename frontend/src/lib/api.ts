import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL?.trim() || "";

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

const refreshClient = axios.create({
  baseURL,
  withCredentials: true,
});

const SESSION_EXPIRED_EVENT = "auth:session-expired";
const ACCESS_TOKEN_REFRESHED_EVENT = "auth:access-token-refreshed";

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

let refreshTokenRequest: Promise<string> | null = null;

export const notifySessionExpired = () => {
  setAuthToken(null);
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));

  if (window.location.pathname !== "/login") {
    window.location.assign("/login?session=expired");
  }
};

export const onSessionExpired = (handler: () => void) => {
  window.addEventListener(SESSION_EXPIRED_EVENT, handler);

  return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
};

export const notifyAccessTokenRefreshed = (token: string) => {
  window.dispatchEvent(
    new CustomEvent<string>(ACCESS_TOKEN_REFRESHED_EVENT, { detail: token }),
  );
};

export const onAccessTokenRefreshed = (handler: (token: string) => void) => {
  const eventHandler = (event: Event) => {
    handler((event as CustomEvent<string>).detail);
  };

  window.addEventListener(ACCESS_TOKEN_REFRESHED_EVENT, eventHandler);

  return () =>
    window.removeEventListener(ACCESS_TOKEN_REFRESHED_EVENT, eventHandler);
};

// =========================
// SET AUTH TOKEN
// =========================

export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const status = error.response?.status;
    const requestUrl = originalRequest?.url ?? "";

    if (
      status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      requestUrl.includes("/api/auth/login") ||
      requestUrl.includes("/api/auth/register") ||
      requestUrl.includes("/api/auth/refresh") ||
      requestUrl.includes("/api/auth/logout")
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      refreshTokenRequest ??= refreshClient
        .post("/api/auth/refresh")
        .then((response) => {
          const nextAccessToken = response.data.accessToken as string;
          setAuthToken(nextAccessToken);
          notifyAccessTokenRefreshed(nextAccessToken);
          return nextAccessToken;
        })
        .finally(() => {
          refreshTokenRequest = null;
        });

      const nextAccessToken = await refreshTokenRequest;
      originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;

      return api(originalRequest);
    } catch (refreshError) {
      notifySessionExpired();
      return Promise.reject(refreshError);
    }
  },
);
