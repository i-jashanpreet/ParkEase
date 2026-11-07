import { useState } from "react";
import { Link, NavLink } from "react-router-dom";

/**
 * Reusable Navbar component with responsive desktop/mobile navigation,
 * active route indicators, and accessible mobile drawer toggle.
 */
export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen((prev) => !prev);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="site-header">
      <nav className="container navbar" aria-label="Main navigation">
        <Link to="/" className="brand" onClick={closeMobileMenu}>
          <span className="brand-mark" aria-hidden="true">
            P
          </span>
          ParkEase<span className="brand-dot">.</span>
        </Link>

        {/* Mobile menu toggle button */}
        <button
          type="button"
          className={`mobile-menu-toggle ${mobileMenuOpen ? "open" : ""}`}
          onClick={toggleMobileMenu}
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation menu"
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>

        {/* Navigation links */}
        <div className={`nav-links ${mobileMenuOpen ? "nav-links-open" : ""}`}>
          <NavLink
            to="/"
            end
            onClick={closeMobileMenu}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Home
          </NavLink>
          <NavLink
            to="/dashboard"
            onClick={closeMobileMenu}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/login"
            onClick={closeMobileMenu}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Login
          </NavLink>
          <NavLink
            className="button button-small button-accent"
            to="/register"
            onClick={closeMobileMenu}
          >
            Register <span aria-hidden="true">↗</span>
          </NavLink>
        </div>
      </nav>
    </header>
  );
}
