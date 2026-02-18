export function Skeleton({ className = "" }) {
  return <div className={`skeleton ${className}`.trim()} aria-hidden="true" />;
}

export function SkeletonLines({ lines = 3 }) {
  return (
    <div className="skeleton-lines" aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className="skeleton skeleton-line" />
      ))}
    </div>
  );
}
