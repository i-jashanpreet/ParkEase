import Button from "../components/Button.jsx";

/**
 * DashboardPage: Foundation placeholder dashboard view.
 * Demonstrates layout slot allocation, metric summary placeholders,
 * and next-stage module integration points without business logic.
 */
export default function DashboardPage() {
  return (
    <div className="dashboard-content-grid">
      {/* Welcome Banner */}
      <section className="dashboard-banner">
        <div>
          <span className="eyebrow">FOUNDATION PREVIEW</span>
          <h2>Room for what comes next.</h2>
          <p>
            Role-specific functionality for Users, Mall Owners, Guards, and
            Admins will be implemented in upcoming development sprints. This
            interface is currently a layout and architectural preview.
          </p>
        </div>
        <div className="dashboard-banner-actions">
          <Button to="/" variant="accent">
            Back to Home <span aria-hidden="true">↗</span>
          </Button>
        </div>
      </section>

      {/* Metrics Row Placeholder */}
      <section className="dashboard-metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Total Parking Slots</span>
            <span className="planned">Sprint 3</span>
          </div>
          <div className="metric-value">--</div>
          <p className="metric-note">Slot inventory & management</p>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Occupancy Rate</span>
            <span className="planned">Sprint 3</span>
          </div>
          <div className="metric-value">--%</div>
          <p className="metric-note">Real-time slot tracking</p>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Active Bookings</span>
            <span className="planned">Sprint 4</span>
          </div>
          <div className="metric-value">--</div>
          <p className="metric-note">Atomic reservation engine</p>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">QR Verifications</span>
            <span className="planned">Sprint 4</span>
          </div>
          <div className="metric-value">--</div>
          <p className="metric-note">Guard entry / exit workflow</p>
        </div>
      </section>

      {/* Roadmap & Architecture Preview Cards */}
      <section className="dashboard-details-grid">
        <div className="dashboard-panel">
          <h3>Module Development Roadmap</h3>
          <p className="panel-desc">
            The ParkEase system connects four dedicated developer streams into a
            unified mall parking intelligence platform:
          </p>
          <ul className="roadmap-list">
            <li>
              <strong>Sprint 1 (Current):</strong> Frontend Architecture, Design
              System & Layouts (Jashan)
            </li>
            <li>
              <strong>Sprint 2:</strong> Identity, Authentication, and Role-Based
              Access Control (Ocean & Jashan)
            </li>
            <li>
              <strong>Sprint 3:</strong> Mall Inventory, Slot Management & Live
              Availability (Shikhar & Jashan)
            </li>
            <li>
              <strong>Sprint 4:</strong> Atomic Booking Engine & QR Entry/Exit
              Verification (Shikhar, Mehak & Jashan)
            </li>
            <li>
              <strong>Sprint 5:</strong> Guard Operations, Billing & Analytics
              Dashboards (Ocean, Shikhar, Jashan & Mehak)
            </li>
          </ul>
        </div>

        <div className="dashboard-panel">
          <h3>Quick Navigation</h3>
          <p className="panel-desc">
            Test route transitions across the configured application paths:
          </p>
          <div className="panel-buttons">
            <Button to="/" variant="outline" size="sm">
              Public Home
            </Button>
            <Button to="/login" variant="outline" size="sm">
              Login Placeholder
            </Button>
            <Button to="/register" variant="outline" size="sm">
              Register Placeholder
            </Button>
            <Button to="/unknown-route" variant="ghost" size="sm">
              Test 404 Route
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
