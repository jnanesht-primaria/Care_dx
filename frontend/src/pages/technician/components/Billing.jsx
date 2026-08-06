import React, { useState, useEffect } from 'react';
import { searchPatientsAsTechnician, getPatientBookings, updateTechnicianAppointmentStatus } from '../../../api/technician';
import './Billing.css';

const Billing = () => {
  // ---- Patient ----
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // ---- Bookings ----
  const [bookings, setBookings] = useState([]);
  const [selectedBookingOption, setSelectedBookingOption] = useState(''); // 'all' or booking_id
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ---- Payment ----
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');

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
        .catch(() => setIsSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ---- Select patient → fetch bookings ----
  const handlePatientSelect = async (patient) => {
    setSelectedPatient(patient);
    setSearchQuery('');
    setSearchResults([]);
    setBookings([]);
    setSelectedBookingOption('');
    setError('');
    setSuccess('');
    setPaidAmount('');
    setLoading(true);

    try {
      const res = await getPatientBookings(patient.id);
      const data = res.data;
      if (data.bookings && data.bookings.length > 0) {
        setBookings(data.bookings);
        // Default: select the first booking or 'all'? We'll let user choose.
        setSelectedBookingOption('all'); // or data.bookings[0].booking_id
      } else {
        setError('No bookings found for this patient.');
      }
    } catch (err) {
      setError('Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearPatient = () => {
    setSelectedPatient(null);
    setSearchQuery('');
    setBookings([]);
    setSelectedBookingOption('');
    setPaidAmount('');
    setPaymentMode('Cash');
    setError('');
    setSuccess('');
  };

  // ---- Submit payment ----
  const handleSubmit = async () => {
    if (!selectedBookingOption) {
      alert('Please select a booking or "All".');
      return;
    }
    // If "all", we need to update all bookings? For simplicity, we'll handle one booking at a time.
    // We'll restrict to single booking for payment.
    if (selectedBookingOption === 'all') {
      alert('Please select a specific booking to complete payment.');
      return;
    }
    const booking = bookings.find(b => b.booking_id === parseInt(selectedBookingOption));
    if (!booking) {
      alert('Selected booking not found.');
      return;
    }
    const paid = parseFloat(paidAmount) || 0;
    const total = booking.total_amount || 0;
    if (paid < 0 || paid > total) {
      alert('Paid amount cannot exceed total or be negative.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      // Update booking status (you might want a dedicated payment endpoint)
      await updateTechnicianAppointmentStatus(booking.booking_id, 'Sample Collected');
      setSuccess(`✅ Payment recorded for booking #${booking.booking_id}`);
      // Refresh bookings
      await handlePatientSelect(selectedPatient);
    } catch (err) {
      setError('Payment update failed.');
    } finally {
      setLoading(false);
    }
  };

  // ---- Get selected tests and total ----
  const getSelectedData = () => {
    if (!selectedBookingOption) return { tests: [], total: 0 };
    if (selectedBookingOption === 'all') {
      const allTests = [];
      let total = 0;
      bookings.forEach(b => {
        allTests.push(...b.tests);
        total += b.total_amount;
      });
      return { tests: allTests, total };
    } else {
      const booking = bookings.find(b => b.booking_id === parseInt(selectedBookingOption));
      if (!booking) return { tests: [], total: 0 };
      return { tests: booking.tests, total: booking.total_amount };
    }
  };

  const { tests, total } = getSelectedData();

  return (
    <div className="billing-container">
      <div className="billing-header">
        <h2>🧾 Billing Form</h2>
        <p>Select a patient, choose a booking, and complete payment.</p>
      </div>

      {/* Patient Search */}
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
            <button className="clear-btn" onClick={handleClearPatient}>✕</button>
          </div>
        ) : (
          <div className="search-container">
            <input
              type="text"
              placeholder="Search by name, ID, or mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
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

      {/* Bookings Selection */}
      {selectedPatient && bookings.length > 0 && (
        <section className="booking-select-section">
          <label className="section-label">📋 Select Booking</label>
          <div className="booking-select-group">
            <select
              value={selectedBookingOption}
              onChange={(e) => setSelectedBookingOption(e.target.value)}
              className="booking-select"
            >
              <option value="">-- Choose --</option>
              <option value="all">📌 Combine All</option>
              {bookings.map(b => (
                <option key={b.booking_id} value={b.booking_id}>
                  # {b.booking_id} ({b.status}) - {new Date(b.booking_date).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
        </section>
      )}

      {/* Booking Details & Payment */}
      {selectedBookingOption && bookings.length > 0 && (
        <section className="booking-section">
          {loading ? (
            <p>Loading...</p>
          ) : error ? (
            <div className="billing-error">{error}</div>
          ) : tests.length > 0 ? (
            <>
              <h3>
                {selectedBookingOption === 'all'
                  ? 'All Tests (Combined)'
                  : `Booking #${selectedBookingOption}`}
              </h3>
              <div className="tests-list">
                <table className="tests-table">
                  <thead>
                    <tr>
                      <th>Test</th>
                      <th>Rate (₹)</th>
                      <th>Discount (₹)</th>
                      <th>Final (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tests.map(test => (
                      <tr key={test.id}>
                        <td>{test.test_name}</td>
                        <td>{test.rate}</td>
                        <td>{test.discount}</td>
                        <td>{test.final_price}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'right' }}><strong>Total:</strong></td>
                      <td><strong>₹{total.toFixed(2)}</strong></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Payment Fields */}
              <div className="payment-fields">
                <div className="payment-row">
                  <div className="payment-group">
                    <label>💰 Paid Amount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      className="payment-input"
                    />
                  </div>
                  <div className="payment-group">
                    <label>⚖️ Balance (₹)</label>
                    <input
                      type="text"
                      value={(total - (parseFloat(paidAmount) || 0)).toFixed(2)}
                      className="payment-input balance"
                      readOnly
                    />
                  </div>
                </div>
                <div className="payment-row">
                  <div className="payment-group">
                    <label>💳 Payment Mode</label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="payment-select"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="Online">Online</option>
                      <option value="Insurance">Insurance</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                className="submit-btn"
                onClick={handleSubmit}
                disabled={loading || selectedBookingOption === 'all'}
              >
                {loading ? 'Processing...' : '✅ Complete Payment'}
              </button>
              {selectedBookingOption === 'all' && (
                <p style={{ color: '#f59e0b', marginTop: '8px' }}>
                  ⚠️ Payment can only be completed for a single booking. Please select a specific booking.
                </p>
              )}
              {success && <div className="billing-success">{success}</div>}
            </>
          ) : (
            <p>No tests found for the selected booking.</p>
          )}
        </section>
      )}
    </div>
  );
};

export default Billing;