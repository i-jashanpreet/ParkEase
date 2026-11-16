import Button from "./Button.jsx";
import Card from "./Card.jsx";
import Input from "./Input.jsx";
import Select from "./Select.jsx";
import { useEffect, useState } from "react";
import { sessionRequest } from "../services/authService.js";

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
        <Button type="button" size="sm" disabled={busy} onClick={() => update(owner, { status: "ACTIVE" })}>Approve</Button>
        <Input label="Rejection reason" name="reason" maxLength={500} required disabled={busy} />
        <Button type="submit" variant="secondary" size="sm" disabled={busy}>Reject</Button>
      </form>
    );
  }
  if (owner.status === "ACTIVE") {
    return <Button variant="secondary" size="sm" disabled={busy} onClick={() => update(owner, { status: "SUSPENDED" })}>Suspend</Button>;
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
        body,
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
      <Button variant="secondary" size="sm" disabled={busy} onClick={() => {
        setOwners(null);
        setError("");
        setReload((value) => value + 1);
      }}>Refresh list</Button>
      {notice && <p role="status">{notice}</p>}
      {error && <p className="form-error-text" role="alert">{error}</p>}
      {!owners && !error && <p role="status">Loading mall owners…</p>}
      {owners?.length === 0 && <p>No mall owners with this status.</p>}
      {owners?.map((owner) => (
        <Card key={owner._id} title={owner.name} subtitle={owner.email}>
          <OwnerActions owner={owner} busy={busy} update={update} />
        </Card>
      ))}
    </>
  );
}

export default function OwnerApprovals() {
  const [filter, setFilter] = useState("PENDING_APPROVAL");
  return (
    <section className="approval-panel" aria-labelledby="owner-heading">
      <h2 id="owner-heading">Mall-owner accounts</h2>
      <Select label="Account status" value={filter} onChange={(event) => setFilter(event.target.value)}
        options={Object.entries(statuses).map(([value, label]) => ({ value, label }))} />
      <OwnerList key={filter} filter={filter} />
    </section>
  );
}
