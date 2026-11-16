import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import Button from "../src/components/Button.jsx";
import Input from "../src/components/Input.jsx";
import Select from "../src/components/Select.jsx";
import Card from "../src/components/Card.jsx";
import Badge from "../src/components/Badge.jsx";
import Modal from "../src/components/Modal.jsx";
import Loading from "../src/components/Loading.jsx";
import Skeleton from "../src/components/Skeleton.jsx";
import EmptyState from "../src/components/EmptyState.jsx";
import ErrorMessage from "../src/components/ErrorMessage.jsx";
import PageHeader from "../src/components/PageHeader.jsx";
import StatCard from "../src/components/StatCard.jsx";

// Helper to render inside router context when components use Link
function renderWithRouter(element) {
  return renderToStaticMarkup(React.createElement(MemoryRouter, null, element));
}

test("Button component renders variants, sizes, and states", () => {
  // Primary variant (default)
  const primary = renderToStaticMarkup(
    React.createElement(Button, null, "Confirm")
  );
  assert.match(primary, /button-primary/);
  assert.match(primary, /Confirm/);

  // Danger variant
  const danger = renderToStaticMarkup(
    React.createElement(Button, { variant: "danger" }, "Cancel Booking")
  );
  assert.match(danger, /button-danger/);

  // Outline variant & small size
  const outlineSm = renderToStaticMarkup(
    React.createElement(Button, { variant: "outline", size: "sm" }, "Details")
  );
  assert.match(outlineSm, /button-outline/);
  assert.match(outlineSm, /button-sm/);

  // Disabled state
  const disabled = renderToStaticMarkup(
    React.createElement(Button, { disabled: true }, "Unavailable")
  );
  assert.match(disabled, /disabled=""/);

  // Loading state
  const loading = renderToStaticMarkup(
    React.createElement(Button, { loading: true }, "Processing")
  );
  assert.match(loading, /button-loading/);
  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, /button-spinner/);

  // Router Link render when `to` prop provided
  const linkBtn = renderWithRouter(
    React.createElement(Button, { to: "/dashboard" }, "Dashboard")
  );
  assert.match(linkBtn, /<a /);
  assert.match(linkBtn, /href="\/dashboard"/);
});

test("Input component renders label, helper text, error state, and accessibility attributes", () => {
  // Standard input with label and helper
  const standard = renderToStaticMarkup(
    React.createElement(Input, {
      label: "Vehicle Plate",
      id: "plate-input",
      placeholder: "e.g. DL-01-AB-1234",
      helperText: "Enter your registered vehicle number",
      required: true,
    })
  );
  assert.match(standard, /<label for="plate-input"/);
  assert.match(standard, /Vehicle Plate/);
  assert.match(standard, /required-star/);
  assert.match(standard, /id="plate-input"/);
  assert.match(standard, /aria-describedby="plate-input-helper"/);
  assert.match(standard, /id="plate-input-helper"/);

  // Error state
  const errorInput = renderToStaticMarkup(
    React.createElement(Input, {
      label: "Vehicle Plate",
      id: "plate-err",
      error: "Invalid license plate format",
    })
  );
  assert.match(errorInput, /form-input-error/);
  assert.match(errorInput, /aria-invalid="true"/);
  assert.match(errorInput, /role="alert"/);
  assert.match(errorInput, /Invalid license plate format/);

  // Disabled state
  const disabledInput = renderToStaticMarkup(
    React.createElement(Input, {
      label: "Locked Field",
      disabled: true,
    })
  );
  assert.match(disabledInput, /form-group-disabled/);
  assert.match(disabledInput, /disabled=""/);
});

test("Select component renders options, placeholder, error, and chevron", () => {
  const options = [
    { value: "p1", label: "Basement 1" },
    { value: "p2", label: "Basement 2" },
  ];

  const select = renderToStaticMarkup(
    React.createElement(Select, {
      label: "Select Floor",
      id: "floor-select",
      placeholder: "Choose a level...",
      options: options,
      helperText: "Select which mall floor you want to park on",
    })
  );

  assert.match(select, /<label for="floor-select"/);
  assert.match(select, /<select/);
  assert.match(select, /Choose a level\.\.\./);
  assert.match(select, /value="p1"/);
  assert.match(select, /Basement 1/);
  assert.match(select, /select-chevron/);

  // Error state
  const errorSelect = renderToStaticMarkup(
    React.createElement(Select, {
      label: "Select Floor",
      error: "Please select a valid floor",
      options: options,
    })
  );
  assert.match(errorSelect, /form-select-error/);
  assert.match(errorSelect, /role="alert"/);
  assert.match(errorSelect, /Please select a valid floor/);
});

test("Card component renders header, subtitle, footer, and compound subcomponents", () => {
  // Standard card with props
  const card = renderToStaticMarkup(
    React.createElement(
      Card,
      {
        title: "Mall Parking Overview",
        subtitle: "Floor B1",
        footer: React.createElement("button", null, "Manage"),
        variant: "elevated",
        padding: "lg",
      },
      React.createElement("p", null, "Slot availability is high.")
    )
  );

  assert.match(card, /card-elevated/);
  assert.match(card, /card-padding-lg/);
  assert.match(card, /Mall Parking Overview/);
  assert.match(card, /Floor B1/);
  assert.match(card, /card-footer/);
  assert.match(card, /Manage/);
  assert.match(card, /Slot availability is high\./);

  // Compound subcomponent usage
  const compound = renderToStaticMarkup(
    React.createElement(
      Card,
      null,
      React.createElement(Card.Header, null, "Custom Header"),
      React.createElement(Card.Body, null, "Custom Body"),
      React.createElement(Card.Footer, null, "Custom Footer")
    )
  );
  assert.match(compound, /Custom Header/);
  assert.match(compound, /Custom Body/);
  assert.match(compound, /Custom Footer/);
});

