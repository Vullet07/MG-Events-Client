import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import { formatDateTime } from "../utils/formatDateTime";
import "./LandingPage.css";

export default function LandingPage() {
  const [threads, setThreads] = useState([]);
  const [pins, setPins] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [threadsRes, pinsRes] = await Promise.all([
          api.get("/forum-threads?page=1&pageSize=10"),
          api.get("/event-pins")
        ]);

        setThreads(threadsRes.data?.items || threadsRes.data || []);
        setPins(pinsRes.data?.items || pinsRes.data || []);
      } catch {
        setThreads([]);
        setPins([]);
      }
    };

    load();
  }, []);

  const stats = useMemo(() => {
    const newsCount = threads.filter((t) => t.title?.toLowerCase().startsWith("[news]")).length;
    return {
      threads: threads.length,
      pins: pins.length,
      news: newsCount,
      active: Math.max(12, Math.ceil((threads.length + pins.length) / 2))
    };
  }, [threads, pins]);

  const recentThreads = threads.slice(0, 4);
  const recentPins = pins.slice(0, 3);

  return (
    <div className="landing-page">
      <section className="landing-hero card">
        <div className="landing-hero__copy">
          <p className="landing-eyebrow">Платформа за МГ "Академик Кирил Попов" - Пловдив</p>
          <h1>Сигнализирай, обсъждай и координирай решения по-бързо.</h1>
          <p>
            MG Events съчетава форумни теми, пинове на карта, модерация и
            официални училищни съобщения за МГ "Академик Кирил Попов" в една работеща среда.
          </p>
          <div className="landing-actions">
            <Link to="/login" className="btn btn-primary">Вход</Link>
            <Link to="/register" className="btn btn-secondary">Регистрация за ученик</Link>
            <Link to="/teacher-register" className="btn btn-ghost">Заявка за учител</Link>
          </div>
        </div>

        <div className="landing-stat-grid">
          <article className="landing-stat">
            <strong>{stats.threads}</strong>
            <span>Форумни теми</span>
          </article>
          <article className="landing-stat">
            <strong>{stats.pins}</strong>
            <span>Пинове на карта</span>
          </article>
          <article className="landing-stat">
            <strong>{stats.news}</strong>
            <span>Съобщения</span>
          </article>
          <article className="landing-stat">
            <strong>{stats.active}</strong>
            <span>Прогноза за активни потребители</span>
          </article>
        </div>
      </section>

      <section className="landing-main">
        <article className="card card-pad landing-block">
          <div className="split-row">
            <h2 className="section-title">Последни дискусии</h2>
            <span className="pill">Актуален преглед</span>
          </div>
          <div className="landing-feed">
            {recentThreads.length === 0 ? (
              <p className="muted">Все още няма заредени теми.</p>
            ) : (
              recentThreads.map((thread) => (
                <div className="landing-feed-item" key={thread.id}>
                  <h3>{thread.title}</h3>
                  <p className="muted">
                    от {thread.createdByUsername || "Неизвестен"} - {formatDateTime(thread.lastPostAt || thread.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
          <Link to="/login" className="btn btn-secondary">Влез, за да разгледаш темите</Link>
        </article>

        <article className="card card-pad landing-block">
          <h2 className="section-title">Как работи</h2>
          <div className="landing-steps">
            <div>
              <span className="landing-step-index">1</span>
              <p><strong>Добави пин</strong> с локация и снимка.</p>
            </div>
            <div>
              <span className="landing-step-index">2</span>
              <p><strong>Отвори тема</strong> и обсъди решенията.</p>
            </div>
            <div>
              <span className="landing-step-index">3</span>
              <p><strong>Гласувай и докладвай</strong> важните случаи.</p>
            </div>
            <div>
              <span className="landing-step-index">4</span>
              <p><strong>Следи новини</strong> от учители и администратори.</p>
            </div>
          </div>
        </article>
      </section>

      <section className="landing-bottom card card-pad">
        <div>
          <h2 className="section-title">Последни пинове</h2>
          <p className="section-subtitle">Бърз преглед на последно докладвани събития в училището.</p>
        </div>
        <div className="landing-pin-grid">
          {recentPins.length === 0 ? (
            <p className="muted">Все още няма налични пинове.</p>
          ) : (
            recentPins.map((pin) => (
              <article key={pin.id} className="landing-pin-card">
                <h3>{pin.title}</h3>
                {pin.description && <p>{pin.description}</p>}
                <span className="muted">{formatDateTime(pin.createdAt)}</span>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
