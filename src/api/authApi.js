import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

export const login = async (data) => {
  const res = await api.post("/Auth/login", data);
  return res.data;
};