import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/api";
import { useToast } from "../context/ToastContext";
import { formatDateTime } from "../utils/formatDateTime";
import { toBgReportStatus, toBgTargetType } from "../utils/localize";
import EmptyState from "../components/ui/EmptyState";
import { Skeleton, SkeletonLines } from "../components/ui/Skeleton";
import "./MyReportsPage.css";

export default function MyReportsPage() {
  const [params] = useSearchParams();
  const toast = useToast();
  const createdFlag = params.get("created");

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createdToastShown, setCreatedToastShown] = useState(false);

  useEffect(() => {
    if (createdFlag === "1" && !createdToastShown) {
      toast?.success("Сигналът е регистриран и очаква преглед от модератор.");
      setCreatedToastShown(true);
    }
  }, [createdFlag, createdToastShown, toast]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get("/reports/mine");
        setReports(res.data || []);
      } catch (err) {
        setError(err?.response?.data?.message || err?.message || "Неуспешно зареждане на твоите сигнали.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const statusCounts = useMemo(() => {
    return reports.reduce(
      (acc, report) => {
        const key = String(report.status || "Pending");
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      { Pending: 0 }
    );
  }, [reports]);

  return (
    <div className="page-shell my-reports-page">
      <section className="card card-pad my-reports-head">
        <div>
          <h2 className="section-title">Моите сигнали</h2>
          <p className="section-subtitle">Проследи сигналите, които си подал.</p>
        </div>
        <Link to="/threads" className="btn btn-ghost btn-sm">
          Назад към темите
        </Link>
      </section>

      <section className="my-reports-stats">
        <article className="card card-pad">
          <strong>{reports.length}</strong>
          <span>Общо сигнали</span>
        </article>
        {Object.entries(statusCounts).map(([key, value]) => (
          <article className="card card-pad" key={key}>
            <strong>{value}</strong>
            <span>{toBgReportStatus(key)}</span>
          </article>
        ))}
      </section>

      {error && <p className="error-msg">{error}</p>}

      <section className="card-grid">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <article className="card card-pad my-report-item" key={`sk-${index}`}>
              <Skeleton className="my-report-skeleton-title" />
              <SkeletonLines lines={3} />
            </article>
          ))
        ) : reports.length === 0 ? (
          <EmptyState
            title="Все още нямаш подадени сигнали"
            description="Когато докладваш публикация, тема, пин или профил, ще ги виждаш тук."
            actionLabel="Към форума"
            actionTo="/threads"
          />
        ) : (
          reports.map((report) => (
            <article className="card card-pad my-report-item" key={report.id}>
              <div className="split-row">
                <strong>
                  {toBgTargetType(report.targetType)}: {report.targetLabel}
                </strong>
                <span className="pill">{toBgReportStatus(report.status)}</span>
              </div>
              <p>{report.reason}</p>
              {report.details && <p className="muted">{report.details}</p>}
              <span className="muted">{formatDateTime(report.createdAt)}</span>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
