import { formatBookingTime, formatRupees } from "../utils/bookingDisplay.js";
import Icon from "../components/Icon.jsx";
import { useState, useEffect, useCallback } from "react";
import Button from "../components/Button.jsx";
import StatCard from "../components/StatCard.jsx";
import Card from "../components/Card.jsx";
import Badge from "../components/Badge.jsx";
import PageHeader from "../components/PageHeader.jsx";
import PageContainer from "../components/PageContainer.jsx";
import Modal from "../components/Modal.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import Skeleton from "../components/Skeleton.jsx";
import useAuth from "../hooks/useAuth.js";
import { cancelBooking, getUserBookings, isBookingApiAvailable } from "../services/bookingService.js";
import { ROLES } from "../constants/roles.js";

/**
 * DashboardPage: Polished User Dashboard for authenticated ParkEase drivers and shoppers.
 * Displays personalized greeting, live booking summary metrics, quick actions,
 * and a recent reservations list with loading, empty, and error states.
 */
export default function DashboardPage({
  bookingsOnly = false,
  initialLoading,
  initialBookings,
  initialStats,
} = {}) {
  const { user } = useAuth();

  const [bookings, setBookings] = useState(() => initialBookings || []);
  const [stats, setStats] = useState(() => initialStats || { total: 0, active: 0, completed: 0 });
  const [isLoading, setIsLoading] = useState(() =>
    typeof initialLoading === "boolean" ? initialLoading : isBookingApiAvailable()
  );
  const [error, setError] = useState(null);
  const [isPendingBackend, setIsPendingBackend] = useState(() => !isBookingApiAvailable());

  // Modals state
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleCancel() {
    if (cancelling || !selectedBooking) return;
    setCancelling(true);
    setCancelError("");
    try {
      const cancelled = await cancelBooking(selectedBooking.id);
      setBookings((current) => current.map((entry) => entry.id === cancelled.id ? cancelled : entry));
      setStats((current) => ({ ...current, active: Math.max(0, current.active - 1), cancelled: (current.cancelled || 0) + 1 }));
      setSelectedBooking(cancelled);
      setNotice("Reservation cancelled. The bay is available for that time window again.");
    } catch (err) {
      setCancelError(err.message);
    } finally {
      setCancelling(false);
    }
  }

  /**
   * Fetch bookings and summary metrics.
   * Handles pending backend API gracefully without inventing fake data.
   */
  const loadBookingsData = useCallback(async () => {
    try {
      const result = await getUserBookings();
      setBookings(result.bookings || []);
      setStats(result.stats || { total: 0, active: 0, completed: 0 });
      setIsPendingBackend(Boolean(result.isPendingBackend));
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to load parking reservations. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRefresh = async () => {
    setIsLoading(true);
    await loadBookingsData();
  };

  useEffect(() => {
    if (initialBookings !== undefined && initialBookings !== null) {
      return;
    }

    let isMounted = true;
    getUserBookings()
      .then((result) => {
        if (isMounted) {
          setBookings(result.bookings || []);
          setStats(result.stats || { total: 0, active: 0, completed: 0 });
          setIsPendingBackend(Boolean(result.isPendingBackend));
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Failed to load parking reservations. Please check your connection.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [initialBookings]);

  // Guard: strictly restrict to USER role accounts
  if (user && user.role && user.role !== ROLES.USER) {
    return (
      <PageContainer className="unauthorized-page-container">
        <div className="unauthorized-card">
          <Badge variant="danger" size="md">
            403 Forbidden
          </Badge>
          <h1 className="unauthorized-title">Access Restricted</h1>
          <p className="unauthorized-text">
            This dashboard is dedicated to <strong>Driver / Customer</strong> accounts.
            Your account role is <strong>{user.role}</strong>. Please switch to your designated management portal.
          </p>
          <div className="unauthorized-actions">
            <Button to="/" variant="secondary">
              Return to Public Home
            </Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  const openBooking = (booking) => {
    setSelectedBooking(booking);
    setCancelError("");
    setDetailsOpen(true);
  };

  const displayName = user?.name || user?.email?.split("@")[0] || "Driver";

  return (
    <div className="dashboard-content-grid">
      {bookingsOnly ? <PageHeader
        title="My bookings"
        description="View reservation details and manage upcoming parking visits."
        actions={<>
          <Button to="/malls" size="sm">Find parking</Button>
          <Button variant="outline" size="sm" loading={isLoading} onClick={handleRefresh}>Refresh bookings</Button>
        </>}
      /> : <>
        {/* 1. Personalized Welcome Header */}
        <PageHeader
          eyebrow="USER PORTAL"
          title={`Welcome back, ${displayName}!`}
          description="Your starting point for a smoother arrival. Explore malls and keep your parking visits in one place."
          badge={
            <Badge variant="success" dot>
              Driver Account Active
            </Badge>
          }
          actions={
            <div className="page-actions">
              <Button
                to="/malls"
                variant="accent"
                size="sm"
              >
                Find Parking
              </Button>
              <Button
                variant="outline"
                size="sm"
                loading={isLoading}
                onClick={handleRefresh}
              >
                ↻ Refresh
              </Button>
            </div>
          }
        />

        {/* Authenticated User Metadata Details */}
        <div className="welcome-user-meta" aria-label="Account details">
          <span className="user-meta-pill">
            <span aria-hidden="true">✉</span>
            <span>{user?.email}</span>
          </span>
          <span className="user-meta-pill">
            <span>Role: <strong>{user?.role || "USER"}</strong></span>
          </span>
          <span className="user-meta-pill">
            <span className="status-dot online" aria-hidden="true" />
            <span>Active Session</span>
          </span>
        </div>

        {/* Global Error Notice if initial fetch failed */}
        {error && (
          <ErrorMessage
            title="Could Not Refresh Reservations"
            message={error}
            onRetry={handleRefresh}
            onDismiss={() => setError(null)}
          />
        )}

        {/* 2. Summary Metric Cards: Total, Active, Completed */}
        <section className="dashboard-summary-grid" aria-label="Parking summary statistics">
          <StatCard
            label="Total Bookings"
            value={isLoading ? "--" : stats.total}
            note={isPendingBackend ? "Reservations are coming soon" : "All-time parking reservations"}
            badge={isPendingBackend ? "Coming soon" : `${stats.total} total`}
            badgeVariant={isPendingBackend ? "neutral" : "primary"}
            loading={isLoading}
          />

          <StatCard
            label="Active Bookings"
            value={isLoading ? "--" : stats.active}
            note={isPendingBackend ? "Gate passes are coming soon" : "Currently reserved or checked-in bays"}
            badge={stats.active > 0 ? "Active Now" : "None Active"}
            badgeVariant={stats.active > 0 ? "success" : "neutral"}
            loading={isLoading}
          />

          <StatCard
            label="Past Reservations"
            value={isLoading ? "--" : stats.completed}
            note={isPendingBackend ? "Your visits will appear here" : "Reservation windows that have ended"}
            badge={stats.completed > 0 ? "Completed" : "None"}
            badgeVariant="neutral"
            loading={isLoading}
          />
        </section>

        {/* 3. Quick Action Cards */}
        <section className="quick-actions-grid" aria-label="Quick actions">
          <Card className="quick-action-card">
            <div className="quick-action-header">
              <div className="quick-action-icon" aria-hidden="true"><Icon name="pin" /></div>
              <div>
                <h3 className="quick-action-title">Find Parking</h3>
                <p className="quick-action-desc">
                  Explore approved malls, parking rates, and opening hours.
                </p>
              </div>
            </div>
            <Button to="/malls" variant="accent" size="sm">
              Search Available Slots ↗
            </Button>
          </Card>

          <Card className="quick-action-card">
            <div className="quick-action-header">
              <div className="quick-action-icon" aria-hidden="true"><Icon name="clipboard" /></div>
              <div>
                <h3 className="quick-action-title">My Bookings</h3>
                <p className="quick-action-desc">
                  Review or cancel an upcoming reservation.
                </p>
              </div>
            </div>
            <Button to="/dashboard/bookings" variant="outline" size="sm">
              View all bookings
            </Button>
          </Card>
        </section>

      </>}

      {notice && <p role="status" className="notice-success">{notice}</p>}

      {/* 4. Recent Bookings Section */}
      <section id="recent-bookings-section" className="bookings-section" aria-label={bookingsOnly ? "All bookings" : "Recent bookings"}>
        <Card
          title={bookingsOnly ? "All reservations" : "Recent Bookings"}
          subtitle="Review upcoming and past reservations."
        >
          {/* Loading State */}
          {isLoading && (
            <div className="bookings-list" aria-busy="true" aria-label="Loading reservations">
              <Skeleton height="72px" />
              <Skeleton height="72px" />
              <Skeleton height="72px" />
            </div>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <ErrorMessage
              title="Unable to Load Bookings"
              message={error}
              onRetry={handleRefresh}
            />
          )}

          {/* Empty State */}
          {!isLoading && !error && bookings.length === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <EmptyState
                icon={<Icon name="car" size={28} />}
                title="No Parking Reservations Found"
                description="Choose a mall, time window, and bay to make your first reservation."
                action={
                  <Button to="/malls" variant="accent" size="sm">
                    Find Parking Now
                  </Button>
                }
              />

              {isPendingBackend && (
                <div className="auth-status-banner info" role="status">
                  <div>
                    <strong>Reservations are coming next. </strong>
                    <span>
                      You can explore malls now. Online reservations and digital gate passes will be available in a future update.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Booking List with Real/Fetched Bookings */}
          {!isLoading && !error && bookings.length > 0 && (
            <div className="bookings-list" role="list">
              {(bookingsOnly ? bookings : bookings.slice(0, 3)).map((booking) => {
                const isConfirmed = booking.status === "CONFIRMED" || booking.status === "ACTIVE";
                const isCompleted = booking.status === "COMPLETED";

                return (
                  <div key={booking.id} className="booking-item-card" role="listitem">
                    <div className="booking-main-info">
                      <div className="booking-mall-title">
                        <span>{booking.mallName}</span>
                        <Badge
                          variant={isConfirmed ? "success" : isCompleted ? "neutral" : "danger"}
                          size="sm"
                          dot={isConfirmed}
                        >
                          {booking.status}
                        </Badge>
                      </div>

                      <div className="booking-meta-row">
                        <span>
                          <strong>Bay:</strong> {booking.slotCode} ({booking.floor})
                        </span>
                        <span>•</span>
                        <span>
                          <strong>Vehicle:</strong> {booking.vehicleNumber}
                        </span>
                        <span>•</span>
                        <span>
                          <strong>Arrival:</strong> {formatBookingTime(booking.startTime)} IST
                        </span>
                        {booking.totalAmount > 0 && (
                          <>
                            <span>•</span>
                            <span>
                              <strong>Estimate:</strong> {formatRupees(booking.totalAmount)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="booking-actions-group">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openBooking(booking)}
                      >
                        View reservation
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </section>

      <Modal isOpen={detailsOpen} onClose={() => { if (!cancelling) setDetailsOpen(false); }}
        title="Reservation details" description={selectedBooking?.mallName}
        actions={<>
          <Button variant="secondary" disabled={cancelling} onClick={() => setDetailsOpen(false)}>Close</Button>
          {selectedBooking?.canCancel &&
            <Button variant="danger" loading={cancelling} onClick={handleCancel}>Cancel reservation</Button>}
        </>}>
        {cancelError && <ErrorMessage message={cancelError} />}
        {selectedBooking && <dl className="detail-list">
          <div><dt>Reference</dt><dd>{selectedBooking.id.toUpperCase()}</dd></div>
          <div><dt>Bay</dt><dd>{selectedBooking.slotCode} · {selectedBooking.floor}</dd></div>
          <div><dt>Vehicle</dt><dd>{selectedBooking.vehicleNumber}</dd></div>
          <div><dt>Arrival (IST)</dt><dd>{formatBookingTime(selectedBooking.startTime)}</dd></div>
          <div><dt>Departure (IST)</dt><dd>{formatBookingTime(selectedBooking.endTime)}</dd></div>
          <div><dt>Estimated total</dt><dd>{formatRupees(selectedBooking.totalAmount)}</dd></div>
          <div><dt>Status</dt><dd>{selectedBooking.status}</dd></div>
        </dl>}
      </Modal>
    </div>
  );
}
