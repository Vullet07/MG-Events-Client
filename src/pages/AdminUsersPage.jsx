import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { formatDateTime } from "../utils/formatDateTime";
import { toBgReportStatus, toBgRole, toBgTargetType } from "../utils/localize";
import "./AdminUsersPage.css";

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const toast = useToast();

  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [teacherRequests, setTeacherRequests] = useState([]);

  const [filter, setFilter] = useState("");
  const [activeSection, setActiveSection] = useState("users");
  const [banUntil, setBanUntil] = useState({});
  const [status, setStatus] = useState({});

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isAdmin = currentUser?.role === "Admin";
  const isTeacher = currentUser?.role === "Teacher";

  const fetchUsers = async () => {
    try {
      const res = await api.get("/user?page=1&pageSize=100");
      const list = res.data?.items || res.data || [];
      if (isTeacher) {
        setUsers(list.filter((u) => u.role === "Student"));
      } else {
        setUsers(list);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Неуспешно зареждане на потребителите.");
    }
  };

  useEffect(() => {
    if (!currentUser?.role) return;
    fetchUsers();
  }, [currentUser?.role]);

  useEffect(() => {
    if (!isAdmin) {
      setReports([]);
      return;
    }

    const fetchReports = async () => {
      try {
        const res = await api.get("/reports");
        setReports(res.data || []);
      } catch (err) {
        setError(err?.response?.data?.message || err?.message || "Неуспешно зареждане на сигналите.");
      }
    };

    fetchReports();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      setTeacherRequests([]);
      return;
    }

    const fetchTeacherRequests = async () => {
      try {
        const res = await api.get("/user/teacher-requests");
        setTeacherRequests(res.data || []);
      } catch (err) {
        setError(err?.response?.data?.message || err?.message || "Неуспешно зареждане на учителските заявки.");
      }
    };

    fetchTeacherRequests();
  }, [isAdmin]);

  const visibleUsers = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return users;

    return users.filter((u) => {
      const username = u.username?.toLowerCase() || "";
      const email = u.email?.toLowerCase() || "";
      const role = u.role?.toLowerCase() || "";
      return username.includes(query) || email.includes(query) || role.includes(query);
    });
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
        [userId]: {
          isBanned: true,
          bannedUntil: res.data?.bannedUntil || untilValue
        }
      }));

      const bannedUser = users.find((u) => u.id === userId);
      setMessage(`${bannedUser?.username || "Потребител"} е блокиран.`);
      toast?.success("Потребителят е блокиран.");
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Неуспешно блокиране на потребител.";
      setError(message);
      toast?.error(message);
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
      setMessage(`${unbannedUser?.username || "Потребител"} е разблокиран.`);
      toast?.success("Потребителят е разблокиран.");
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Неуспешно разблокиране на потребител.";
      setError(message);
      toast?.error(message);
    }
  };

  const handleReportStatus = async (reportId, statusValue) => {
    setError("");

    try {
      await api.put(`/reports/${reportId}/status`, { status: statusValue });
      setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status: statusValue } : r)));
      toast?.success("Статусът на сигнала е обновен.");
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Неуспешна промяна на статуса на сигнала.";
      setError(message);
      toast?.error(message);
    }
  };

  const handleDeleteReportedTarget = async (reportId) => {
    setError("");
    setMessage("");

    try {
      const res = await api.post(`/reports/${reportId}/delete-target`);
      setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status: "Actioned" } : r)));
      setMessage(res.apiMessage || "Докладваното съдържание е изтрито.");
      toast?.success("Докладваното съдържание е изтрито.");
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Неуспешно изтриване на докладваното съдържание.";
      setError(message);
      toast?.error(message);
    }
  };

  const reviewTeacherRequest = async (requestId, action) => {
    setError("");
    setMessage("");

    try {
      await api.post(`/user/teacher-requests/${requestId}/${action}`, {});
      setTeacherRequests((prev) =>
        prev.map((request) =>
          request.id === requestId
            ? { ...request, status: action === "approve" ? "Approved" : "Rejected" }
            : request
        )
      );
      setMessage(action === "approve" ? "Заявката е одобрена." : "Заявката е отказана.");
      toast?.success(action === "approve" ? "Учителската заявка е одобрена." : "Учителската заявка е отказана.");
      await fetchUsers();
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Неуспешна обработка на учителската заявка.";
      setError(message);
      toast?.error(message);
    }
  };

  return (
    <div className="page-shell admin-page">
      <section className="card card-pad admin-header">
        <div>
          <h2 className="section-title">Табло за модерация</h2>
          <p className="section-subtitle">
            {isTeacher
              ? "Режим учител: управление само на ученически профили."
              : "Режим администратор: управление на потребители, сигнали и учителски заявки."}
          </p>
        </div>
        <Link to="/threads" className="btn btn-ghost btn-sm">Назад към темите</Link>
      </section>

      <section className="card card-pad admin-toolbar">
        <input
          className="input"
          placeholder="Търсене по потребител, имейл или роля"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />

        <div className="admin-tabs">
          <button
            type="button"
            className={`btn btn-ghost btn-sm ${activeSection === "users" ? "is-active" : ""}`}
            onClick={() => setActiveSection("users")}
          >
            Потребители
          </button>

          {isAdmin && (
            <>
              <button
                type="button"
                className={`btn btn-ghost btn-sm ${activeSection === "teachers" ? "is-active" : ""}`}
                onClick={() => setActiveSection("teachers")}
              >
                Учителски заявки
              </button>
              <button
                type="button"
                className={`btn btn-ghost btn-sm ${activeSection === "reports" ? "is-active" : ""}`}
                onClick={() => setActiveSection("reports")}
              >
                Сигнали
              </button>
            </>
          )}
        </div>
      </section>

      {message && <p className="success-msg">{message}</p>}
      {error && <p className="error-msg">{error}</p>}

      {activeSection === "users" && (
        <section className="admin-grid">
          {visibleUsers.map((user) => {
            const statusInfo = status[user.id];
            const isBanned = statusInfo?.isBanned;
            const isSelf = currentUser?.id === user.id;
            const targetIsAdmin = user.role === "Admin";
            const targetIsTeacher = user.role === "Teacher";

            const cannotModify = isSelf || targetIsAdmin || (isTeacher && targetIsTeacher);

            return (
              <article key={user.id} className="card card-pad admin-card">
                <div className="admin-card__header">
                  <div>
                    <h3>{user.username}</h3>
                    <p className="muted">{user.email}</p>
                  </div>
                  <span className="tag tag-secondary">{toBgRole(user.role)}</span>
                </div>

                <div className="admin-card__meta">
                  <Link to={`/users/${user.id}`} className="link">Преглед на профил</Link>
                  {isBanned !== undefined && (
                    <span className={`tag ${isBanned ? "tag-danger" : "tag-secondary"}`}>
                      {isBanned ? "Блокиран" : "Активен"}
                    </span>
                  )}
                </div>

                <div className="admin-card__actions">
                  <input
                    type="date"
                    className="input"
                    value={banUntil[user.id] || ""}
                    onChange={(e) => setBanUntil((prev) => ({ ...prev, [user.id]: e.target.value }))}
                    disabled={cannotModify}
                  />
                  <button className="btn btn-danger btn-sm" onClick={() => handleBan(user.id)} disabled={cannotModify}>
                    Блокирай
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleUnban(user.id)} disabled={cannotModify}>
                    Разблокирай
                  </button>
                  {cannotModify && <span className="pill">Защитен профил</span>}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {isAdmin && activeSection === "teachers" && (
        <section className="card card-pad admin-list">
          <h3>Заявки за регистрация на учители</h3>
          {teacherRequests.length === 0 ? (
            <p className="muted">Няма подадени учителски заявки.</p>
          ) : (
            teacherRequests.map((request) => (
              <article key={request.id} className="admin-list-item">
                <div>
                  <strong>{request.username}</strong>
                  <p className="muted">{request.email}</p>
                  {request.motivation && <p className="muted">{request.motivation}</p>}
                  <span className="pill">{toBgReportStatus(request.status)}</span>
                </div>

                {String(request.status) === "Pending" && (
                  <div className="admin-list-actions">
                    <button className="btn btn-primary btn-sm" type="button" onClick={() => reviewTeacherRequest(request.id, "approve")}>
                      Одобри
                    </button>
                    <button className="btn btn-danger btn-sm" type="button" onClick={() => reviewTeacherRequest(request.id, "reject")}>
                      Откажи
                    </button>
                  </div>
                )}
              </article>
            ))
          )}
        </section>
      )}

      {isAdmin && activeSection === "reports" && (
        <section className="card card-pad admin-list">
          <h3>Сигнали за модерация</h3>
          {reports.length === 0 ? (
            <p className="muted">Все още няма подадени сигнали.</p>
          ) : (
            reports.map((report) => (
              <article key={report.id} className="admin-list-item">
                <div>
                  <strong>{toBgTargetType(report.targetType)}: {report.targetLabel}</strong>
                  <p className="muted">{report.reason}</p>
                  {report.details && <p className="muted">{report.details}</p>}
                  <p className="muted">{formatDateTime(report.createdAt)}</p>
                </div>

                <div className="admin-list-actions">
                  <span className="pill">{toBgReportStatus(report.status)}</span>
                  <button className="btn btn-secondary btn-sm" type="button" onClick={() => handleReportStatus(report.id, "Reviewed")}>Преглед</button>
                  <button className="btn btn-primary btn-sm" type="button" onClick={() => handleReportStatus(report.id, "Actioned")}>Действие</button>
                  <button className="btn btn-danger btn-sm" type="button" onClick={() => handleDeleteReportedTarget(report.id)}>Изтрий съдържанието</button>
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => handleReportStatus(report.id, "Dismissed")}>Отхвърли</button>
                </div>
              </article>
            ))
          )}
        </section>
      )}
    </div>
  );
}
