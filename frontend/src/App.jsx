// frontend/src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/Login';

// Receptionist imports
import ReceptionistLayout from './pages/receptionist/Layout';
import ReceptionistDashboard from './pages/receptionist/Dashboard';
import ReceptionistPatients from './pages/receptionist/components/Patients';
import ReceptionistPatientRegistration from './pages/receptionist/components/PatientRegistration';
import ReceptionistBookTests from './pages/receptionist/components/BookTests';
import ReceptionistBilling from './pages/receptionist/components/Billing';
import ReceptionistReportStatus from './pages/receptionist/components/ReportStatus';
import ReceptionistFinanceEntry from './pages/receptionist/components/FinanceEntry';
import ReceptionistCampBudget from './pages/receptionist/components/CampBudget';
import ReceptionistCampPatientEntry from './pages/receptionist/components/CampPatientEntry';
import ReceptionistUpcomingCamps from './pages/receptionist/components/UpcomingCamps';

// Technician imports
import TechnicianLayout from './pages/technician/Layout';
import TechnicianDashboard from './pages/technician/Dashboard';
import TechnicianPatients from './pages/technician/components/Patients';
import TechnicianPatientRegistration from './pages/technician/components/PatientRegistration';
import TechnicianBookTests from './pages/technician/components/BookTests';
import TechnicianBilling from './pages/technician/components/Billing';
import TechnicianTestsQueue from './pages/technician/components/TestsQueue';
import TechnicianSampleCollection from './pages/technician/components/SampleCollection';
import TechnicianReporting from './pages/technician/components/Reporting';
import TechnicianReportManagement from './pages/technician/components/ReportManagement';

// Admin imports
import AdminLayout from './pages/admin/Layout';
import AdminDashboard from './pages/admin/Dashboard';
import UserManagement from './pages/admin/components/UserManagement';
import PartnerManagement from './pages/admin/components/PartnerManagement';
import TestCatalog from './pages/admin/components/TestCatalog';
import AdminReports from './pages/admin/components/Reports';

function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Navigate to={user ? `/${user.role.toLowerCase()}` : "/login"} replace />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Receptionist routes */}
      <Route path="/receptionist" element={<ReceptionistLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ReceptionistDashboard />} />
        <Route path="patients" element={<ReceptionistPatients />} />
        <Route path="register" element={<ReceptionistPatientRegistration />} />
        <Route path="book-tests" element={<ReceptionistBookTests />} />
        <Route path="billing" element={<ReceptionistBilling />} />
        <Route path="report-status" element={<ReceptionistReportStatus />} />
        <Route path="finance" element={<ReceptionistFinanceEntry />} />
        <Route path="camp-budget" element={<ReceptionistCampBudget />} />
        <Route path="camp-patient" element={<ReceptionistCampPatientEntry />} />
        <Route path="upcoming-camps" element={<ReceptionistUpcomingCamps />} />
      </Route>

      {/* Technician routes */}
      <Route path="/technician" element={<TechnicianLayout />}>
        <Route index element={<TechnicianDashboard />} />
        <Route path="dashboard" element={<TechnicianDashboard />} />
        <Route path="patients" element={<TechnicianPatients />} />
        <Route path="register" element={<TechnicianPatientRegistration />} />
        <Route path="book-tests" element={<TechnicianBookTests />} />
        <Route path="billing" element={<TechnicianBilling />} />
        <Route path="tests-queue" element={<TechnicianTestsQueue />} />
        <Route path="sample-collection" element={<TechnicianSampleCollection />} />
        <Route path="reporting" element={<TechnicianReporting />} />
        <Route path="report-management" element={<TechnicianReportManagement />} />
      </Route>

      {/* Admin routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="labs" element={<PartnerManagement />} />
        <Route path="tests" element={<TestCatalog />} />
        <Route path="reports" element={<AdminReports />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;