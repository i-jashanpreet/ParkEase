import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";

/**
 * PublicLayout: Standard application layout for public pages (Home, Login, Register, 404).
 * Includes skip-link accessibility, top navigation bar, main content area, and footer.
 */
export default function PublicLayout({ children }) {
  return (
    <div className="public-layout">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Navbar />
      <main id="main-content" className="public-main">
        {children || <Outlet />}
      </main>
      <Footer />
    </div>
  );
}
