// frontend/src/pages/technician/Layout.jsx
import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './components/Sidebar';
// frontend/src/pages/technician/Layout.jsx
import './Layout.css';
import './MobileGlobal.css'; // add this line
const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Format current date: e.g., "Saturday, 8 August 2026"
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="technician-layout">
      <Sidebar />
      <div className="main-content">
        <header className="top-header">
          <div className="header-left">
            <h1 className="portal-title">Technician Portal</h1>
            <p className="welcome-text">
              Welcome back, <strong>{user?.username || 'Technician'}</strong> · {dateStr}
            </p>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;