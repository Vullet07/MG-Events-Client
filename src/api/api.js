import axios from "axios";

const api = axios.create({
  baseURL: "https://localhost:7277/api", // match your backend
  headers: {
    "Content-Type": "application/json"
  }
});

// Attach token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
