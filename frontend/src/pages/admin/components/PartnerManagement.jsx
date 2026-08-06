// frontend/src/pages/admin/components/PartnerManagement.jsx
import React, { useState, useEffect } from 'react';
import { getLaboratories, createLaboratory, updateLaboratory, deleteLaboratory } from '../../../api/admin';
import './PartnerManagement.css';

const PartnerManagement = () => {
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    lab_name: '',
    location: '',
    technician_name: '',
    contact_number: '',
    email: '',
  });

  const loadData = async () => {
    try {
      const res = await getLaboratories();
      setLabs(res.data);
    } catch (err) {
      alert('Failed to load labs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateLaboratory(editingId, form);
      } else {
        await createLaboratory(form);
      }
      setForm({ lab_name: '', location: '', technician_name: '', contact_number: '', email: '' });
      setEditingId(null);
      loadData();
    } catch (err) {
      alert('Operation failed');
    }
  };

  const handleEdit = (lab) => {
    setEditingId(lab.id);
    setForm({
      lab_name: lab.lab_name,
      location: lab.location || '',
      technician_name: lab.technician_name || '',
      contact_number: lab.contact_number || '',
      email: lab.email || '',
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this lab?')) return;
    try {
      await deleteLaboratory(id);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Partner (Laboratory) Management</h2>
      <form onSubmit={handleSubmit} className="admin-form">
        <input name="lab_name" placeholder="Lab Name*" value={form.lab_name} onChange={handleChange} required />
        <input name="location" placeholder="Location" value={form.location} onChange={handleChange} />
        <input name="technician_name" placeholder="Technician Name" value={form.technician_name} onChange={handleChange} />
        <input name="contact_number" placeholder="Contact Number" value={form.contact_number} onChange={handleChange} />
        <input name="email" placeholder="Email" type="email" value={form.email} onChange={handleChange} />
        <button type="submit">{editingId ? 'Update' : 'Add'} Lab</button>
        {editingId && <button type="button" onClick={() => { setEditingId(null); setForm({ lab_name: '', location: '', technician_name: '', contact_number: '', email: '' }); }}>Cancel</button>}
      </form>

      <table className="admin-table">
        <thead>
          <tr><th>Lab Name</th><th>Location</th><th>Technician</th><th>Contact</th><th>Email</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {labs.map(lab => (
            <tr key={lab.id}>
              <td>{lab.lab_name}</td>
              <td>{lab.location || '-'}</td>
              <td>{lab.technician_name || '-'}</td>
              <td>{lab.contact_number || '-'}</td>
              <td>{lab.email || '-'}</td>
              <td>
                <button onClick={() => handleEdit(lab)}>Edit</button>
                <button onClick={() => handleDelete(lab.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PartnerManagement;