import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../components/PageHeader.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import { cancelBooking, getBooking } from "../services/bookingService.js";
import { formatBookingTime, formatRupees } from "../utils/bookingDisplay.js";
import useAuth from "../hooks/useAuth.js";

export default function BookingDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setError("");
    try { setBooking(await getBooking(id)); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    getBooking(id, { signal: controller.signal }).then((result) => {
      if (active) setBooking(result);
    }).catch((err) => { if (active) setError(err.message); }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; controller.abort(); };
  }, [id, user?._id]);

  async function cancel() {
    if (!booking?.canCancel || busy || !window.confirm("Cancel this reservation?")) return;
    setBusy(true);
    try { setBooking(await cancelBooking(id)); setError(""); }
    catch (err) { setError(err.message); await refresh(); }
    finally { setBusy(false); }
  }

  return <div className="dashboard-content-grid">
    <PageHeader title="Reservation details" description="Times below are shown in IST." />
    {loading && <p role="status">Loading reservation…</p>}
    {error && <p role="alert">{error} <Button onClick={refresh}>Retry</Button></p>}
    {booking && <Card title={booking.mallName} subtitle={`Reference: ${booking.id}`}>
      <dl className="detail-list">
        <div><dt>Status</dt><dd>{booking.status === "ENDED" ? "ENDED (legacy reservation, entry not verified)" : booking.status}</dd></div>
        <div><dt>Bay</dt><dd>{booking.floor} · {booking.slotCode}</dd></div>
        <div><dt>Vehicle</dt><dd>{booking.vehicleNumber} {booking.vehicleType && `(${booking.vehicleType})`}</dd></div>
        <div><dt>Scheduled arrival</dt><dd>{formatBookingTime(booking.startTime)} IST</dd></div>
        <div><dt>Scheduled departure</dt><dd>{formatBookingTime(booking.endTime)} IST</dd></div>
        {booking.entryDeadline && <div><dt>Entry deadline</dt><dd>{formatBookingTime(booking.entryDeadline)} IST</dd></div>}
        {booking.enteredAt && <div><dt>Actual entry</dt><dd>{formatBookingTime(booking.enteredAt)} IST</dd></div>}
        {booking.exitedAt && <div><dt>Actual exit</dt><dd>{formatBookingTime(booking.exitedAt)} IST</dd></div>}
        <div><dt>Reservation estimate</dt><dd>{formatRupees(booking.totalAmount)}</dd></div>
      </dl>
      <div className="page-header-actions">
        {booking.canCancel && <Button onClick={cancel} disabled={busy}>{busy ? "Cancelling…" : "Cancel reservation"}</Button>}
        {booking.billAvailable && <Link className="button button-secondary" to={`/dashboard/bookings/${id}/bill`}>View final bill</Link>}
      </div>
    </Card>}
  </div>;
}
