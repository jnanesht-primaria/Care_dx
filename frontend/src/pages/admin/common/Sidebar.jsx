// frontend/src/pages/admin/common/Sidebar.jsx
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  FaTachometerAlt,
  FaUsers,
  FaBuilding,
  FaFlask,
  FaFileAlt,
  FaSignOutAlt,
  FaBars,
  FaTimes,
} from 'react-icons/fa';
import './Sidebar.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: FaTachometerAlt },
    { path: '/admin/users', label: 'User Management', icon: FaUsers },
    { path: '/admin/labs', label: 'Partner Management', icon: FaBuilding },
    { path: '/admin/tests', label: 'Test Catalog', icon: FaFlask },
    { path: '/admin/reports', label: 'Reports', icon: FaFileAlt },
  ];

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('caredx_token');
      navigate('/login');
    }
  };

  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {/* Hamburger — only visible on mobile */}
      <button
        className="mobile-menu-toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Toggle navigation menu"
      >
        {isOpen ? <FaTimes /> : <FaBars />}
      </button>

      {/* Backdrop, tap to close */}
      {isOpen && <div className="sidebar-overlay" onClick={closeMenu} />}

      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <img src="/primaria_logo.png" alt="Primaria Logo" className="brand-logo" />
          <div className="brand-text"></div>
        </div>

        <div className="nav-label">NAVIGATION</div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={closeMenu}
              className={({ isActive }) =>
                isActive ? 'sidebar-link active' : 'sidebar-link'
              }
            >
              <item.icon className="sidebar-icon" />
              <span className="sidebar-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-logout" onClick={handleLogout}>
            <FaSignOutAlt className="sidebar-icon" />
            <span className="sidebar-label">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;