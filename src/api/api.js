import axios from "axios";

const api = axios.create({
  baseURL: "https://localhost:7277/api", // match your backend
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
    if (error.response?.status === 403) {
      const message = error.response?.data?.message || "";
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
