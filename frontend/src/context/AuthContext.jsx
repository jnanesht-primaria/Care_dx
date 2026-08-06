// frontend/src/context/AuthContext.jsx
import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);
const login = (accessToken, userData) => {
  console.log('🔑 Login called – saving token:', accessToken);  // ← add this
  setToken(accessToken);
  setUser(userData);
  localStorage.setItem("caredx_token", accessToken);
  localStorage.setItem("user", JSON.stringify(userData));
};
export function AuthProvider({ children }) {
  // ✅ Use "caredx_token" to match axios interceptor
  const [token, setToken] = useState(() => localStorage.getItem("caredx_token"));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

  const login = (accessToken, userData) => {
    setToken(accessToken);
    setUser(userData);
    localStorage.setItem("caredx_token", accessToken);   // ✅ changed from "token"
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("caredx_token");             // ✅ changed from "token"
    localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}