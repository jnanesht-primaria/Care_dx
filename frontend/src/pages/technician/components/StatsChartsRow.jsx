// frontend/src/pages/technician/components/StatsChartsRow.jsx
import React from 'react';
import {
  BarChart,
  Bar,
  RadialBarChart,
  RadialBar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
  LabelList,
  PolarAngleAxis,
} from 'recharts';
import './StatsChartsRow.css';

const formatCurrency = (value) => {
  const num = Number(value) || 0;
  return `₹${num.toLocaleString('en-IN')}`;
};

// Rounds a value up to a "nice" ceiling so gauge charts have headroom
// instead of always reading as 100% full.
const niceCeiling = (value) => {
  const v = Number(value) || 0;
  if (v <= 0) return 10;
  const magnitude = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil((v * 1.3) / magnitude) * magnitude;
};

export default function StatsChartsRow({
  todayPatients = 0,
  totalCompleted = 0,
  todayTests = 0,
  pendingTests = 0,
  invoicesCount = 0,
  revenue = 0,
  totalQueueCount = 0,
}) {
  // ── Card 1: Today's Patients → vertical bar ──────────────────
  const patientsData = [{ name: "Today's Patients", value: todayPatients }];

  // ── Card 2: Tests Completed → radial gauge vs total queue ────
  const completedMax = Math.max(totalQueueCount, totalCompleted, 1);
  const completedData = [
    { name: 'Completed', value: totalCompleted, fill: '#51cf66' },
  ];

  // ── Card 3: Today's Tests → donut of pending vs completed ────
  const statusPieData = [
    { name: 'Pending', value: pendingTests, fill: '#f59e0b' },
    { name: 'Completed', value: totalCompleted, fill: '#20c997' },
  ].filter((d) => d.value > 0);
  const hasStatusData = statusPieData.length > 0;

  // ── Card 4: Pending Tests → horizontal bar ────────────────────
  const pendingData = [{ name: 'Pending Tests', value: pendingTests }];

  // ── Card 5: Invoices → area comparison vs today's tests ──────
  const invoicesAreaData = [
    { name: 'Tests', value: todayTests },
    { name: 'Invoices', value: invoicesCount },
  ];

  // ── Card 6: Revenue → radial gauge vs a rounded ceiling ───────
  const revenueMax = niceCeiling(revenue);
  const revenueData = [{ name: 'Revenue', value: revenue, fill: '#ef4444' }];

  return (
    <div className="charts-row">
      {/* 1. Today's Patients — bar */}
      <div className="chart-card">
        <div className="chart-card-header">
          <span className="chart-card-label">Today's Patients</span>
          <span className="chart-card-value" style={{ color: '#9775fa' }}>
            {todayPatients}
          </span>
        </div>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={patientsData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <Tooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
            <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={40}>
              <Cell fill="#9775fa" />
              <LabelList dataKey="value" position="top" style={{ fontSize: 12, fontWeight: 600, fill: '#334155' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 2. Tests Completed — radial gauge */}
      <div className="chart-card">
        <div className="chart-card-header">
          <span className="chart-card-label">Tests Completed</span>
          <span className="chart-card-value" style={{ color: '#51cf66' }}>
            {totalCompleted}
          </span>
        </div>
        <ResponsiveContainer width="100%" height={130}>
          <RadialBarChart
            data={completedData}
            innerRadius="55%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            barSize={14}
          >
            <PolarAngleAxis type="number" domain={[0, completedMax]} tick={false} />
            <RadialBar dataKey="value" cornerRadius={8} background />
            <Tooltip />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>

      {/* 3. Today's Tests — status donut */}
      <div className="chart-card">
        <div className="chart-card-header">
          <span className="chart-card-label">Today's Tests</span>
          <span className="chart-card-value" style={{ color: '#20c997' }}>
            {todayTests}
          </span>
        </div>
        {hasStatusData ? (
          <ResponsiveContainer width="100%" height={130}>
            <PieChart>
              <Pie
                data={statusPieData}
                dataKey="value"
                nameKey="name"
                innerRadius={30}
                outerRadius={50}
                paddingAngle={3}
              >
                {statusPieData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="chart-empty">No status data yet</div>
        )}
      </div>

      {/* 4. Pending Tests — horizontal bar */}
      <div className="chart-card">
        <div className="chart-card-header">
          <span className="chart-card-label">Pending Tests</span>
          <span className="chart-card-value" style={{ color: '#f59e0b' }}>
            {pendingTests}
          </span>
        </div>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart
            data={pendingData}
            layout="vertical"
            margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
          >
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" hide />
            <Tooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
            <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={28}>
              <Cell fill="#f59e0b" />
              <LabelList dataKey="value" position="right" style={{ fontSize: 12, fontWeight: 600, fill: '#334155' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 5. Invoices — area comparison vs today's tests */}
      <div className="chart-card">
        <div className="chart-card-header">
          <span className="chart-card-label">Invoices</span>
          <span className="chart-card-value" style={{ color: '#3b82f6' }}>
            {invoicesCount}
          </span>
        </div>
        <ResponsiveContainer width="100%" height={130}>
          <AreaChart data={invoicesAreaData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              fill="#bfdbfe"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 6. Revenue — radial gauge */}
      <div className="chart-card">
        <div className="chart-card-header">
          <span className="chart-card-label">Revenue</span>
          <span className="chart-card-value" style={{ color: '#ef4444' }}>
            {formatCurrency(revenue)}
          </span>
        </div>
        <ResponsiveContainer width="100%" height={130}>
          <RadialBarChart
            data={revenueData}
            innerRadius="55%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            barSize={14}
          >
            <PolarAngleAxis type="number" domain={[0, revenueMax]} tick={false} />
            <RadialBar dataKey="value" cornerRadius={8} background />
            <Tooltip formatter={(val) => formatCurrency(val)} />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
