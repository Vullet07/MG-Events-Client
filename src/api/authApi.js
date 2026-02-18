import api from "./api";

export const login = async (data) => {
  const res = await api.post("/Auth/login", data);
  return res.data;
};

export const register = async (data) => {
  const res = await api.post("/Auth/register", data);
  return res.data;
};

export const registerTeacherRequest = async (data) => {
  const res = await api.post("/Auth/register-teacher-request", data);
  return res.data;
};

export const logout = () => {
  localStorage.removeItem("token");
};
