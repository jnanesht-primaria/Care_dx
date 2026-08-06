import React, { useState, useEffect } from 'react';
import { getTestsQueue } from '../../../api/technician';

const TestsQueue = () => {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTestsQueue().then(res => setQueue(res.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Tests Queue</h2>
      <table className="queue-table">
        <thead><tr><th>Patient</th><th>Tests</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          {queue.map(item => (
            <tr key={item.booking_id}>
              <td>{item.patient_name}</td>
              <td>{item.tests_assigned.map(t => t.test_name).join(', ')}</td>
              <td>{item.status}</td>
              <td><button>Collect Sample</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
export default TestsQueue;