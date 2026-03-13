import { useEffect, useMemo, useState } from "react";
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
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const canPublish = user?.role === "Admin" || user?.role === "Teacher";

  const loadNews = async () => {
    try {
      const threadsRes = await api.get("/forum-threads?page=1&pageSize=300");
      const threads = threadsRes.data?.items || threadsRes.data || [];
      const onlyNews = threads.filter((thread) => thread.title?.toLowerCase().startsWith("[news]"));

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

      setNews(
        withPreview.sort(
          (a, b) => new Date(b.lastPostAt || b.createdAt) - new Date(a.lastPostAt || a.createdAt)
        )
      );
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Неуспешно зареждане на новините.");
    }
  };

  useEffect(() => {
    loadNews();
  }, []);

  const filteredNews = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return news;

    return news.filter((item) => {
      const titleMatch = item.title?.toLowerCase().includes(query);
      const previewMatch = item.preview?.toLowerCase().includes(query);
      const authorMatch = item.createdByUsername?.toLowerCase().includes(query);
      return titleMatch || previewMatch || authorMatch;
    });
  }, [news, search]);

  const handlePublish = async (e) => {
    e.preventDefault();

    if (!canPublish) {
      setError("Само учители и администратори могат да публикуват новини.");
      setMessage("");
      return;
    }

    if (!title.trim() || !content.trim()) {
      setError("Заглавие и съдържание са задължителни.");
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
      formData.append("title", "Съобщение");
      formData.append("content", content.trim());
      formData.append("threadId", String(threadId));
      await api.post("/ForumPosts", formData);

      setTitle("");
      setContent("");
      setMessage("Новината е публикувана.");
      await loadNews();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Неуспешно публикуване на новина.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell news-page">
      <section className="card card-pad news-head">
        <div>
          <h2 className="section-title">Новини и съобщения</h2>
          <p className="section-subtitle">Официални обновления от учители и администратори.</p>
        </div>
        <input
          className="input news-search"
          placeholder="Търси в новините"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </section>

      {canPublish && (
        <form className="card card-pad news-form" onSubmit={handlePublish}>
          <div className="split-row">
            <h3>Публикувай съобщение</h3>
            <span className="pill">{content.length} знака</span>
          </div>

          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Заглавие"
          />

          <textarea
            className="textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Опиши съобщението..."
          />

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Публикуване..." : "Публикувай"}
          </button>
        </form>
      )}

      {error && <p className="error-msg">{error}</p>}
      {message && <p className="success-msg">{message}</p>}

      <section className="news-feed">
        {filteredNews.length === 0 ? (
          <div className="card card-pad">
            <p className="muted">Все още няма публикувани съобщения.</p>
          </div>
        ) : (
          filteredNews.map((item) => (
            <Link key={item.id} to={`/threads/${item.id}`} className="news-feed-card">
              <div className="news-feed-card__meta">
                <span className="tag">Официално</span>
                <span className="muted">{formatDateTime(item.createdAt)}</span>
              </div>
              <h3>{item.title.replace(/^\[news\]\s*/i, "")}</h3>
              {item.preview && <p>{item.preview}</p>}
              <div className="news-feed-card__footer">
                <span className="muted">От {item.createdByUsername || "Екип"}</span>
                <span className="news-feed-card__cta">Отвори темата</span>
              </div>
            </Link>
          ))
        )}
      </section>

      <Link to="/threads" className="btn btn-ghost btn-sm">Назад към темите</Link>
    </div>
  );
}
