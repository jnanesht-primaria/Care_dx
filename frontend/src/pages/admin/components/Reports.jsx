// frontend/src/pages/admin/components/Reports.jsx
import React, { useState, useEffect } from 'react';
import { getReports } from '../../../api/admin';
import './Reports.css';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    patient_id: '',
    test_id: '',
    status: '',
    date_from: '',
    date_to: '',
  });

  const loadReports = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.patient_id) params.patient_id = filters.patient_id;
      if (filters.test_id) params.test_id = filters.test_id;
      if (filters.status) params.status = filters.status;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      const res = await getReports(params);
      setReports(res.data);
    } catch (err) {
      alert('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadReports();
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Reports</h2>
      <form onSubmit={handleSearch} className="filter-form">
        <input name="patient_id" placeholder="Patient ID" value={filters.patient_id} onChange={handleFilterChange} />
        <input name="test_id" placeholder="Test ID" value={filters.test_id} onChange={handleFilterChange} />
        <select name="status" value={filters.status} onChange={handleFilterChange}>
          <option value="">All Status</option>
          <option value="Draft">Draft</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Uploaded">Uploaded</option>
        </select>
        <input name="date_from" type="date" value={filters.date_from} onChange={handleFilterChange} />
        <input name="date_to" type="date" value={filters.date_to} onChange={handleFilterChange} />
        <button type="submit">Apply Filters</button>
      </form>

      <table className="admin-table">
        <thead>
          <tr><th>Report ID</th><th>Patient ID</th><th>Test ID</th><th>Report Date</th><th>Status</th><th>File</th></tr>
        </thead>
        <tbody>
          {reports.map(r => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td>{r.patient_id}</td>
              <td>{r.test_id}</td>
              <td>{r.report_date}</td>
              <td>{r.status}</td>
              <td>{r.file_path ? <a href={r.file_path} target="_blank">View</a> : '-'}</td>
            </tr>
          ))}
          {reports.length === 0 && <tr><td colSpan="6">No reports found</td></tr>}
        </tbody>
      </table>
    </div>
  );
};

export default Reports;