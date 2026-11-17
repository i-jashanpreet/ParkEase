import { Link } from "react-router-dom";

export default function Footer() {
  return <footer className="site-footer"><div className="container footer"><div><Link to="/" className="brand footer-brand"><span className="brand-mark">P</span>ParkEase</Link><p className="footer-tagline">A smoother arrival starts here.</p></div><nav className="footer-nav-links" aria-label="Footer navigation"><Link to="/malls">Find parking</Link><Link to="/dashboard">Your workspace</Link><Link to="/register">Join ParkEase</Link></nav><p className="footer-attribution">Built together, for better arrivals.<br /><span>© {new Date().getFullYear()} ParkEase</span></p></div></footer>;
}
