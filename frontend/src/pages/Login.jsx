import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loginRequest } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

const ROLE_ROUTES = {
  ADMIN: "/admin",
  TECHNICIAN: "/technician",
  RECEPTIONIST: "/receptionist",
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Simulate logo splash screen
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1800); // 1.8 seconds – adjust as needed
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await loginRequest(email, password);
      login(data.access_token, data.user);
      navigate(ROLE_ROUTES[data.user.role] || "/login");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Splash screen (logo animation)
  if (showSplash) {
    return (
      <div className="splash-screen">
        <div className="splash-logo-wrapper">
          <img src="/primaria_logo.png" alt="Primaria Logo" className="splash-logo" />
        </div>
      </div>
    );
  }

  // Login form
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <img src="/primaria_logo.png" alt="Primaria Logo" className="login-logo" />
          <h1>Primaria Healthcare</h1>
          <p>Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          {error && <div className="login-error">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {/* Role tags removed – no longer displayed */}
      </div>
    </div>
  );
}