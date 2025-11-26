import React, { useState, useEffect } from 'react';
import { Layout, Button, Spin, theme } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';

import ConfigurationView from './components/ConfigurationView';
import BookingView from './components/BookingView';
import AgendaView from './components/AgendaView';
import LoginView from './components/LoginView';
import UserManagementView from './components/UserManagementView';
import InitialSetupView from './components/InitialSetupView';
import AdminLayout from './components/AdminLayout';
import { AuthProvider, useAuth } from './AuthContext';
import './App.css';

const { Header, Content } = Layout;

// PrivateRoute - for authenticated users, with optional adminOnly check
function PrivateRoute({ adminOnly = false }) {
  const { token, user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !user.is_admin) {
    return <Navigate to="/" replace />; // Redirect non-admin to public view
  }

  return <Outlet />; // Renders child routes
}

// AppRouter component contains all routing logic
function AppRouter() {
  const { token, user, loading: authLoading } = useAuth();
  const [needsInitialSetup, setNeedsInitialSetup] = useState(false);
  const [initialSetupCheckFinished, setInitialSetupCheckFinished] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkInitialSetup = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/initial-setup');
        if (response.ok) { // Backend returns 200 if setup is needed
          setNeedsInitialSetup(true);
        } else if (response.status === 307) { // Backend redirects if setup is not needed (handled by browser)
          setNeedsInitialSetup(false);
        } else if (response.status === 400) { // Should not happen with current backend logic
          setNeedsInitialSetup(false);
        }
      } catch (error) {
        console.error('Error checking initial setup:', error);
        setNeedsInitialSetup(false); // Assume not needed on network error
      } finally {
        setInitialSetupCheckFinished(true);
      }
    };

    if (!initialSetupCheckFinished && !token) { // Only check if not authenticated and not yet checked
        checkInitialSetup();
    }
  }, [initialSetupCheckFinished, token]);

  // Handle redirection after login
  useEffect(() => {
    if (!authLoading && !needsInitialSetup && token && user && (location.pathname === '/login' || location.pathname === '/')) {
      if (user.is_admin) {
        navigate('/admin/config', { replace: true }); // Admin home
      } else {
        navigate('/', { replace: true }); // Regular user home (booking)
      }
    }
  }, [token, user, authLoading, needsInitialSetup, location.pathname, navigate]);


  // Global Loading State
  if (authLoading || !initialSetupCheckFinished) { 
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  // --- Render based on application state ---
  return (
    <Routes>
      {/* Initial Setup Route */}
      {needsInitialSetup && (
        <Route path="/initial-setup" element={<InitialSetupView />} />
      )}
      {needsInitialSetup && <Route path="*" element={<Navigate to="/initial-setup" replace />} />}


      {/* Login Route (only if setup is done and not authenticated) */}
      {!needsInitialSetup && !token && (
        <Route path="/login" element={<LoginView />} />
      )}
      {!needsInitialSetup && !token && location.pathname !== '/' && (
        <Route path="*" element={<Navigate to="/login" replace />} />
      )}


      {/* Public Booking View - Always accessible if setup is done */}
      <Route path="/" element={<BookingView />} />

      {/* Admin Protected Routes */}
      <Route path="/admin" element={<PrivateRoute adminOnly />}>
        <Route element={<AdminLayout />}> {/* Render AdminLayout as the base for admin children */}
          <Route path="config" element={<ConfigurationView />} />
          <Route path="agenda" element={<AgendaView />} />
          <Route path="users" element={<UserManagementView />} />
          <Route index element={<Navigate to="config" replace />} /> {/* Default admin route */}
        </Route>
      </Route>

      {/* Fallback for unhandled routes - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}


function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter /> {/* Use the new AppRouter component */}
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;