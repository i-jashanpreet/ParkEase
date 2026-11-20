import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { sessionRequest } from "../services/authService.js";
import PageHeader from "../components/PageHeader.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";

export default function EditMallPage() {
  const { id } = useParams();
  const [mall, setMall] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    sessionRequest("/malls/owner/my-malls").then(({ data }) => {
      if (active) {
        const found = data.malls.find((item) => item._id === id);
        if (found?.status === "APPROVED") setMall(found);
        else setError("This approved mall is not available in your account.");
      }
    }).catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [id]);

  async function save(event) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const { rate, ...fields } = values;
    const next = { ...fields, hourlyRatePaise: Math.round(Number(rate) * 100) };
    const body = Object.fromEntries(Object.entries(next).filter(([field, value]) => value !== (mall[field] ?? "")));
    if (!Object.keys(body).length) { setBusy(false); setNotice("No changes to save."); return; }
    try {
      const { data } = await sessionRequest(`/malls/${encodeURIComponent(id)}`, { method: "PATCH", body });
      setMall(data.mall);
      setNotice(data.mall.status === "PENDING" ? "Saved. Listing changes now await review." : "Mall updated. New rates apply to future bookings; existing rate snapshots stay unchanged.");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return <div className="dashboard-content-grid">
    <PageHeader title="Edit mall listing" description="Changes to the mall name or address may require another approval." />
    {error && <p role="alert" className="form-error-text">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {!mall && !error && <p role="status">Loading mall…</p>}
    {mall && <Card title={mall.name}><form key={mall._id} onSubmit={save} className="owner-mall-form">
      <label>Mall name<input name="name" required defaultValue={mall.name} /></label>
      <label>City<input name="city" required defaultValue={mall.city} /></label>
      <label>Address<input name="address" required defaultValue={mall.address} /></label>
      <label>Description<input name="description" defaultValue={mall.description || ""} /></label>
      <label>Opens (IST)<input name="openingTime" type="time" required defaultValue={mall.openingTime} /></label>
      <label>Closes (IST)<input name="closingTime" type="time" required defaultValue={mall.closingTime} /></label>
      <label>Hourly rate (₹)<input name="rate" type="number" min="0" max="10000" step="0.01" required defaultValue={mall.hourlyRatePaise / 100} /></label>
      <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
    </form></Card>}
    <Link to="/dashboard?view=my-malls">Back to My malls</Link>
  </div>;
}
