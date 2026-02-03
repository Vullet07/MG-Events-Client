import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import ThreadsListPage from "./pages/ThreadsListPage";
import ThreadDetailsPage from "./pages/ThreadDetailsPage";
import ProfilePage from "./pages/ProfilePage";
import AdminUsersPage from "./pages/AdminUsersPage";
import CreateThreadPage from "./pages/CreateThreadPage";
import UserProfilePage from "./pages/UserProfilePage";
import ProtectedRoute from "./routes/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/threads"
        element={
          <ProtectedRoute>
            <ThreadsListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-thread"
        element={
          <ProtectedRoute>
            <CreateThreadPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/threads/:id"
        element={
          <ProtectedRoute>
            <ThreadDetailsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users/:id"
        element={
          <ProtectedRoute>
            <UserProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute role="Admin">
            <AdminUsersPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
