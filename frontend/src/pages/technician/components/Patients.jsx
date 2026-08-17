import React, { useState, useEffect, useCallback } from 'react';
import { searchPatientsAsTechnician } from '../../../api/technician';
import './Patients.css';

const Patients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    gender: 'all',
    minAge: '',
    maxAge: '',
  });

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = searchTerm.trim();
      const response = await searchPatientsAsTechnician(query);
      let filtered = response;

      if (filters.gender !== 'all') {
        filtered = filtered.filter(p => p.gender === filters.gender);
      }
      if (filters.minAge) {
        const min = parseInt(filters.minAge);
        filtered = filtered.filter(p => p.age >= min);
      }
      if (filters.maxAge) {
        const max = parseInt(filters.maxAge);
        filtered = filtered.filter(p => p.age <= max);
      }

      setPatients(filtered);
    } catch (err) {
      setError('Failed to load patients. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatients();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchPatients]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleRefresh = () => {
    setFilters({ gender: 'all', minAge: '', maxAge: '' });
    setSearchTerm('');
    fetchPatients();
  };

  return (
    <div className="patients-container">
      <div className="patients-header">
        <div>
          <h2>Patient Management</h2>
          <p>Search and manage patient records</p>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="patients-controls">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by name, patient ID, or mobile..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button onClick={fetchPatients} className="search-btn">
            Search
          </button>
        </div>

        <div className="filter-group">
          <select
            name="gender"
            value={filters.gender}
            onChange={handleFilterChange}
            className="filter-select"
          >
            <option value="all">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>

          <input
            type="number"
            name="minAge"
            placeholder="Min Age"
            value={filters.minAge}
            onChange={handleFilterChange}
            className="filter-age"
          />
          <input
            type="number"
            name="maxAge"
            placeholder="Max Age"
            value={filters.maxAge}
            onChange={handleFilterChange}
            className="filter-age"
          />

          <button
            onClick={handleRefresh}
            className="refresh-btn"
            disabled={loading}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Error / Loading */}
      {error && <div className="patients-error">{error}</div>}
      {loading && <div className="patients-loading">Loading patients...</div>}

      {/* Patient Table */}
      {!loading && !error && (
        <div className="patients-table-wrapper">
          <table className="patients-table">
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Name</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Mobile</th>
                <th>Email</th>
                <th>City</th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 ? (
                <tr>
                  <td colSpan="7" className="no-data">No patients found</td>
                </tr>
              ) : (
                patients.map(patient => (
                  <tr key={patient.id}>
                    <td><span className="patient-id">{patient.patient_id}</span></td>
                    <td>{patient.first_name} {patient.last_name}</td>
                    <td>{patient.age}</td>
                    <td><span className={`gender-badge ${patient.gender?.toLowerCase()}`}>{patient.gender}</span></td>
                    <td>{patient.mobile}</td>
                    <td>{patient.email || '—'}</td>
                    <td>{patient.city || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Patients;