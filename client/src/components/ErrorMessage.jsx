/**
 * Reusable ErrorMessage component for displaying application errors,
 * validation failures, network issues, and fallback states with optional retry actions.
 */
export default function ErrorMessage({
  title,
  message,
  children,
  variant = "banner",
  onRetry = null,
  onDismiss = null,
  icon = null,
  className = "",
  ...rest
}) {
  const variantClass = `error-message-${variant}`;
  const combinedClass = ["error-message", variantClass, className]
    .filter(Boolean)
    .join(" ");

  const defaultIcon = (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className="error-icon-svg"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  );

  const displayMessage = message || children;

  return (
    <div className={combinedClass} role="alert" aria-live="assertive" {...rest}>
      <div className="error-icon-wrapper">{icon || defaultIcon}</div>

      <div className="error-content">
        {title && <h4 className="error-title">{title}</h4>}
        {displayMessage && <div className="error-body">{displayMessage}</div>}
      </div>

      {(onRetry || onDismiss) && (
        <div className="error-actions">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="error-retry-btn"
              aria-label="Retry operation"
            >
              Retry
            </button>
          )}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="error-dismiss-btn"
              aria-label="Dismiss error notification"
            >
              <svg
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M12 4L4 12M4 4L12 12"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
