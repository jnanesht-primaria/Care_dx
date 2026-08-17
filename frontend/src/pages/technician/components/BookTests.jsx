import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  getTests, 
  createBooking, 
  updateBookingTests,
  searchPatientsAsTechnician,
  getAllPatientBookings
} from '../../../api/technician';
import './BookTests.css';

const dedupeArray = (arr) => Array.from(new Set(arr));

const BookTests = ({ onBookingComplete }) => {
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
  
  // ---- Existing booking test IDs & booking ID ----
  const [existingBookingTestIds, setExistingBookingTestIds] = useState([]);
  const [editingBookingId, setEditingBookingId] = useState(null);

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

  // ---- Fetch existing bookings for a patient ----
  const fetchExistingBookings = async (patientId) => {
    try {
      const res = await getAllPatientBookings(patientId);
      console.log('📦 Raw API response:', res.data);
      const bookings = res.data.bookings || [];
      const testIds = [];
      let latestBookingId = null;
      bookings.forEach(booking => {
        booking.tests.forEach(test => {
          if (test.test_id) {
            testIds.push(test.test_id);
          }
        });
        if (!latestBookingId) {
          latestBookingId = booking.booking_id;
        }
      });
      const uniqueTestIds = dedupeArray(testIds);
      console.log('✅ Extracted test IDs:', uniqueTestIds);
      console.log('✅ Latest booking ID:', latestBookingId);
      
      setExistingBookingTestIds(uniqueTestIds);
      setSelectedTestIds(uniqueTestIds);
      setEditingBookingId(latestBookingId || null);
      
      // Reset discounts to prevent stale values
      setDiscounts({});
      
      return { uniqueTestIds, latestBookingId };
    } catch (err) {
      console.error('❌ Failed to fetch existing bookings:', err);
      return { uniqueTestIds: [], latestBookingId: null };
    }
  };

  // ---- Pre‑select patient from URL param ----
  useEffect(() => {
    if (urlPatientId) {
      searchPatientsAsTechnician(urlPatientId)
        .then(results => {
          if (results && results.length > 0) {
            const patient = results[0];
            setSelectedPatient(patient);
            fetchExistingBookings(patient.id);
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
  const handlePatientSelect = async (patient) => {
    setSelectedPatient(patient);
    setSearchQuery('');
    setSearchResults([]);
    setDiscounts({});
    await fetchExistingBookings(patient.id);
  };

  const handleClearPatient = () => {
    setSelectedPatient(null);
    setSearchQuery('');
    setSelectedTestIds([]);
    setExistingBookingTestIds([]);
    setEditingBookingId(null);
    setDiscounts({});
  };

  const toggleTestSelection = (testId) => {
    setSelectedTestIds(prev => {
      const newSelection = prev.includes(testId)
        ? prev.filter(id => id !== testId)
        : [...prev, testId];
      return dedupeArray(newSelection);
    });
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

  // ---- Helper: compare arrays ----
  const arraysEqual = (a, b) => {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, idx) => val === sortedB[idx]);
  };

  // ---- Submit: Create or Update ----
  const handleSubmit = async () => {
    if (!selectedPatient) {
      alert('Please select a patient first.');
      return;
    }
    if (selectedTestIds.length === 0) {
      alert('Please select at least one test.');
      return;
    }

    // If editing and no changes, inform user
    if (editingBookingId && arraysEqual(selectedTestIds, existingBookingTestIds)) {
      alert('No changes to save.');
      return;
    }

    const payload = {
      tests: selectedTestIds.map(id => ({
        test_id: id,
        discount: discounts[id] || 0,
      })),
      payment_mode: 'Cash',
      paid_amount: 0,
    };

    console.log('📤 Payload to send:', payload);

    setLoading(true);
    setError('');
    try {
      let res;
      let message;
      if (editingBookingId) {
        console.log(`🔄 Updating booking #${editingBookingId}...`);
        res = await updateBookingTests(editingBookingId, payload);
        console.log('📥 Update response:', res);
        message = `✅ Booking #${editingBookingId} updated!`;
      } else {
        console.log('📝 Creating new booking...');
        const createPayload = { patient_id: selectedPatient.id, ...payload };
        res = await createBooking(createPayload);
        console.log('📥 Create response:', res);
        message = `✅ New booking created! ID: ${res.data.booking_id}`;
        setEditingBookingId(res.data.booking_id);
      }
      
      alert(message);

      // ---- Trigger dashboard refresh (if parent provided) ----
      if (onBookingComplete) {
        onBookingComplete();
      }

      // ---- Re-fetch bookings to update UI ----
      console.log('🔄 Refetching bookings...');
      await fetchExistingBookings(selectedPatient.id);
      console.log('✅ UI updated with latest data.');

    } catch (err) {
      console.error('❌ Submit error:', err);
      const msg = err.response?.data?.message || 'Action failed. Please try again.';
      setError(msg);
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  // ---- Helpers for test info ----
  const getTest = (id) => allTests.find(t => t.id === id);
  const getTestName = (id) => getTest(id)?.test_name || 'Unknown';
  const getTestRate = (id) => getTest(id)?.rate || 0;

  const total = selectedTestIds.reduce((sum, id) => {
    const rate = getTestRate(id);
    const disc = discounts[id] || 0;
    return sum + (rate - disc);
  }, 0);

  const allSelectedAreBooked = selectedTestIds.length > 0 && selectedTestIds.every(id => existingBookingTestIds.includes(id));
  const someSelectedAreBooked = selectedTestIds.some(id => existingBookingTestIds.includes(id));

  // ---- Button label and behavior ----
  let buttonLabel = '📌 Book Tests';
  let buttonDisabled = loading;

  if (editingBookingId) {
    const changed = !arraysEqual(selectedTestIds, existingBookingTestIds);
    if (changed && selectedTestIds.length > 0) {
      buttonLabel = '🔄 Update Book Tests';
      buttonDisabled = false;
    } else if (!changed) {
      buttonLabel = '✅ No Changes';
      buttonDisabled = true;
    }
  }

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
              {existingBookingTestIds.length > 0 && (
                <span className="existing-booking-badge">
                  ✅ {existingBookingTestIds.length} test(s) already booked
                </span>
              )}
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
            {allTests.map(test => {
              const isSelected = selectedTestIds.includes(test.id);
              const isAlreadyBooked = existingBookingTestIds.includes(test.id);
              return (
                <label 
                  key={test.id} 
                  className={`test-checkbox ${isSelected ? 'selected' : ''} ${isAlreadyBooked ? 'already-booked' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleTestSelection(test.id)}
                  />
                  <span className="test-name">{test.test_name}</span>
                  <span className="test-rate">₹{test.rate}</span>
                  {isAlreadyBooked && <span className="booked-badge">✓ Booked</span>}
                  {isSelected && !isAlreadyBooked && <span className="selected-badge">✓ Selected</span>}
                </label>
              );
            })}
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
                  const isAlreadyBooked = existingBookingTestIds.includes(id);
                  return (
                    <tr key={id} className={isAlreadyBooked ? 'already-booked-row' : ''}>
                      <td>{getTestName(id)} {isAlreadyBooked && <span className="booked-badge-small">✓ Booked</span>}</td>
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

          {someSelectedAreBooked && (
            <div className="info-message">
              {allSelectedAreBooked ? (
                <span className="info-booked">✅ All selected tests are already booked for this patient.</span>
              ) : (
                <span className="info-mixed">ℹ️ Some of the selected tests are already booked. New tests will be added.</span>
              )}
            </div>
          )}

          <button
            className="book-btn"
            onClick={handleSubmit}
            disabled={buttonDisabled}
          >
            {loading ? 'Processing...' : buttonLabel}
          </button>
          {error && <div className="book-error">{error}</div>}
        </section>
      )}
    </div>
  );
};

export default BookTests;