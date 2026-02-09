import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../api/api";
import "./ForgotPasswordPage.css";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function ResetPasswordPage() {
  const query = useQuery();
  const token = query.get("token") || "";
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setStatus("");

    if (!token) {
      setError("Missing reset token.");
      return;
    }
    if (!password || !confirm) {
      setError("Please fill in both password fields.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      setError("Password must be 8+ chars, include 1 uppercase letter and 1 digit.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/reset-password", {
        token,
        newPassword: password
      });
      setStatus(res?.data || "Password reset successfully.");
      setPassword("");
      setConfirm("");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      const apiMessage = err?.response?.data?.message;
      const validation =
        err?.response?.data?.errors &&
        Object.values(err.response.data.errors).flat().join(" ");
      setError(apiMessage || validation || err?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>Reset Password</h2>
        <p className="muted">
          Set a new password for your account.
        </p>
        {error && <p className="error-msg">{error}</p>}
        {status && <p className="success-msg">{status}</p>}
        <input
          className="input"
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <small className="muted">
          Must be at least 8 characters, with 1 uppercase letter and 1 digit.
        </small>
        <input
          className="input"
          type="password"
          placeholder="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Saving..." : "Reset Password"}
        </button>
        <div className="auth-footer">
          <Link to="/login" className="link">Back to login</Link>
        </div>
      </form>
    </div>
  );
}
