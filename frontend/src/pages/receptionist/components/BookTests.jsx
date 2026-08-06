// frontend/src/pages/receptionist/components/BookTests.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getTests, createBooking, searchPatients } from '../../../api/receptionist';
import './BookTests.css';

const BookTests = () => {
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patient') || '';

  const [patient, setPatient] = useState(null);
  const [tests, setTests] = useState([]);
  const [selectedTests, setSelectedTests] = useState([]);
  const [discounts, setDiscounts] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load tests
    getTests().then(res => setTests(res.data)).catch(console.error);
    // If patientId is provided, fetch patient details (optional)
    if (patientId) {
      searchPatients(patientId).then(res => {
        const found = res.data.find(p => p.id == patientId);
        if (found) setPatient(found);
      }).catch(console.error);
    }
  }, [patientId]);

  const handleAddTest = (testId) => {
    if (!selectedTests.includes(testId)) {
      setSelectedTests([...selectedTests, testId]);
      setDiscounts({ ...discounts, [testId]: 0 });
    }
  };

  const handleRemoveTest = (testId) => {
    setSelectedTests(selectedTests.filter(id => id !== testId));
    const newDiscounts = { ...discounts };
    delete newDiscounts[testId];
    setDiscounts(newDiscounts);
  };

  const handleDiscountChange = (testId, value) => {
    setDiscounts({ ...discounts, [testId]: parseFloat(value) || 0 });
  };

  const handleSubmit = async () => {
    if (!patientId) {
      alert('Please select a patient first');
      return;
    }
    if (selectedTests.length === 0) {
      alert('Add at least one test');
      return;
    }
    const payload = {
      patient_id: parseInt(patientId),
      tests: selectedTests.map(id => ({
        test_id: id,
        discount: discounts[id] || 0,
      })),
      payment_mode: 'Cash', // default, can add dropdown
      paid_amount: 0,
    };
    setLoading(true);
    try {
      const res = await createBooking(payload);
      alert(`Booking created! Booking ID: ${res.data.booking_id}`);
      setSelectedTests([]);
      setDiscounts({});
    } catch (err) {
      alert(err.response?.data?.message || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  const getTestName = (id) => tests.find(t => t.id === id)?.test_name || '';
  const getTestRate = (id) => tests.find(t => t.id === id)?.rate || 0;

  return (
    <div>
      <h2>Book Tests</h2>
      {patient && <p>Patient: {patient.first_name} {patient.last_name} (ID: {patient.patient_id})</p>}
      <div className="test-selector">
        <select onChange={(e) => handleAddTest(parseInt(e.target.value))} value="">
          <option value="">-- Add Test --</option>
          {tests.filter(t => !selectedTests.includes(t.id)).map(t => (
            <option key={t.id} value={t.id}>{t.test_name} (₹{t.rate})</option>
          ))}
        </select>
      </div>

      {selectedTests.length > 0 && (
        <div className="selected-tests">
          <h4>Selected Tests</h4>
          <table>
            <thead>
              <tr><th>Test</th><th>Rate</th><th>Discount</th><th>Final</th><th>Action</th></tr>
            </thead>
            <tbody>
              {selectedTests.map(id => {
                const rate = getTestRate(id);
                const disc = discounts[id] || 0;
                const final = rate - disc;
                return (
                  <tr key={id}>
                    <td>{getTestName(id)}</td>
                    <td>₹{rate}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={disc}
                        onChange={(e) => handleDiscountChange(id, e.target.value)}
                      />
                    </td>
                    <td>₹{final}</td>
                    <td><button onClick={() => handleRemoveTest(id)}>Remove</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Booking...' : 'Book Tests / Next'}
          </button>
        </div>
      )}
    </div>
  );
};

export default BookTests;