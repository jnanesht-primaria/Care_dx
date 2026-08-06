// components/QueueTable.jsx
import React from 'react';
import './QueueTable.css';

export default function QueueTable({
  scope,
  appointments = [],
  loading,
  onClaim,
  onStatusChange,
  onEnterResult,
}) {
  if (loading) return <div className="tech-table-loading">Loading appointments...</div>;
  if (!appointments || appointments.length === 0) {
    return (
      <div className="tech-table-empty">
        <div className="empty-icon">📭</div>
        <p>No appointments found</p>
        <span className="empty-sub">Try changing the date or scope</span>
      </div>
    );
  }

  const getNextStatusLabel = (status) => {
    const flow = { Scheduled: 'Check In', CheckedIn: 'Start', InProgress: 'Complete' };
    return flow[status] || null;
  };
  const getNextStatusValue = (status) => {
    const flow = { Scheduled: 'CheckedIn', CheckedIn: 'InProgress', InProgress: 'Completed' };
    return flow[status] || null;
  };
  const getStatusColor = (status) => {
    const colors = {
      Scheduled: '#3b82f6', CheckedIn: '#f59e0b', InProgress: '#8b5cf6',
      Completed: '#10b981', Cancelled: '#ef4444', NoShow: '#6b7280'
    };
    return colors[status] || '#6b7280';
  };

  return (
    <div className="tech-queue-table-wrap">
      <div className="tech-queue-table-scroll">
        <table className="tech-queue-table">
          <thead>
            <tr><th>Patient</th><th>Department</th><th>Time</th><th>Priority</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {appointments.map((appt) => {
              const nextLabel = getNextStatusLabel(appt.status);
              const nextStatus = getNextStatusValue(appt.status);
              return (
                <tr key={appt.id}>
                  <td>
                    <div className="tech-patient-info">
                      <div className="tech-patient-avatar">{appt.patient_name?.charAt(0) || 'P'}</div>
                      <div>
                        <div className="tech-patient-name">{appt.patient_name}</div>
                        <div className="tech-patient-phone">{appt.patient_phone}</div>
                      </div>
                    </div>
                  </td>
                  <td>{appt.department}</td>
                  <td>{appt.appointment_time}</td>
                  <td><span className={`tech-priority ${appt.priority?.toLowerCase() || 'normal'}`}>{appt.priority || 'Normal'}</span></td>
                  <td><span className="tech-status" style={{ backgroundColor: getStatusColor(appt.status) }}>{appt.status}</span></td>
                  <td>
                    <div className="tech-actions">
                      {scope === 'unassigned' && <button className="tech-btn tech-btn-primary" onClick={() => onClaim(appt.id)}>Claim</button>}
                      {scope === 'mine' && nextLabel && <button className="tech-btn tech-btn-success" onClick={() => onStatusChange(appt.id, nextStatus)}>{nextLabel}</button>}
                      {scope === 'mine' && appt.status === 'InProgress' && <button className="tech-btn tech-btn-info" onClick={() => onEnterResult(appt)}>Enter Result</button>}
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