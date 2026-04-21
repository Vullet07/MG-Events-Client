import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/api";
import { useToast } from "../context/ToastContext";
import "./CreateThreadPage.css";

export default function CreateThreadPage() {
  const [searchParams] = useSearchParams();
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const prefilledTitle = searchParams.get("title");
    if (prefilledTitle) {
      setTitle(prefilledTitle);
    }
  }, [searchParams]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const normalizedTitle = title.trim();

    if (!normalizedTitle) {
      setError("Заглавието е задължително.");
      return;
    }

    if (/^\s*\[(news|новина)\]\b/i.test(normalizedTitle)) {
      setError("Новините се публикуват само от секцията „Новини“.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/forum-threads", { title: normalizedTitle });
      toast?.success("Темата е създадена успешно.");
      navigate(`/threads/${response.data.id}`);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Неуспешно създаване на тема.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell create-thread-page">
      <section className="card card-pad create-thread-hero">
        <div className="create-thread-hero__copy">
          <p className="create-thread-eyebrow">Форум • MG Events</p>
          <h2 className="section-title">Създай тема, която веднага казва какъв е казусът</h2>
          <p className="section-subtitle">
            Ясното заглавие помага на ученици, учители и администратори в МГ &quot;Академик Кирил
            Попов&quot; по-бързо да открият темата, да я обсъдят и да стигнат до решение.
          </p>

          <div className="create-thread-hero__chips">
            <span className="pill">Кратко и конкретно</span>
            <span className="pill">Подходящо за търсене</span>
            <span className="pill">Ясен проблем и локация</span>
          </div>
        </div>

        <div className="create-thread-hero__tips">
          <article>
            <strong>Какво работи най-добре</strong>
            <p>Напиши проблема, мястото и при нужда кратък контекст още в заглавието.</p>
          </article>
          <article>
            <strong>Добър пример</strong>
            <p>„Опасно хлъзгав под пред малката сграда при дъжд“.</p>
          </article>
          <article>
            <strong>Полезен ориентир</strong>
            <p>Темата трябва да е разбираема и за хора, които я виждат за първи път.</p>
          </article>
        </div>
      </section>

      <section className="card card-pad create-thread-card">
        <div className="split-row create-thread-card__header">
          <div>
            <h3>Нова тема</h3>
            <p className="muted">В момента е необходимо само заглавие, за да публикуваш темата.</p>
          </div>
          <span className="pill">{title.trim().length} символа</span>
        </div>

        {error && <p className="error-msg">{error}</p>}

        <form onSubmit={handleSubmit} className="form-grid create-thread-form">
          <label className="create-thread-field">
            <span>Заглавие на темата</span>
            <input
              className="input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Пример: Опасна пешеходна пътека до училището"
            />
          </label>

          <div className="create-thread-note">
            Използвай заглавие, което веднага подсказва какъв е проблемът и къде се намира.
          </div>

          <div className="create-thread-actions">
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Създаване..." : "Създай тема"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
