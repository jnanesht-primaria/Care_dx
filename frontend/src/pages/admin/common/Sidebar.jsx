// frontend/src/pages/admin/common/Sidebar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = () => {
  const menuItems = [
    { path: '/admin/dashboard', label: 'Dashboard' },
    { path: '/admin/users', label: 'User Management' },
    { path: '/admin/labs', label: 'Partner Management' },
    { path: '/admin/tests', label: 'Test Catalog' },
    { path: '/admin/reports', label: 'Reports' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">CareDx Admin</div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              isActive ? 'sidebar-link active' : 'sidebar-link'
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;