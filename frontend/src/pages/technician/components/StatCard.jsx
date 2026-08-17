// components/StatCard.jsx
import React from 'react';
import './StatCard.css';

export default function StatCard({ label, value, icon, color, trend, onClick }) {
  return (
    <div
      className="tech-stat-card"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="tech-stat-icon" style={{ background: `${color}15`, color: color }}>
        {icon}
      </div>
      <div className="tech-stat-info">
        <span className="tech-stat-value">{value}</span>
        <span className="tech-stat-label">{label}</span>
        {trend && (
          <span className={`tech-stat-trend ${trend > 0 ? 'up' : 'down'}`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  );
}