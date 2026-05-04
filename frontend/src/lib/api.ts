import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL?.trim() || "";

export const api = axios.create({
  baseURL,
  withCredentials: true,
});
