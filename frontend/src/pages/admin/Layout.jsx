// frontend/src/pages/admin/Layout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './common/Sidebar';
import './Layout.css';

const Layout = () => {
  return (
    <div className="admin-layout">
      <Sidebar />
      <div className="admin-content">
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;