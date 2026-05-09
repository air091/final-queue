import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL?.trim() || "";

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

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
