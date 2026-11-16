/**
 * Reusable EmptyState component for presenting empty lists, zero search results,
 * unassigned parking slots, and unavailable data states with clear CTAs.
 */
export default function EmptyState({
  icon,
  title = "No data available",
  description = "There are no items to display at this moment.",
  action = null,
  secondaryAction = null,
  children = null,
  size = "md",
  className = "",
  ...rest
}) {
  const sizeClass = `empty-state-${size}`;
  const combinedClass = ["empty-state", sizeClass, className]
    .filter(Boolean)
    .join(" ");

  const defaultIcon = (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="empty-state-svg"
      aria-hidden="true"
    >
      <rect
        x="8"
        y="12"
        width="48"
        height="40"
        rx="8"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeDasharray="4 4"
      />
      <circle cx="32" cy="32" r="12" stroke="currentColor" strokeWidth="2.5" />
      <path
        d="M29 27H33.5C34.88 27 36 28.12 36 29.5C36 30.88 34.88 32 33.5 32H29V37"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <div className={combinedClass} {...rest}>
      <div className="empty-state-icon-wrapper">{icon || defaultIcon}</div>

      <div className="empty-state-content">
        <h3 className="empty-state-title">{title}</h3>
        {description && (
          <p className="empty-state-description">{description}</p>
        )}
      </div>

      {(action || secondaryAction) && (
        <div className="empty-state-actions">
          {action}
          {secondaryAction}
        </div>
      )}

      {children && <div className="empty-state-extra">{children}</div>}
    </div>
  );
}
