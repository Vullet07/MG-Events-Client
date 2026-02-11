import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/api";
import "./ReportPage.css";

const allowedTypes = new Set(["Post", "Thread", "Pin", "User"]);

export default function ReportPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reportInfo = useMemo(() => {
    const type = params.get("type") || "";
    const id = Number(params.get("id"));
    const label = params.get("label") || "";
    const returnTo = params.get("returnTo") || "/threads";
    return { type, id, label, returnTo };
  }, [params]);

  const isValid = allowedTypes.has(reportInfo.type) && Number.isInteger(reportInfo.id) && reportInfo.id > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) {
      setError("Invalid report target.");
      return;
    }
    if (!reason.trim()) {
      setError("Reason is required.");
      return;
    }

    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      await api.post("/reports", {
        targetType: reportInfo.type,
        targetId: reportInfo.id,
        reason: reason.trim(),
        details: details.trim() || null
      });
      setMessage("Report submitted.");
      setTimeout(() => navigate(reportInfo.returnTo), 700);
    } catch (err) {
      setError(err?.message || "Failed to submit report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="card card-pad report-card">
        <div className="split-row">
          <h2 className="section-title">Report Content</h2>
          <Link to={reportInfo.returnTo || "/threads"} className="btn btn-ghost">Back</Link>
        </div>

        {!isValid ? (
          <p className="error-msg">Invalid report link.</p>
        ) : (
          <>
            <p className="muted">
              Reporting: <strong>{reportInfo.type}</strong>{reportInfo.label ? ` - ${reportInfo.label}` : ""}
            </p>
            {error && <p className="error-msg">{error}</p>}
            {message && <p className="success-msg">{message}</p>}
            <form onSubmit={handleSubmit} className="form-grid">
              <input
                className="input"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Short reason"
                maxLength={200}
              />
              <textarea
                className="textarea"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Extra details (optional)"
                maxLength={2000}
              />
              <button className="btn btn-danger" type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Report"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
