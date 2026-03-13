import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";
import { formatDateTime } from "../utils/formatDateTime";
import { toBgRole } from "../utils/localize";
import EmptyState from "../components/ui/EmptyState";
import { Skeleton, SkeletonLines } from "../components/ui/Skeleton";
import "./ThreadsListPage.css";

export default function ThreadsListPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [threads, setThreads] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [filter, setFilter] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setFilter(searchParams.get("search") || "");
  }, [searchParams]);

  useEffect(() => {
    const fetchThreads = async () => {
      try {
        setLoading(true);
        const res = await api.get("/forum-threads?page=1&pageSize=500");
        setThreads(res.data?.items || res.data || []);
      } catch (err) {
        setError(err?.response?.data?.message || err?.message || "Неуспешно зареждане на темите.");
      } finally {
        setLoading(false);
      }
    };

    fetchThreads();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!threads.length) return;

      const ids = Array.from(new Set(threads.map((thread) => thread.createdByUserId).filter(Boolean)));
      if (!ids.length) return;

      const entries = await Promise.all(
        ids.map(async (id) => {
          if (userMap[id]) return [id, userMap[id]];
          try {
            const res = await api.get(`/user/public/${id}`);
            return [id, res.data?.username || null];
          } catch {
            return [id, null];
          }
        })
      );

      setUserMap((prev) => {
        const next = { ...prev };
        entries.forEach(([id, username]) => {
          if (username) next[id] = username;
        });
        return next;
      });
    };

    fetchUsers();
  }, [threads]);

  const filteredThreads = useMemo(() => {
    const query = filter.trim().toLowerCase();

    return threads
      .filter((thread) => {
        const title = thread.title?.toLowerCase() || "";
        if (query && !title.includes(query)) return false;

        if (statusFilter === "open" && thread.isLocked) return false;
        if (statusFilter === "locked" && !thread.isLocked) return false;
        if (statusFilter === "pinned" && !thread.isPinned) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "title") return String(a.title || "").localeCompare(String(b.title || ""));
        if (sortBy === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
        return new Date(b.lastPostAt || b.createdAt) - new Date(a.lastPostAt || a.createdAt);
      });
  }, [threads, filter, statusFilter, sortBy]);

  const stats = useMemo(() => {
    const locked = threads.filter((thread) => thread.isLocked).length;
    const pinned = threads.filter((thread) => thread.isPinned).length;
    return {
      total: threads.length,
      locked,
      open: Math.max(0, threads.length - locked),
      pinned
    };
  }, [threads]);

  return (
    <div className="page-shell threads-page">
      <section className="card card-pad threads-head">
        <div>
          <h2 className="section-title">Форумни теми</h2>
          <p className="section-subtitle">Търси, сортирай и отвори активните дискусии.</p>
        </div>
        <div className="threads-head__actions">
          {user && (
            <span className="pill">
              {user.username || "Потребител"} - {toBgRole(user.role)}
            </span>
          )}
          <Link to="/create-thread" className="btn btn-primary">Създай тема</Link>
        </div>
      </section>

      <section className="threads-stats">
        <article className="card card-pad"><strong>{stats.total}</strong><span>Общо</span></article>
        <article className="card card-pad"><strong>{stats.open}</strong><span>Отворени</span></article>
        <article className="card card-pad"><strong>{stats.locked}</strong><span>Заключени</span></article>
        <article className="card card-pad"><strong>{stats.pinned}</strong><span>Закачени</span></article>
      </section>

      <section className="card card-pad threads-toolbar">
        <input
          className="input"
          placeholder="Търси тема по заглавие"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">Всички статуси</option>
          <option value="open">Само отворени</option>
          <option value="locked">Само заключени</option>
          <option value="pinned">Само закачени</option>
        </select>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="recent">Последна активност</option>
          <option value="oldest">Най-стари първо</option>
          <option value="title">По азбучен ред</option>
        </select>
      </section>

      {error && <p className="error-msg">{error}</p>}

      {loading ? (
        <section className="threads-feed">
          {Array.from({ length: 6 }).map((_, index) => (
            <article key={index} className="thread-feed-card">
              <div className="thread-feed-card__status" />
              <div className="thread-feed-card__body">
                <Skeleton className="thread-skeleton-title" />
                <SkeletonLines lines={3} />
              </div>
              <div className="thread-actions thread-actions--feed">
                <Skeleton className="thread-skeleton-btn" />
                <Skeleton className="thread-skeleton-btn" />
              </div>
            </article>
          ))}
        </section>
      ) : filteredThreads.length === 0 ? (
        <EmptyState
          title="Няма намерени теми"
          description="Промени филтрите или създай нова дискусия."
          actionLabel="Създай тема"
          actionTo="/create-thread"
        />
      ) : (
        <section className="threads-feed">
          {filteredThreads.map((thread) => (
            <article key={thread.id} className="thread-feed-card">
              <div className="thread-feed-card__status">
                <span className={`thread-feed-card__bar ${thread.isPinned ? "is-pinned" : thread.isLocked ? "is-locked" : "is-open"}`} />
              </div>

              <div className="thread-feed-card__body">
                <div className="thread-feed-card__meta">
                  <span className="thread-feed-card__author">
                    {thread.createdByUsername || userMap[thread.createdByUserId] || "Неизвестен потребител"}
                  </span>
                  <span className="thread-feed-card__dot" />
                  <span className="muted">{toBgRole(thread.createdByRole || "Student")}</span>
                  <span className="thread-feed-card__dot" />
                  <span className="muted">{formatDateTime(thread.lastPostAt || thread.createdAt)}</span>
                </div>

                <Link to={`/threads/${thread.id}`} className="thread-feed-card__title">
                  <h3>{thread.title}</h3>
                </Link>

                <p className="thread-feed-card__summary">
                  {thread.isLocked
                    ? "Темата е заключена и е видима само за четене."
                    : "Активна дискусия с подреден хронологичен поток и възможност за докладване."}
                </p>

                <div className="thread-feed-card__footer">
                  <div className="thread-badges">
                    {thread.isPinned && <span className="tag">Закачена</span>}
                    {thread.isLocked && <span className="tag tag-danger">Заключена</span>}
                    {!thread.isPinned && !thread.isLocked && <span className="tag tag-secondary">Активна</span>}
                  </div>
                  <span className="muted">Създадена: {formatDateTime(thread.createdAt)}</span>
                </div>
              </div>

              <div className="thread-actions thread-actions--feed">
                <Link to={`/threads/${thread.id}`} className="btn btn-secondary">Отвори</Link>
                <Link
                  className="btn btn-danger"
                  to={`/report?type=Thread&id=${thread.id}&label=${encodeURIComponent(thread.title || "Тема")}&returnTo=${encodeURIComponent(location.pathname)}`}
                >
                  Докладвай
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
