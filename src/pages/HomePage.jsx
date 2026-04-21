import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Compass,
  Megaphone,
  MessageSquarePlus,
  Route,
  ShieldAlert,
  Sparkles,
  X
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import api from "../api/api";
import { formatDateTime } from "../utils/formatDateTime";
import { toBgRole } from "../utils/localize";
import EmptyState from "../components/ui/EmptyState";
import { Skeleton, SkeletonLines } from "../components/ui/Skeleton";
import "./HomePage.css";

const platformHighlights = [
  "Отбелязвай локални проблеми в МГ \"Академик Кирил Попов\" с местоположение и снимки.",
  "Прехвърляй важните сигнали в отделни форумни теми.",
  "Използвай сигнали и модерация за по-качествена общност."
];

const quickActions = [
  {
    to: "/create-thread",
    label: "Нова тема",
    bucket: "community",
    icon: MessageSquarePlus,
    variant: "btn-primary"
  },
  {
    to: "/threads",
    label: "Преглед на теми",
    bucket: "community",
    icon: Compass,
    variant: "btn-secondary"
  },
  {
    to: "/map?create=1",
    label: "Добави пин",
    bucket: "map",
    icon: Route,
    variant: "btn-ghost"
  },
  {
    to: "/news",
    label: "Новини",
    bucket: "community",
    icon: Megaphone,
    variant: "btn-ghost"
  },
  {
    to: "/my-reports",
    label: "Моите сигнали",
    bucket: "community",
    icon: ShieldAlert,
    variant: "btn-ghost"
  },
  {
    to: "/profile",
    label: "Профил",
    bucket: "community",
    icon: Sparkles,
    variant: "btn-ghost"
  },
  {
    to: "/admin/users",
    label: "Модерация",
    bucket: "moderation",
    icon: ShieldAlert,
    roles: ["Admin", "Teacher"],
    variant: "btn-danger"
  }
];

const focusByRole = {
  Student: ["all", "community", "map"],
  Teacher: ["all", "community", "map", "moderation"],
  Admin: ["all", "community", "map", "moderation"]
};

const focusLabels = {
  all: "Всичко",
  community: "Общност",
  map: "Карта",
  moderation: "Модерация"
};

