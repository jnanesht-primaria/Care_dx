// frontend/src/pages/receptionist/Layout.jsx
import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './common/Sidebar';
import './Layout.css';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="receptionist-layout">
      <Sidebar />
      <div className="main-content">
        <header className="top-header">
          <div className="header-left">
            {/* Logo removed */}
            <span className="header-brand">CareDx</span>
            <span className="header-welcome">Welcome, {user?.username}</span>
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