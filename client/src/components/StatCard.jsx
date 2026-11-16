import Badge from "./Badge.jsx";
import Skeleton from "./Skeleton.jsx";

/**
 * Reusable StatCard component for displaying key parking metrics,
 * occupancy indicators, revenue/booking statistics, and trend arrows.
 */
export default function StatCard({
  label,
  title,
  value,
  icon = null,
  badge = null,
  badgeVariant = "neutral",
  note = null,
  description = null,
  trend = null,
  loading = false,
  onClick = null,
  className = "",
  ...rest
}) {
  const displayLabel = label || title;
  const displayNote = note || description;

  const cardClasses = [
    "stat-card",
    onClick ? "stat-card-clickable" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (loading) {
    return (
      <div className={cardClasses} aria-busy="true" {...rest}>
        <div className="stat-card-header">
          <Skeleton variant="text" width="60%" height="16px" />
          <Skeleton variant="circular" width="28px" height="28px" />
        </div>
        <div className="stat-card-value-row">
          <Skeleton variant="text" width="40%" height="32px" />
        </div>
        <Skeleton variant="text" width="80%" height="14px" />
      </div>
    );
  }

  const renderTrend = () => {
    if (!trend) return null;

    const direction = trend.direction || "neutral";
    const trendClass = `stat-card-trend stat-card-trend-${direction}`;

    const arrow =
      direction === "up" ? "↑" : direction === "down" ? "↓" : "→";

    return (
      <span className={trendClass}>
        <span aria-hidden="true">{arrow}</span>
        <span>{trend.value}</span>
        {trend.label && <span className="trend-label">{trend.label}</span>}
      </span>
    );
  };

  return (
    <article
      className={cardClasses}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
      {...rest}
    >
      <div className="stat-card-header">
        <span className="stat-card-label">{displayLabel}</span>
        <div className="stat-card-header-right">
          {badge && (
            typeof badge === "string" ? (
              <Badge variant={badgeVariant} size="sm">
                {badge}
              </Badge>
            ) : (
              badge
            )
          )}
          {icon && <span className="stat-card-icon" aria-hidden="true">{icon}</span>}
        </div>
      </div>

      <div className="stat-card-value-row">
        <span className="stat-card-value">{value}</span>
        {renderTrend()}
      </div>

      {displayNote && <p className="stat-card-note">{displayNote}</p>}
    </article>
  );
}