export default function HomePage() {
  const { user } = useAuth();
  const toast = useToast();

  const [threads, setThreads] = useState([]);
  const [pins, setPins] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [recentRoutes, setRecentRoutes] = useState([]);
  const [focusFilter, setFocusFilter] = useState("all");
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [threadsRes, pinsRes, profileRes] = await Promise.all([
          api.get("/forum-threads?page=1&pageSize=20"),
          api.get("/event-pins"),
          api.get("/user/profile").catch(() => null)
        ]);

        setThreads(threadsRes?.data?.items || threadsRes?.data || []);
        setPins(pinsRes?.data?.items || pinsRes?.data || []);
        setProfile(profileRes?.data || null);
      } catch (err) {
        setError(err?.response?.data?.message || err?.message || "Неуспешно зареждане на таблото.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    try {
      const rawRoutes = localStorage.getItem("mg:lastVisited");
      const parsedRoutes = rawRoutes ? JSON.parse(rawRoutes) : [];
      setRecentRoutes(Array.isArray(parsedRoutes) ? parsedRoutes.slice(0, 5) : []);
    } catch {
      setRecentRoutes([]);
    }

    const seenOnboarding = localStorage.getItem("mg:onboardingSeen") === "1";
    setShowOnboarding(!seenOnboarding);

    const allowed = focusByRole[user?.role] || focusByRole.Student;
    if (!allowed.includes(focusFilter)) {
      setFocusFilter("all");
    }
  }, [user?.role]);

  const stats = useMemo(() => {
    const news = threads.filter((thread) => thread.title?.toLowerCase().startsWith("[news]")).length;
    const openThreads = threads.filter((thread) => !thread.isLocked).length;
    return {
      threads: threads.length,
      pins: pins.length,
      news,
      openThreads
    };
  }, [threads, pins]);

  const latestThreads = useMemo(
    () =>
      [...threads]
        .filter((thread) => !thread.title?.toLowerCase().startsWith("[news]"))
        .sort((a, b) => new Date(b.lastPostAt || b.createdAt) - new Date(a.lastPostAt || a.createdAt))
        .slice(0, 6),
    [threads]
  );

  const topPins = useMemo(
    () => [...pins].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 5),
    [pins]
  );

  const latestNews = useMemo(
    () => threads.filter((thread) => thread.title?.toLowerCase().startsWith("[news]")).slice(0, 4),
    [threads]
  );

  const availableFocusFilters = useMemo(() => focusByRole[user?.role] || focusByRole.Student, [user?.role]);

  const visibleQuickActions = useMemo(
    () =>
      quickActions
        .filter((action) => !action.roles || action.roles.includes(user?.role))
        .filter((action) => focusFilter === "all" || action.bucket === focusFilter),
    [focusFilter, user?.role]
  );

  const dismissOnboarding = () => {
    localStorage.setItem("mg:onboardingSeen", "1");
    setShowOnboarding(false);
    toast?.info("Винаги можеш да отвориш темите, картата и профила от страничното меню.");
  };

  return (
    <div className="page-shell">
      <section className="hero dashboard-hero">
        <div>
          <p className="dashboard-eyebrow">Здравей</p>
          <h2>
            {user?.username ? `${user.username}` : "Потребител"}
            <span className="dashboard-role">{toBgRole(user?.role)}</span>
          </h2>
          <p>Следи локални проблеми, участвай в дискусии и координирай действия от едно място.</p>
        </div>

        <div className="dashboard-kpis">
          <article>
            <strong>{stats.threads}</strong>
            <span>Общо теми</span>
          </article>
          <article>
            <strong>{stats.pins}</strong>
            <span>Пинове</span>
          </article>
          <article>
            <strong>{stats.news}</strong>
            <span>Новини</span>
          </article>
          <article>
            <strong>{stats.openThreads}</strong>
            <span>Отворени теми</span>
          </article>
        </div>
      </section>

      {error && <p className="error-msg">{error}</p>}

      <section className="dashboard-grid dashboard-grid--triple">
        <article className="card card-pad dashboard-panel">
          <div className="split-row">
            <h3>Бързи действия</h3>
            {profile && <span className="pill">Твоите теми: {profile.threadsCount || 0}</span>}
          </div>

          <div className="dashboard-filter-pills">
            {availableFocusFilters.map((item) => (
              <button
                key={item}
                type="button"
                className={`btn btn-ghost btn-sm ${focusFilter === item ? "is-active" : ""}`}
                onClick={() => setFocusFilter(item)}
              >
                {focusLabels[item]}
              </button>
            ))}
          </div>

          <div className="dashboard-actions">
            {visibleQuickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.to} to={action.to} className={`btn ${action.variant || "btn-ghost"}`}>
                  <Icon size={15} />
                  {action.label}
                </Link>
              );
            })}
          </div>
        </article>

        <article className="card card-pad dashboard-panel dashboard-platform-panel">
          <div className="split-row">
            <h3>Фокус на платформата</h3>
            <span className="pill">Събрано табло + вход</span>
          </div>
          <div className="dashboard-platform-stats">
            <article>
              <strong>{stats.threads}</strong>
              <span>Теми</span>
            </article>
            <article>
              <strong>{stats.pins}</strong>
              <span>Пинове</span>
            </article>
            <article>
              <strong>{stats.news}</strong>
              <span>Новини</span>
            </article>
          </div>
          <ul className="dashboard-platform-list">
            {platformHighlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="card card-pad dashboard-panel">
          <div className="split-row">
            <h3>Последни дискусии</h3>
            <Link className="link" to="/threads">
              Виж всички
            </Link>
          </div>
          <div className="dashboard-feed">
            {loading ? (
              <div className="dashboard-skeleton">
                <Skeleton className="dashboard-skeleton-title" />
                <SkeletonLines lines={3} />
              </div>
            ) : latestThreads.length === 0 ? (
              <EmptyState
                title="Все още няма теми"
                description="Създай първата тема и стартирай дискусия."
                actionLabel="Създай тема"
                actionTo="/create-thread"
              />
            ) : (
              latestThreads.map((thread) => (
                <Link key={thread.id} to={`/threads/${thread.id}`} className="dashboard-feed-item">
                  <strong>{thread.title}</strong>
                  <span className="muted">
                    {thread.createdByUsername || "Неизвестен"} - {formatDateTime(thread.lastPostAt || thread.createdAt)}
                  </span>
                </Link>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="dashboard-grid dashboard-grid--bottom">
        <article className="card card-pad dashboard-panel">
          <div className="split-row">
            <h3>Популярни пинове</h3>
            <Link className="link" to="/map">
              Отвори карта
            </Link>
          </div>
          <div className="dashboard-feed">
            {loading ? (
              <div className="dashboard-skeleton">
                <Skeleton className="dashboard-skeleton-title" />
                <SkeletonLines lines={3} />
              </div>
            ) : topPins.length === 0 ? (
              <p className="muted">Все още няма пинове.</p>
            ) : (
              topPins.map((pin) => (
                <div key={pin.id} className="dashboard-feed-item">
                  <strong>{pin.title}</strong>
                  <span className="muted">
                    Оценка {pin.score || 0} - {formatDateTime(pin.createdAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="card card-pad dashboard-panel">
          <div className="split-row">
            <h3>Актуални новини</h3>
            <Link className="link" to="/news">
              Към новини
            </Link>
          </div>
          <div className="dashboard-feed">
            {loading ? (
              <div className="dashboard-skeleton">
                <Skeleton className="dashboard-skeleton-title" />
                <SkeletonLines lines={3} />
              </div>
            ) : latestNews.length === 0 ? (
              <p className="muted">Все още няма публикувани новини.</p>
            ) : (
              latestNews.map((item) => (
                <Link key={item.id} to={`/threads/${item.id}`} className="dashboard-feed-item">
                  <strong>{item.title.replace(/^\[news\]\s*/i, "")}</strong>
                  <span className="muted">{formatDateTime(item.createdAt)}</span>
                </Link>
              ))
            )}
          </div>
        </article>

        <article className="card card-pad dashboard-panel">
          <div className="split-row">
            <h3>Последно посещавани</h3>
            <span className="pill">Навигация по история</span>
          </div>
          <div className="dashboard-feed">
            {recentRoutes.length === 0 ? (
              <p className="muted">Няма запазени последно посетени екрани.</p>
            ) : (
              recentRoutes.map((route) => (
                <Link key={`${route.to}-${route.at}`} to={route.to} className="dashboard-feed-item">
                  <strong>{route.label}</strong>
                  <span className="muted">{formatDateTime(route.at)}</span>
                </Link>
              ))
            )}
          </div>
        </article>
      </section>

      {showOnboarding && (
        <div className="onboarding-overlay" onClick={dismissOnboarding}>
          <section className="onboarding-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="onboarding-close" onClick={dismissOnboarding}>
              <X size={16} />
            </button>
            <h3>Кратко въведение</h3>
            <p className="muted">Платформата обединява карта, форум, сигнали, профили и модерация за МГ "Академик Кирил Попов".</p>
            <ul>
              <li>1. Избери „Карта“, ако искаш да отбележиш събитие.</li>
              <li>2. Избери „Теми“, ако искаш дискусия и отговори.</li>
              <li>3. Използвай „Докладвай“, когато съдържание нарушава правилата.</li>
            </ul>
            <button type="button" className="btn btn-primary" onClick={dismissOnboarding}>
              Разбрах
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
