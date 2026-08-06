// frontend/src/pages/receptionist/components/UpcomingCamps.jsx
import React, { useState, useEffect } from 'react';
import { getUpcomingCamps } from '../../../api/receptionist';
import './UpcomingCamps.css';

const UpcomingCamps = () => {
  const [camps, setCamps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUpcomingCamps()
      .then(res => setCamps(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Upcoming Camps</h2>
      {camps.length === 0 ? (
        <p>No upcoming camps scheduled.</p>
      ) : (
        <ul>
          {camps.map(c => (
            <li key={c.id}>
              <strong>{c.camp_name}</strong> – {c.location} – {c.camp_date} – Coordinator: {c.coordinator_name} – Status: {c.status}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default UpcomingCamps;