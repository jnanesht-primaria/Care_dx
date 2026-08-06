// frontend/src/pages/receptionist/components/ReportStatus.jsx
import React, { useState } from 'react';
import { updateBookingStatus, searchPatients } from '../../../api/receptionist';
import './ReportStatus.css';

const ReportStatus = () => {
  const [bookingId, setBookingId] = useState('');
  const [status, setStatus] = useState('');
  const [message, setMessage] = useState('');

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!bookingId || !status) return;
    try {
      await updateBookingStatus(bookingId, status);
      setMessage('Status updated successfully');
    } catch (err) {
      setMessage('Update failed');
    }
  };

  return (
    <div>
      <h2>Report Status Tracking</h2>
      <form onSubmit={handleUpdate}>
        <input
          type="number"
          placeholder="Booking ID"
          value={bookingId}
          onChange={(e) => setBookingId(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Select Status</option>
          <option value="Pending">Pending</option>
          <option value="Sample Collected">Sample Collected</option>
          <option value="Processing">Processing</option>
          <option value="Completed">Completed</option>
          <option value="Approved">Approved</option>
          <option value="Uploaded">Uploaded</option>
          <option value="Delivered">Delivered</option>
        </select>
        <button type="submit">Update Status</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
};

export default ReportStatus;