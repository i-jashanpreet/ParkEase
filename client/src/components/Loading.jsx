/**
 * Reusable Loading component with spinner animation and accessibility labels.
 * Supports inline, centered, and full-page layout modes.
 */
export default function Loading({
  message = "Loading...",
  size = "md",
  fullPage = false,
  inline = false,
  centered = true,
  className = "",
}) {
  const containerClass = [
    "loading-container",
    fullPage ? "loading-fullpage" : "",
    inline ? "loading-inline" : centered ? "loading-centered" : "",
    `loading-${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClass} role="status" aria-live="polite">
      <div className="loading-spinner" aria-hidden="true">
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
            strokeOpacity="0.2"
          />
          <path
            d="M12 2a10 10 0 0 1 10 10"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </div>
      {message && <span className="loading-text">{message}</span>}
      <span className="sr-only">Loading</span>
    </div>
  );
}
