// frontend/src/pages/technician/Components/AddPatient.jsx
import React, { useState } from 'react';
import { registerPatient } from '../../../api/technician';
import { useNavigate } from 'react-router-dom';
import './AddPatient.css';

const AddPatient = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    age: '',
    gender: 'Male',
    mobile: '',
    address_type: '',
    city: '',
    email: '',
    id_proof_type: '',
    id_proof_number: '',
    referral_source: '',
    referral_doctor: '',
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await registerPatient(form);
      alert('Patient registered successfully');
      navigate('/technician/dashboard');
    } catch (err) {
      alert(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Add Patient</h2>
      <form onSubmit={handleSubmit} className="registration-form">
        <div className="form-row">
          <input name="first_name" placeholder="First Name*" onChange={handleChange} required />
          <input name="last_name" placeholder="Last Name*" onChange={handleChange} required />
        </div>
        <div className="form-row">
          <input name="age" placeholder="Age" type="number" onChange={handleChange} />
          <select name="gender" onChange={handleChange}>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="form-row">
          <input name="mobile" placeholder="Mobile*" onChange={handleChange} required />
          <input name="email" placeholder="Email" type="email" onChange={handleChange} />
        </div>
        <div className="form-row">
          <input name="address_type" placeholder="Address Type" onChange={handleChange} />
          <input name="city" placeholder="City" onChange={handleChange} />
        </div>
        <div className="form-row">
          <input name="id_proof_type" placeholder="ID Proof Type" onChange={handleChange} />
          <input name="id_proof_number" placeholder="ID Proof Number" onChange={handleChange} />
        </div>
        <div className="form-row">
          <input name="referral_source" placeholder="Referral Source" onChange={handleChange} />
          <input name="referral_doctor" placeholder="Referral Doctor" onChange={handleChange} />
        </div>
        <div className="form-row">
          <input name="username" placeholder="Username (optional)" onChange={handleChange} />
          <input name="password" placeholder="Password (optional)" type="password" onChange={handleChange} />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Registering...' : 'Register Patient'}
        </button>
      </form>
    </div>
  );
};

export default AddPatient;