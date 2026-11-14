import api from "./api";

export const loginUser = async (identifiant, password) => {
  const response = await api.post("/auth/login/", {
    identifiant,
    password,
  });

  return response.data;
};

export const refreshToken = async (refresh) => {
  const response = await api.post("/auth/refresh/", {
    refresh,
  });

  return response.data;
};

export const logoutUser = async (refresh) => {
  const response = await api.post("/auth/logout/", {
    refresh,
  });

  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get("/auth/me/");

  return response.data;
};