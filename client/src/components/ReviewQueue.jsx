import { useState } from "react";
import Badge from "./Badge.jsx";
import Button from "./Button.jsx";
import EmptyState from "./EmptyState.jsx";
import Icon from "./Icon.jsx";
import Input from "./Input.jsx";
import MallIllustration from "./MallIllustration.jsx";

const mallStatuses = { PENDING: "Pending", APPROVED: "Approved", REJECTED: "Rejected", INACTIVE: "Inactive" };
const ownerStatuses = { PENDING_APPROVAL: "Pending", ACTIVE: "Active", REJECTED: "Rejected", SUSPENDED: "Suspended" };
const dateLabel = (date) => date ? new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—";

function ReviewDetail({ item, owner, kind, busy, onUpdate }) {
  const [reason, setReason] = useState("");
  const [validation, setValidation] = useState("");
  const isMall = kind === "mall";
  const pending = item.status === (isMall ? "PENDING" : "PENDING_APPROVAL");
  const active = item.status === (isMall ? "APPROVED" : "ACTIVE");
  const labels = isMall ? mallStatuses : ownerStatuses;
  function reject(event) {
    event.preventDefault();
    if (!reason.trim()) { setValidation("Enter a reason before rejecting this application."); return; }
    setValidation("");
    onUpdate(item, { status: "REJECTED", rejectionReason: reason.trim() });
  }
  return <aside className="review-detail" aria-label={`${item.name} application details`}>
    <div className="review-detail-header"><span className="eyebrow">{isMall ? "Mall application" : "Owner account"}</span><Badge variant={pending ? "warning" : active ? "success" : "neutral"}>{labels[item.status] || item.status}</Badge></div>
    <h3>{item.name}</h3>
    {isMall ? <MallIllustration compact /> : <div className="owner-identity"><span className="profile-avatar">{item.name.slice(0, 1)}</span><span>{item.email}</span></div>}
    <dl className="detail-list">
      {isMall ? <>
        <div><dt>Location</dt><dd>{item.city}</dd></div>
        <div><dt>Address</dt><dd>{item.address}</dd></div>
        <div><dt>Submitted by</dt><dd>{owner?.name || "Owner information unavailable"}</dd></div>
        <div><dt>Owner account</dt><dd>{owner ? ownerStatuses[owner.status] || owner.status : "Unavailable"}</dd></div>
        <div><dt>Opening hours</dt><dd>{item.openingTime} – {item.closingTime}</dd></div>
        <div><dt>Parking rate</dt><dd>₹{(item.hourlyRatePaise / 100).toFixed(2)} / hour</dd></div>
      </> : <>
        <div><dt>Email</dt><dd>{item.email}</dd></div>
        <div><dt>Phone</dt><dd>{item.phone || "Not provided"}</dd></div>
      </>}
      <div><dt>Submitted</dt><dd>{dateLabel(item.createdAt)}</dd></div>
    </dl>
    {item.description && <p className="review-description">{item.description}</p>}
    {item.rejectionReason && <div className="review-reason"><strong>Rejection reason</strong><p>{item.rejectionReason}</p></div>}
    {pending && <form className="review-actions" onSubmit={reject}>
      <label className="form-label" htmlFor={`reason-${item._id}`}>Rejection reason <span className="muted">(required to reject)</span></label>
      <textarea id={`reason-${item._id}`} className="form-input" rows={3} maxLength={500} value={reason} disabled={busy} onChange={(event) => { setReason(event.target.value); setValidation(""); }} placeholder="Explain what needs to change…" />
      {validation && <p className="form-error-text" role="alert">{validation}</p>}
      <Button loading={busy} onClick={() => onUpdate(item, { status: isMall ? "APPROVED" : "ACTIVE" })} icon={<Icon name="check" size={17} />}>Approve {isMall ? "mall" : "owner"}</Button>
      <Button type="submit" disabled={busy} variant="outline" className="reject-button">Reject application</Button>
      <p className="panel-hint">{isMall ? "Approval makes this mall visible in the public directory." : "Approval allows this owner to submit malls for review."}</p>
    </form>}
    {active && <div className="review-actions"><Button variant="outline" disabled={busy} onClick={() => onUpdate(item, { status: isMall ? "INACTIVE" : "SUSPENDED" })}>{isMall ? "Deactivate mall" : "Suspend owner"}</Button><p className="panel-hint">{isMall ? "Deactivation removes this mall from public discovery." : "Suspension removes this owner's access to management actions."}</p></div>}
  </aside>;
}

