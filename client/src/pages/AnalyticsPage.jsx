import { useEffect, useState } from "react";
import useAuth from "../hooks/useAuth.js";
import PageHeader from "../components/PageHeader.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import { getAnalytics, getMallAnalytics } from "../services/analyticsService.js";
import { formatRupees } from "../utils/bookingDisplay.js";

const labels = {
  totalBays: "Published bays", availableNow: "Available now", reservedNow: "Reserved now",
  occupiedNow: "Occupied now", maintenanceNow: "Maintenance", upcomingBookings: "Upcoming reservations",
  activeVisits: "Active visits", completedVisits: "Completed visits", expiredBookings: "Expired reservations",
  cancelledBookings: "Cancelled reservations", billedAmountPaise: "Billed amount",
};

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [mallId, setMallId] = useState("");
  const [query, setQuery] = useState({});
  const [data, setData] = useState(null);
  const [mallChoices, setMallChoices] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const read = mallId && user?.role === "MALL_OWNER"
      ? getMallAnalytics(mallId, query, { signal: controller.signal })
      : getAnalytics(user?.role, query, { signal: controller.signal });
    read.then((result) => { if (!controller.signal.aborted) { setData(result); if (!mallId) setMallChoices(result.perMall || []); setError(""); } })
      .catch((err) => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [user?._id, user?.role, mallId, query]);

  const value = (key, number) => key === "billedAmountPaise" ? formatRupees(number / 100) : number;
  return <div className="dashboard-content-grid">
    <PageHeader title={user?.role === "ADMIN" ? "Platform analytics" : "Your mall analytics"} description="Current bay counts and completed visits in the selected IST date range." />
    <Card title="Reporting filters"><form className="form-two-columns" onSubmit={(event) => { event.preventDefault(); setLoading(true); setQuery({ from: from || undefined, to: to || undefined }); }}>
      <label>From (IST)<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
      <label>To (IST)<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
      {user?.role === "MALL_OWNER" && <label>Mall<select value={mallId} onChange={(event) => { setLoading(true); setMallId(event.target.value); }}><option value="">All owned malls</option>{mallChoices.map((mall) => <option key={mall.mallId} value={mall.mallId}>{mall.mallName}</option>)}</select></label>}
      <Button type="submit">Apply dates</Button>
    </form></Card>
    {loading && <p role="status">Loading analytics…</p>}
    {error && <p role="alert" className="form-error-text">{error} <Button onClick={() => { setLoading(true); setQuery({ ...query }); }}>Retry</Button></p>}
    {data && <>
      <Card title="Overview"><div className="owner-metrics">{Object.entries(labels).map(([key, label]) => <div key={key}><strong>{label}</strong><p>{value(key, data.metrics?.[key] ?? 0)}</p></div>)}</div>
        {user?.role === "ADMIN" && <p>Owners: {data.ownerCount} · Malls: {data.mallCount} · Pending owners: {data.pendingOwnerCount} · Pending malls: {data.pendingMallCount}</p>}
        <p>Last updated: {data.generatedAt ? new Date(data.generatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "—"} IST</p>
      </Card>
      <Card title="Daily report"><div className="table-scroll"><table><thead><tr><th scope="col">IST date</th><th scope="col">Completed visits</th><th scope="col">Billed amount</th></tr></thead><tbody>{data.series?.map((day) => <tr key={day.date}><td>{day.date}</td><td>{day.completedVisits}</td><td>{formatRupees(day.billedAmountPaise / 100)}</td></tr>)}</tbody></table></div></Card>
      <Card title="Malls"><div className="table-scroll"><table><thead><tr><th scope="col">Mall</th><th scope="col">Published bays</th><th scope="col">Active visits</th><th scope="col">Billed amount</th></tr></thead><tbody>{data.perMall?.map((mall) => <tr key={mall.mallId}><td>{mall.mallName}</td><td>{mall.metrics.totalBays}</td><td>{mall.metrics.activeVisits}</td><td>{formatRupees(mall.metrics.billedAmountPaise / 100)}</td></tr>)}</tbody></table></div></Card>
    </>}
  </div>;
}
