// frontend/src/pages/receptionist/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { getDashboard } from '../../api/receptionist';
import { FaUsers, FaFlask, FaFileAlt, FaMoneyBillWave, FaUserMd, FaCalendarAlt } from 'react-icons/fa';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState({
    patients_today: 0,
    bookings_today: 0,
    pending_reports: 0,
    collections: 0,
    camp_registrations: 0,
    upcoming_camps: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then((res) => {
        setStats(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load dashboard', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loader"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  const cards = [
    {
      id: 1,
      label: 'Patients Today',
      value: stats.patients_today,
      icon: <FaUsers className="stat-icon" />,
      color: '#4f46e5',
      bgColor: '#eef2ff',
    },
    {
      id: 2,
      label: 'Tests Booked Today',
      value: stats.bookings_today,
      icon: <FaFlask className="stat-icon" />,
      color: '#0ea5e9',
      bgColor: '#e0f2fe',
    },
    {
      id: 3,
      label: 'Pending Reports',
      value: stats.pending_reports,
      icon: <FaFileAlt className="stat-icon" />,
      color: '#f59e0b',
      bgColor: '#fef3c7',
    },
    {
      id: 4,
      label: 'Collections (₹)',
      value: `₹${stats.collections.toLocaleString()}`,
      icon: <FaMoneyBillWave className="stat-icon" />,
      color: '#10b981',
      bgColor: '#d1fae5',
    },
    {
      id: 5,
      label: 'Camp Registrations',
      value: stats.camp_registrations,
      icon: <FaUserMd className="stat-icon" />,
      color: '#8b5cf6',
      bgColor: '#ede9fe',
    },
    {
      id: 6,
      label: 'Upcoming Camps',
      value: stats.upcoming_camps,
      icon: <FaCalendarAlt className="stat-icon" />,
      color: '#ec4899',
      bgColor: '#fce7f3',
    },
  ];

  return (
    <div className="dashboard-container">
      
      <div className="stats-grid">
        {cards.map((card) => (
          <div className="stat-card" key={card.id} style={{ borderLeftColor: card.color }}>
            <div className="stat-icon-wrapper" style={{ backgroundColor: card.bgColor, color: card.color }}>
              {card.icon}
            </div>
            <span className="stat-label">{card.label}</span>
            <span className="stat-value">{card.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;