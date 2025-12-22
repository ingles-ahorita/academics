import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import ClassesPage from './pages/ClassesPage';
import ClassAttendancePage from './pages/ClassAttendancePage';
import StudentManagementPage from './pages/StudentManagementPage';
import './App.css';

function ProtectedRoute({ children }) {
  const { teacher, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return teacher ? children : <Navigate to="/" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route 
        path="/classes" 
        element={
          <ProtectedRoute>
            <ClassesPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/class/:classId/attendance" 
        element={
          <ProtectedRoute>
            <ClassAttendancePage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/students" 
        element={
          <ProtectedRoute>
            <StudentManagementPage />
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}


