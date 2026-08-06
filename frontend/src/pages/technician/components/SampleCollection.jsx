import React, { useState } from 'react';
import { collectSample } from '../../../api/technician';

const SampleCollection = () => {
  const [form, setForm] = useState({
    booking_id: '',
    sample_type: 'Blood',
    collection_date_time: new Date().toISOString().slice(0, 16),
    collection_location: '',
    processed_date_time: '',
    processing_status: 'Pending',
    storage_location: '',
    remarks: '',
    send_for_approval: false,
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await collectSample(form);
      alert('Sample collected successfully');
      setForm({ ...form, booking_id: '', remarks: '' });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to collect sample');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Sample Collection</h2>
      <form onSubmit={handleSubmit} className="sample-form">
        <input name="booking_id" placeholder="Booking ID*" value={form.booking_id} onChange={handleChange} required />
        <select name="sample_type" value={form.sample_type} onChange={handleChange}>
          <option value="Blood">Blood</option><option value="Urine">Urine</option><option value="Swab">Swab</option><option value="Other">Other</option>
        </select>
        <input name="collection_date_time" type="datetime-local" value={form.collection_date_time} onChange={handleChange} />
        <input name="collection_location" placeholder="Collection Location" value={form.collection_location} onChange={handleChange} />
        <input name="processed_date_time" type="datetime-local" value={form.processed_date_time} onChange={handleChange} />
        <select name="processing_status" value={form.processing_status} onChange={handleChange}>
          <option value="Pending">Pending</option><option value="Processing">Processing</option><option value="Completed">Completed</option>
        </select>
        <input name="storage_location" placeholder="Storage Location" value={form.storage_location} onChange={handleChange} />
        <textarea name="remarks" placeholder="Remarks" value={form.remarks} onChange={handleChange} />
        <label><input type="checkbox" name="send_for_approval" checked={form.send_for_approval} onChange={handleChange} /> Send for Approval</label>
        <button type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Submit Sample'}</button>
      </form>
    </div>
  );
};
export default SampleCollection;