test("Badge component renders status variants and dot indicators", () => {
  const successBadge = renderToStaticMarkup(
    React.createElement(Badge, { variant: "success", dot: true }, "Available")
  );
  assert.match(successBadge, /badge-success/);
  assert.match(successBadge, /badge-dot/);
  assert.match(successBadge, /Available/);

  const dangerBadge = renderToStaticMarkup(
    React.createElement(Badge, { variant: "danger" }, "Occupied")
  );
  assert.match(dangerBadge, /badge-danger/);
  assert.match(dangerBadge, /Occupied/);

  const warningBadge = renderToStaticMarkup(
    React.createElement(Badge, { variant: "warning" }, "Reserved")
  );
  assert.match(warningBadge, /badge-warning/);

  const neutralBadge = renderToStaticMarkup(
    React.createElement(Badge, { variant: "neutral" }, "Planned")
  );
  assert.match(neutralBadge, /badge-neutral/);
});

test("Modal component renders dialog content when isOpen is true and hides when false", () => {
  // Closed modal
  const closed = renderToStaticMarkup(
    React.createElement(Modal, { isOpen: false, title: "Test Dialog" }, "Content")
  );
  assert.equal(closed, "");

  // Open modal
  const open = renderToStaticMarkup(
    React.createElement(
      Modal,
      {
        isOpen: true,
        title: "Confirm Reservation",
        description: "Review slot details below",
        actions: React.createElement("button", null, "Confirm"),
      },
      React.createElement("p", null, "Slot A-12 reserved for 2 hours.")
    )
  );

  assert.match(open, /role="dialog"/);
  assert.match(open, /aria-modal="true"/);
  assert.match(open, /Confirm Reservation/);
  assert.match(open, /Review slot details below/);
  assert.match(open, /Slot A-12 reserved for 2 hours\./);
  assert.match(open, /modal-close-button/);
  assert.match(open, /Confirm/);
});

test("Loading and Skeleton components render appropriately", () => {
  // Loading indicator
  const loading = renderToStaticMarkup(
    React.createElement(Loading, { message: "Fetching slots...", size: "lg" })
  );
  assert.match(loading, /role="status"/);
  assert.match(loading, /loading-lg/);
  assert.match(loading, /Fetching slots\.\.\./);
  assert.match(loading, /spinner-svg/);

  // Skeleton lines
  const skeleton = renderToStaticMarkup(
    React.createElement(Skeleton, { variant: "text", count: 3 })
  );
  assert.match(skeleton, /skeleton-group/);
  assert.match(skeleton, /skeleton-animated/);
  assert.match(skeleton, /aria-hidden="true"/);

  // Skeleton card
  const skeletonCard = renderToStaticMarkup(
    React.createElement(Skeleton, { variant: "card" })
  );
  assert.match(skeletonCard, /skeleton-card/);
  assert.match(skeletonCard, /skeleton-card-image/);
});

test("EmptyState component renders title, description, icon, and action", () => {
  const empty = renderToStaticMarkup(
    React.createElement(EmptyState, {
      title: "No Parking Reservations Found",
      description: "You have not reserved any parking slots yet.",
      action: React.createElement("button", null, "Book a Slot"),
    })
  );

  assert.match(empty, /empty-state/);
  assert.match(empty, /No Parking Reservations Found/);
  assert.match(empty, /You have not reserved any parking slots yet\./);
  assert.match(empty, /Book a Slot/);
  assert.match(empty, /empty-state-icon-wrapper/);
});

test("ErrorMessage component renders alert banner with retry action", () => {
  const error = renderToStaticMarkup(
    React.createElement(ErrorMessage, {
      title: "Network Connection Error",
      message: "Could not reach backend health endpoint.",
      onRetry: () => {},
    })
  );

  assert.match(error, /role="alert"/);
  assert.match(error, /Network Connection Error/);
  assert.match(error, /Could not reach backend health endpoint\./);
  assert.match(error, /error-retry-btn/);
  assert.match(error, /Retry/);
});

test("PageHeader component renders eyebrow, title, description, and actions", () => {
  const header = renderToStaticMarkup(
    React.createElement(PageHeader, {
      eyebrow: "MALL DASHBOARD",
      title: "Parking Slot Inventory",
      description: "Live overview of multi-tier parking slots across mall floors.",
      actions: React.createElement("button", null, "Add Slot"),
    })
  );

  assert.match(header, /page-header/);
  assert.match(header, /MALL DASHBOARD/);
  assert.match(header, /Parking Slot Inventory/);
  assert.match(header, /Live overview of multi-tier parking slots/);
  assert.match(header, /Add Slot/);
});

test("StatCard component renders metrics, trend indicators, badges, and loading skeleton", () => {
  const stat = renderToStaticMarkup(
    React.createElement(StatCard, {
      label: "Live Occupancy",
      value: "84%",
      badge: "Peak Hour",
      badgeVariant: "warning",
      note: "168 of 200 slots filled",
      trend: { value: "+12%", direction: "up", label: "vs last hour" },
    })
  );

  assert.match(stat, /stat-card/);
  assert.match(stat, /Live Occupancy/);
  assert.match(stat, /84%/);
  assert.match(stat, /Peak Hour/);
  assert.match(stat, /stat-card-trend-up/);
  assert.match(stat, /\+12%/);
  assert.match(stat, /vs last hour/);
  assert.match(stat, /168 of 200 slots filled/);

  // StatCard loading state
  const loadingStat = renderToStaticMarkup(
    React.createElement(StatCard, {
      label: "Active Bookings",
      loading: true,
    })
  );
  assert.match(loadingStat, /aria-busy="true"/);
  assert.match(loadingStat, /skeleton/);
});
