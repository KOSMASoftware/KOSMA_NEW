
import React from 'react';
import { HashRouter, BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Landing } from './pages/Landing';
import { AuthPage } from './pages/Auth';
import { CustomerDashboard } from './pages/CustomerDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { UserRole } from './types';
import { Loader2 } from 'lucide-react';

// Guard for protected routes
const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: UserRole }> = ({ children, requiredRole }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
      return (
          <div className="h-screen w-full flex items-center justify-center bg-gray-50">
              <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          </div>
      );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    // Redirect customers trying to access admin to their own dash
    return <Navigate to={user?.role === UserRole.ADMIN ? '/admin' : '/dashboard'} replace />;
  }

  return <Layout>{children}</Layout>;
};

const App: React.FC = () => {
  // RADIKALE LÖSUNG:
  // Wir prüfen, ob wir auf dem Pfad /update-password sind (durch Supabase Redirect).
  // Wenn ja, rendern wir die AuthPage direkt in einem BrowserRouter, damit die URL und der Hash (Token) 
  // unangetastet bleiben und von Supabase verarbeitet werden können.
  // KEIN REDIRECT, KEIN HASH-ROUTER FÜR DIESEN FALL.
  const isUpdatePasswordPath = window.location.pathname === '/update-password' || window.location.pathname.endsWith('/update-password');

  if (isUpdatePasswordPath) {
    return (
      // FIX: 'key' zwingt React, den AuthProvider neu zu mounten, wenn wir in diesen Modus wechseln.
      <AuthProvider key="auth-recovery">
        <BrowserRouter>
           <AuthPage mode="update-password" />
        </BrowserRouter>
      </AuthProvider>
    );
  }

  return (
    // FIX: 'key' zwingt React, den AuthProvider neu zu mounten, wenn wir zurück in den normalen Modus kommen.
    // Dadurch wird 'initSession' (useEffect) erneut ausgeführt und der Login funktioniert sofort.
    <AuthProvider key="auth-normal">
      <HashRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />
          {/* Fallback route within HashRouter just in case */}
          <Route path="/update-password" element={<AuthPage mode="update-password" />} />

          {/* Customer Routes */}
          <Route 
            path="/dashboard/*" 
            element={
              <ProtectedRoute requiredRole={UserRole.CUSTOMER}>
                <CustomerDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Admin Routes */}
          <Route 
            path="/admin/*" 
            element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;
