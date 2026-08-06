// frontend/src/api/admin.js
import axiosInstance from './axios';

// ============================================================
// Dashboard
// ============================================================
export const getAdminDashboard = () => axiosInstance.get('/api/admin/dashboard');

// ============================================================
// User Management
// ============================================================
export const getUsers = () => axiosInstance.get('/api/admin/users');
export const createUser = (data) => axiosInstance.post('/api/admin/users', data);
export const updateUser = (id, data) => axiosInstance.put(`/api/admin/users/${id}`, data);
export const deleteUser = (id) => axiosInstance.delete(`/api/admin/users/${id}`);

// ============================================================
// Laboratory (Partner) Management
// ============================================================
export const getLaboratories = () => axiosInstance.get('/api/admin/laboratories');
export const createLaboratory = (data) => axiosInstance.post('/api/admin/laboratories', data);
export const updateLaboratory = (id, data) => axiosInstance.put(`/api/admin/laboratories/${id}`, data);
export const deleteLaboratory = (id) => axiosInstance.delete(`/api/admin/laboratories/${id}`);

// ============================================================
// Test Catalog Management
// ============================================================
export const getTests = () => axiosInstance.get('/api/admin/tests');
export const createTest = (data) => axiosInstance.post('/api/admin/tests', data);
export const updateTest = (id, data) => axiosInstance.put(`/api/admin/tests/${id}`, data);
export const deleteTest = (id) => axiosInstance.delete(`/api/admin/tests/${id}`);

// ============================================================
// Reports
// ============================================================
export const getReports = (params) => axiosInstance.get('/api/admin/reports', { params });
export const getReport = (id) => axiosInstance.get(`/api/admin/reports/${id}`);