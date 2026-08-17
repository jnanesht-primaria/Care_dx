import React, { useState } from 'react';
import { registerPatient } from '../../../api/technician';
import { useNavigate } from 'react-router-dom';
import './PatientRegistration.css';

const PatientRegistration = () => {
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
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await registerPatient(form);
      alert('Patient registered successfully');
      navigate('/technician/patients');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm({
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
    setError('');
  };

  return (
    <div className="registration-container">
      <div className="registration-header">
        <h2>Register Patient</h2>
        <p>Enter patient details to create a new record</p>
      </div>

      {error && <div className="registration-error">{error}</div>}

      <form onSubmit={handleSubmit} className="registration-form">
        {/* ─── Personal Details ─────────────────────── */}
        <div className="form-section">
          <h3 className="section-title">Personal Details</h3>
          <div className="form-row">
            <div className="form-group">
              <label>First Name*</label>
              <input
                name="first_name"
                placeholder="Enter first name"
                value={form.first_name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Last Name*</label>
              <input
                name="last_name"
                placeholder="Enter last name"
                value={form.last_name}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Age</label>
              <input
                name="age"
                type="number"
                min="0"
                placeholder="Enter age"
                value={form.age}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Gender</label>
              <select name="gender" value={form.gender} onChange={handleChange}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* ─── Contact Details ──────────────────────── */}
        <div className="form-section">
          <h3 className="section-title">Contact Details</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Mobile*</label>
              <input
                name="mobile"
                placeholder="10-digit mobile number"
                value={form.mobile}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                name="email"
                type="email"
                placeholder="patient@example.com"
                value={form.email}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Address Type</label>
              <select name="address_type" value={form.address_type} onChange={handleChange}>
                <option value="">Select address type</option>
                <option value="Home">Home</option>
                <option value="Work">Work</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>City</label>
              <input
                name="city"
                placeholder="Enter city"
                value={form.city}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* ─── Identification ───────────────────────── */}
        <div className="form-section">
          <h3 className="section-title">Identification</h3>
          <div className="form-row">
            <div className="form-group">
              <label>ID Proof Type</label>
              <select name="id_proof_type" value={form.id_proof_type} onChange={handleChange}>
                <option value="">Select ID type</option>
                <option value="Aadhar">Aadhar</option>
                <option value="PAN">PAN</option>
                <option value="Passport">Passport</option>
                <option value="Driving License">Driving License</option>
                <option value="Voter ID">Voter ID</option>
              </select>
            </div>
            <div className="form-group">
              <label>ID Proof Number</label>
              <input
                name="id_proof_number"
                placeholder="Enter ID number"
                value={form.id_proof_number}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* ─── Referral Info ────────────────────────── */}
        <div className="form-section">
          <h3 className="section-title">Referral Information</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Referral Source</label>
              <input
                name="referral_source"
                placeholder="e.g. Hospital, Camp, Online"
                value={form.referral_source}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Referral Doctor</label>
              <input
                name="referral_doctor"
                placeholder="Enter doctor's name"
                value={form.referral_doctor}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* ─── Login Credentials ────────────────────── */}
        <div className="form-section">
          <h3 className="section-title">Login Credentials (Optional)</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Username</label>
              <input
                name="username"
                placeholder="Enter username"
                value={form.username}
                onChange={handleChange}
                autoComplete="off"
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                name="password"
                type="password"
                placeholder="Enter password"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
              />
            </div>
          </div>
        </div>

        {/* ─── Actions ──────────────────────────────── */}
        <div className="form-actions">
          <button type="button" className="reset-btn" onClick={handleReset} disabled={loading}>
            Reset
          </button>
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Registering...' : 'Register Patient'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PatientRegistration;