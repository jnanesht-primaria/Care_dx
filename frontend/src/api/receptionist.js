// frontend/src/api/receptionist.js
import axiosInstance from './axios';

// Dashboard
export const getDashboard = () => axiosInstance.get('/api/receptionist/dashboard');

// Patients
export const searchPatients = (query) =>
  axiosInstance.get('/api/receptionist/patients/search', { params: { q: query } });

export const registerPatient = (data) =>
  axiosInstance.post('/api/receptionist/patients', data);

// Tests
export const getTests = () => axiosInstance.get('/api/receptionist/tests');

// Bookings
export const createBooking = (data) =>
  axiosInstance.post('/api/receptionist/bookings', data);

export const updateBookingStatus = (bookingId, status) =>
  axiosInstance.put(`/api/receptionist/bookings/${bookingId}/status`, { status });

export const getInvoice = (bookingId) =>
  axiosInstance.get(`/api/receptionist/bookings/${bookingId}/invoice`);

// Finance
export const addFinanceEntry = (data) =>
  axiosInstance.post('/api/receptionist/finance', data);

export const getFinanceEntries = () =>
  axiosInstance.get('/api/receptionist/finance');

// Camp Budget
export const addCampBudget = (data) =>
  axiosInstance.post('/api/receptionist/camp-budget', data);

export const getCampBudgets = () =>
  axiosInstance.get('/api/receptionist/camp-budget');

// Camp Patient
export const addCampPatient = (data) =>
  axiosInstance.post('/api/receptionist/camp-patient', data);

export const getCampPatients = () =>
  axiosInstance.get('/api/receptionist/camp-patient');

// Upcoming Camps
export const getUpcomingCamps = () =>
  axiosInstance.get('/api/receptionist/upcoming-camps');