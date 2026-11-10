import { useState } from "react";
import Button from "../components/Button.jsx";
import StatCard from "../components/StatCard.jsx";
import Card from "../components/Card.jsx";
import Badge from "../components/Badge.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Modal from "../components/Modal.jsx";
import Input from "../components/Input.jsx";
import Select from "../components/Select.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";

/**
 * DashboardPage: Foundation placeholder dashboard view.
 * Demonstrates layout slot allocation, metric summary placeholders,
 * and next-stage module integration points without business logic.
 */
export default function DashboardPage() {
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState(false);

  return (
    <div className="dashboard-content-grid">
      {/* Page Header */}
      <PageHeader
        eyebrow="FOUNDATION PREVIEW"
        title="Room for what comes next."
        description="Role-specific functionality for Users, Mall Owners, Guards, and Admins will be implemented in upcoming development sprints. This interface is currently a layout and component library preview."
        badge={
          <Badge variant="accent" dot>
            Milestone 2 Active
          </Badge>
        }
        actions={
          <div className="page-actions">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDemoModalOpen(true)}
            >
              Component Gallery ↗
            </Button>
            <Button
              variant="secondary"
              size="sm"
              loading={demoLoading}
              onClick={() => {
                setDemoLoading(true);
                setTimeout(() => setDemoLoading(false), 1200);
              }}
            >
              Test Loading
            </Button>
            <Button to="/" variant="accent" size="sm">
              Public Home ↗
            </Button>
          </div>
        }
      />

      {demoError && (
        <ErrorMessage
          title="Sample Error State"
          message="This is a demonstration of the ErrorMessage component with an action handler."
          onRetry={() => setDemoError(false)}
          onDismiss={() => setDemoError(false)}
        />
      )}

      {/* Metrics Row using reusable StatCard components */}
      <section className="dashboard-metrics-grid">
        <StatCard
          label="Total Parking Slots"
          value="--"
          badge="Sprint 3"
          badgeVariant="warning"
          note="Slot inventory & management"
          trend={{ value: "0%", direction: "neutral", label: "baseline" }}
        />

        <StatCard
          label="Occupancy Rate"
          value="--%"
          badge="Sprint 3"
          badgeVariant="warning"
          note="Real-time slot tracking"
          trend={{ value: "0%", direction: "neutral", label: "baseline" }}
        />

        <StatCard
          label="Active Bookings"
          value="--"
          badge="Sprint 4"
          badgeVariant="warning"
          note="Atomic reservation engine"
          trend={{ value: "0%", direction: "neutral", label: "baseline" }}
        />

        <StatCard
          label="QR Verifications"
          value="--"
          badge="Sprint 4"
          badgeVariant="warning"
          note="Guard entry / exit workflow"
          trend={{ value: "0%", direction: "neutral", label: "baseline" }}
        />
      </section>

      {/* Roadmap & Architecture Preview Cards using reusable Card component */}
      <section className="dashboard-details-grid">
        <Card
          title="Module Development Roadmap"
          subtitle="Connecting four dedicated developer streams into a unified mall parking intelligence platform:"
        >
          <ul className="roadmap-list">
            <li>
              <strong>Sprint 1:</strong> Frontend Architecture, Design System &
              Layouts (Jashan) — <Badge variant="success">Completed</Badge>
            </li>
            <li>
              <strong>Sprint 2:</strong> Reusable UI Component Library & Auth
              Contracts (Jashan & Ocean) —{" "}
              <Badge variant="accent">In Progress</Badge>
            </li>
            <li>
              <strong>Sprint 3:</strong> Mall Inventory, Slot Management & Live
              Availability (Shikhar & Jashan) —{" "}
              <Badge variant="neutral">Upcoming</Badge>
            </li>
            <li>
              <strong>Sprint 4:</strong> Atomic Booking Engine & QR Entry/Exit
              Verification (Shikhar, Mehak & Jashan) —{" "}
              <Badge variant="neutral">Upcoming</Badge>
            </li>
            <li>
              <strong>Sprint 5:</strong> Guard Operations, Billing & Analytics
              Dashboards (Ocean, Shikhar, Jashan & Mehak) —{" "}
              <Badge variant="neutral">Upcoming</Badge>
            </li>
          </ul>
        </Card>

        <Card
          title="Quick Navigation & Tools"
          subtitle="Test route transitions across configured paths:"
        >
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
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDemoError((prev) => !prev)}
            >
              Toggle Error Banner
            </Button>
            <Button to="/unknown-route" variant="ghost" size="sm">
              Test 404 Route
            </Button>
          </div>
        </Card>
      </section>

      {/* Modal Demonstration */}
      <Modal
        isOpen={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
        title="Reusable Component Gallery"
        description="Live preview of form controls, status badges, and empty states designed for ParkEase."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => setDemoModalOpen(false)}
            >
              Close
            </Button>
            <Button
              variant="accent"
              onClick={() => setDemoModalOpen(false)}
            >
              Looks Great
            </Button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <h4 style={{ marginBottom: "8px", fontSize: "14px", fontWeight: "700" }}>
              Form Controls
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <Input
                label="Mall Name"
                placeholder="e.g. Phoenix Marketcity"
                helperText="Search for malls with registered parking bays."
              />
              <Select
                label="Parking Floor"
                placeholder="Select a level..."
                options={[
                  { value: "b1", label: "Basement 1 (Valet & EV)" },
                  { value: "b2", label: "Basement 2 (General Parking)" },
                  { value: "b3", label: "Basement 3 (Overnight & Long-term)" },
                ]}
              />
            </div>
          </div>

          <div>
            <h4 style={{ marginBottom: "8px", fontSize: "14px", fontWeight: "700" }}>
              Status Badges
            </h4>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <Badge variant="success" dot>Available</Badge>
              <Badge variant="warning" dot>Reserved</Badge>
              <Badge variant="danger" dot>Occupied</Badge>
              <Badge variant="neutral">Planned</Badge>
              <Badge variant="primary">Admin</Badge>
              <Badge variant="accent">Verified</Badge>
            </div>
          </div>

          <div>
            <h4 style={{ marginBottom: "8px", fontSize: "14px", fontWeight: "700" }}>
              Empty State Preview
            </h4>
            <EmptyState
              size="sm"
              title="No live reservations"
              description="Booking engine will connect to Shikhar's APIs in Sprint 4."
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
