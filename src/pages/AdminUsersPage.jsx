import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";
import "./AdminUsersPage.css";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [banUntil, setBanUntil] = useState({});
  const [status, setStatus] = useState({});
  const [reports, setReports] = useState([]);
  const [teacherForm, setTeacherForm] = useState({
    username: "",
    email: "",
    password: ""
  });
  const { user: currentUser } = useAuth();

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

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await api.get("/reports");
        setReports(res.data || []);
      } catch (err) {
        setError(err?.message || "Failed to load reports.");
      }
    };
    fetchReports();
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
      const bannedUser = users.find((u) => u.id === userId);
      setMessage(`${bannedUser?.username || "User"} banned.`);
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
      const unbannedUser = users.find((u) => u.id === userId);
      setMessage(`${unbannedUser?.username || "User"} unbanned.`);
    } catch (err) {
      setError(err?.message || "Failed to unban user.");
    }
  };

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await api.post("/user/create-teacher", teacherForm);
      setTeacherForm({ username: "", email: "", password: "" });
      setMessage("Teacher account created.");
      const res = await api.get("/user?page=1&pageSize=100");
      setUsers(res.data.items || res.data);
    } catch (err) {
      setError(err?.message || "Failed to create teacher.");
    }
  };

  const handleReportStatus = async (reportId, statusValue) => {
    setError("");
    try {
      await api.put(`/reports/${reportId}/status`, { status: statusValue });
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: statusValue } : r))
      );
    } catch (err) {
      setError(err?.message || "Failed to update report.");
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

      {currentUser?.role === "Admin" && (
        <form className="card card-pad admin-create-teacher" onSubmit={handleCreateTeacher}>
          <h3>Create Teacher Account</h3>
          <input
            className="input"
            placeholder="Username"
            value={teacherForm.username}
            onChange={(e) => setTeacherForm((p) => ({ ...p, username: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Email"
            value={teacherForm.email}
            onChange={(e) => setTeacherForm((p) => ({ ...p, email: e.target.value }))}
          />
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={teacherForm.password}
            onChange={(e) => setTeacherForm((p) => ({ ...p, password: e.target.value }))}
          />
          <button className="btn btn-primary" type="submit">Create Teacher</button>
        </form>
      )}

      <div className="admin-grid">
        {visibleUsers.map((user) => {
          const statusInfo = status[user.id];
          const isBanned = statusInfo?.isBanned;
          const isSelf = currentUser?.id === user.id;
          const isAdmin = user.role === "Admin";
          const banDisabled = isSelf || isAdmin;
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
                  disabled={banDisabled}
                />
                <button
                  className="btn btn-danger"
                  onClick={() => handleBan(user.id)}
                  disabled={banDisabled}
                >
                  Ban
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleUnban(user.id)}
                  disabled={banDisabled}
                >
                  Unban
                </button>
                {banDisabled && (
                  <span className="pill">Admin protected</span>
                )}
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

      <div className="card card-pad admin-reports">
        <h3>Moderation Reports</h3>
        {reports.length === 0 ? (
          <p className="muted">No reports submitted yet.</p>
        ) : (
          reports.map((report) => (
            <div key={report.id} className="admin-report-item">
              <div>
                <strong>{report.targetType}: {report.targetLabel}</strong>
                <p className="muted">{report.reason}</p>
              </div>
              <div className="admin-report-actions">
                <span className="pill">{report.status}</span>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => handleReportStatus(report.id, "Reviewed")}
                >
                  Review
                </button>
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => handleReportStatus(report.id, "Actioned")}
                >
                  Action
                </button>
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => handleReportStatus(report.id, "Dismissed")}
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
