import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getTests, createBooking, searchPatientsAsTechnician } from '../../../api/technician';
import './BookTests.css';

const BookTests = () => {
  const [searchParams] = useSearchParams();
  const urlPatientId = searchParams.get('patient') || '';

  // ---- Patient state ----
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // ---- Test state ----
  const [allTests, setAllTests] = useState([]);
  const [selectedTestIds, setSelectedTestIds] = useState([]);
  const [discounts, setDiscounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ---- Load tests on mount ----
  useEffect(() => {
    getTests()
      .then(res => {
        const tests = Array.isArray(res.data) ? res.data : [];
        setAllTests(tests);
      })
      .catch(err => {
        console.error('Failed to load tests:', err);
        setError('Could not load test list.');
      });
  }, []);

  // ---- Pre‑select patient from URL param ----
  useEffect(() => {
    if (urlPatientId) {
      searchPatientsAsTechnician(urlPatientId)
        .then(results => {
          if (results && results.length > 0) {
            setSelectedPatient(results[0]);
          } else {
            setSelectedPatient({ id: parseInt(urlPatientId), first_name: 'Selected', last_name: 'Patient' });
          }
        })
        .catch(() => {
          setSelectedPatient({ id: parseInt(urlPatientId), first_name: 'Selected', last_name: 'Patient' });
        });
    }
  }, [urlPatientId]);

  // ---- Debounced patient search ----
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(() => {
      searchPatientsAsTechnician(searchQuery)
        .then(results => {
          setSearchResults(Array.isArray(results) ? results : []);
          setIsSearching(false);
        })
        .catch(err => {
          console.error('Search failed:', err);
          setIsSearching(false);
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ---- Handlers ----
  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleClearPatient = () => {
    setSelectedPatient(null);
    setSearchQuery('');
  };

  const toggleTestSelection = (testId) => {
    setSelectedTestIds(prev =>
      prev.includes(testId)
        ? prev.filter(id => id !== testId)
        : [...prev, testId]
    );
    // Remove discount if test is deselected
    if (selectedTestIds.includes(testId)) {
      const newDiscounts = { ...discounts };
      delete newDiscounts[testId];
      setDiscounts(newDiscounts);
    }
  };

  const handleDiscountChange = (testId, value) => {
    const num = parseFloat(value) || 0;
    setDiscounts({ ...discounts, [testId]: num });
  };

  const handleSubmit = async () => {
    if (!selectedPatient) {
      alert('Please select a patient first.');
      return;
    }
    if (selectedTestIds.length === 0) {
      alert('Please select at least one test.');
      return;
    }

    const payload = {
      patient_id: selectedPatient.id,
      tests: selectedTestIds.map(id => ({
        test_id: id,
        discount: discounts[id] || 0,
      })),
      payment_mode: 'Cash',
      paid_amount: 0,
    };

    setLoading(true);
    setError('');
    try {
      const res = await createBooking(payload);
      alert(`✅ Booking created! ID: ${res.data.booking_id}`);
      // Reset selection
      setSelectedTestIds([]);
      setDiscounts({});
      setSelectedPatient(null);
    } catch (err) {
      const msg = err.response?.data?.message || 'Booking failed. Please try again.';
      setError(msg);
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  // ---- Helpers ----
  const getTest = (id) => allTests.find(t => t.id === id);
  const getTestName = (id) => getTest(id)?.test_name || 'Unknown';
  const getTestRate = (id) => getTest(id)?.rate || 0;

  const total = selectedTestIds.reduce((sum, id) => {
    const rate = getTestRate(id);
    const disc = discounts[id] || 0;
    return sum + (rate - disc);
  }, 0);

  return (
    <div className="book-tests-container">
      <div className="book-tests-header">
        <h2>📋 Book Tests</h2>
        <p>Select a patient, then choose the tests you want to book.</p>
      </div>

      {/* --- Patient Selection --- */}
      <section className="patient-section">
        <label className="section-label">👤 Patient</label>
        {selectedPatient ? (
          <div className="selected-patient">
            <span>
              <strong>{selectedPatient.first_name} {selectedPatient.last_name}</strong>
              <span className="patient-meta">
                (ID: {selectedPatient.patient_id} | {selectedPatient.mobile})
              </span>
            </span>
            <button className="clear-patient-btn" onClick={handleClearPatient}>✕</button>
          </div>
        ) : (
          <div className="search-container">
            <input
              type="text"
              placeholder="Search by name, ID, or mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="patient-search-input"
            />
            {isSearching && <span className="search-spinner">⏳</span>}
            {searchResults.length > 0 && (
              <ul className="search-results">
                {searchResults.map(p => (
                  <li key={p.id} onClick={() => handlePatientSelect(p)}>
                    {p.first_name} {p.last_name} ({p.patient_id}) - {p.mobile}
                  </li>
                ))}
              </ul>
            )}
            {searchQuery && !isSearching && searchResults.length === 0 && (
              <div className="no-results">No patients found</div>
            )}
          </div>
        )}
      </section>

      {/* --- Test Selection (checkboxes) --- */}
      <section className="tests-section">
        <label className="section-label">🧪 Select Tests</label>
        {allTests.length === 0 ? (
          <p className="no-tests">No tests available. Please add tests in the database.</p>
        ) : (
          <div className="tests-grid">
            {allTests.map(test => (
              <label key={test.id} className="test-checkbox">
                <input
                  type="checkbox"
                  checked={selectedTestIds.includes(test.id)}
                  onChange={() => toggleTestSelection(test.id)}
                />
                <span className="test-name">{test.test_name}</span>
                <span className="test-rate">₹{test.rate}</span>
              </label>
            ))}
          </div>
        )}
      </section>

      {/* --- Summary & Book Button --- */}
      {selectedTestIds.length > 0 && (
        <section className="summary-section">
          <h3>Selected Tests Summary</h3>
          <div className="summary-table-wrapper">
            <table className="selected-tests-table">
              <thead>
                <tr>
                  <th>Test</th>
                  <th>Rate (₹)</th>
                  <th>Discount (₹)</th>
                  <th>Final (₹)</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {selectedTestIds.map(id => {
                  const rate = getTestRate(id);
                  const disc = discounts[id] || 0;
                  const final = rate - disc;
                  return (
                    <tr key={id}>
                      <td>{getTestName(id)}</td>
                      <td>{rate}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max={rate}
                          value={disc}
                          onChange={(e) => handleDiscountChange(id, e.target.value)}
                          className="discount-input"
                        />
                      </td>
                      <td>{final}</td>
                      <td>
                        <button className="remove-test-btn" onClick={() => toggleTestSelection(id)}>✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="3" style={{ textAlign: 'right' }}><strong>Total:</strong></td>
                  <td><strong>₹{total.toFixed(2)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <button
            className="book-btn"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Booking...' : '📌 Book Tests'}
          </button>
          {error && <div className="book-error">{error}</div>}
        </section>
      )}
    </div>
  );
};

export default BookTests;