import { Link } from "react-router-dom";
import { CircleSlash2 } from "lucide-react";

export default function EmptyState({
  title,
  description,
  actionLabel,
  actionTo,
  actionOnClick
}) {
  return (
    <div className="card card-pad empty-state-card">
      <CircleSlash2 size={20} />
      <h3>{title}</h3>
      {description && <p className="muted">{description}</p>}
      {actionTo && actionLabel && (
        <Link to={actionTo} className="btn btn-primary btn-sm">
          {actionLabel}
        </Link>
      )}
      {!actionTo && actionOnClick && actionLabel && (
        <button type="button" className="btn btn-primary btn-sm" onClick={actionOnClick}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
