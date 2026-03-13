import { Skeleton, SkeletonLines } from "./Skeleton";

export default function AppLoader({ label = "Зареждане..." }) {
  return (
    <div className="page-shell app-loader-shell">
      <div className="card card-pad app-loader-card">
        <span className="pill">MG Events</span>
        <Skeleton className="app-loader-title" />
        <SkeletonLines lines={3} />
        <p className="muted">{label}</p>
      </div>
    </div>
  );
}
