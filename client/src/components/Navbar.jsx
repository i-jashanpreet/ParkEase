import { useState } from "react";
import useAuth from "../hooks/useAuth.js";
import { signOut } from "../services/authSession.js";
import { Link, NavLink } from "react-router-dom";
export default function Navbar() {
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    setBusy(true);
    setError("");
    try {
      await signOut();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <header className="site-header">
      <nav className="container navbar" aria-label="Main navigation">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            P
          </span>
          ParkEase<span className="brand-dot">.</span>
        </Link>
        <div className="nav-links">
          <NavLink to="/">Home</NavLink>
          {!loading && (user ? (
            <>
              <NavLink to="/dashboard">Dashboard</NavLink>
              <button className="button button-small secondary" onClick={logout} disabled={busy}>
                {busy ? "Signing out…" : "Sign out"}
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login">Sign in</NavLink>
              <NavLink className="button button-small" to="/register">Register</NavLink>
            </>
          ))}
        </div>
      </nav>
      {error && <p className="container form-error" role="alert">{error}</p>}
    </header>
  );
}
