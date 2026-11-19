import Button from "./Button.jsx";
import Input from "./Input.jsx";
import Select from "./Select.jsx";
import { formatBookingTime } from "../utils/bookingDisplay.js";

const durations = Array.from({ length: 16 }, (_, index) => {
  const minutes = 30 * (index + 1);
  return { value: String(minutes), label: minutes % 60 === 0 ? `${minutes / 60} hr` : `${Math.floor(minutes / 60) || ""}${minutes > 60 ? " hr " : ""}30 min` };
});

export default function BookingWindowForm({ activeWindow, loading, busy, onCheck, onClear }) {
  function submit(event) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const start = new Date(`${fields.get("date")}T${fields.get("time")}:00+05:30`);
    if (!Number.isFinite(start.getTime())) return;
    const end = new Date(start.getTime() + Number(fields.get("duration")) * 60_000);
    onCheck({ startTime: start.toISOString(), endTime: end.toISOString() }, fields.get("vehicleType"));
  }

  return <div className="reservation-toolbar">
    <form className="parking-filter-bar" onSubmit={submit}>
      <Input name="date" label="Arrival date" type="date" required disabled={busy} />
      <Input name="time" label="Arrival time (IST)" type="time" required disabled={busy} />
      <Select name="duration" label="Duration" options={durations} defaultValue="120" disabled={busy} />
      <Select name="vehicleType" label="Vehicle for reservation" options={[{ value: "CAR", label: "Car" }, { value: "BIKE", label: "Bike" }]} disabled={busy} />
      <Button type="submit" loading={loading} disabled={busy}>Check availability</Button>
    </form>
    {activeWindow && <div className="reservation-window-summary">
      <p>Showing {formatBookingTime(activeWindow.startTime)} to {formatBookingTime(activeWindow.endTime)} IST.</p>
      <Button size="sm" variant="ghost" onClick={onClear} disabled={busy}>Clear time window</Button>
    </div>}
  </div>;
}
