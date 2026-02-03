import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/api";
import "./CreateThreadPage.css";

export default function CreateThreadPage() {
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/forum-threads", { title });
      navigate(`/threads/${res.data.id}`);
    } catch (err) {
      setError(err?.message || "Failed to create thread.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="card card-pad create-thread-card">
        <div className="split-row">
          <div>
            <h2 className="section-title">Start a New Thread</h2>
            <p className="section-subtitle">
              Share a question or spark a conversation.
            </p>
          </div>
          <Link to="/threads" className="btn btn-ghost">Back to Threads</Link>
        </div>

        {error && <p className="error-msg">{error}</p>}

        <form onSubmit={handleSubmit} className="form-grid">
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Thread title"
          />
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Thread"}
          </button>
        </form>
      </div>
    </div>
  );
}
