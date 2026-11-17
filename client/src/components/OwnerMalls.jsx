import { useSearchParams } from "react-router-dom";
import Icon from "./Icon.jsx";
import MallIllustration from "./MallIllustration.jsx";
import StatCard from "./StatCard.jsx";
import EmptyState from "./EmptyState.jsx";
import { useEffect, useState } from "react";
import Badge from "./Badge.jsx";
import Button from "./Button.jsx";
import Card from "./Card.jsx";
import Input from "./Input.jsx";
import { sessionRequest } from "../services/authService.js";

const statusLabels = {
  PENDING: "Pending approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  INACTIVE: "Inactive",
};

const formatRate = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

export default function OwnerMalls() {
  const [params] = useSearchParams();
  const view = params.get("view") || "overview";
  const [malls, setMalls] = useState(null);
  const [listError, setListError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    sessionRequest("/malls/owner/my-malls", { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setMalls(data.malls);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setListError(err.message);
      });
    return () => controller.abort();
  }, [reload]);

  async function submit(event) {
    event.preventDefault();
    if (busy || !malls) return;
    const form = event.currentTarget;
    const { rate, ...details } = Object.fromEntries(new FormData(form));
    setSubmitError("");
    setNotice("");
    setBusy(true);
    try {
      const { data } = await sessionRequest("/malls", {
        method: "POST",
        body: { ...details, hourlyRatePaise: Math.round(Number(rate) * 100) },
      });
      setMalls((current) => [data.mall, ...current]);
      setNotice("Mall submitted for approval.");
      form.reset();
    } catch (err) {
      setSubmitError(err.data?.error?.details?.[0]?.issue || err.message);
    } finally { setBusy(false); }
  }

  return (
    <section className="owner-malls" aria-labelledby="my-malls-heading">
      {view === "overview" && <div className="owner-metrics">
        <StatCard label="Your malls" value={malls ? malls.length : "—"} note="All submitted locations" icon={<Icon name="building" />} />
        <StatCard label="Published" value={malls ? malls.filter((mall) => mall.status === "APPROVED").length : "—"} note="Visible to drivers" icon={<Icon name="check" />} />
        <StatCard label="Awaiting review" value={malls ? malls.filter((mall) => mall.status === "PENDING").length : "—"} note="With the ParkEase team" icon={<Icon name="clock" />} />
      </div>}
      <div className="section-title-row"><div><h2 id="my-malls-heading">{view === "submit" ? "Put your mall on the map." : "My malls"}</h2><p>{view === "submit" ? "Add the details drivers need for a smoother arrival." : "Your locations and their publication status."}</p></div>{view !== "submit" && <Button to="/dashboard?view=submit" icon={<Icon name="plus" size={17} />}>Submit a mall</Button>}</div>
      {listError && <div className="error-message" role="alert"><p>{listError}</p><Button size="sm" variant="secondary" onClick={() => { setListError(""); setReload((value) => value + 1); }}>Retry</Button></div>}
      {!malls && !listError && <p role="status">Loading your malls…</p>}
      {view !== "submit" && malls?.length === 0 && <EmptyState icon={<Icon name="building" size={30} />} title="Your first location starts here." description="Submit your mall's details. Once approved, it will appear in the public directory." action={<Button to="/dashboard?view=submit">Add your first mall</Button>} />}
      {view !== "submit" && <div className="owner-location-grid">{malls?.map((mall) => <Card key={mall._id} className="owner-location-card">
        <MallIllustration compact />
        <div className="section-title-row"><h3>{mall.name}</h3><Badge variant={mall.status === "APPROVED" ? "success" : mall.status === "PENDING" ? "warning" : "neutral"}>{statusLabels[mall.status]}</Badge></div>
        <p className="muted">{mall.address}, {mall.city}</p>
        <div className="location-facts"><span><Icon name="clock" size={16} />{mall.openingTime} – {mall.closingTime}</span><strong>{formatRate.format(mall.hourlyRatePaise / 100)} / hr</strong></div>
        {mall.rejectionReason && <div className="review-reason"><strong>Review feedback</strong><p>{mall.rejectionReason}</p></div>}
        {mall.status === "APPROVED" && <Button to={`/dashboard/malls/${mall._id}/inventory`}>Manage parking layout</Button>}
        {mall.status === "APPROVED" && <Button to={`/malls/${mall._id}`} variant="outline" size="sm" icon={<Icon name="arrow" size={16} />}>View public listing</Button>}
      </Card>)}</div>}
      {view === "submit" && <div className="owner-submission-layout"><Card title="Mall details" subtitle="Your listing will be reviewed before it goes live.">
        <form className="owner-mall-form" onSubmit={submit}>
          <Input label="Mall name" name="name" placeholder="e.g. Phoenix Marketcity" required minLength={2} maxLength={120} disabled={busy} />
          <Input label="City" name="city" placeholder="e.g. Pune" required maxLength={80} disabled={busy} />
          <Input label="Street address" name="address" placeholder="Street, area and landmark" required maxLength={250} disabled={busy} />
          <Input label="Description (optional)" name="description" maxLength={500} disabled={busy} />
          <Input label="Hourly parking rate (₹)" name="rate" type="number" required min="0" max="10000" step="0.01" disabled={busy} />
          <div className="form-two-columns"><Input label="Opening time" name="openingTime" type="time" required defaultValue="08:00" disabled={busy} /><Input label="Closing time" name="closingTime" type="time" required defaultValue="23:00" disabled={busy} /></div>
          {submitError && <p className="form-error-text" role="alert">{submitError}</p>}
          {notice && <div className="notice-success" role="status">{notice}<Button to="/dashboard?view=my-malls" variant="ghost" size="sm">View my malls →</Button></div>}
          <Button type="submit" loading={busy} disabled={!malls} icon={<Icon name="arrow" size={17} />}>Submit for approval</Button>
        </form>
      </Card><aside className="submission-guide"><span className="eyebrow">WHAT HAPPENS NEXT</span><h3>A few details.<br />A new destination.</h3><ol><li><strong>Submit your listing</strong><p>Add your location, hours and parking rate.</p></li><li><strong>We review the details</strong><p>An admin checks your submission.</p></li><li><strong>Welcome your visitors</strong><p>Approved malls appear in the public directory.</p></li></ol><MallIllustration compact /></aside></div>}
    </section>
  );
}
