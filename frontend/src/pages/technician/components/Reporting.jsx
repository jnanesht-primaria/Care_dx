import React, { useState } from 'react';
import { getBookingTests, saveReport } from '../../../api/technician';

const Reporting = () => {
  const [bookingId, setBookingId] = useState('');
  const [tests, setTests] = useState([]);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchTests = async () => {
    if (!bookingId) return;
    setLoading(true);
    try {
      const res = await getBookingTests(bookingId);
      setTests(res.data);
      // initialize results with empty strings
      const init = {};
      res.data.forEach(item => { init[item.booking_item_id] = ''; });
      setResults(init);
    } catch (err) {
      alert('Failed to load tests');
    } finally {
      setLoading(false);
    }
  };

  const handleResultChange = (itemId, value) => {
    setResults({ ...results, [itemId]: value });
  };

  const handleSave = async (status) => {
    if (!bookingId) return;
    try {
      // For each item, save report. We'll combine all into one or per test.
      // Here we simply save each test individually.
      for (const item of tests) {
        const reportData = {
          booking_item_id: item.booking_item_id,
          result_data: { result: results[item.booking_item_id] || '' },
          status: status,
          report_date: new Date().toISOString().slice(0, 10),
        };
        await saveReport(reportData);
      }
      alert(`Reports ${status === 'Draft' ? 'saved as draft' : 'submitted for approval'}`);
    } catch (err) {
      alert('Failed to save reports');
    }
  };

  return (
    <div>
      <h2>Reporting</h2>
      <div>
        <input type="number" placeholder="Booking ID" value={bookingId} onChange={(e) => setBookingId(e.target.value)} />
        <button onClick={fetchTests} disabled={loading}>Load Tests</button>
      </div>
      {tests.length > 0 && (
        <div>
          <h4>Enter Results</h4>
          {tests.map(item => (
            <div key={item.booking_item_id} style={{ marginBottom: '10px' }}>
              <strong>{item.test_name}</strong>
              <input
                type="text"
                placeholder="Result"
                value={results[item.booking_item_id] || ''}
                onChange={(e) => handleResultChange(item.booking_item_id, e.target.value)}
              />
            </div>
          ))}
          <button onClick={() => handleSave('Draft')}>Save Draft</button>
          <button onClick={() => handleSave('Pending')}>Submit for Approval</button>
        </div>
      )}
    </div>
  );
};
export default Reporting;