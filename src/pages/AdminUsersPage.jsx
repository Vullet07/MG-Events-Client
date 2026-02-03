import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import "./AdminUsersPage.css";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [banUntil, setBanUntil] = useState({});
  const [status, setStatus] = useState({});

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get("/user?page=1&pageSize=100");
        setUsers(res.data.items || res.data);
      } catch (err) {
        setError(err?.message || "Failed to load users.");
      }
    };
    fetchUsers();
  }, []);

  const visibleUsers = useMemo(() => {
    if (!filter) return users;
    const query = filter.toLowerCase();
    return users.filter(
      (u) =>
        u.username?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query)
    );
  }, [users, filter]);

  const handleBan = async (userId) => {
    setError("");
    setMessage("");
    try {
      const untilValue = banUntil[userId];
      const payload = {
        bannedUntil: untilValue ? new Date(untilValue).toISOString() : null
      };
      const res = await api.post(`/user/${userId}/ban`, payload);
      setStatus((prev) => ({
        ...prev,
        [userId]: { isBanned: true, bannedUntil: res.data?.bannedUntil || untilValue }
      }));
      setMessage(`User ${userId} banned.`);
    } catch (err) {
      setError(err?.message || "Failed to ban user.");
    }
  };

  const handleUnban = async (userId) => {
    setError("");
    setMessage("");
    try {
      await api.post(`/user/${userId}/unban`);
      setStatus((prev) => ({
        ...prev,
        [userId]: { isBanned: false, bannedUntil: null }
      }));
      setMessage(`User ${userId} unbanned.`);
    } catch (err) {
      setError(err?.message || "Failed to unban user.");
    }
  };

  return (
    <div className="page-shell">
      <div className="split-row">
        <div>
          <h2 className="section-title">Admin Users Dashboard</h2>
          <p className="section-subtitle">
            Search users, view profiles, and manage bans.
          </p>
        </div>
        <Link to="/threads" className="btn btn-ghost">Back to Threads</Link>
      </div>

      <div className="admin-toolbar">
        <input
          className="input"
          placeholder="Search by username or email"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {message && <p className="success-msg">{message}</p>}
      {error && <p className="error-msg">{error}</p>}

      <div className="admin-grid">
        {visibleUsers.map((user) => {
          const statusInfo = status[user.id];
          const isBanned = statusInfo?.isBanned;
          return (
            <div key={user.id} className="card card-pad admin-card">
              <div className="admin-card__header">
                <div>
                  <h3>{user.username}</h3>
                  <p className="muted">{user.email}</p>
                </div>
                <span className="tag tag-secondary">{user.role}</span>
              </div>
              <div className="admin-card__meta">
                <span className="pill">ID {user.id}</span>
                <Link to={`/users/${user.id}`} className="link">View Profile</Link>
              </div>
              <div className="admin-card__actions">
                <input
                  type="date"
                  className="input"
                  value={banUntil[user.id] || ""}
                  onChange={(e) =>
                    setBanUntil((prev) => ({
                      ...prev,
                      [user.id]: e.target.value
                    }))
                  }
                />
                <button className="btn btn-danger" onClick={() => handleBan(user.id)}>
                  Ban
                </button>
                <button className="btn btn-secondary" onClick={() => handleUnban(user.id)}>
                  Unban
                </button>
                {isBanned !== undefined && (
                  <span className={`tag ${isBanned ? "tag-danger" : "tag-secondary"}`}>
                    {isBanned ? "Banned" : "Active"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
