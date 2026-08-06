// frontend/src/pages/technician/Dashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  fetchTechnicianStats, 
  fetchTechnicianQueue,
  claimAppointment,
  updateTechnicianAppointmentStatus,
} from '../../api/technician';
import StatCard from './components/StatCard';          // ✅ now exists
import QueueTable from './components/QueueTable';      // ✅ now exists
import ResultModal from './components/ResultModal';    // ✅ now exists
import Sidebar from './components/Sidebar';

// Import page components – use the actual filenames
import AddPatient from './components/PatientRegistration';   // renamed import
import AddTest from './components/BookTests';               // renamed import
import Billing from './components/Billing';
import SampleCollection from './components/SampleCollection';
import PatientTestStatus from './components/Patients';      // or whatever you have – adjust as needed
import Reporting from './components/Reporting';
import ReportManagement from './components/ReportManagement';

import './Dashboard.css';

// ... rest of your component remains the same

const today = () => new Date().toISOString().slice(0, 10);

export default function TechnicianDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();                        // ← ADD this
  const [activeTab, setActiveTab] = useState('dashboard');
  const [date, setDate] = useState(today());
  const [scope, setScope] = useState('mine');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [resultTarget, setResultTarget] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, queueRes] = await Promise.all([
        fetchTechnicianStats(date),
        fetchTechnicianQueue({ scope, date, search: search || undefined }),
      ]);
      setStats(statsRes.data);    
      console.log('📊 Stats data:', statsRes.data);
         setQueue(Array.isArray(queueRes) ? queueRes : []);
    } catch (err) {
      setError(err.data?.message || err.message || 'Could not load your queue.');
    } finally {
      setLoading(false);
    }
  }, [date, scope, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleClaim = async (appointmentId) => {
    try {
      await claimAppointment(appointmentId);
      showToast('Appointment claimed successfully!', 'success');
      loadData();
    } catch (err) {
      showToast(err.data?.message || 'Could not claim appointment.', 'error');
      loadData();
    }
  };

  const handleStatusChange = async (appointmentId, nextStatus) => {
    setQueue((prev) =>
      prev.map((a) => (a.id === appointmentId ? { ...a, status: nextStatus } : a))
    );
    try {
      await updateTechnicianAppointmentStatus(appointmentId, nextStatus);
      showToast(`Marked as ${nextStatus}.`, 'success');
    } catch (err) {
      showToast('Could not update status.', 'error');
      loadData();
    }
  };

  const handleResultSaved = () => {
    setResultTarget(null);
    showToast('Result saved successfully!', 'success');
    loadData();
  };

  // 🔥 UPDATED: handle tab change and logout
  const handleTabChange = (tab) => {
    if (tab === 'logout') {
      logout();             // Clear auth state
      navigate('/login');   // Redirect to login page
      return;
    }
    setActiveTab(tab);
  };

  return (
  <div className="tech-dashboard">
    {toast && (
      <div className={`tech-toast tech-toast--${toast.type}`}>
        {toast.message}
      </div>
    )}

    <Sidebar 
      activeTab={activeTab} 
      onTabChange={handleTabChange} 
      onLogout={logout}
    />
    
    <div className="tech-main">
      <div className="tech-content">
        {/* ========== DASHBOARD TAB ========== */}

 {activeTab === 'dashboard' && (
  <div className="dashboard-container">
    <h1>Dashboard</h1>
    <div className="stats-grid">
      <StatCard label="Total Appointments" value={stats?.total || 0} accent="accent-blue" />
      <StatCard label="Pending" value={stats?.pending || 0} accent="accent-orange" />
      <StatCard label="In Progress" value={stats?.in_progress || 0} accent="accent-yellow" />
      <StatCard label="Completed" value={stats?.completed || 0} accent="accent-green" />
      {/* ✅ Now it's inside the grid */}
      <StatCard 
        label="Total Patients" 
        value={stats?.totalPatients || 0} 
        accent="accent-purple" 
      />
    </div>
    <QueueTable
      queue={queue}
      loading={loading}
      error={error}
      onClaim={handleClaim}
      onStatusChange={handleStatusChange}
      onAddResult={setResultTarget}
      scope={scope}
      setScope={setScope}
      date={date}
      setDate={setDate}
      search={search}
      setSearch={setSearch}
    />
  </div>
)}

        {/* ========== OTHER TABS ========== */}
        {activeTab === 'add-patient' && <AddPatient />}
        {activeTab === 'add-test' && <AddTest />}
        {activeTab === 'billing' && <Billing />}
        {activeTab === 'sample-collection' && <SampleCollection />}
        {activeTab === 'patients' && <PatientTestStatus />}
        {activeTab === 'reporting' && <Reporting />}
        {activeTab === 'reports' && <ReportManagement />}
      </div>
    </div>

    {resultTarget && (
      <ResultModal
        appointment={resultTarget}
        onClose={() => setResultTarget(null)}
        onSaved={handleResultSaved}
      />
    )}
  </div>
);
}