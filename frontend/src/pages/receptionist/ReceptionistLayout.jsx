// frontend/src/pages/receptionist/ReceptionistLayout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './common/Sidebar';
import './ReceptionistLayout.css'; // optional styling

const ReceptionistLayout = () => {
  return (
    <div className="receptionist-layout">
      <Sidebar />
      <div className="receptionist-content">
        <Outlet />
      </div>
    </div>
  );
};

export default ReceptionistLayout;