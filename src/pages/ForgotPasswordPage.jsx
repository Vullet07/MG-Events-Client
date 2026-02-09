import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import "./ForgotPasswordPage.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setStatus("");

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", { email });
      setStatus(res?.data || "If the email exists, a reset link was sent.");
      setEmail("");
    } catch (err) {
      setError(err?.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>Forgot Password</h2>
        <p className="muted">
          Enter your email and we’ll send a reset link.
        </p>
        {error && <p className="error-msg">{error}</p>}
        {status && <p className="success-msg">{status}</p>}
        <input
          className="input"
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
        <div className="auth-footer">
          <Link to="/login" className="link">Back to login</Link>
        </div>
      </form>
    </div>
  );
}
