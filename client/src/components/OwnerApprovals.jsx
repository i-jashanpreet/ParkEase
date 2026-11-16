import { useEffect, useState } from "react";
import { sessionRequest } from "../services/authSession.js";

const statuses = {
  PENDING_APPROVAL: "Pending approval",
  ACTIVE: "Active",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
};

function OwnerActions({ owner, update, busy }) {
  if (owner.status === "PENDING_APPROVAL") {
    return (
      <form className="owner-actions" onSubmit={(event) => {
        event.preventDefault();
        const rejectionReason = new FormData(event.currentTarget).get("reason").trim();
        update(owner, { status: "REJECTED", rejectionReason });
      }}>
        <button type="button" className="button button-small" disabled={busy} onClick={() => update(owner, { status: "ACTIVE" })}>Approve</button>
        <label>Rejection reason<input name="reason" maxLength={500} required disabled={busy} /></label>
        <button className="button button-small secondary" disabled={busy}>Reject</button>
      </form>
    );
  }
  if (owner.status === "ACTIVE") {
    return <button className="button button-small secondary" disabled={busy} onClick={() => update(owner, { status: "SUSPENDED" })}>Suspend</button>;
  }
  return owner.rejectionReason ? <p>Reason: {owner.rejectionReason}</p> : null;
}

function OwnerList({ filter }) {
  const [owners, setOwners] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    sessionRequest(`/admin/mall-owners?status=${filter}`, { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setOwners(data.mallOwners);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      });
    return () => controller.abort();
  }, [filter, reload]);

  async function update(owner, body) {
    if (busy) return;
    setError("");
    setNotice("");
    if (body.status === "REJECTED" && !body.rejectionReason) {
      setError("Enter a rejection reason.");
      return;
    }
    setBusy(true);
    try {
      const { data } = await sessionRequest(`/admin/mall-owners/${owner._id}/status`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setOwners((current) => current.filter((item) => item._id !== owner._id));
      setNotice(`${owner.name} · ${statuses[data.user.status]}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="button button-small secondary" disabled={busy} onClick={() => {
        setOwners(null);
        setError("");
        setReload((value) => value + 1);
      }}>Refresh list</button>
      {notice && <p role="status">{notice}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {!owners && !error && <p role="status">Loading mall owners…</p>}
      {owners?.length === 0 && <p>No mall owners with this status.</p>}
      {owners?.map((owner) => (
        <article key={owner._id} className="owner-card">
          <h3>{owner.name}</h3>
          <p>{owner.email}</p>
          <OwnerActions owner={owner} busy={busy} update={update} />
        </article>
      ))}
    </>
  );
}

export default function OwnerApprovals() {
  const [filter, setFilter] = useState("PENDING_APPROVAL");
  return (
    <section className="approval-panel" aria-labelledby="owner-heading">
      <h2 id="owner-heading">Mall-owner accounts</h2>
      <label>Account status
        <select value={filter} onChange={(event) => setFilter(event.target.value)}>
          {Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <OwnerList key={filter} filter={filter} />
    </section>
  );
}
