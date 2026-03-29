import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './index.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/dashboard/Dashboard';
import MyAnimals from './pages/animals/MyAnimals';
import CattleMarket from './pages/cattle/CattleMarket';
import BreedingRecords from './pages/records/BreedingRecords';
import FeedingRecords from './pages/records/FeedingRecords';
import AnimalProgress from './pages/records/AnimalProgress';
import VaccinationRecords from './pages/records/VaccinationRecords';
import Installments from './pages/vouchers/Installments';
import Vouchers from './pages/vouchers/Vouchers';
import Profile from './pages/profile/Profile';
import NotFound from './pages/NotFound';
import logo from '../assets/favicon.svg';

// ✅ ProtectedRoute defined here
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1b4332, #40916c)'
    }}>
      <div style={{ color: 'white', fontSize: '2rem', fontWeight: 800, marginBottom: '16px' }}>
        Farm<span style={{ color: '#95d5b2' }}>Fusion</span>
      </div>
      <div style={{
        width: '36px', height: '36px', borderRadius: '50%',
        border: '3px solid rgba(255,255,255,0.3)',
        borderTop: '3px solid white',
        animation: 'spin 0.8s linear infinite'
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
};

// ✅ PublicRoute defined here
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : children;
};

// ✅ AppRoutes separated so useAuth works inside BrowserRouter + AuthProvider
const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="dashboard"        element={<Dashboard />} />
        <Route path="my-animals"       element={<MyAnimals />} />
        <Route path="cattle"           element={<CattleMarket />} />
        <Route path="breeding-records" element={<BreedingRecords />} />
        <Route path="feeding-records"  element={<FeedingRecords />} />
        <Route path="animal-progress"  element={<AnimalProgress />} />
        <Route path="installments"     element={<Installments />} />
        <Route path="vouchers"         element={<Vouchers />} />
        <Route path="profile"          element={<Profile />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastContainer position="top-right" autoClose={3000} theme="light" />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;