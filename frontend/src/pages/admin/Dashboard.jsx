// frontend/src/pages/admin/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminDashboard } from '../../api/admin';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState({
    total_patients: 0,
    tests_conducted: 0,
    pending_reports: 0,
    collaborated_labs: 0,
    total_revenue: 0,
    total_staff: 0,
    upcoming_camps: 0,
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getAdminDashboard()
      .then((res) => {
        setStats(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load admin dashboard', err);
        setLoading(false);
      });
  }, []);

  const handleLogout = () => {
    // Confirm logout action (optional)
    if (window.confirm('Are you sure you want to logout?')) {
      // Clear authentication token (adjust key as per your implementation)
      localStorage.removeItem('token'); // or sessionStorage.removeItem('token')
      // Optionally call a logout API if needed
      // await logoutApi();
      // Redirect to login page
      navigate('/login');
    }
  };

  if (loading) return <div className="loading">Loading dashboard...</div>;

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Patients</span>
          <span className="stat-value">{stats.total_patients}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Tests Conducted</span>
          <span className="stat-value">{stats.tests_conducted}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pending Reports</span>
          <span className="stat-value">{stats.pending_reports}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Collaborated Labs</span>
          <span className="stat-value">{stats.collaborated_labs}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Revenue (₹)</span>
          <span className="stat-value">₹{stats.total_revenue.toLocaleString()}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Staff</span>
          <span className="stat-value">{stats.total_staff}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Upcoming Camps</span>
          <span className="stat-value">{stats.upcoming_camps}</span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;