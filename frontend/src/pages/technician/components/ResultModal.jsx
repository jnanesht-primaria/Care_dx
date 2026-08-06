// components/ResultModal.jsx
import React, { useState, useEffect } from 'react';
import { fetchTestResult, submitTestResult } from '../../../api/technician';
import './ResultModal.css';

export default function ResultModal({ appointment, onClose, onSaved }) {
  if (!appointment || !appointment.id) {
    console.warn('ResultModal called without a valid appointment.');
    return null;
  }

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState({ result_summary: '', notes: '' });
  const [existingResult, setExistingResult] = useState(null);

  useEffect(() => {
    const loadResult = async () => {
      try {
        const data = await fetchTestResult(appointment.id);
        if (data) {
          setExistingResult(data);
          setResult({ result_summary: data.result_summary || '', notes: data.notes || '' });
        }
      } catch (error) {
        console.error('Error loading result:', error);
      }
    };
    loadResult();
  }, [appointment.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!result.result_summary.trim()) {
      alert('Please enter a result summary.');
      return;
    }
    setLoading(true);
    try {
      await submitTestResult(appointment.id, result);
      onSaved();
    } catch (error) {
      alert(error.data?.message || 'Failed to save result.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tech-modal-backdrop" onClick={onClose}>
      <div className="tech-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tech-modal-header">
          <h2>Enter Test Result</h2>
          <button className="tech-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="tech-modal-body">
          <div className="tech-modal-patient"><span className="label">Patient:</span><span className="value">{appointment.patient_name || 'N/A'}</span></div>
          <div className="tech-modal-patient"><span className="label">Department:</span><span className="value">{appointment.department || 'N/A'}</span></div>
          <div className="tech-modal-patient"><span className="label">Time:</span><span className="value">{appointment.appointment_time || 'N/A'}</span></div>
          {existingResult && (
            <div className="tech-existing-result">
              <p><strong>Previously saved result:</strong></p>
              <p>{existingResult.result_summary}</p>
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="tech-form-group">
              <label>Result Summary *</label>
              <textarea value={result.result_summary} onChange={(e) => setResult({ ...result, result_summary: e.target.value })} placeholder="Enter test results..." rows="4" required />
            </div>
            <div className="tech-form-group">
              <label>Notes</label>
              <textarea value={result.notes} onChange={(e) => setResult({ ...result, notes: e.target.value })} placeholder="Additional notes..." rows="2" />
            </div>
            <div className="tech-modal-actions">
              <button type="button" className="tech-btn tech-btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="tech-btn tech-btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Result'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}