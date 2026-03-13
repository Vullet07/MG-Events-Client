import axios from "axios";

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL || "https://localhost:7277/api").trim();

export const getApiErrorMessage = (error, fallback = "Request failed.") => {
  const payload = error?.response?.data;

  if (typeof payload === "string" && payload.trim()) {
    return payload.trim();
  }

  if (payload?.message) {
    return payload.message;
  }

  if (payload?.errors && typeof payload.errors === "object") {
    const messages = Object.values(payload.errors)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join(" ");
    }
  }

  if (payload?.title) {
    return payload.title;
  }

  return error?.message || fallback;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {}
});

// Attach token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Let browser set multipart boundaries for FormData
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  } else {
    config.headers["Content-Type"] = "application/json";
  }
  return config;
});

// Handle API response shape + auth errors globally
api.interceptors.response.use(
  (response) => {
    const payload = response?.data;
    if (payload && typeof payload === "object" && "success" in payload) {
      if (!payload.success) {
        const error = new Error(payload.message || "Request failed");
        error.response = response;
        throw error;
      }
      response.apiMessage = payload.message;
      response.data = payload.data;
    }
    return response;
  },
  (error) => {
    error.apiMessage = getApiErrorMessage(error);

    if (error.response?.status === 403) {
      const message = error.apiMessage || "";
      if (message.toLowerCase().includes("banned")) {
        localStorage.removeItem("token");
        window.location.href = "/login?banned=1";
      }
    }
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
