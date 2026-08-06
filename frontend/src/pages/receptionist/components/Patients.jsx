// frontend/src/pages/receptionist/components/Patients.jsx
import React, { useState } from 'react';
import { searchPatients } from '../../../api/receptionist';
import { useNavigate } from 'react-router-dom';
import './patients.css';
const Patients = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await searchPatients(query);
      setResults(res.data);
    } catch (err) {
      alert('Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Patient Search</h2>
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          placeholder="Search by name, ID, or mobile"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
        <button type="button" onClick={() => navigate('/receptionist/register')}>
          Register New Patient
        </button>
      </form>

      {results.length > 0 && (
        <table className="patient-table">
          <thead>
            <tr>
              <th>Patient ID</th>
              <th>Name</th>
              <th>Mobile</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {results.map((p) => (
              <tr key={p.id}>
                <td>{p.patient_id}</td>
                <td>{p.first_name} {p.last_name}</td>
                <td>{p.mobile}</td>
                <td>
                  <button onClick={() => navigate(`/receptionist/book-tests?patient=${p.id}`)}>
                    Book Tests
                  </button>
                  <button onClick={() => navigate(`/receptionist/billing?patient=${p.id}`)}>
                    Billing
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Patients;