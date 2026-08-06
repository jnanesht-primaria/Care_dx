// frontend/src/pages/admin/components/UserManagement.jsx
import React, { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, deleteUser, getLaboratories } from '../../../api/admin';
import './UserManagement.css';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'TECHNICIAN',
    lab_id: '',
    is_active: true,
  });

  const loadData = async () => {
    try {
      const [usersRes, labsRes] = await Promise.all([getUsers(), getLaboratories()]);
      setUsers(usersRes.data);
      setLabs(labsRes.data);
    } catch (err) {
      alert('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateUser(editingId, form);
      } else {
        await createUser(form);
      }
      setForm({ username: '', email: '', password: '', role: 'TECHNICIAN', lab_id: '', is_active: true });
      setEditingId(null);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (user) => {
    setEditingId(user.id);
    setForm({
      username: user.username,
      email: user.email,
      password: '',
      role: user.role,
      lab_id: user.lab_id || '',
      is_active: user.is_active,
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await deleteUser(id);
      loadData();
    } catch (err) {
      alert('Delete failed');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>User Management</h2>
      <form onSubmit={handleSubmit} className="admin-form">
        <input name="username" placeholder="Username*" value={form.username} onChange={handleChange} required />
        <input name="email" placeholder="Email*" type="email" value={form.email} onChange={handleChange} required />
        <input name="password" placeholder="Password*" type="password" value={form.password} onChange={handleChange} required={!editingId} />
        <select name="role" value={form.role} onChange={handleChange}>
          <option value="TECHNICIAN">Technician</option>
          <option value="RECEPTIONIST">Receptionist</option>
          <option value="ADMIN">Admin</option>
        </select>
        <select name="lab_id" value={form.lab_id} onChange={handleChange}>
          <option value="">-- No Lab --</option>
          {labs.map(lab => (
            <option key={lab.id} value={lab.id}>{lab.lab_name}</option>
          ))}
        </select>
        <label>
          <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
          Active
        </label>
        <button type="submit">{editingId ? 'Update' : 'Create'} User</button>
        {editingId && <button type="button" onClick={() => { setEditingId(null); setForm({ username: '', email: '', password: '', role: 'TECHNICIAN', lab_id: '', is_active: true }); }}>Cancel</button>}
      </form>

      <table className="admin-table">
        <thead>
          <tr><th>Username</th><th>Email</th><th>Role</th><th>Lab</th><th>Active</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.username}</td>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>{user.lab_name || '-'}</td>
              <td>{user.is_active ? 'Yes' : 'No'}</td>
              <td>
                <button onClick={() => handleEdit(user)}>Edit</button>
                <button onClick={() => handleDelete(user.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserManagement;