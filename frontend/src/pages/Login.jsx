import { useState } from "react";
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
  const { login } = useAuth();
  const navigate = useNavigate();

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

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-mark">SR</div>
          <h1>Service Records</h1>
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

        <div className="login-footer">
          <span className="role-tag admin">Admin</span>
          <span className="role-tag technician">Technician</span>
          <span className="role-tag receptionist">Receptionist</span>
        </div>
      </div>
    </div>
  );
}
