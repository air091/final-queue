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

type RefreshAccessTokenResponse = {
  accessToken: string;
  user?: {
    id: string;
    username: string;
    email: string;
    profileUrl: string;
    role: string;
  };
};

let refreshTokenRequest: Promise<RefreshAccessTokenResponse> | null = null;

const AUTH_ENDPOINTS = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
  "/api/auth/logout",
];

const ACCESS_TOKEN_REFRESH_BUFFER_SECONDS = 30;

const getAuthorizationToken = (authorization?: unknown) => {
  if (typeof authorization !== "string") return null;
  if (!authorization.startsWith("Bearer ")) return null;

  return authorization.slice("Bearer ".length);
};

const getTokenExpiresAtSeconds = (token: string) => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decodedPayload = JSON.parse(window.atob(normalizedPayload)) as {
      exp?: unknown;
    };

    return typeof decodedPayload.exp === "number"
      ? decodedPayload.exp
      : null;
  } catch {
    return null;
  }
};

const isTokenExpiring = (token: string) => {
  const expiresAtSeconds = getTokenExpiresAtSeconds(token);
  if (!expiresAtSeconds) return false;

  const nowSeconds = Date.now() / 1000;
  return expiresAtSeconds - nowSeconds <= ACCESS_TOKEN_REFRESH_BUFFER_SECONDS;
};

const isAuthEndpoint = (url = "") =>
  AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));

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

export const refreshAccessTokenRequest = () => {
  refreshTokenRequest ??= refreshClient
    .post("/api/auth/refresh")
    .then((response) => {
      const nextAccessToken = response.data.accessToken as string;
      setAuthToken(nextAccessToken);
      notifyAccessTokenRefreshed(nextAccessToken);
      return response.data as RefreshAccessTokenResponse;
    })
    .finally(() => {
      refreshTokenRequest = null;
    });

  return refreshTokenRequest;
};

api.interceptors.request.use(async (config) => {
  const requestUrl = config.url ?? "";

  if (isAuthEndpoint(requestUrl)) {
    return config;
  }

  const requestToken = getAuthorizationToken(config.headers.Authorization);
  const defaultToken = getAuthorizationToken(
    api.defaults.headers.common.Authorization,
  );
  const token = requestToken ?? defaultToken;

  if (!token || !isTokenExpiring(token)) {
    return config;
  }

  const { accessToken } = await refreshAccessTokenRequest();
  config.headers.Authorization = `Bearer ${accessToken}`;

  return config;
});

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
      isAuthEndpoint(requestUrl)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const { accessToken } = await refreshAccessTokenRequest();
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;

      return api(originalRequest);
    } catch (refreshError) {
      notifySessionExpired();
      return Promise.reject(refreshError);
    }
  },
);
