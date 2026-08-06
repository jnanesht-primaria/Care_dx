// frontend/src/pages/receptionist/components/CampBudget.jsx
import React, { useState, useEffect } from 'react';
import { addCampBudget, getCampBudgets } from '../../../api/receptionist';
import './CampBudget.css';

const CampBudget = () => {
  const [camps, setCamps] = useState([]);
  const [form, setForm] = useState({
    camp_name: '',
    location: '',
    budget_allocation: '',
    equipment_materials: '',
    total_amount: '',
    paid_amount: '',
    balance: '',
    camp_date: '',
    status: 'Scheduled',
  });

  useEffect(() => {
    getCampBudgets().then(res => setCamps(res.data)).catch(console.error);
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addCampBudget(form);
      alert('Camp budget added');
      const res = await getCampBudgets();
      setCamps(res.data);
      setForm({ camp_name: '', location: '', budget_allocation: '', equipment_materials: '', total_amount: '', paid_amount: '', balance: '', camp_date: '', status: 'Scheduled' });
    } catch (err) {
      alert('Failed');
    }
  };

  return (
    <div>
      <h2>Camp Budget Entry</h2>
      <form onSubmit={handleSubmit}>
        <input name="camp_name" placeholder="Camp Name*" onChange={handleChange} value={form.camp_name} required />
        <input name="location" placeholder="Location" onChange={handleChange} value={form.location} />
        <input name="budget_allocation" placeholder="Budget Allocation" type="number" onChange={handleChange} value={form.budget_allocation} />
        <textarea name="equipment_materials" placeholder="Equipment / Materials" onChange={handleChange} value={form.equipment_materials} />
        <input name="total_amount" placeholder="Total Amount" type="number" onChange={handleChange} value={form.total_amount} />
        <input name="paid_amount" placeholder="Paid Amount" type="number" onChange={handleChange} value={form.paid_amount} />
        <input name="balance" placeholder="Balance" type="number" onChange={handleChange} value={form.balance} />
        <input name="camp_date" type="date" onChange={handleChange} value={form.camp_date} />
        <select name="status" onChange={handleChange} value={form.status}>
          <option value="Scheduled">Scheduled</option>
          <option value="Ongoing">Ongoing</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <button type="submit">Submit</button>
      </form>
      <h3>Existing Camps</h3>
      <ul>
        {camps.map(c => (
          <li key={c.id}>{c.camp_name} - {c.location} - ₹{c.total_amount} - {c.status}</li>
        ))}
      </ul>
    </div>
  );
};

export default CampBudget;