// frontend/src/pages/receptionist/common/Sidebar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  FaHome, 
  FaUsers, 
  FaUserPlus, 
  FaFlask, 
  FaFileInvoiceDollar, 
  FaClipboardCheck, 
  FaCoins, 
  FaMoneyBillWave, 
  FaHospitalUser, 
  FaCalendarAlt 
} from 'react-icons/fa';
import './Sidebar.css';

const Sidebar = () => {
  const menuItems = [
    { path: '/receptionist/dashboard', label: 'Dashboard', icon: <FaHome /> },
    { path: '/receptionist/patients', label: 'Patients', icon: <FaUsers /> },
    { path: '/receptionist/register', label: 'Register Patient', icon: <FaUserPlus /> },
    { path: '/receptionist/book-tests', label: 'Book Tests', icon: <FaFlask /> },
    { path: '/receptionist/billing', label: 'Billing', icon: <FaFileInvoiceDollar /> },
    { path: '/receptionist/report-status', label: 'Report Status', icon: <FaClipboardCheck /> },
    { path: '/receptionist/finance', label: 'Finance', icon: <FaCoins /> },
    { path: '/receptionist/camp-budget', label: 'Camp Budget', icon: <FaMoneyBillWave /> },
    { path: '/receptionist/camp-patient', label: 'Camp Patient Entry', icon: <FaHospitalUser /> },
    { path: '/receptionist/upcoming-camps', label: 'Upcoming Camps', icon: <FaCalendarAlt /> },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src="/logo.png" alt="CareDx Logo" className="sidebar-logo" />
        {/* Brand name removed – now in Layout header */}
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              isActive ? 'sidebar-link active' : 'sidebar-link'
            }
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;