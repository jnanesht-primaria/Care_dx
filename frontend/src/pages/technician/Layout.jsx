// frontend/src/pages/technician/Layout.jsx
import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './components/Sidebar';
import './Layout.css';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="technician-layout">
      <Sidebar />
      <div className="main-content">
        <header className="top-header">
          <div>
            <span>Welcome, {user?.username}</span>
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