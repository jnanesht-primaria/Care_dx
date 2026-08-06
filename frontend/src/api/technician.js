// frontend/src/api/technician.js
import axiosInstance from './axios';

// ============================================================
// Dashboard
// ============================================================
export function fetchTechnicianStats(date) {
  return axiosInstance.get('/api/technician/dashboard', {
    params: { date }
  });
}

export function fetchTechnicianQueue({ scope, date, search } = {}) {
  return axiosInstance.get('/api/technician/tests-queue', {
    params: { scope, date, search }
  });
}

// ============================================================
// Tests & Queue
// ============================================================
export const getTests = () => axiosInstance.get('/api/technician/tests');

// Alias for TestsQueue.jsx – uses the same function as fetchTechnicianQueue
export const getTestsQueue = fetchTechnicianQueue;

export const createBooking = (data) => axiosInstance.post('/api/technician/bookings', data);

// ============================================================
// Appointment Actions (claim and status)
// ============================================================
export function claimAppointment(id) {
  return axiosInstance.patch(`/api/technician/appointments/${id}/claim`);
}

export function updateTechnicianAppointmentStatus(id, status) {
  return axiosInstance.patch(`/api/technician/appointments/${id}/status`, { status });
}

// ============================================================
// Test Results
// ============================================================
export function fetchTestResult(appointmentId) {
  return axiosInstance.get(`/api/technician/appointments/${appointmentId}/result`);
}

export function submitTestResult(appointmentId, payload) {
  return axiosInstance.post(`/api/technician/appointments/${appointmentId}/result`, payload);
}

// ============================================================
// Samples
// ============================================================
export const collectSample = (data) => axiosInstance.post('/api/technician/samples', data);

// ============================================================
// Reports
// ============================================================
export const getBookingTests = (bookingId) =>
  axiosInstance.get(`/api/technician/bookings/${bookingId}/tests`);

export const saveReport = (data) => axiosInstance.post('/api/technician/reports', data);

export const listReports = (params) =>
  axiosInstance.get('/api/technician/reports', { params });

export const uploadReportFile = (reportId, filePath) =>
  axiosInstance.put(`/api/technician/reports/${reportId}/upload`, { file_path: filePath });

// ============================================================
// Invoice
// ============================================================
export const getInvoice = (bookingId) =>
  axiosInstance.get(`/api/technician/bookings/${bookingId}/invoice`);

// ============================================================
// Patient Management
// ============================================================
export const registerPatient = (data) => axiosInstance.post('/api/technician/patients', data);
export const registerPatientAsTechnician = registerPatient;

export function searchPatientsAsTechnician(query) {
  const qs = query ? `?search=${encodeURIComponent(query)}` : "";
  return axiosInstance.get(`/api/technician/patients${qs}`)
    .then(response => Array.isArray(response.data) ? response.data : [])
    .catch(() => []);
}

// ============================================================
// Notifications
// ============================================================
export const fetchNotifications = () => axiosInstance.get('/api/technician/notifications');
export const markNotificationRead = (id) =>
  axiosInstance.patch(`/api/technician/notifications/${id}/read`);
export const getPatientPendingBooking = (patientId) =>
  axiosInstance.get(`/api/technician/patients/${patientId}/pending-booking`);