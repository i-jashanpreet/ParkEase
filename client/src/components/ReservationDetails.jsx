import Button from "./Button.jsx";
import Input from "./Input.jsx";
import Badge from "./Badge.jsx";
import { formatBookingTime, formatRupees } from "../utils/bookingDisplay.js";

export default function ReservationDetails({
  bay, window, plate, onPlate, busy, loading, role, loginTo, loginFrom, onReserve, onClear,
}) {
  if (!bay) return <>
    <span className="eyebrow">PARKING RESERVATION</span>
    <h2>Choose a bay</h2>
    <p>Check a time window, then select a bay to review its details.</p>
  </>;

  const hours = window ? (Date.parse(window.endTime) - Date.parse(window.startTime)) / 3_600_000 : 0;
  const available = bay.status === "AVAILABLE";
  const mismatch = window && bay.vehicleType !== window.vehicleType;
  const canReserve = window && available && !mismatch && !loading;

  return <>
    <span className="eyebrow">SELECTED BAY</span>
    <h2>{bay.slotNumber}</h2>
    <Badge variant={available ? "success" : "neutral"}>{bay.status}</Badge>
    <dl className="detail-list">
      <div><dt>Floor</dt><dd>{bay.floor || "General Level"}</dd></div>
      <div><dt>Vehicle</dt><dd>{bay.vehicleType === "BIKE" ? "Bike" : "Car"}</dd></div>
      {typeof bay.hourlyRate === "number" && <div><dt>Hourly rate</dt><dd>{formatRupees(bay.hourlyRate)}</dd></div>}
      {bay.isElectric && <div><dt>Charging</dt><dd>EV available</dd></div>}
      {bay.isAccessible && <div><dt>Access</dt><dd>Accessible bay</dd></div>}
      {window && <>
        <div><dt>Arrival (IST)</dt><dd>{formatBookingTime(window.startTime)}</dd></div>
        <div><dt>Departure (IST)</dt><dd>{formatBookingTime(window.endTime)}</dd></div>
        {typeof bay.hourlyRate === "number" && <div><dt>Estimated total</dt><dd>{formatRupees(bay.hourlyRate * hours)}</dd></div>}
      </>}
    </dl>
    {canReserve && (role === "USER" ? (
      <form className="inventory-form" onSubmit={onReserve}>
        <Input label="Vehicle plate number" value={plate} onChange={(event) => onPlate(event.target.value)} placeholder="UP32 AB 1234" minLength={3} maxLength={20} required disabled={busy} />
        <Button type="submit" loading={busy}>Confirm reservation</Button>
      </form>
    ) : role ? <p className="panel-hint">Sign in with a driver account to reserve this bay.</p>
      : <Button to={loginTo} state={{ from: loginFrom }}>Sign in to reserve</Button>)}
    {!window && <p className="panel-hint">Check a time window to reserve this bay.</p>}
    {window && !available && <p className="panel-hint">This bay is unavailable for the selected window.</p>}
    {mismatch && <p className="panel-hint">Choose a bay that matches your vehicle.</p>}
    <Button variant="ghost" size="sm" onClick={onClear} disabled={busy}>Clear selection</Button>
  </>;
}
