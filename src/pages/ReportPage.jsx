import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/api";
import { useToast } from "../context/ToastContext";
import { toBgTargetType } from "../utils/localize";
import "./ReportPage.css";

const allowedTypes = new Set(["Post", "Thread", "Pin", "User"]);

export default function ReportPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const toast = useToast();

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

  const isValid =
    allowedTypes.has(reportInfo.type) && Number.isInteger(reportInfo.id) && reportInfo.id > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isValid) {
      setError("Невалидна цел на сигнала.");
      return;
    }
    if (!reason.trim()) {
      setError("Причината е задължителна.");
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

      setMessage("Сигналът е подаден успешно.");
      toast?.success("Сигналът е изпратен.");
      setTimeout(() => navigate("/my-reports?created=1"), 700);
    } catch (err) {
      const nextError = err?.response?.data?.message || err?.message || "Неуспешно подаване на сигнал.";
      setError(nextError);
      toast?.error(nextError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-shell">
      <section className="card card-pad report-card">
        <div className="split-row">
          <h2 className="section-title">Подай сигнал</h2>
          <Link to={reportInfo.returnTo || "/threads"} className="btn btn-ghost btn-sm">
            Назад
          </Link>
        </div>

        {!isValid ? (
          <p className="error-msg">Невалиден линк за докладване.</p>
        ) : (
          <>
            <p className="muted">
              Докладваш <strong>{toBgTargetType(reportInfo.type)}</strong>
              {reportInfo.label ? `: ${reportInfo.label}` : ""}
            </p>

            {error && <p className="error-msg">{error}</p>}
            {message && <p className="success-msg">{message}</p>}

            <form onSubmit={handleSubmit} className="form-grid">
              <input
                className="input"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Кратка причина"
                maxLength={200}
              />

              <textarea
                className="textarea"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Допълнителни детайли (по желание)"
                maxLength={2000}
              />

              <button className="btn btn-danger" type="submit" disabled={submitting}>
                {submitting ? "Изпращане..." : "Изпрати сигнал"}
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
