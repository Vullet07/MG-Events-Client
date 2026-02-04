import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");

    const hydrateFromToken = () => {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const username =
          payload.unique_name ||
          payload.name ||
          payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"];
        setUser({
          id: payload.sub,
          role: payload.role,
          username
        });
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
      }
    };

    if (token) {
      const ok = hydrateFromToken();
      if (!ok) {
        hydrateFromApi();
      } else {
        hydrateFromApi();
      }
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
      const payload = JSON.parse(atob(token.split(".")[1]));
      const username =
        payload.unique_name ||
        payload.name ||
        payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"];
      setUser({
        id: payload.sub,
        role: payload.role,
        username
      });
    } catch (err) {
      localStorage.removeItem("token");
      setUser(null);
    }
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
        logout,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
