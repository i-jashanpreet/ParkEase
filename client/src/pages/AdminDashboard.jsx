import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Button from "../components/Button.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import Icon from "../components/Icon.jsx";
import MallReviews from "../components/MallReviews.jsx";
import OwnerApprovals from "../components/OwnerApprovals.jsx";
import PageHeader from "../components/PageHeader.jsx";
import StatCard from "../components/StatCard.jsx";
import { sessionRequest } from "../services/authService.js";

export default function AdminDashboard() {
  const [params] = useSearchParams();
  const view = params.get("view") || "overview";
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const load = useCallback((signal) => {
    return Promise.all([
      sessionRequest("/admin/malls", { signal }),
      sessionRequest("/admin/mall-owners", { signal }),
    ]).then(([mallResponse, ownerResponse]) => {
      if (!signal?.aborted) setData({ malls: mallResponse.data.malls, owners: ownerResponse.data.mallOwners });
    }).catch((err) => {
      if (!signal?.aborted) setError(err.message);
    }).finally(() => {
      if (!signal?.aborted) setLoading(false);
    });
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);
  function refresh() { setLoading(true); setError(""); load(); }
  async function update(kind, item, body) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { data: result } = await sessionRequest(`/admin/${kind === "mall" ? "malls" : "mall-owners"}/${item._id}/status`, { method: "PATCH", body });
      const key = kind === "mall" ? "malls" : "owners";
      const updated = kind === "mall" ? result.mall : result.user;
      setData((current) => ({ ...current, [key]: current[key].map((entry) => entry._id === item._id ? updated : entry) }));
      const labels = { APPROVED: "approved", ACTIVE: "approved", REJECTED: "rejected", INACTIVE: "deactivated", SUSPENDED: "suspended" };
      setNotice(`${item.name} ${labels[updated.status] || "updated"}.`);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  const count = (list, status) => data ? data[list].filter((item) => item.status === status).length : "—";
  const titles = { overview: "Platform overview", malls: "Mall applications", owners: "Owner accounts", "all-malls": "Mall directory" };
  return <div className="dashboard-content-grid">
    <PageHeader title={titles[view] || titles.overview} description="Review applications and keep ParkEase running smoothly." actions={<Button variant="outline" size="sm" loading={loading} disabled={busy} onClick={refresh}>Refresh data</Button>} />
    <div className="admin-metrics">
      <StatCard label="Published malls" value={count("malls", "APPROVED")} note="Visible to drivers" icon={<Icon name="building" />} loading={loading && !data} />
      <StatCard label="Mall applications" value={count("malls", "PENDING")} note="Awaiting review" icon={<Icon name="clipboard" />} loading={loading && !data} />
      <StatCard label="Owner applications" value={count("owners", "PENDING_APPROVAL")} note="Awaiting verification" icon={<Icon name="users" />} loading={loading && !data} />
      <StatCard label="Inactive malls" value={count("malls", "INACTIVE")} note="Hidden from discovery" icon={<Icon name="eye" />} loading={loading && !data} />
    </div>
    {error && <ErrorMessage message={error} onRetry={refresh} />}
    {notice && <div className="notice-success" role="status"><Icon name="check" />{notice}</div>}
    {loading && !data && <p role="status">Loading applications…</p>}
    {data && (view === "owners" ? <OwnerApprovals items={data.owners} busy={busy || loading} onUpdate={(item, body) => update("owner", item, body)} /> : <>
      <MallReviews key={view} items={data.malls} owners={data.owners} busy={busy || loading} all={view === "all-malls"} onUpdate={(item, body) => update("mall", item, body)} />
      {view === "overview" && <div className="owner-summary-strip"><span className="summary-icon"><Icon name="users" /></span><div><h2>Owner approvals</h2><p>{count("owners", "PENDING_APPROVAL")} accounts awaiting verification</p></div><Button to="/dashboard?view=owners" variant="outline" size="sm" icon={<Icon name="arrow" size={16} />}>Review accounts</Button></div>}
    </>)}
  </div>;
}
