// components/StatsChartsRow.jsx
import React from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import './StatsChartsRow.css';

const buildData = (value) => ([
  { name: 'Mon', v: Math.max(value * 0.3, 0) },
  { name: 'Tue', v: Math.max(value * 0.5, 0) },
  { name: 'Wed', v: Math.max(value * 0.4, 0) },
  { name: 'Thu', v: Math.max(value * 0.7, 0) },
  { name: 'Fri', v: Math.max(value * 0.6, 0) },
  { name: 'Sat', v: Math.max(value * 0.9, 0) },
  { name: 'Today', v: value },
]);

function ChartCard({ label, value, color, trendData }) {
  const data = trendData && trendData.length > 0 ? trendData : buildData(value);

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <span className="chart-card-label">{label}</span>
        <span className="chart-card-value" style={{ color }}>{value}</span>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
            labelStyle={{ color: '#5a6f84' }}
          />
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            fill={`url(#grad-${label})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function StatsChartsRow({ todayPatients, totalCompleted, todayTests }) {
  return (
    <div className="charts-row">
      <ChartCard label="Today's Patients" value={todayPatients} color="#9775fa" />
      <ChartCard label="Tests Completed" value={totalCompleted} color="#51cf66" />
      <ChartCard label="Today's Tests" value={todayTests} color="#20c997" />
    </div>
  );
}