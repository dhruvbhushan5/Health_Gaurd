import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Dashboard from './components/Dashboard/Dashboard';
import HealthMetrics from './components/Health/HealthMetrics';
import Diseases from './components/Health/Diseases';
import Medications from './components/Health/Medications';
import MealTracker from './components/Health/MealTracker';
import CalorieRecommendation from './components/AI/CalorieRecommendation';
import AdminDashboard from './components/Admin/AdminDashboard';
import AdminRoute from './components/Auth/AdminRoute';
import AdminLayout from './components/Admin/AdminLayout';
import Welcome from './components/Welcome/Welcome';
import Layout from './components/Layout/Layout';
import './App.css';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<Welcome />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/health-metrics" element={
              <ProtectedRoute>
                <Layout>
                  <HealthMetrics />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/diseases" element={
              <ProtectedRoute>
                <Layout>
                  <Diseases />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/medications" element={
              <ProtectedRoute>
                <Layout>
                  <Medications />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/meal-tracker" element={
              <ProtectedRoute>
                <Layout>
                  <MealTracker />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/calorie-recommendation" element={
              <ProtectedRoute>
                <Layout>
                  <CalorieRecommendation />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <AdminRoute>
                <AdminLayout>
                  <AdminDashboard />
                </AdminLayout>
              </AdminRoute>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
