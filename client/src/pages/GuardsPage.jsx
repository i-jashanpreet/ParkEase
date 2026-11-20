import { useEffect, useState } from "react";
import useAuth from "../hooks/useAuth.js";
import { sessionRequest } from "../services/authService.js";
import { getMalls } from "../services/mallService.js";
import { assignGuard, createGuard, listMallGuards, updateAssignment } from "../services/guardService.js";
import PageHeader from "../components/PageHeader.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";

export default function GuardsPage() {
  const { user } = useAuth();
  const [malls, setMalls] = useState([]);
  const [mallId, setMallId] = useState("");
  const [guards, setGuards] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const source = user?.role === "ADMIN" ? getMalls() : sessionRequest("/malls/owner/my-malls");
    source.then((result) => {
      const list = user?.role === "ADMIN" ? result.malls : result.data.malls;
      if (active) setMalls(list.filter((mall) => mall.status === "APPROVED"));
    }).catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [user?._id, user?.role]);

  async function refresh() {
    if (!mallId) return;
    setError("");
    try { setGuards(await listMallGuards(mallId)); }
    catch (err) { setError(err.message); }
  }

  useEffect(() => {
    if (!mallId) return;
    let active = true;
    listMallGuards(mallId).then((list) => { if (active) setGuards(list); })
      .catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [mallId]);

  async function submit(event, mode) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (mode === "create") await createGuard(mallId, fields);
      else await assignGuard(mallId, fields);
      event.currentTarget.reset();
      setNotice(mode === "create" ? "Guard created. Share the temporary password securely; it will not be shown again." : "Guard assigned.");
      await refresh();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function toggle(assignment) {
    setBusy(true); setError("");
    try { await updateAssignment(assignment.id, { isActive: !assignment.isActive, gateLabel: assignment.gateLabel }); await refresh(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return <div className="dashboard-content-grid">
    <PageHeader title="Guards" description="Manage guards for an approved mall." />
    {error && <p className="form-error-text" role="alert">{error} <Button onClick={refresh}>Retry</Button></p>}
    {notice && <p role="status">{notice}</p>}
    <label>Selected mall <select value={mallId} onChange={(event) => { setMallId(event.target.value); setGuards([]); }}>
      <option value="">Choose a mall</option>{malls.map((mall) => <option key={mall._id} value={mall._id}>{mall.name}</option>)}
    </select></label>
    {mallId && <>
      <Card title="Assigned guards">{guards.length === 0 ? <p>No guards assigned.</p> : guards.map(({ user: guard, assignment }) => <div key={assignment.id} className="section-title-row">
        <span>{guard?.name} ({guard?.email}) · {assignment.gateLabel || "Gate not labeled"} · {assignment.isActive ? "Active" : "Inactive"}</span>
        <Button disabled={busy} onClick={() => toggle(assignment)}>{assignment.isActive ? "Deactivate" : "Activate"}</Button>
      </div>)}</Card>
      <Card title="Create guard"><form onSubmit={(event) => submit(event, "create")} className="auth-form">
        <label>Full name<input name="name" required /></label><label>Email<input name="email" type="email" required /></label>
        <label>Phone<input name="phone" /></label><label>Temporary password<input name="initialPassword" type="password" required autoComplete="new-password" /></label>
        <label>Gate label<input name="gateLabel" /></label><p>Give the password directly to the guard through a secure channel.</p>
        <Button type="submit" disabled={busy}>Create guard</Button>
      </form></Card>
      <Card title="Assign existing guard"><form onSubmit={(event) => submit(event, "assign")} className="auth-form">
        <label>Guard ID<input name="guardId" required /></label><label>Gate label<input name="gateLabel" /></label>
        <Button type="submit" disabled={busy}>Assign guard</Button>
      </form></Card>
    </>}
  </div>;
}
