// src/App.jsx
import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import RegistrationPage from './components/Components/RegistrationPage';
import AdminApp from './components/AdminLayout';
import AdminLogin from './components/AdminLogin';
import CombinedMultiStepForm from './components/Components/MultiStepForm/CombinedMultiStepForm';
import ProtectedRoute from './components/Components/ProtectedRoute/ProtectedRoute';
import FacultyPage from './components/FacultyPage';
import FacultyLayout from './components/FacultyLayout';
import { API_BASE } from './lib/config';
import './App.css';

function App() {
  // Wake up backend server as soon as app loads (any page)
  useEffect(() => {
    const wakeBackend = async () => {
      try {
        // Fire-and-forget request to wake up Render backend
        fetch(`${API_BASE}/api`, { 
          method: 'GET'
        }).catch(() => {
          // Silent fail - backend will wake up eventually
          console.log('Backend warming up...');
        });
      } catch (err) {
        // Ignore errors - this is just pre-warming
      }
    };
    
    wakeBackend();
  }, []);
  // Optional: Only fetch backend data if needed (e.g., for admin dashboard)
  // If you don't use `backendData`, you can remove this useEffect entirely
  /*
  const [backendData, setBackendData] = useState(null);

  useEffect(() => {
    fetch(API_BASE + "/api")
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(data => setBackendData(data))
      .catch(err => console.error("API fetch error:", err));
  }, []);
  */

  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Navigate to="/register" replace />} />
        <Route path="/register" element={<RegistrationPage />} />
        <Route path="/faculty" element={<FacultyPage />} />

        {/* 🔒 Protected route: Only authenticated users can access */}
        <Route element={<ProtectedRoute />}>
          <Route path="/application" element={<CombinedMultiStepForm />} />
        </Route>

        {/* Admin login route */}
        <Route path="/admin/login" element={<AdminLogin />} />
        
        {/* Admin routes */}
        <Route path="/admin/*" element={<AdminApp />} />
        
        {/* Faculty Portal routes */}
        <Route path="/faculty-portal/*" element={<FacultyLayout />} />
      </Routes>
    </>
  );
}

export default App;