export default function ReviewQueue({ kind = "mall", items, owners = [], busy, onUpdate, all = false }) {
  const isMall = kind === "mall";
  const statuses = isMall ? mallStatuses : ownerStatuses;
  const [status, setStatus] = useState(all ? "ALL" : isMall ? "PENDING" : "PENDING_APPROVAL");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const ownerFor = (item) => owners.find((owner) => owner._id === (item.ownerId?._id || item.ownerId));
  const filtered = items.filter((item) => (status === "ALL" || item.status === status) && [item.name, item.city, item.email, ownerFor(item)?.name].filter(Boolean).join(" ").toLowerCase().includes(search.trim().toLowerCase()));
  const selected = filtered.find((item) => item._id === selectedId) || filtered[0];
  const filters = { ALL: "All", ...statuses };
  return <section className="review-workspace" aria-label={isMall ? "Mall reviews" : "Owner reviews"}>
    <div className="review-queue">
      <div className="section-title-row"><div><h2>{isMall ? all ? "All malls" : "Mall approval queue" : "Owner approvals"}</h2><p>{isMall ? "Review submissions and manage publication." : "Manage who can list malls on ParkEase."}</p></div><span className="count-chip">{filtered.length}</span></div>
      <div className="filter-tabs" aria-label="Filter by status">{Object.entries(filters).map(([value, label]) => <button key={value} type="button" disabled={busy} aria-pressed={status === value} className={status === value ? "selected" : ""} onClick={() => { setStatus(value); setSelectedId(null); }}>{label}</button>)}</div>
      <div className="queue-search"><Input label={isMall ? "Search mall or owner" : "Search owner"} placeholder={isMall ? "Search by name, city or owner" : "Search by name or email"} value={search} disabled={busy} onChange={(event) => setSearch(event.target.value)} icon={<Icon name="search" size={17} />} /></div>
      {filtered.length === 0 ? <EmptyState size="sm" icon={<Icon name="check" size={28} />} title="Nothing to review here" description={search ? "Try another search or choose a different status." : "Applications with this status will appear here."} /> : <div className="review-table-wrap"><table className="review-table"><caption className="sr-only">{isMall ? "Mall applications" : "Owner accounts"}</caption><thead><tr><th>{isMall ? "Mall" : "Owner"}</th><th>Status</th><th>Submitted</th><th><span className="sr-only">Action</span></th></tr></thead><tbody>{filtered.map((item) => <tr key={item._id} className={item._id === selected?._id ? "is-selected" : ""}><td><strong>{item.name}</strong><span>{isMall ? item.city : item.email}</span></td><td><Badge variant={["PENDING", "PENDING_APPROVAL"].includes(item.status) ? "warning" : ["APPROVED", "ACTIVE"].includes(item.status) ? "success" : "neutral"}>{statuses[item.status]}</Badge></td><td>{dateLabel(item.createdAt)}</td><td><Button size="sm" variant={item._id === selected?._id ? "primary" : "outline"} disabled={busy} aria-label={`Review ${item.name}`} aria-pressed={item._id === selected?._id} onClick={() => setSelectedId(item._id)}>Review</Button></td></tr>)}</tbody></table></div>}
      <div className="queue-footer">{filtered.length} {isMall ? "malls" : "accounts"}{status !== "ALL" ? ` · ${filters[status]}` : " · All statuses"}</div>
    </div>
    {selected ? <ReviewDetail key={`${selected._id}-${selected.status}`} item={selected} owner={isMall ? ownerFor(selected) : null} kind={kind} busy={busy} onUpdate={onUpdate} /> : <aside className="review-detail review-placeholder"><Icon name="clipboard" size={36} /><h3>Every detail, in one place.</h3><p>Select an application to review its details and take action.</p></aside>}
  </section>;
}
