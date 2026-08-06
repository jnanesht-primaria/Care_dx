// frontend/src/pages/receptionist/components/CampPatientEntry.jsx
import React, { useState, useEffect } from 'react';
import { addCampPatient, getCampPatients } from '../../../api/receptionist';
import './CampPatientEntry.css';

const CampPatientEntry = () => {
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({
    camp_name: '',
    camp_location: '',
    camp_date: '',
    coordinator_name: '',
    staff_name: '',
    role: '',
    contact_number: '',
    patient_count: '',
    follow_up_count: '',
    tests_conducted: '',
  });

  useEffect(() => {
    getCampPatients().then(res => setEntries(res.data)).catch(console.error);
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addCampPatient(form);
      alert('Camp patient entry added');
      const res = await getCampPatients();
      setEntries(res.data);
      setForm({ camp_name: '', camp_location: '', camp_date: '', coordinator_name: '', staff_name: '', role: '', contact_number: '', patient_count: '', follow_up_count: '', tests_conducted: '' });
    } catch (err) {
      alert('Failed');
    }
  };

  return (
    <div>
      <h2>Camp Patient Entry</h2>
      <form onSubmit={handleSubmit}>
        <input name="camp_name" placeholder="Camp Name*" onChange={handleChange} value={form.camp_name} required />
        <input name="camp_location" placeholder="Location" onChange={handleChange} value={form.camp_location} />
        <input name="camp_date" type="date" onChange={handleChange} value={form.camp_date} />
        <input name="coordinator_name" placeholder="Coordinator Name" onChange={handleChange} value={form.coordinator_name} />
        <input name="staff_name" placeholder="Staff Name" onChange={handleChange} value={form.staff_name} />
        <input name="role" placeholder="Role" onChange={handleChange} value={form.role} />
        <input name="contact_number" placeholder="Contact Number" onChange={handleChange} value={form.contact_number} />
        <input name="patient_count" placeholder="Patient Count" type="number" onChange={handleChange} value={form.patient_count} />
        <input name="follow_up_count" placeholder="Follow-up Count" type="number" onChange={handleChange} value={form.follow_up_count} />
        <input name="tests_conducted" placeholder="Tests Conducted (comma separated)" onChange={handleChange} value={form.tests_conducted} />
        <button type="submit">Submit</button>
      </form>
      <h3>Recent Entries</h3>
      <ul>
        {entries.map(e => (
          <li key={e.id}>{e.camp_name} - Patients: {e.patient_count} - Tests: {e.tests_conducted}</li>
        ))}
      </ul>
    </div>
  );
};

export default CampPatientEntry;