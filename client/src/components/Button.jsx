import { Link } from "react-router-dom";

/**
 * Reusable Button component supporting primary, secondary, outline,
 * danger, accent, and ghost variants, different sizes, disabled and loading states,
 * and rendering as either <button>, <Link>, or <a>.
 */
export default function Button({
  children,
  variant = "primary",
  size = "md",
  to,
  href,
  onClick,
  type = "button",
  disabled = false,
  loading = false,
  className = "",
  icon = null,
  iconPosition = "right",
  ...rest
}) {
  const isActionDisabled = disabled || loading;
  const variantClass = `button-${variant}`;
  const sizeClass = size !== "md" ? `button-${size}` : "";
  const loadingClass = loading ? "button-loading" : "";

  const combinedClass = [
    "button",
    variantClass,
    sizeClass,
    loadingClass,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {loading ? (
        <span className="button-spinner" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="spinner-svg"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              strokeOpacity="0.25"
            />
            <path
              d="M12 2a10 10 0 0 1 10 10"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </span>
      ) : (
        icon &&
        iconPosition === "left" && (
          <span className="button-icon-left" aria-hidden="true">
            {icon}
          </span>
        )
      )}
      <span className="button-text">{children}</span>
      {!loading && icon && iconPosition === "right" && (
        <span className="button-icon-right" aria-hidden="true">
          {icon}
        </span>
      )}
    </>
  );

  if (to && !isActionDisabled) {
    return (
      <Link to={to} className={combinedClass} {...rest}>
        {content}
      </Link>
    );
  }

  if (href && !isActionDisabled) {
    return (
      <a href={href} className={combinedClass} {...rest}>
        {content}
      </a>
    );
  }

  return (
    <button
      type={type}
      disabled={isActionDisabled}
      aria-busy={loading ? "true" : undefined}
      onClick={onClick}
      className={combinedClass}
      {...rest}
    >
      {content}
    </button>
  );
}
