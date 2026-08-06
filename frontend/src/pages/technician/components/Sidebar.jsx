// frontend/src/pages/technician/components/Sidebar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = () => {
  const menuItems = [
    { path: '/technician/dashboard', label: 'Dashboard' },
    { path: '/technician/patients', label: 'Patients' },
    { path: '/technician/register', label: 'Register Patient' },
    { path: '/technician/book-tests', label: 'Book Tests' },
    { path: '/technician/billing', label: 'Billing' },
    { path: '/technician/tests-queue', label: 'Tests Queue' },
    { path: '/technician/sample-collection', label: 'Sample Collection' },
    { path: '/technician/reporting', label: 'Reporting' },
    { path: '/technician/report-management', label: 'Report Management' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">CareDx</div>
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