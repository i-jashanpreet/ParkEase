import { Link } from "react-router-dom";

/**
 * Reusable NotFound component for 404 views and missing resource states.
 */
export default function NotFound({
  eyebrow = "404 · PAGE NOT FOUND",
  title = "This space is empty.",
  message = "We could not find the page you are looking for. Let’s get you back on track.",
  actionTo = "/",
  actionText = "Back to Home",
  showDashboardLink = true,
  children,
  className = "",
}) {
  return (
    <div className={`not-found-container ${className}`.trim()}>
      <div className="not-found-content">
        <div className="not-found-badge">
          <span className="not-found-code">404</span>
          <span className="not-found-indicator">Slot Not Found</span>
        </div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        <p className="not-found-description">{message}</p>
        <div className="not-found-actions">
          <Link className="button button-accent" to={actionTo}>
            {actionText} <span aria-hidden="true">↗</span>
          </Link>
          {showDashboardLink && (
            <Link className="button button-secondary" to="/dashboard">
              Go to Dashboard
            </Link>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
