import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import "./CreateThreadPage.css";

export default function CreateThreadPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const toast = useToast();
  const navigate = useNavigate();
  const canPublishNews = user?.role === "Admin" || user?.role === "Teacher";

  useEffect(() => {
    const prefilledTitle = searchParams.get("title");
    if (prefilledTitle) {
      setTitle(prefilledTitle);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Заглавието е задължително.");
      return;
    }

    if (/^\s*\[news\]\b/i.test(title) && !canPublishNews) {
      setError("Само учители и администратори могат да публикуват новини.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/forum-threads", { title: title.trim() });
      toast?.success("Темата е създадена успешно.");
      navigate(`/threads/${res.data.id}`);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Неуспешно създаване на тема.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <section className="card card-pad create-thread-card">
        <h2 className="section-title">Създай нова тема</h2>
        <p className="section-subtitle">Използвай ясно заглавие, за да се намира темата лесно.</p>

        {error && <p className="error-msg">{error}</p>}

        <form onSubmit={handleSubmit} className="form-grid">
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Пример: Опасна пешеходна пътека до училището"
          />

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Създаване..." : "Създай тема"}
          </button>
        </form>
      </section>
    </div>
  );
}
