import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import TeacherRegisterPage from "./pages/TeacherRegisterPage";
import HomePage from "./pages/HomePage";
import ThreadsListPage from "./pages/ThreadsListPage";
import ThreadDetailsPage from "./pages/ThreadDetailsPage";
import ProfilePage from "./pages/ProfilePage";
import AdminUsersPage from "./pages/AdminUsersPage";
import CreateThreadPage from "./pages/CreateThreadPage";
import UserProfilePage from "./pages/UserProfilePage";
import MapPage from "./pages/MapPage";
import ReportPage from "./pages/ReportPage";
import NewsPage from "./pages/NewsPage";
import MyReportsPage from "./pages/MyReportsPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ConfirmEmailPage from "./pages/ConfirmEmailPage";
import ProtectedRoute from "./routes/ProtectedRoute";
import AppShell from "./components/AppShell";
import AppLoader from "./components/ui/AppLoader";
import { useAuth } from "./context/AuthContext";

function EntryPage() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <AppLoader label="Подготвяме твоя профил..." />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <LoginPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<EntryPage />} />
      <Route path="/login" element={<EntryPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/confirm-email" element={<ConfirmEmailPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/teacher-register" element={<TeacherRegisterPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<HomePage />} />
        <Route path="/threads" element={<ThreadsListPage />} />
        <Route path="/create-thread" element={<CreateThreadPage />} />
        <Route path="/threads/:id" element={<ThreadDetailsPage />} />
        <Route path="/users/:id" element={<UserProfilePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/my-reports" element={<MyReportsPage />} />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute role={["Admin", "Teacher"]}>
              <AdminUsersPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
