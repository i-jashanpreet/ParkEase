import { Link } from "react-router-dom";

/**
 * Reusable Footer component providing brand identity, quick navigation links,
 * and project foundation metadata.
 */
export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer">
        <div className="footer-brand-section">
          <Link to="/" className="brand footer-brand">
            <span className="brand-mark" aria-hidden="true">
              P
            </span>
            ParkEase<span className="brand-dot">.</span>
          </Link>
          <p className="footer-tagline">
            Smart Mall Parking Intelligence System
          </p>
          <p className="footer-subtext">
            Book smarter. Enter faster. Park better.
          </p>
        </div>

        <div className="footer-nav-section">
          <span className="footer-nav-heading">Platform</span>
          <nav className="footer-nav-links" aria-label="Footer platform links">
            <Link to="/">Home</Link>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </nav>
        </div>

        <div className="footer-meta-section">
          <p className="footer-attribution">
            Built together. One foundation, four developers.
            <br />
            <span>College project · Foundation stage</span>
          </p>
          <div className="footer-status-pill">
            <span className="status-dot online" aria-hidden="true" />
            <span>Foundation Preview</span>
          </div>
        </div>
      </div>
      <div className="container footer-bottom">
        <p>© {new Date().getFullYear()} ParkEase. All rights reserved.</p>
      </div>
    </footer>
  );
}
