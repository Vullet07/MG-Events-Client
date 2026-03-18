import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { formatDateTime } from "../utils/formatDateTime";
import { toBgReportStatus, toBgRole, toBgTargetType } from "../utils/localize";
import "./AdminUsersPage.css";

const gradeOptions = Array.from({ length: 12 }, (_, index) => String(index + 1));

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const toast = useToast();

  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [teacherRequests, setTeacherRequests] = useState([]);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [moderationFilter, setModerationFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("username");

  const [activeSection, setActiveSection] = useState("users");
  const [banUntil, setBanUntil] = useState({});
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [loadingTeacherRequests, setLoadingTeacherRequests] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);

  const isAdmin = currentUser?.role === "Admin";
  const isTeacher = currentUser?.role === "Teacher";

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      setError("");
      const res = await api.get("/user?page=1&pageSize=250");
      const list = res.data?.items || res.data || [];
      setUsers(isTeacher ? list.filter((entry) => entry.role === "Student") : list);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Неуспешно зареждане на потребителите.");
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchReports = async () => {
    if (!isAdmin) {
      setReports([]);
      return;
    }

    try {
      setLoadingReports(true);
      const res = await api.get("/reports");
      setReports(res.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Неуспешно зареждане на сигналите.");
    } finally {
      setLoadingReports(false);
    }
  };

  const fetchTeacherRequests = async () => {
    if (!isAdmin) {
      setTeacherRequests([]);
      return;
    }

    try {
      setLoadingTeacherRequests(true);
      const res = await api.get("/user/teacher-requests");
      setTeacherRequests(res.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Неуспешно зареждане на учителските заявки.");
    } finally {
      setLoadingTeacherRequests(false);
    }
  };

  useEffect(() => {
    if (!currentUser?.role) return;
    fetchUsers();
    fetchReports();
    fetchTeacherRequests();
  }, [currentUser?.role]);

  const visibleUsers = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    const filtered = users.filter((entry) => {
      const isProtected = entry.role === "Admin" || entry.id === Number(currentUser?.id);
      const activeBan = entry.isBanned && (!entry.bannedUntil || new Date(entry.bannedUntil) > new Date());
      const isExpiringSoon =
        entry.scheduledDeletionAt &&
        new Date(entry.scheduledDeletionAt).getTime() <= Date.now() + 1000 * 60 * 60 * 24 * 45;

      if (normalizedQuery) {
        const haystack = `${entry.username || ""} ${entry.email || ""} ${entry.role || ""} ${entry.gradeLevel || ""}`.toLowerCase();
        if (!haystack.includes(normalizedQuery)) return false;
      }

      if (roleFilter !== "all" && entry.role !== roleFilter) return false;
      if (gradeFilter !== "all" && String(entry.gradeLevel || "") !== gradeFilter) return false;

      if (moderationFilter === "active" && activeBan) return false;
      if (moderationFilter === "banned" && !activeBan) return false;
      if (moderationFilter === "protected" && !isProtected) return false;
      if (moderationFilter === "expiring" && !isExpiringSoon) return false;

      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "role") return String(a.role || "").localeCompare(String(b.role || ""), "bg");
      if (sortBy === "grade") return Number(a.gradeLevel || 99) - Number(b.gradeLevel || 99);
      if (sortBy === "scheduledDeletion") {
        return new Date(a.scheduledDeletionAt || "9999-12-31").getTime() - new Date(b.scheduledDeletionAt || "9999-12-31").getTime();
      }
      return String(a.username || "").localeCompare(String(b.username || ""), "bg");
    });
  }, [users, search, roleFilter, moderationFilter, gradeFilter, sortBy, currentUser?.id]);

  const handleBan = async (userId) => {
    setError("");
    setFeedback("");

    try {
      const untilValue = banUntil[userId];
      const payload = {
        bannedUntil: untilValue ? new Date(untilValue).toISOString() : null
      };

      const res = await api.post(`/user/${userId}/ban`, payload);
      setUsers((prev) =>
        prev.map((entry) =>
          entry.id === userId
            ? {
                ...entry,
                isBanned: true,
                bannedUntil: res.data?.bannedUntil || payload.bannedUntil
              }
            : entry
        )
      );

      toast?.success("Потребителят е блокиран.");
      setFeedback("Потребителят е блокиран успешно.");
    } catch (err) {
      const nextError = err?.response?.data?.message || err?.message || "Неуспешно блокиране на потребител.";
      setError(nextError);
      toast?.error(nextError);
    }
  };

  const handleUnban = async (userId) => {
    setError("");
    setFeedback("");

    try {
      await api.post(`/user/${userId}/unban`);
      setUsers((prev) =>
        prev.map((entry) =>
          entry.id === userId
            ? {
                ...entry,
                isBanned: false,
                bannedUntil: null
              }
            : entry
        )
      );

      toast?.success("Потребителят е разблокиран.");
      setFeedback("Потребителят е разблокиран успешно.");
    } catch (err) {
      const nextError = err?.response?.data?.message || err?.message || "Неуспешно разблокиране на потребител.";
      setError(nextError);
      toast?.error(nextError);
    }
  };

  const handleDeleteUser = (targetUser) => {
    if (!isAdmin || !targetUser) return;
    setDeleteCandidate(targetUser);
  };

  const confirmDeleteUser = async () => {
    if (!deleteCandidate) return;

    setError("");
    setFeedback("");
    setDeletingUserId(deleteCandidate.id);

    try {
      const res = await api.delete(`/user/${deleteCandidate.id}`);
      setUsers((prev) => prev.filter((entry) => entry.id !== deleteCandidate.id));
      setReports((prev) => prev.filter((report) => !(report.targetType === "User" && report.targetId === deleteCandidate.id)));
      setDeleteCandidate(null);
      toast?.success("Потребителят е изтрит.");
      setFeedback(res?.apiMessage || "Потребителят и свързаното съдържание са изтрити.");
    } catch (err) {
      const nextError = err?.response?.data?.message || err?.message || "Неуспешно изтриване на потребителя.";
      setError(nextError);
      toast?.error(nextError);
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleReportStatus = async (reportId, statusValue, { removeAfter = false, silent = false } = {}) => {
    try {
      await api.put(`/reports/${reportId}/status`, { status: statusValue });
      setReports((prev) =>
        removeAfter
          ? prev.filter((report) => report.id !== reportId)
          : prev.map((report) => (report.id === reportId ? { ...report, status: statusValue } : report))
      );

      if (!silent) {
        toast?.success(statusValue === "Dismissed" ? "Сигналът е отхвърлен." : "Статусът на сигнала е обновен.");
      }

      return true;
    } catch (err) {
      const nextError = err?.response?.data?.message || err?.message || "Неуспешна промяна на статуса на сигнала.";
      setError(nextError);
      toast?.error(nextError);
      return false;
    }
  };

  const handlePreviewReport = async (report) => {
    if (!report?.previewPath) return;

    if (report.status === "Open") {
      await handleReportStatus(report.id, "Reviewed", { silent: true });
    }

    navigate(report.previewPath);
  };

  const handleDeleteReportedTarget = async (report) => {
    if (!report) return;

    try {
      await api.post(`/reports/${report.id}/delete-target`);
      setReports((prev) =>
        prev.filter(
          (entry) => !(entry.targetType === report.targetType && Number(entry.targetId) === Number(report.targetId))
        )
      );
      toast?.success("Докладваното съдържание е изтрито.");
      setFeedback("Докладваното съдържание е премахнато.");
    } catch (err) {
      const nextError = err?.response?.data?.message || err?.message || "Неуспешно изтриване на докладваното съдържание.";
      setError(nextError);
      toast?.error(nextError);
    }
  };

  const reviewTeacherRequest = async (requestId, action) => {
    setError("");
    setFeedback("");

    try {
      await api.post(`/user/teacher-requests/${requestId}/${action}`, {});
      setTeacherRequests((prev) =>
        prev.map((request) =>
          request.id === requestId
            ? { ...request, status: action === "approve" ? "Approved" : "Rejected" }
            : request
        )
      );
      await fetchUsers();
      toast?.success(action === "approve" ? "Учителската заявка е одобрена." : "Учителската заявка е отказана.");
      setFeedback(action === "approve" ? "Заявката е одобрена." : "Заявката е отказана.");
    } catch (err) {
      const nextError = err?.response?.data?.message || err?.message || "Неуспешна обработка на учителската заявка.";
      setError(nextError);
      toast?.error(nextError);
    }
  };

  const clearUserFilters = () => {
    setSearch("");
    setRoleFilter("all");
    setModerationFilter("all");
    setGradeFilter("all");
    setSortBy("username");
  };

  return (
    <div className="page-shell admin-page">
      <section className="card card-pad admin-header">
        <div>
          <h2 className="section-title">Табло за модерация</h2>
          <p className="section-subtitle">
            {isTeacher
              ? "Режим учител: управление само на ученически профили."
              : "Режим администратор: потребители, сигнали и учителски заявки в един прегледен поток."}
          </p>
        </div>
        <Link to="/threads" className="btn btn-ghost btn-sm">
          Назад към темите
        </Link>
      </section>

      <section className="card card-pad admin-toolbar">
        <div className="admin-toolbar__filters">
          <input
            className="input"
            placeholder="Търсене по име, имейл, роля или клас"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option value="all">Всички роли</option>
            <option value="Student">Ученици</option>
            {!isTeacher && <option value="Teacher">Учители</option>}
            {!isTeacher && <option value="Admin">Администратори</option>}
          </select>
          <select value={moderationFilter} onChange={(event) => setModerationFilter(event.target.value)}>
            <option value="all">Всички статуси</option>
            <option value="active">Активни</option>
            <option value="banned">Блокирани</option>
            <option value="expiring">С предстоящо изтичане</option>
            <option value="protected">Защитени профили</option>
          </select>
          <select value={gradeFilter} onChange={(event) => setGradeFilter(event.target.value)}>
            <option value="all">Всички класове</option>
            {gradeOptions.map((grade) => (
              <option key={grade} value={grade}>
                {grade} клас
              </option>
            ))}
          </select>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="username">Сортиране по име</option>
            <option value="role">Сортиране по роля</option>
            <option value="grade">Сортиране по клас</option>
            <option value="scheduledDeletion">По дата на деактивиране</option>
          </select>
        </div>

        <div className="admin-toolbar__side">
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

          <button type="button" className="btn btn-secondary btn-sm" onClick={clearUserFilters}>
            Изчисти филтрите
          </button>
        </div>
      </section>

      {feedback && <p className="success-msg">{feedback}</p>}
      {error && <p className="error-msg">{error}</p>}

      {activeSection === "users" && (
        <section className="admin-feed">
          <div className="admin-feed__summary card card-pad">
            <div>
              <strong>{visibleUsers.length}</strong>
              <span>потребители по текущите филтри</span>
            </div>
            <div>
              <strong>{users.filter((entry) => entry.isBanned).length}</strong>
              <span>блокирани</span>
            </div>
            <div>
              <strong>{users.filter((entry) => entry.gradeLevel).length}</strong>
              <span>ученици с клас</span>
            </div>
          </div>

          {loadingUsers ? (
            <article className="card card-pad admin-feed-card">
              <p className="muted">Зареждаме потребителите...</p>
            </article>
          ) : visibleUsers.length === 0 ? (
            <article className="card card-pad admin-feed-card">
              <p className="muted">Няма потребители, които да отговарят на зададените филтри.</p>
            </article>
          ) : (
            visibleUsers.map((entry) => {
              const targetIsAdmin = entry.role === "Admin";
              const targetIsTeacher = entry.role === "Teacher";
              const isSelf = Number(currentUser?.id) === Number(entry.id);
              const isProtected = isSelf || targetIsAdmin || (isTeacher && targetIsTeacher);
              const activeBan = entry.isBanned && (!entry.bannedUntil || new Date(entry.bannedUntil) > new Date());
              const moderationLabel = activeBan ? "Блокиран профил" : "Активен профил";
              const moderationHint = activeBan
                ? entry.bannedUntil
                  ? `Достъпът е спрян до ${formatDateTime(entry.bannedUntil)}.`
                  : "Достъпът е спрян без крайна дата."
                : "Потребителят може да влиза и да използва платформата.";

              return (
                <article key={entry.id} className={`card card-pad admin-feed-card ${activeBan ? "is-banned" : "is-active"}`}>
                  <div className="admin-feed-card__main">
                    <div className="admin-feed-card__head">
                      <div>
                        <div className="admin-feed-card__title">
                          <h3>{entry.username}</h3>
                          <span className="tag tag-secondary">{toBgRole(entry.role)}</span>
                          {entry.gradeLevel ? <span className="pill">{entry.gradeLevel} клас</span> : null}
                        </div>
                        <p className="muted">{entry.email}</p>
                      </div>

                      <div className="admin-feed-card__status">
                        <span className={`pill ${activeBan ? "pill-danger" : "pill-success"}`}>
                          {activeBan ? "Блокиран" : "Активен"}
                        </span>
                        {isProtected ? <span className="pill">Защитен профил</span> : null}
                      </div>
                    </div>

                    <div className={`admin-feed-card__moderation ${activeBan ? "is-banned" : "is-active"}`}>
                      <div className="admin-feed-card__moderation-copy">
                        <strong>{moderationLabel}</strong>
                        <span>{moderationHint}</span>
                      </div>
                      <span className={`admin-state-badge ${activeBan ? "is-banned" : "is-active"}`}>
                        <i />
                        {activeBan ? "Спрян достъп" : "Нормален достъп"}
                      </span>
                    </div>

                    <div className="admin-feed-card__meta">
                      <span>Теми: {entry.threadsCount || 0}</span>
                      <span>Публикации: {entry.postsCount || 0}</span>
                      <span>Маркери: {entry.pinsCount || 0}</span>
                      {entry.scheduledDeletionAt ? (
                        <span>Автоматично изтриване: {formatDateTime(entry.scheduledDeletionAt)}</span>
                      ) : null}
                    </div>

                    <div className="admin-feed-card__actions">
                      <Link to={`/users/${entry.id}`} className="btn btn-ghost btn-sm">
                        Преглед на профила
                      </Link>

                      <label className="admin-ban-field">
                        <span>Блокирай до дата</span>
                        <input
                          type="date"
                          className="input"
                          value={banUntil[entry.id] || ""}
                          onChange={(event) =>
                            setBanUntil((prev) => ({
                              ...prev,
                              [entry.id]: event.target.value
                            }))
                          }
                          disabled={isProtected}
                        />
                      </label>

                      <button className="btn btn-danger btn-sm" type="button" onClick={() => handleBan(entry.id)} disabled={isProtected}>
                        Блокирай
                      </button>
                      <button className="btn btn-secondary btn-sm" type="button" onClick={() => handleUnban(entry.id)} disabled={isProtected}>
                        Разблокирай
                      </button>

                      {isAdmin && !isProtected && (
                        <button className="btn btn-danger btn-sm" type="button" onClick={() => handleDeleteUser(entry)}>
                          Изтрий потребителя
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      )}

      {isAdmin && activeSection === "teachers" && (
        <section className="admin-list">
          <section className="card card-pad admin-list-head">
            <h3>Заявки за регистрация на учители</h3>
            <span className="pill">{teacherRequests.length}</span>
          </section>

          {loadingTeacherRequests ? (
            <article className="card card-pad admin-list-item admin-list-item--stacked">
              <p className="muted">Зареждаме заявките...</p>
            </article>
          ) : teacherRequests.length === 0 ? (
            <article className="card card-pad admin-list-item admin-list-item--stacked">
              <p className="muted">Няма подадени учителски заявки.</p>
            </article>
          ) : (
            teacherRequests.map((request) => (
              <article key={request.id} className="card card-pad admin-list-item admin-list-item--stacked">
                <div>
                  <div className="admin-list-item__title-row">
                    <strong>{request.username}</strong>
                    <span className="pill">{toBgReportStatus(request.status)}</span>
                  </div>
                  <p className="muted">{request.email}</p>
                  {request.motivation && <p>{request.motivation}</p>}
                  <p className="muted">Подадена на {formatDateTime(request.createdAt)}</p>
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
        <section className="admin-list">
          <section className="card card-pad admin-list-head">
            <h3>Сигнали за модерация</h3>
            <span className="pill">{reports.length}</span>
          </section>

          {loadingReports ? (
            <article className="card card-pad admin-list-item admin-list-item--stacked">
              <p className="muted">Зареждаме сигналите...</p>
            </article>
          ) : reports.length === 0 ? (
            <article className="card card-pad admin-list-item admin-list-item--stacked">
              <p className="muted">Все още няма подадени сигнали.</p>
            </article>
          ) : (
            reports.map((report) => (
              <article key={report.id} className="card card-pad admin-list-item admin-list-item--stacked admin-report-card">
                <div className="admin-report-card__head">
                  <div>
                    <div className="admin-list-item__title-row">
                      <strong>
                        {toBgTargetType(report.targetType)}: {report.targetLabel}
                      </strong>
                      <span className="pill">{toBgReportStatus(report.status)}</span>
                    </div>
                    {report.contextLabel && <p className="muted">{report.contextLabel}</p>}
                    <p>{report.reason}</p>
                    {report.details && <p className="muted">{report.details}</p>}
                    <p className="muted">
                      Подаден от {report.reporterUsername || "Неизвестен"} · {formatDateTime(report.createdAt)}
                    </p>
                  </div>

                  {!report.targetExists && <span className="tag tag-danger">Съдържанието вече липсва</span>}
                </div>

                <div className="admin-list-actions">
                  {report.previewPath ? (
                    <button className="btn btn-secondary btn-sm" type="button" onClick={() => handlePreviewReport(report)}>
                      Прегледай в контекст
                    </button>
                  ) : (
                    <button className="btn btn-secondary btn-sm" type="button" disabled>
                      Липсва преглед
                    </button>
                  )}
                  <button
                    className="btn btn-danger btn-sm"
                    type="button"
                    onClick={() => handleDeleteReportedTarget(report)}
                    disabled={!report.targetExists}
                  >
                    Изтрий докладваното
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    onClick={() => handleReportStatus(report.id, "Dismissed", { removeAfter: true })}
                  >
                    Отхвърли сигнала
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      )}

      {deleteCandidate &&
        createPortal(
        <div className="admin-delete-overlay" onClick={() => (deletingUserId ? null : setDeleteCandidate(null))}>
          <section className="admin-delete-modal card card-pad" onClick={(event) => event.stopPropagation()}>
            <div className="admin-delete-modal__eyebrow">Потвърждение за изтриване</div>
            <h3>Изтрий профила на {deleteCandidate.username}?</h3>
            <p>
              Това действие ще премахне потребителя и свързаните с него теми, публикации,
              маркери, сигнали, гласове и качени файлове.
            </p>
            <div className="admin-delete-modal__meta">
              <span className="pill">{toBgRole(deleteCandidate.role)}</span>
              {deleteCandidate.gradeLevel ? <span className="pill">{deleteCandidate.gradeLevel} клас</span> : null}
              <span className="pill">{deleteCandidate.email}</span>
            </div>
            <div className="admin-delete-modal__actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setDeleteCandidate(null)}
                disabled={deletingUserId === deleteCandidate.id}
              >
                Откажи
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={confirmDeleteUser}
                disabled={deletingUserId === deleteCandidate.id}
              >
                {deletingUserId === deleteCandidate.id ? "Изтриване..." : "Изтрий потребителя"}
              </button>
            </div>
          </section>
        </div>,
        document.body
      )}
    </div>
  );
}
