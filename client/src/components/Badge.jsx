/**
 * Reusable Badge component for status indicators, categorization,
 * and operational state chips across parking and management views.
 */
export default function Badge({
  children,
  variant = "neutral",
  size = "sm",
  dot = false,
  icon = null,
  className = "",
  ...rest
}) {
  const variantClass = `badge-${variant}`;
  const sizeClass = size !== "sm" ? `badge-${size}` : "";

  const combinedClass = ["badge", variantClass, sizeClass, className]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={combinedClass} {...rest}>
      {dot && <span className="badge-dot" aria-hidden="true" />}
      {icon && <span className="badge-icon" aria-hidden="true">{icon}</span>}
      <span className="badge-text">{children}</span>
    </span>
  );
}
