// frontend/src/pages/technician/Dashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  fetchTechnicianStats,
  claimAppointment,
  updateTechnicianAppointmentStatus,
  getInvoice,
  getDashboardPatientsToday,
  getDashboardTestsToday,
  getDashboardCompletedToday,
  getDashboardPendingToday,
  getDashboardInvoicesToday,
  getDashboardRevenueToday,
} from '../../api/technician';
import StatCard from './components/StatCard';
import ResultModal from './components/ResultModal';
import Sidebar from './components/Sidebar';
import AddPatient from './components/PatientRegistration';
import AddTest from './components/BookTests';
import Billing from './components/Billing';
import SampleCollection from './components/SampleCollection';
import PatientTestStatus from './components/Patients';
import Reporting from './components/Reporting';
import ReportManagement from './components/ReportManagement';
import {
  FaUserFriends,
  FaCheckCircle,
  FaFlask,
  FaClock,
  FaFileInvoiceDollar,
  FaRupeeSign,
} from 'react-icons/fa';
import './Dashboard.css';

const escapeHtml = (val) =>
  String(val ?? '').replace(/[&<>"']/g, (c) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[c];
  });

const buildInvoiceHtml = (booking, patient) => {
  const rows = (booking.items || [])
    .map(
      (t) => `
        <tr>
          <td>${escapeHtml(t.test_name)}</td>
          <td>${Number(t.rate).toFixed(2)}</td>
          <td>${Number(t.discount).toFixed(2)}</td>
          <td>${Number(t.final_price).toFixed(2)}</td>
        </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Invoice - Booking #${booking.id}</title>
<style>
  @page { size: A4 portrait; margin: 15mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Roboto, Arial, sans-serif; color: #1e293b; line-height: 1.5; }
  .invoice-title { text-align: center; font-size: 22px; margin-bottom: 16px; }
  .invoice-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; font-size: 15px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px dashed #cbd5e1; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 16px; }
  th { background: #f1f5f9; text-align: left; padding: 8px; border: 1px solid #e2e8f0; }
  td { padding: 8px; border: 1px solid #e2e8f0; }
  .totals { margin-left: auto; width: 260px; font-size: 15px; }
  .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
  .totals .grand { border-top: 1px solid #0f172a; font-weight: 700; margin-top: 4px; padding-top: 6px; }
</style>
</head>
<body>
  <h2 class="invoice-title">Payment Invoice</h2>
  <div class="invoice-meta">
    <p><strong>Booking No:</strong> #${booking.id}</p>
    <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
    <p><strong>Patient:</strong> ${escapeHtml(patient?.first_name)} ${escapeHtml(patient?.last_name)}</p>
    <p><strong>Patient ID:</strong> ${escapeHtml(patient?.patient_id)}</p>
    <p><strong>Mobile:</strong> ${escapeHtml(patient?.mobile)}</p>
    <p><strong>Payment Mode:</strong> ${escapeHtml(booking.payment_mode)}</p>
  </div>
  <table>
    <thead><tr><th>Test</th><th>Rate (₹)</th><th>Discount (₹)</th><th>Final (₹)</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <div><span>Total</span><span>₹${Number(booking.total_amount || 0).toFixed(2)}</span></div>
    <div><span>Paid</span><span>₹${Number(booking.paid_amount || 0).toFixed(2)}</span></div>
    <div class="grand"><span>Balance</span><span>₹${Number(booking.balance || 0).toFixed(2)}</span></div>
  </div>
</body>
</html>`;
};

const printHtmlInIframe = (html) => {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  iframe.contentWindow.focus();
  iframe.contentWindow.print();
  iframe.contentWindow.onafterprint = () => document.body.removeChild(iframe);
};

const CARD_FETCHERS = {
  patients: {
    fetch: getDashboardPatientsToday,
    label: "Today's Patients",
    columns: ['patient_id', 'name', 'age', 'gender', 'mobile', 'registered_at'],
  },
  tests: {
    fetch: getDashboardTestsToday,
    label: "Today's Tests",
    columns: ['patient_name', 'test_name', 'category', 'booking_time', 'status'],
  },
  completed: {
    fetch: getDashboardCompletedToday,
    label: 'Tests Completed',
    columns: ['patient_name', 'test_name', 'result_status', 'completed_at'],
  },
  pending: {
    fetch: getDashboardPendingToday,
    label: 'Pending Tests',
    columns: ['patient_name', 'test_name', 'pending_since', 'status'],
  },
  invoices: {
    fetch: getDashboardInvoicesToday,
    label: "Today's Invoices",
    columns: ['invoice_no', 'patient_name', 'date', 'amount', 'payment_status'],
  },
  revenue: {
    fetch: getDashboardRevenueToday,
    label: "Today's Revenue",
    columns: ['patient_name', 'invoice_no', 'amount', 'payment_mode', 'paid_at'],
  },
};

const getTodayStr = () => new Date().toISOString().slice(0, 10);

const formatCurrency = (value) => {
  const num = Number(value) || 0;
  return `₹${num.toLocaleString('en-IN')}`;
};

export default function TechnicianDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [date, setDate] = useState(getTodayStr());
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [resultTarget, setResultTarget] = useState(null);

  const [activeCard, setActiveCard] = useState(null);
  const [detailRows, setDetailRows] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleCardClick = async (key) => {
    if (activeCard === key) {
      setActiveCard(null);
      return;
    }
    setActiveCard(key);
    setDetailLoading(true);
    try {
      const res = await CARD_FETCHERS[key].fetch(date);
      setDetailRows(Array.isArray(res.data) ? res.data : []);
    } catch {
      setDetailRows([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDownloadInvoice = async (bookingId) => {
    try {
      const res = await getInvoice(bookingId);
      const { booking, patient } = res.data;
      const html = buildInvoiceHtml(booking, patient);
      printHtmlInIframe(html);
    } catch (err) {
      console.error('Invoice download failed:', err);
      showToast('Could not load invoice for download.', 'error');
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const statsRes = await fetchTechnicianStats(date);
      setStats(statsRes.data);
    } catch (err) {
      setError(err.data?.message || err.message || 'Could not load dashboard stats.');
    } finally {
      setLoading(false);
    }
  }, [date]);

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
    try {
      await updateTechnicianAppointmentStatus(appointmentId, nextStatus);
      showToast(`Marked as ${nextStatus}.`, 'success');
      loadData();
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

  const handleTabChange = (tab) => {
    if (tab === 'logout') {
      logout();
      navigate('/login');
      return;
    }
    setActiveTab(tab);
  };

  const todayPatients = stats?.today_patients || 0;
  const todayTests = stats?.today_tests || 0;
  const totalCompleted = stats?.completed_tests || 0;
  const pendingTests = stats?.pending_tests || 0;
  const invoicesCount = stats?.invoices_count || 0;
  const revenue = stats?.revenue || 0;

  return (
    <div className="tech-dashboard">
      {toast && (
        <div className={`tech-toast tech-toast--${toast.type}`}>
          {toast.message}
        </div>
      )}

      <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="tech-main">
        <div className="tech-content">
          {activeTab === 'dashboard' && (
            <div className="dashboard-container">
              <h1 className="page-title">Technician Dashboard</h1>

              <div className="stats-grid">
                <StatCard label="Today's Patients" value={todayPatients} icon={<FaUserFriends />} color="#9775fa" onClick={() => handleCardClick('patients')} />
                <StatCard label="Today's Tests" value={todayTests} icon={<FaFlask />} color="#20c997" onClick={() => handleCardClick('tests')} />
                <StatCard label="Tests Completed" value={totalCompleted} icon={<FaCheckCircle />} color="#51cf66" onClick={() => handleCardClick('completed')} />
                <StatCard label="Pending Tests" value={pendingTests} icon={<FaClock />} color="#f59e0b" onClick={() => handleCardClick('pending')} />
                <StatCard label="Invoices" value={invoicesCount} icon={<FaFileInvoiceDollar />} color="#3b82f6" onClick={() => handleCardClick('invoices')} />
                <StatCard label="Revenue" value={formatCurrency(revenue)} icon={<FaRupeeSign />} color="#ef4444" onClick={() => handleCardClick('revenue')} />
              </div>

              {activeCard && (
                <div className="dashboard-detail-panel">
                  <h3>{CARD_FETCHERS[activeCard].label} — {date}</h3>
                  {detailLoading ? (
                    <p>Loading...</p>
                  ) : detailRows.length === 0 ? (
                    <p>No records for today.</p>
                  ) : (
                    <table className="tests-table">
                      <thead>
                        <tr>
                          {CARD_FETCHERS[activeCard].columns.map((c) => (
                            <th key={c}>{c.replace(/_/g, ' ')}</th>
                          ))}
                          {activeCard === 'invoices' && <th>Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {detailRows.map((row, i) => (
                          <tr key={i}>
                            {CARD_FETCHERS[activeCard].columns.map((c) => (
                              <td key={c}>{String(row[c] ?? '')}</td>
                            ))}
                            {activeCard === 'invoices' && (
                              <td>
                                <button className="download-invoice-btn" onClick={() => handleDownloadInvoice(row.booking_id)}>
                                  📄 Download
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {error && <div className="dashboard-error">{error}</div>}
            </div>
          )}

          {activeTab === 'add-patient' && <AddPatient />}
          {activeTab === 'add-test' && <AddTest onBookingComplete={loadData} />}
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