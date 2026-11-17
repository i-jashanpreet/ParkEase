import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Button from "../components/Button.jsx";
import Card from "../components/Card.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import FloorRows from "../components/FloorRows.jsx";
import Input from "../components/Input.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Select from "../components/Select.jsx";
import { sessionRequest } from "../services/authService.js";

const vehicles = [{ value: "CAR", label: "Car" }, { value: "BIKE", label: "Bike" }];

export default function InventoryPage() {
  const { id } = useParams();
  const endpoint = `/malls/${id}/inventory`;
  const [saved, setSaved] = useState(null);
  const [draft, setDraft] = useState(null);
  const [floorIndex, setFloorIndex] = useState(0);
  const [selection, setSelection] = useState(null);
  const [mode, setMode] = useState("edit");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    sessionRequest(endpoint, { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        setSaved(data);
        setDraft(data.draft);
      })
      .catch((err) => { if (!controller.signal.aborted) setError(err.message); });
    return () => controller.abort();
  }, [endpoint, reload]);

  const layout = mode === "operations" ? saved?.published : draft;
  const floor = layout?.floors[floorIndex];
  const liveStatuses = new Map(
    saved?.published.floors.flatMap((entry) => entry.rows.flat().filter(Boolean).map((bay) => [bay.id, bay.status])),
  );
  const bay = selection && floor?.rows[selection.row]?.[selection.index];

  function changeFloor(index) {
    setFloorIndex(index);
    setSelection(null);
  }

  function editRows(action) {
    setDraft((current) => ({
      floors: current.floors.map((entry, index) => index === floorIndex
        ? { ...entry, rows: action(entry.rows) }
        : entry),
    }));
  }

  function editRow(action) {
    editRows((rows) => rows.map((row, index) => index === selection.row ? action(row) : row));
  }

  function updateBay(patch) {
    editRow((row) => row.map((entry, index) => index === selection.index ? { ...entry, ...patch } : entry));
  }

  function addFloor(event) {
    event.preventDefault();
    const name = new FormData(event.currentTarget).get("name").trim();
    if (!name || draft.floors.some((entry) => entry.name.toUpperCase() === name.toUpperCase())) {
      setError("Enter a unique floor name.");
      return;
    }
    setError("");
    setDraft({ floors: [...draft.floors, { name, rows: [] }] });
    changeFloor(draft.floors.length);
    event.currentTarget.reset();
  }

  function addRow(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const prefix = form.get("prefix").trim().toUpperCase();
    const start = form.get("start").trim();
    const count = Number(form.get("count"));
    const codes = new Set(floor.rows.flat().filter(Boolean).map((entry) => entry.code.toUpperCase()));
    const row = Array.from({ length: count }, (_, index) => ({
      id: crypto.randomUUID(),
      code: prefix + String(Number(start) + index).padStart(start.length, "0"),
      vehicleType: form.get("vehicleType"),
      accessible: false,
      electric: false,
    }));
    if (row.some((entry) => codes.has(entry.code))) {
      setError("This row overlaps existing bay codes. Choose a different prefix or starting number.");
      return;
    }
    setError("");
    editRows((rows) => [...rows, row]);
    setSelection({ row: floor.rows.length, index: 0 });
  }

  async function save(path, method, body, message) {
    if (busy || !saved) return;
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const { data } = await sessionRequest(endpoint + path, { method, body: { ...body, revision: saved.revision } });
      setSaved(data);
      if (method === "PUT") setDraft(data.draft);
      setNotice(message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function reloadInventory() {
    if (saved && draft !== saved.draft && !window.confirm("Discard unsaved layout changes?")) return;
    setError("");
    setNotice("");
    setSaved(null);
    changeFloor(0);
    setReload((value) => value + 1);
  }

  return <div className="dashboard-content-grid">
    <PageHeader title={saved ? `Parking layout · ${saved.name}` : "Parking layout"} description="Build a floor row by row, preview it, then publish it for drivers." actions={<Button to="/dashboard?view=my-malls" variant="outline">My malls</Button>} />
    {error && <ErrorMessage message={error} />}
    {notice && <p className="notice-success" role="status">{notice}</p>}
    {!saved && (error ? <Button onClick={reloadInventory}>Try again</Button> : <p role="status">Loading inventory…</p>)}
    {saved && <fieldset className="inventory-workspace" disabled={busy}>
      <legend className="sr-only">Parking inventory tools</legend>
      <div className="inventory-actions">
        <div className="floor-tabs" aria-label="Inventory view">
          {[["edit", "Edit draft"], ["preview", "Driver preview"], ["operations", "Published bays"]].map(([value, name]) => (
            <button type="button" key={value} className={mode === value ? "selected" : ""} aria-pressed={mode === value} onClick={() => { setMode(value); changeFloor(0); }}>{name}</button>
          ))}
        </div>
        {saved.draft !== draft && <span className="muted">Unsaved draft changes</span>}
        <Button variant="ghost" onClick={reloadInventory}>Reload</Button>
        {mode !== "operations" && <>
          <Button variant="outline" onClick={() => save("/draft", "PUT", { layout: draft }, "Draft saved.")}>Save draft</Button>
          <Button onClick={() => save("/published", "PUT", { layout: draft }, "Layout published.")}>Publish layout</Button>
        </>}
      </div>
      <div className="availability-workspace">
        <section className="bay-map-panel">
          <h2>{mode === "operations" ? "Published layout" : "Floor layout"}</h2>
          <div className="floor-tabs" aria-label="Floors">
            {layout.floors.map((entry, index) => <button type="button" key={index} aria-pressed={index === floorIndex} className={index === floorIndex ? "selected" : ""} onClick={() => changeFloor(index)}>{entry.name}</button>)}
          </div>
          {floor?.rows.length > 0 ? <div className="bay-map"><FloorRows rows={floor.rows} renderBay={(entry, row, index) => {
            const bayStatus = mode === "preview" ? liveStatuses.get(entry.id) : entry.status;
            return (
            <button type="button" key={entry.id} className={`bay ${bayStatus === "MAINTENANCE" ? "status-maintenance" : ""} ${bay?.id === entry.id ? "is-selected" : ""}`} aria-pressed={bay?.id === entry.id} onClick={() => setSelection({ row, index })}>
              <strong>{entry.code || "Unnamed"}</strong>
              <span>{bayStatus === "MAINTENANCE" ? "Maintenance" : entry.vehicleType}</span>
              {entry.accessible && <small>Accessible</small>}
              {entry.electric && <small>EV</small>}
            </button>
            );
          }} /></div> : <p>{mode === "operations" ? "Publish a layout to manage bay availability." : "Add a floor and generate your first row."}</p>}
          <p className="panel-hint">Schematic layout. Gaps show space between bays.</p>
        </section>
        <div className="inventory-sidebar">
          {mode === "edit" && <>
            <Card title="Add floor">
              <form className="inventory-form" onSubmit={addFloor}>
                <Input name="name" label="Floor name" placeholder="e.g. B1" maxLength={24} required />
                <Button type="submit" variant="outline">Add floor</Button>
              </form>
            </Card>
            {floor && <Card title={`Add row to ${floor.name}`}>
              <form className="inventory-form" onSubmit={addRow}>
                <Input name="prefix" label="Bay prefix" defaultValue="A" maxLength={12} pattern="[A-Za-z0-9_\-]+" required />
                <Input name="start" label="Starting number" defaultValue="01" maxLength={5} pattern="[0-9]+" required />
                <Input name="count" label="Number of bays" type="number" min="1" max="60" step="1" defaultValue="12" required />
                <Select name="vehicleType" label="Vehicle type" options={vehicles} />
                <Button type="submit">Generate row</Button>
                <Button variant="outline" onClick={() => {
                  setDraft({ floors: draft.floors.filter((_, index) => index !== floorIndex) });
                  changeFloor(0);
                }}>Remove this floor from draft</Button>
              </form>
            </Card>}
          </>}
          {bay && <Card title={mode === "edit" ? "Edit selected bay" : bay.code}>
            {mode === "edit" ? <div className="inventory-form">
              <Input label="Bay code" value={bay.code} maxLength={24} onChange={(event) => updateBay({ code: event.target.value })} />
              <Select label="Vehicle type" options={vehicles} value={bay.vehicleType} onChange={(event) => updateBay({ vehicleType: event.target.value })} />
              <label><input type="checkbox" checked={bay.accessible} onChange={(event) => updateBay({ accessible: event.target.checked })} /> Accessible</label>
              <label><input type="checkbox" checked={bay.electric} onChange={(event) => updateBay({ electric: event.target.checked })} /> EV charging</label>
              <Button variant="outline" onClick={() => editRow((row) => [...row.slice(0, selection.index + 1), null, ...row.slice(selection.index + 1)])}>Insert gap after bay</Button>
              {floor.rows[selection.row][selection.index + 1] === null && <Button variant="ghost" onClick={() => editRow((row) => row.filter((_, index) => index !== selection.index + 1))}>Remove next gap</Button>}
              <Button variant="outline" onClick={() => { editRow((row) => row.filter((_, index) => index !== selection.index)); setSelection(null); }}>Remove bay from draft</Button>
            </div> : <div className="inventory-form">
              <p>{bay.vehicleType}{bay.accessible ? " · Accessible" : ""}{bay.electric ? " · EV charging" : ""}</p>
              {mode === "operations" && <>
                <p>{bay.status === "MAINTENANCE" ? "Under maintenance" : "Available"}</p>
                <Button onClick={() => {
                  const status = bay.status === "MAINTENANCE" ? "AVAILABLE" : "MAINTENANCE";
                  save(`/bays/${bay.id}`, "PATCH", { status }, `${bay.code} is now ${status === "AVAILABLE" ? "available" : "under maintenance"}.`);
                }}>{bay.status === "MAINTENANCE" ? "Reopen bay" : "Mark under maintenance"}</Button>
              </>}
            </div>}
          </Card>}
        </div>
      </div>
    </fieldset>}
  </div>;
}
