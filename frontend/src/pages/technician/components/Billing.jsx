import React, { useState, useEffect } from 'react';
import { searchPatientsAsTechnician, getAllPatientBookings, payBooking } from '../../../api/technician';
import './Billing.css';

// ─── Helper: load/save recent patients ──────────────────────────
const RECENT_KEY = 'recentPatients_technician_billing';
const MAX_RECENT = 10;

const loadRecentPatients = () => {
  try {
    const data = localStorage.getItem(RECENT_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveRecentPatients = (list) => {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {}
};

// ─── Constants for invoice ──────────────────────────────────────
const headerSrc = `${window.location.origin}/header.png`;
const signatureSrc = `${window.location.origin}/signature.jpeg`;

const escapeHtml = (val) =>
  String(val ?? '').replace(/[&<>"']/g, (c) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[c];
  });

const Billing = () => {
  // ---- Patient ----
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // ---- Recent patients ----
  const [recentPatients, setRecentPatients] = useState(loadRecentPatients);

  // ---- Bookings ----
  const [bookings, setBookings] = useState([]);
  const [selectedBookingOption, setSelectedBookingOption] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ---- Payment ----
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');

  // ---- Invoice modal ----
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);

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

  // ---- Select patient → fetch bookings (using getAllPatientBookings) ----
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

    setRecentPatients(prev => {
      const filtered = prev.filter(p => p.id !== patient.id);
      const updated = [patient, ...filtered].slice(0, MAX_RECENT);
      saveRecentPatients(updated);
      return updated;
    });

    try {
      const res = await getAllPatientBookings(patient.id);
      const data = res.data;
      if (data.bookings && data.bookings.length > 0) {
        setBookings(data.bookings);
        setSelectedBookingOption('all');
      } else {
        setError('No bookings found for this patient.');
      }
    } catch (err) {
      setError('Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  };

  // ---- Refresh bookings (manual reload) ----
  const handleRefresh = () => {
    if (selectedPatient) {
      handlePatientSelect(selectedPatient);
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
    setShowInvoice(false);
    setInvoiceData(null);
  };

  // ---- Build invoice data from a booking ----
  const buildInvoiceDataFromBooking = (booking) => {
    return {
      invoiceNo: `INV-${booking.booking_id}-${Date.now()}`,
      date: new Date(),
      patient: selectedPatient,
      bookings: [booking],
      totalDue: booking.total_amount || 0,
      paidAmount: booking.paid_amount || 0,
      balance: booking.balance || 0,
      paymentMode: booking.payment_mode || 'Cash',
    };
  };

  // ---- Build invoice data from multiple bookings ----
  const buildInvoiceDataFromBookings = (bookingsList) => {
    const totalDue = bookingsList.reduce((sum, b) => sum + (b.total_amount || 0), 0);
    const paidAmount = bookingsList.reduce((sum, b) => sum + (b.paid_amount || 0), 0);
    const balance = totalDue - paidAmount;
    return {
      invoiceNo: `INV-${Date.now()}`,
      date: new Date(),
      patient: selectedPatient,
      bookings: bookingsList,
      totalDue,
      paidAmount,
      balance,
      paymentMode: bookingsList[0]?.payment_mode || 'Cash',
    };
  };

  // ---- Submit payment (no claim needed – backend accepts any technician) ----
  const handleSubmit = async () => {
    if (!selectedBookingOption) {
      alert('Please select a booking or "All".');
      return;
    }

    const paid = parseFloat(paidAmount) || 0;
    if (paid <= 0) {
      alert('Paid amount must be greater than zero.');
      return;
    }

    let targetBookings = [];
    if (selectedBookingOption === 'all') {
      targetBookings = bookings;
    } else {
      const booking = bookings.find(b => b.booking_id === parseInt(selectedBookingOption));
      if (!booking) {
        alert('Selected booking not found.');
        return;
      }
      targetBookings = [booking];
    }

    const totalDue = targetBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
    if (paid > totalDue) {
      alert(`Total due is ₹${totalDue.toFixed(2)}. You cannot pay more than that.`);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // ─── Process payment directly ─────────────────────────────
      let remaining = paid;
      for (const booking of targetBookings) {
        if (remaining <= 0) break;
        const bookingTotal = booking.total_amount || 0;
        const payThis = Math.min(remaining, bookingTotal);
        if (payThis > 0) {
          await payBooking(booking.booking_id, payThis, paymentMode);
          remaining -= payThis;
        }
      }

      // Refresh bookings after payment
      await handlePatientSelect(selectedPatient);

      // Build invoice data from the updated bookings
      const updatedTargetBookings = targetBookings.map(b => {
        const updated = bookings.find(ub => ub.booking_id === b.booking_id);
        return updated || b;
      });

      setInvoiceData(buildInvoiceDataFromBookings(updatedTargetBookings));
      setShowInvoice(true);

      setSuccess('✅ Payment recorded successfully.');
    } catch (err) {
      setError('Payment failed. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ---- Handle "Download Invoice" for a paid booking ----
  const handleDownloadInvoice = (booking) => {
    const data = buildInvoiceDataFromBooking(booking);
    setInvoiceData(data);
    setShowInvoice(true);
  };

  // ---- Invoice functions ----
  const buildInvoiceHtml = (data) => {
    const { invoiceNo, date, patient, bookings, totalDue, paidAmount, balance, paymentMode } = data;

    const rows = bookings
      .flatMap((b) =>
        b.tests.map(
          (t) => `
            <tr>
              <td>${escapeHtml(t.test_name)}</td>
              <td>#${b.booking_id}</td>
              <td>${Number(t.rate).toFixed(2)}</td>
              <td>${Number(t.discount).toFixed(2)}</td>
              <td>${Number(t.final_price).toFixed(2)}</td>
            </tr>`
        )
      )
      .join('');

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Invoice ${escapeHtml(invoiceNo)}</title>
<style>
  @page { size: A4 portrait; margin: 15mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Roboto, Arial, sans-serif; color: #1e293b; line-height: 1.5; }
  .print-header { width: 100%; height: 120px; margin-bottom: 20px; display: flex; align-items: center; justify-content: center; }
  .print-header img { width: 100%; height: 100%; object-fit: contain; }
  .invoice-title { text-align: center; font-size: 22px; margin-bottom: 16px; color: #0f172a; }
  .invoice-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; font-size: 15px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px dashed #cbd5e1; }
  .invoice-meta strong { color: #0f172a; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 16px; }
  th { background: #f1f5f9; text-align: left; padding: 8px; border: 1px solid #e2e8f0; }
  td { padding: 8px; border: 1px solid #e2e8f0; }
  .totals { margin-left: auto; width: 260px; font-size: 15px; }
  .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
  .totals .grand { border-top: 1px solid #0f172a; font-weight: 700; margin-top: 4px; padding-top: 6px; }
  .print-footer { margin-top: 100px; display: flex; justify-content: flex-end; }
  .signature-area { text-align: right; font-size: 15px; }
</style>
</head>
<body>
  <div class="print-header"><img src="${headerSrc}" alt="CareDx Lab Header" /></div>
  <h2 class="invoice-title">Payment Invoice</h2>
  <div class="invoice-meta">
    <p><strong>Invoice No:</strong> ${escapeHtml(invoiceNo)}</p>
    <p><strong>Date:</strong> ${date.toLocaleDateString()} ${date.toLocaleTimeString()}</p>
    <p><strong>Patient:</strong> ${escapeHtml(patient.first_name)} ${escapeHtml(patient.last_name)}</p>
    <p><strong>Patient ID:</strong> ${escapeHtml(patient.patient_id)}</p>
    <p><strong>Mobile:</strong> ${escapeHtml(patient.mobile)}</p>
    <p><strong>Payment Mode:</strong> ${escapeHtml(paymentMode)}</p>
  </div>
  <table>
    <thead><tr><th>Test</th><th>Booking</th><th>Rate (₹)</th><th>Discount (₹)</th><th>Final (₹)</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <div><span>Total Due</span><span>₹${totalDue.toFixed(2)}</span></div>
    <div><span>Paid Now</span><span>₹${paidAmount.toFixed(2)}</span></div>
    <div class="grand"><span>Balance</span><span>₹${balance.toFixed(2)}</span></div>
  </div>
  <div class="print-footer">
    <div class="signature-area">
      <img src="${signatureSrc}" alt="Signature" style="max-width:180px;display:block;margin-left:auto;margin-bottom:4px;" />
      <p><strong>Dr. Kishore Babu M</strong></p>
    </div>
  </div>
</body>
</html>`;
  };

  const handlePrintInvoice = () => {
    if (!invoiceData) return;
    const html = buildInvoiceHtml(invoiceData);

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    const images = doc.querySelectorAll('img');
    let loaded = 0;
    const total = images.length;
    const tryPrint = () => {
      if (++loaded === total) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }
    };
    if (total === 0) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } else {
      images.forEach((img) => {
        if (img.complete) tryPrint();
        else {
          img.onload = tryPrint;
          img.onerror = tryPrint;
        }
      });
    }
    iframe.contentWindow.onafterprint = () => document.body.removeChild(iframe);
  };

  // ---- Get selected data for display ----
  const getSelectedData = () => {
    if (!selectedBookingOption) return { tests: [], total: 0, bookings: [], paidAmount: 0, balance: 0 };
    if (selectedBookingOption === 'all') {
      const allTests = [];
      let total = 0;
      let totalPaid = 0;
      let totalBalance = 0;
      bookings.forEach(b => {
        allTests.push(...b.tests);
        total += b.total_amount || 0;
        totalPaid += b.paid_amount || 0;
        totalBalance += b.balance || 0;
      });
      return { tests: allTests, total, bookings, paidAmount: totalPaid, balance: totalBalance };
    } else {
      const booking = bookings.find(b => b.booking_id === parseInt(selectedBookingOption));
      if (!booking) return { tests: [], total: 0, bookings: [], paidAmount: 0, balance: 0 };
      return {
        tests: booking.tests,
        total: booking.total_amount || 0,
        bookings: [booking],
        paidAmount: booking.paid_amount || 0,
        balance: booking.balance || 0,
      };
    }
  };

  const { tests, total, bookings: selectedBookings, paidAmount: existingPaid, balance: existingBalance } = getSelectedData();
  const isFullyPaid = existingBalance === 0 && existingPaid > 0;

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
              <button className="refresh-btn" onClick={handleRefresh} title="Refresh bookings">
                🔄
              </button>
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

            {/* Recent patients */}
            {!searchQuery && recentPatients.length > 0 && (
              <div className="recent-patients">
                <div className="recent-label">🕒 Recent Patients</div>
                <ul className="recent-list">
                  {recentPatients.map(p => (
                    <li key={p.id} onClick={() => handlePatientSelect(p)}>
                      {p.first_name} {p.last_name} ({p.patient_id})
                    </li>
                  ))}
                </ul>
              </div>
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
              <option value="all">📌 Combine All ({bookings.length} bookings)</option>
              {bookings.map(b => {
                const isPaid = (b.balance || 0) === 0 && (b.paid_amount || 0) > 0;
                return (
                  <option key={b.booking_id} value={b.booking_id}>
                    # {b.booking_id} ({b.status}) {isPaid ? '✅ Paid' : ''} - {new Date(b.booking_date).toLocaleDateString()}
                  </option>
                );
              })}
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
                  ? `All Tests (${bookings.length} bookings)`
                  : `Booking #${selectedBookingOption}`}
                {isFullyPaid && <span className="paid-badge">✅ Paid</span>}
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
                    {tests.map((test, idx) => (
                      <tr key={idx}>
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
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'right' }}><strong>Paid:</strong></td>
                      <td><strong>₹{existingPaid.toFixed(2)}</strong></td>
                    </tr>
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'right' }}><strong>Balance:</strong></td>
                      <td><strong>₹{existingBalance.toFixed(2)}</strong></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {isFullyPaid ? (
                <div className="payment-completed">
                  <div className="payment-completed-message">
                    ✅ This booking has been fully paid.
                  </div>
                  <button
                    className="download-invoice-btn"
                    onClick={() => handleDownloadInvoice(selectedBookings[0])}
                  >
                    📄 Download Invoice
                  </button>
                </div>
              ) : (
                <>
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
                        <label>⚖️ New Balance (₹)</label>
                        <input
                          type="text"
                          value={(total - (parseFloat(paidAmount) || 0) - existingPaid).toFixed(2)}
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
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : '✅ Complete Payment'}
                  </button>
                </>
              )}

              {success && <div className="billing-success">{success}</div>}
              {error && <div className="billing-error">{error}</div>}
            </>
          ) : (
            <p>No tests found for the selected booking.</p>
          )}
        </section>
      )}

      {/* Invoice Modal */}
      {showInvoice && invoiceData && (
        <div className="invoice-modal-overlay" onClick={() => setShowInvoice(false)}>
          <div className="invoice-modal" onClick={(e) => e.stopPropagation()}>
            <button className="clear-btn" style={{ float: 'right' }} onClick={() => setShowInvoice(false)}>✕</button>
            <h3>🧾 Invoice — {invoiceData.invoiceNo}</h3>
            <p>{invoiceData.patient.first_name} {invoiceData.patient.last_name} ({invoiceData.patient.patient_id})</p>
            <p>{invoiceData.date.toLocaleDateString()} {invoiceData.date.toLocaleTimeString()}</p>

            <table className="tests-table" style={{ marginTop: 12 }}>
              <thead>
                <tr><th>Test</th><th>Booking</th><th>Rate</th><th>Discount</th><th>Final</th></tr>
              </thead>
              <tbody>
                {invoiceData.bookings.flatMap((b) =>
                  b.tests.map((t, i) => (
                    <tr key={`${b.booking_id}-${i}`}>
                      <td>{t.test_name}</td>
                      <td>#{b.booking_id}</td>
                      <td>{t.rate}</td>
                      <td>{t.discount}</td>
                      <td>{t.final_price}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <p>Total Due: ₹{invoiceData.totalDue.toFixed(2)}</p>
              <p>Paid Now: ₹{invoiceData.paidAmount.toFixed(2)}</p>
              <p><strong>Balance: ₹{invoiceData.balance.toFixed(2)}</strong></p>
            </div>

            <button className="submit-btn" onClick={handlePrintInvoice} style={{ marginTop: 16 }}>
              🖨️ Print Invoice
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;