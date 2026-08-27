import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Updates from './pages/Updates';
import Vehicles from './pages/Vehicles';
import VehicleDetails from './pages/VehicleDetails';
import Stands from './pages/Stands';
import Rentals from './pages/Rentals';
import RentalRequests from './pages/RentalRequests';
import UserManagement from './pages/UserManagement';
import AccountApprovals from './pages/AccountApprovals';
import WalletApprovals from './pages/WalletApprovals';
import Transactions from './pages/Transactions';
import Plans from './pages/Plans';
import SecurityDeposits from './pages/SecurityDeposits';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './context/AuthContext';
import './App.css';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const Layout = ({ children }) => {
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '40px 60px', overflowY: 'auto', background: '#f8fafc' }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/updates" element={<ProtectedRoute><Layout><Updates /></Layout></ProtectedRoute>} />
          <Route path="/vehicles" element={<ProtectedRoute><Layout><Vehicles /></Layout></ProtectedRoute>} />
          <Route path="/vehicles/:id" element={<ProtectedRoute><Layout><VehicleDetails /></Layout></ProtectedRoute>} />
          <Route path="/stands" element={<ProtectedRoute><Layout><Stands /></Layout></ProtectedRoute>} />
          <Route path="/rentals" element={<ProtectedRoute><Layout><Rentals /></Layout></ProtectedRoute>} />
          <Route path="/rental-requests" element={<ProtectedRoute><Layout><RentalRequests /></Layout></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><Layout><UserManagement /></Layout></ProtectedRoute>} />
          <Route path="/account-approvals" element={<ProtectedRoute><Layout><AccountApprovals /></Layout></ProtectedRoute>} />
          <Route path="/wallet-approvals" element={<ProtectedRoute><Layout><WalletApprovals /></Layout></ProtectedRoute>} />
          <Route path="/security-deposits" element={<ProtectedRoute><Layout><SecurityDeposits /></Layout></ProtectedRoute>} />
          <Route path="/transactions" element={<ProtectedRoute><Layout><Transactions /></Layout></ProtectedRoute>} />
          <Route path="/plans" element={<ProtectedRoute><Layout><Plans /></Layout></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
