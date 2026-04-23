import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");

    const decodeJwtPayload = (rawToken) => {
      const base64Url = rawToken.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
      return JSON.parse(atob(padded));
    };

    const normalizeUserFromPayload = (payload) => {
      const username =
        payload.unique_name ||
        payload.name ||
        payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"];
      const role =
        payload.role ||
        payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
      const id =
        payload.sub ||
        payload.nameid ||
        payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];

      if (!id || !role) return null;
      return { id, role, username };
    };

    const hydrateFromToken = () => {
      try {
        const payload = decodeJwtPayload(token);
        const normalized = normalizeUserFromPayload(payload);
        if (!normalized) return false;
        setUser(normalized);
        return true;
      } catch (err) {
        return false;
      }
    };

    const hydrateFromApi = async () => {
      try {
        const res = await api.get("/auth/me");
        setUser(res.data);
      } catch (err) {
        localStorage.removeItem("token");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      const ok = hydrateFromToken();
      if (ok) {
        hydrateFromApi();
        return;
      }
      hydrateFromApi();
      return;
    }

    setLoading(false);
  }, []);

  const login = (token, userFromResponse) => {
    localStorage.setItem("token", token);

    if (userFromResponse?.id) {
      setUser(userFromResponse);
      return;
    }

    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
      const payload = JSON.parse(atob(padded));
      const username =
        payload.unique_name ||
        payload.name ||
        payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"];
      const role =
        payload.role ||
        payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
      const id =
        payload.sub ||
        payload.nameid ||
        payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];
      if (!id || !role) throw new Error("Invalid token claims");
      setUser({ id, role, username });
    } catch (err) {
      localStorage.removeItem("token");
      setUser(null);
    }
  };

  const refreshUser = async () => {
    const res = await api.get("/auth/me");
    setUser(res.data);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        refreshUser,
        logout,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
