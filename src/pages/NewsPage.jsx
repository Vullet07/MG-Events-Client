import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";
import { formatDateTime } from "../utils/formatDateTime";
import "./NewsPage.css";

export default function NewsPage() {
  const { user } = useAuth();
  const [news, setNews] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const canPublish = user?.role === "Admin" || user?.role === "Teacher";

  const loadNews = async () => {
    try {
      const threadsRes = await api.get("/forum-threads?page=1&pageSize=200");
      const threads = threadsRes.data?.items || threadsRes.data || [];
      const onlyNews = threads.filter((t) => t.title?.toLowerCase().startsWith("[news]"));

      const withPreview = await Promise.all(
        onlyNews.map(async (thread) => {
          try {
            const postsRes = await api.get(`/ForumPosts/thread/${thread.id}?page=1&pageSize=1`);
            const firstPost = postsRes.data?.items?.[0];
            return {
              ...thread,
              preview: firstPost?.content || ""
            };
          } catch {
            return { ...thread, preview: "" };
          }
        })
      );

      setNews(withPreview);
    } catch (err) {
      setError(err?.message || "Failed to load news.");
    }
  };

  useEffect(() => {
    loadNews();
  }, []);

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError("Title and content are required.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    try {
      const threadRes = await api.post("/forum-threads", {
        title: `[News] ${title.trim()}`
      });

      const threadId = threadRes.data?.id;
      const formData = new FormData();
      formData.append("title", "Announcement");
      formData.append("content", content.trim());
      formData.append("threadId", String(threadId));
      await api.post("/ForumPosts", formData);

      setTitle("");
      setContent("");
      setMessage("News published.");
      await loadNews();
    } catch (err) {
      setError(err?.message || "Failed to publish news.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell news-page">
      <div className="split-row">
        <div>
          <h2 className="section-title">News</h2>
          <p className="section-subtitle">Upcoming events and important announcements.</p>
        </div>
        <Link to="/dashboard" className="btn btn-ghost">Back to Dashboard</Link>
      </div>

      {canPublish && (
        <form className="card card-pad news-form" onSubmit={handlePublish}>
          <h3>Publish Announcement</h3>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event or announcement title"
          />
          <textarea
            className="textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write the announcement details..."
          />
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Publishing..." : "Publish"}
          </button>
        </form>
      )}

      {error && <p className="error-msg">{error}</p>}
      {message && <p className="success-msg">{message}</p>}

      <div className="news-list">
        {news.length === 0 ? (
          <div className="card card-pad">
            <p className="muted">No announcements yet.</p>
          </div>
        ) : (
          news.map((item) => (
            <Link key={item.id} to={`/threads/${item.id}`} className="card card-pad news-card">
              <h3>{item.title.replace(/^\[news\]\s*/i, "")}</h3>
              {item.preview && <p>{item.preview}</p>}
              <span className="muted">{formatDateTime(item.createdAt)}</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
