import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchDashboard } from "../api/axios";
import "./DashboardShell.css";

export default function DashboardShell({ title, accent, apiRole }) {
  const { user, logout } = useAuth();
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboard(apiRole)
      .then((data) => setMessage(data.message))
      .catch(() => setMessage("Could not load dashboard data"));
  }, [apiRole]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className={`dashboard ${accent}`}>
      <header className="dashboard-header">
        <div>
          <h1>{title}</h1>
          <p>Signed in as {user?.username}</p>
        </div>
        <button onClick={handleLogout}>Log out</button>
      </header>

      <main className="dashboard-body">
        <div className="dashboard-card">{message || "Loading..."}</div>
      </main>
    </div>
  );
}
