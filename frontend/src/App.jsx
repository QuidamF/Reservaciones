import React, { useState, useEffect } from 'react';
import { Layout, Button, Spin, theme } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';

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
  const { token, user, loading: authLoading } = useAuth(); // Need token and user here
  const [needsInitialSetup, setNeedsInitialSetup] = useState(false);
  const [initialSetupCheckFinished, setInitialSetupCheckFinished] = useState(false);

  useEffect(() => {
    const checkInitialSetup = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/initial-setup`);
        if (response.ok) {
          const data = await response.json();
          setNeedsInitialSetup(data.setup_needed);
        } else {
          setNeedsInitialSetup(false);
        }
      } catch (error) {
        setNeedsInitialSetup(false);
      } finally {
        setInitialSetupCheckFinished(true);
      }
    };

    if (!token) { // Only check initial setup if not authenticated
        checkInitialSetup();
    } else {
        // If there's a token, assume initial setup is complete.
        setInitialSetupCheckFinished(true);
        setNeedsInitialSetup(false); 
    }
  }, [token]);

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
      <Route path="/initial-setup" element={<InitialSetupView />} />

      {/* Login Route */}
      <Route path="/login" element={<LoginView />} />

      {/* Public Booking View */}
      <Route path="/book" element={<BookingView />} />

      {/* Root Path - Intelligent Redirection */}
      <Route path="/" element={
        needsInitialSetup ? (
          <Navigate to="/initial-setup" replace />
        ) : (
          token && user ? (
            user.is_admin ? (
              <Navigate to="/admin/config" replace />
            ) : (
              <Navigate to="/book" replace />
            )
          ) : (
            <Navigate to="/book" replace /> // Default to booking for unauthenticated
          )
        )
      } />

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
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <AppRouter /> {/* Use the new AppRouter component */}
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
