/**
 * Reusable FeatureCard component for presenting platform capabilities,
 * planned milestones, and system features.
 */
export default function FeatureCard({
  number,
  title,
  badge = "Planned",
  icon = null,
  children,
  className = "",
}) {
  return (
    <article className={`feature-card ${className}`.trim()}>
      <div className="feature-card-header">
        {number && <span className="feature-number">{number}</span>}
        {icon && (
          <span className="feature-icon" aria-hidden="true">
            {icon}
          </span>
        )}
        {badge && <span className="planned">{badge}</span>}
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
    </article>
  );
}
