// frontend/src/pages/receptionist/components/FinanceEntry.jsx
import React, { useState, useEffect } from 'react';
import { addFinanceEntry, getFinanceEntries } from '../../../api/receptionist';
import './FinanceEntry.css';

const FinanceEntry = () => {
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({
    staff_name: '',
    role: '',
    type: 'Income',
    category: '',
    amount: '',
    paid: '',
    balance: '',
    remarks: '',
    entry_date: '',
  });

  useEffect(() => {
    getFinanceEntries().then(res => setEntries(res.data)).catch(console.error);
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addFinanceEntry(form);
      alert('Entry added');
      setForm({ staff_name: '', role: '', type: 'Income', category: '', amount: '', paid: '', balance: '', remarks: '', entry_date: '' });
      const res = await getFinanceEntries();
      setEntries(res.data);
    } catch (err) {
      alert('Failed to add entry');
    }
  };

  return (
    <div>
      <h2>Finance Entry</h2>
      <form onSubmit={handleSubmit} className="finance-form">
        <input name="staff_name" placeholder="Staff Name" onChange={handleChange} value={form.staff_name} />
        <input name="role" placeholder="Role" onChange={handleChange} value={form.role} />
        <select name="type" onChange={handleChange} value={form.type}>
          <option value="Income">Income</option>
          <option value="Expense">Expense</option>
        </select>
        <input name="category" placeholder="Category" onChange={handleChange} value={form.category} />
        <input name="amount" placeholder="Amount" type="number" onChange={handleChange} value={form.amount} />
        <input name="paid" placeholder="Paid" type="number" onChange={handleChange} value={form.paid} />
        <input name="balance" placeholder="Balance" type="number" onChange={handleChange} value={form.balance} />
        <input name="remarks" placeholder="Remarks" onChange={handleChange} value={form.remarks} />
        <input name="entry_date" type="date" onChange={handleChange} value={form.entry_date} />
        <button type="submit">Submit</button>
      </form>
      <h3>Recent Entries</h3>
      <table>
        <thead><tr><th>Staff</th><th>Type</th><th>Amount</th><th>Date</th></tr></thead>
        <tbody>
          {entries.map(e => (
            <tr key={e.id}>
              <td>{e.staff_name}</td>
              <td>{e.type}</td>
              <td>₹{e.amount}</td>
              <td>{e.entry_date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FinanceEntry;