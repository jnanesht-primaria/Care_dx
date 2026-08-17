// frontend/src/pages/technician/components/Sidebar.jsx
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  FaTachometerAlt,
  FaUserInjured,
  FaUserPlus,
  FaClipboardList,
  FaFileInvoice,
  FaFileAlt,
  FaFolderOpen,
  FaSignOutAlt,
  FaBars,
  FaTimes,
} from 'react-icons/fa';
import './Sidebar.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { path: '/technician/dashboard', label: 'Dashboard', icon: FaTachometerAlt },
    { path: '/technician/patients', label: 'Patients', icon: FaUserInjured },
    { path: '/technician/register', label: 'Register Patient', icon: FaUserPlus },
    { path: '/technician/book-tests', label: 'Book Tests', icon: FaClipboardList },
    { path: '/technician/billing', label: 'Billing', icon: FaFileInvoice },
    { path: '/technician/reporting', label: 'Reporting', icon: FaFileAlt },
    { path: '/technician/report-management', label: 'Report Management', icon: FaFolderOpen },
  ];

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('token');
      navigate('/login');
    }
  };

  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {/* Hamburger — only shown on mobile via CSS */}
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
          <img src="\public\logo.jpeg" alt="CareDx Logo" className="brand-logo" />
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