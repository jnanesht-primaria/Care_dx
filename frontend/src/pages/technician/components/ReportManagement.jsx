import React, { useState, useEffect } from 'react';
import { listReports } from '../../../api/technician';

const ReportManagement = () => {
  const [filters, setFilters] = useState({ patient_name: '', test_name: '', date: '', status: '' });
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await listReports(filters);
      setReports(res.data);
    } catch (err) {
      alert('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchReports();
  };

  return (
    <div>
      <h2>Report Management</h2>
      <form onSubmit={handleSearch} className="filter-form">
        <input name="patient_name" placeholder="Patient Name" value={filters.patient_name} onChange={handleFilterChange} />
        <input name="test_name" placeholder="Test Name" value={filters.test_name} onChange={handleFilterChange} />
        <input name="date" type="date" value={filters.date} onChange={handleFilterChange} />
        <select name="status" value={filters.status} onChange={handleFilterChange}>
          <option value="">All Status</option>
          <option value="Draft">Draft</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Uploaded">Uploaded</option>
        </select>
        <button type="submit">Search</button>
      </form>
      {loading ? <div>Loading...</div> : (
        <table className="report-table">
          <thead><tr><th>Report ID</th><th>Patient</th><th>Test</th><th>Date</th><th>Status</th><th>File</th></tr></thead>
          <tbody>
            {reports.map(r => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.patient_id}</td>
                <td>{r.test_id}</td>
                <td>{r.report_date}</td>
                <td>{r.status}</td>
                <td>{r.file_path || 'No file'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
export default ReportManagement;