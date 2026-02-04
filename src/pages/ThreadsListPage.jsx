import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api"; // your axios instance
import { useAuth } from "../context/AuthContext";
import { formatDateTime } from "../utils/formatDateTime";
import "./ThreadsListPage.css";

export default function ThreadsListPage() {
  const [threads, setThreads] = useState([]);
  const [filter, setFilter] = useState("");
  const [userMap, setUserMap] = useState({});
  const { user } = useAuth();

  useEffect(() => {
    const fetchThreads = async () => {
      try {
        const res = await api.get("/forum-threads");
        setThreads(res.data.items || res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchThreads();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!threads.length) return;
      const ids = Array.from(new Set(threads.map((t) => t.createdByUserId)));
      const missing = ids.filter((id) => !userMap[id]);
      if (missing.length === 0) return;
      const entries = await Promise.all(
        missing.map(async (id) => {
          try {
            const res = await api.get(`/user/public/${id}`);
            return [id, res.data?.username];
          } catch (err) {
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
  }, [threads, userMap]);

  const visibleThreads = threads.filter((thread) =>
    thread.title?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="page-shell">
      <div className="split-row">
        <div>
          <h2 className="section-title">Forum Threads</h2>
          <p className="section-subtitle">Browse the latest discussions.</p>
        </div>
        <div className="threads-actions">
          {user && (
            <span className="user-chip">
              Signed in as {user.username || "User"} - {user.role || "Member"}
            </span>
          )}
          <Link to="/create-thread" className="btn btn-primary">Create New Thread</Link>
        </div>
      </div>

      <div className="threads-toolbar">
        <input
          className="input"
          placeholder="Search threads..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {visibleThreads.length === 0 ? (
        <div className="card card-pad empty-state">
          <h3>No threads yet.</h3>
          <p className="muted">Be the first to start a conversation.</p>
        </div>
      ) : (
        <div className="threads-grid">
          {visibleThreads.map((thread) => (
            <div key={thread.id} className="thread-card">
              <div className="thread-card__header">
                <Link to={`/threads/${thread.id}`}>
                  <h3>{thread.title}</h3>
                </Link>
                <div className="thread-badges">
                  {thread.isPinned && <span className="tag">Pinned</span>}
                  {thread.isLocked && <span className="tag tag-danger">Locked</span>}
                </div>
              </div>
              <div className="thread-meta">
                <span className="muted">
                  Created by{" "}
                  <Link to={`/users/${thread.createdByUserId}`} className="link">
                    {thread.createdByUsername ||
                      userMap[thread.createdByUserId] ||
                      `User ${thread.createdByUserId}`}
                  </Link>
                </span>
                <span className="muted">
                  Last post: {formatDateTime(thread.lastPostAt || thread.createdAt)}
                </span>
              </div>
              <div className="thread-actions">
                <Link to={`/threads/${thread.id}`} className="btn btn-secondary">
                  View Thread
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


