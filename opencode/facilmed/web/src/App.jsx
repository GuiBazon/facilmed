import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardMedico from './pages/DashboardMedico';
import GestaoMedicos from './pages/GestaoMedicos';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex justify-center items-center h-screen"><div className="text-gray-500">Carregando...</div></div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.tipo_usuario)) return <Navigate to="/" />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={
        <ProtectedRoute>
          {user?.tipo_usuario === 'ADMIN' ? <GestaoMedicos /> : <DashboardMedico />}
        </ProtectedRoute>
      } />
      <Route path="/medicos" element={
        <ProtectedRoute roles={['ADMIN']}>
          <GestaoMedicos />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
