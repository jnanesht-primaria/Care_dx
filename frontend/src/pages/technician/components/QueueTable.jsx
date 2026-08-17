// components/QueueTable.jsx
import React from 'react';
import './QueueTable.css';

export default function QueueTable({
  scope,
  queue = [],
  loading,
  error,
  onClaim,
  onStatusChange,
  onAddResult,
}) {
  if (loading) return <div className="tech-table-loading">Loading appointments...</div>;
  if (error) return <div className="tech-table-error">{error}</div>;

  const getNextStatusLabel = (status) => {
    const flow = {
      Pending: 'Sample Collected',
      'Sample Collected': 'Processing',
      Processing: 'Complete',
    };
    return flow[status] || null;
  };
  const getNextStatusValue = (status) => {
    const flow = {
      Pending: 'Sample Collected',
      'Sample Collected': 'Processing',
      Processing: 'Completed',
    };
    return flow[status] || null;
  };
  const getStatusColor = (status) => {
    const colors = {
      Pending: '#3b82f6',
      'Sample Collected': '#f59e0b',
      Processing: '#8b5cf6',
      Completed: '#10b981',
      Approved: '#10b981',
      Uploaded: '#0ea5e9',
      Delivered: '#6b7280',
    };
    return colors[status] || '#6b7280';
  };

  const getPatientName = (item) =>
    item.patient_name || `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Unknown';

  const getTestNames = (item) =>
    item.test_name || (Array.isArray(item.tests) ? item.tests.map((t) => t.test_name).join(', ') : '—');

  const getDate = (item) => {
    const raw = item.date || item.appointment_date || item.booking_date || item.created_at;
    if (!raw) return '—';
    try {
      return new Date(raw).toLocaleDateString();
    } catch {
      return '—';
    }
  };

  return (
    <div className="tech-queue-table-wrap">
      <div className="tech-queue-table-scroll">
        <table className="tech-queue-table">
          <thead>
            <tr>
              <th>Patient</th>
              <th>Test(s)</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {queue.map((item) => {
              const nextLabel = getNextStatusLabel(item.status);
              const nextStatus = getNextStatusValue(item.status);
              return (
                <tr key={item.id}>
                  <td>
                    <div className="tech-patient-info">
                      <div className="tech-patient-avatar">
                        {getPatientName(item).charAt(0) || 'P'}
                      </div>
                      <div>
                        <div className="tech-patient-name">{getPatientName(item)}</div>
                        {item.patient_phone && (
                          <div className="tech-patient-phone">{item.patient_phone}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>{getTestNames(item)}</td>
                  <td>{getDate(item)}</td>
                  <td>
                    <span className="tech-status" style={{ backgroundColor: getStatusColor(item.status) }}>
                      {item.status}
                    </span>
                  </td>
                  <td>
                    <div className="tech-actions">
                      {scope === 'unassigned' && (
                        <button className="tech-btn tech-btn-primary" onClick={() => onClaim(item.id)}>
                          Claim
                        </button>
                      )}
                      {scope === 'mine' && nextLabel && (
                        <button
                          className="tech-btn tech-btn-success"
                          onClick={() => onStatusChange(item.id, nextStatus)}
                        >
                          {nextLabel}
                        </button>
                      )}
                      {scope === 'mine' && item.status === 'Processing' && (
                        <button className="tech-btn tech-btn-info" onClick={() => onAddResult(item)}>
                          Enter Result
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
