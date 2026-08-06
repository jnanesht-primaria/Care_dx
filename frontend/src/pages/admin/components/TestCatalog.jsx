// frontend/src/pages/admin/components/TestCatalog.jsx
import React, { useState, useEffect } from 'react';
import { getTests, createTest, updateTest, deleteTest, getLaboratories } from '../../../api/admin';
import './TestCatalog.css';

const TestCatalog = () => {
  const [tests, setTests] = useState([]);
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    test_name: '',
    rate: '',
    lab_id: '',
    category: '',
    reference_range: '',
    report_template_text: '',
    report_template_file_path: '',
    is_active: true,
  });

  const loadData = async () => {
    try {
      const [testsRes, labsRes] = await Promise.all([getTests(), getLaboratories()]);
      setTests(testsRes.data);
      setLabs(labsRes.data);
    } catch (err) {
      alert('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateTest(editingId, form);
      } else {
        await createTest(form);
      }
      setForm({ test_name: '', rate: '', lab_id: '', category: '', reference_range: '', report_template_text: '', report_template_file_path: '', is_active: true });
      setEditingId(null);
      loadData();
    } catch (err) {
      alert('Operation failed');
    }
  };

  const handleEdit = (test) => {
    setEditingId(test.id);
    setForm({
      test_name: test.test_name,
      rate: test.rate,
      lab_id: test.lab_id,
      category: test.category || '',
      reference_range: test.reference_range || '',
      report_template_text: test.report_template_text || '',
      report_template_file_path: test.report_template_file_path || '',
      is_active: test.is_active,
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this test?')) return;
    try {
      await deleteTest(id);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Test Catalog Management</h2>
      <form onSubmit={handleSubmit} className="admin-form">
        <input name="test_name" placeholder="Test Name*" value={form.test_name} onChange={handleChange} required />
        <input name="rate" placeholder="Rate (₹)*" type="number" step="0.01" value={form.rate} onChange={handleChange} required />
        <select name="lab_id" value={form.lab_id} onChange={handleChange} required>
          <option value="">Select Lab</option>
          {labs.map(lab => (
            <option key={lab.id} value={lab.id}>{lab.lab_name}</option>
          ))}
        </select>
        <input name="category" placeholder="Category" value={form.category} onChange={handleChange} />
        <input name="reference_range" placeholder="Reference Range" value={form.reference_range} onChange={handleChange} />
        <textarea name="report_template_text" placeholder="Report Template (Text)" value={form.report_template_text} onChange={handleChange} />
        <input name="report_template_file_path" placeholder="Report Template File Path" value={form.report_template_file_path} onChange={handleChange} />
        <label>
          <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
          Active
        </label>
        <button type="submit">{editingId ? 'Update' : 'Add'} Test</button>
        {editingId && <button type="button" onClick={() => { setEditingId(null); setForm({ test_name: '', rate: '', lab_id: '', category: '', reference_range: '', report_template_text: '', report_template_file_path: '', is_active: true }); }}>Cancel</button>}
      </form>

      <table className="admin-table">
        <thead>
          <tr><th>ID</th><th>Test Name</th><th>Category</th><th>Reference Range</th><th>Lab</th><th>Rate (₹)</th><th>Active</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {tests.map(test => (
            <tr key={test.id}>
              <td>{test.id}</td>
              <td>{test.test_name}</td>
              <td>{test.category || '-'}</td>
              <td>{test.reference_range || '-'}</td>
              <td>{test.lab_name || '-'}</td>
              <td>₹{test.rate}</td>
              <td>{test.is_active ? 'Yes' : 'No'}</td>
              <td>
                <button onClick={() => handleEdit(test)}>Edit</button>
                <button onClick={() => handleDelete(test.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TestCatalog;