import { useCallback, useMemo, useState } from "react";
import axios from "axios";
import AuthContext from "./authContext.js";

const AUTH_STORAGE_KEY = "ai-interview-auth";
const AUTH_API_BASE_URL = "http://localhost:5000/api/auth";

const getStoredAuth = () => {
  if (typeof window === "undefined") {
    return { user: null, token: null };
  }

  const storedAuth = window.localStorage.getItem(AUTH_STORAGE_KEY);

  if (!storedAuth) {
    return { user: null, token: null };
  }

  try {
    return JSON.parse(storedAuth);
  } catch {
    return { user: null, token: null };
  }
};

const saveAuth = (auth) => {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
};

const clearAuth = () => {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
};

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(() => {
    const storedAuth = getStoredAuth();

    if (storedAuth.token) {
      axios.defaults.headers.common.Authorization = `Bearer ${storedAuth.token}`;
    }

    return storedAuth;
  });

  const setAuthState = useCallback((nextUser, nextToken) => {
    setAuth({ user: nextUser, token: nextToken });

    if (nextToken) {
      axios.defaults.headers.common.Authorization = `Bearer ${nextToken}`;
      saveAuth({ user: nextUser, token: nextToken });
      return;
    }

    delete axios.defaults.headers.common.Authorization;
    clearAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await axios.post(`${AUTH_API_BASE_URL}/login`, { email, password });
    const { user: nextUser, token: nextToken } = response.data;

    setAuthState(nextUser, nextToken);
    return response.data;
  }, [setAuthState]);

  const register = useCallback(async (name, email, password) => {
    const response = await axios.post(`${AUTH_API_BASE_URL}/register`, {
      name,
      email,
      password,
    });
    const { user: nextUser, token: nextToken } = response.data;

    setAuthState(nextUser, nextToken);
    return response.data;
  }, [setAuthState]);

  const logout = useCallback(() => {
    setAuthState(null, null);
  }, [setAuthState]);

  const value = useMemo(
    () => ({
      user: auth.user,
      token: auth.token,
      isAuthenticated: Boolean(auth.token),
      login,
      logout,
      register,
    }),
    [auth, login, logout, register]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};