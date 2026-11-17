import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Button from "../components/Button.jsx";
import Badge from "../components/Badge.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import Icon from "../components/Icon.jsx";
import Input from "../components/Input.jsx";
import Select from "../components/Select.jsx";
import PageHeader from "../components/PageHeader.jsx";
import PageContainer from "../components/PageContainer.jsx";
import StatCard from "../components/StatCard.jsx";
import Skeleton from "../components/Skeleton.jsx";
import { getMallById } from "../services/mallService.js";
import { getParkingAvailability, SLOT_STATUS } from "../services/parkingService.js";

export default function ParkingAvailabilityPage({ initialMall = null, initialData = null, initialLoading } = {}) {
  const { id } = useParams();
  const mallId = id || initialMall?.id || initialMall?._id;
  const [mall, setMall] = useState(initialMall);
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(initialLoading ?? !initialData);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [floor, setFloor] = useState("ALL");
  const [vehicle, setVehicle] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  useEffect(() => {
    if (initialData && revision === 0) return;
    let cancelled = false;
    Promise.all([initialMall ? Promise.resolve({ mall: initialMall }) : getMallById(mallId), getParkingAvailability(mallId)])
      .then(([mallResult, parkingResult]) => { if (!cancelled) { setMall(mallResult.mall); setData(parkingResult); } })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [mallId, initialMall, initialData, revision]);
  const slots = data?.slots || [];
  const floors = data?.supportedFloors || [];
  const vehicles = data?.supportedVehicleTypes || [];
  const statuses = data?.supportedStatuses || [];
  const filtered = slots.filter((slot) => (floor === "ALL" || slot.floor === floor) && (vehicle === "ALL" || slot.vehicleType === vehicle) && (status === "ALL" || slot.status === status) && `${slot.slotNumber} ${slot.floor} ${slot.vehicleType}`.toLowerCase().includes(search.trim().toLowerCase()));
  const groups = new Map();
  for (const slot of filtered) {
    const level = slot.floor || "General Level";
    if (!groups.has(level)) groups.set(level, []);
    groups.get(level).push(slot);
  }
  const selected = filtered.find((slot) => (slot.id || slot.slotNumber) === selectedId);
  const filteredView = floor !== "ALL" || vehicle !== "ALL" || status !== "ALL" || search;
  const reset = () => { setFloor("ALL"); setVehicle("ALL"); setStatus("ALL"); setSearch(""); };
  const retry = () => { setError(""); setLoading(true); setRevision((value) => value + 1); };
  return <PageContainer><div className="parking-availability-layout">
    <div className="mall-details-topbar"><Button to={mallId ? `/malls/${mallId}` : "/malls"} variant="ghost" size="sm">← Back to Mall Details</Button><Button variant="outline" size="sm" loading={loading} onClick={retry}>Refresh availability</Button></div>
    <PageHeader title="Your spot. Your way." description={mall ? `${mall.name} · ${mall.address || mall.city || ""}` : "Explore parking bays and floor availability."} />
    {error && <ErrorMessage title="Unable to load parking" message={error} onRetry={retry} />}
    {loading && <div aria-busy="true" aria-label="Loading parking availability"><Skeleton height="320px" /></div>}
    {!loading && !error && <>
      {data?.summary?.total > 0 && <div className="parking-summary-grid">{[["Total Capacity", "total"], ["Available Bays", "available"], ["Occupied Bays", "occupied"], ["Reserved Bays", "reserved"]].map(([label, key]) => <StatCard key={key} label={label} value={data.summary[key]} icon={<Icon name={key === "occupied" ? "car" : "building"} />} />)}</div>}
      {slots.length > 0 ? <>
        <div className="parking-filter-bar">
          <Input label="Search Bays" value={search} placeholder="Search by bay number" icon={<Icon name="search" size={16} />} onChange={(event) => setSearch(event.target.value)} />
          {vehicles.length > 0 && <Select label="Vehicle Type" value={vehicle} onChange={(event) => setVehicle(event.target.value)} options={[{ value: "ALL", label: "All Vehicle Types" }, ...vehicles.map((value) => ({ value, label: value }))]} />}
          {statuses.length > 0 && <Select label="Slot Status" value={status} onChange={(event) => setStatus(event.target.value)} options={[{ value: "ALL", label: "All Statuses" }, ...statuses.map((value) => ({ value, label: value }))]} />}
          {filteredView && <Button variant="ghost" size="sm" onClick={reset}>Clear filters</Button>}
        </div>
        <div className="availability-workspace"><section className="bay-map-panel" aria-label="Parking bays by floor">
          <div className="section-title-row"><h2>Explore parking bays</h2><span className="muted">{filtered.length} of {slots.length} bays</span></div>
          <div className="floor-tabs" aria-label="Select Floor / Level"><button aria-pressed={floor === "ALL"} className={floor === "ALL" ? "selected" : ""} onClick={() => setFloor("ALL")}>All floors</button>{floors.map((value) => <button key={value} aria-pressed={floor === value} className={floor === value ? "selected" : ""} onClick={() => setFloor(value)}>{value}</button>)}</div>
          {filtered.length ? <div className="bay-map">{[...groups].map(([level, bays]) => <section className="bay-floor" key={level}><div className="bay-floor-title"><strong>{level}</strong><span>{bays.filter((bay) => bay.status === SLOT_STATUS.AVAILABLE).length} available</span></div><div className="bay-grid">{bays.map((bay) => <button key={bay.id || bay.slotNumber} type="button" className={`bay status-${bay.status.toLowerCase()} ${selected === bay ? "is-selected" : ""}`} aria-label={`Slot ${bay.slotNumber}, Floor ${bay.floor}, Status ${bay.status}`} aria-pressed={selected === bay} onClick={() => setSelectedId(bay.id || bay.slotNumber)}><strong>{bay.slotNumber}</strong><Icon name={bay.status === SLOT_STATUS.OCCUPIED ? "car" : selected === bay ? "check" : "building"} size={26} /><span>{bay.status.toLowerCase()}</span>{bay.isElectric && <small>EV</small>}{bay.isAccessible && <small>Accessible</small>}</button>)}</div></section>)}</div> : <EmptyState title="No Matching Parking Slots" description="Try changing the floor, vehicle type or status filters." action={<Button onClick={reset}>Reset All Filters</Button>} />}
          <div className="map-legend"><span><i />Available</span><span><i className="occupied" />Occupied</span><span><i className="selected" />Selected</span><span><i className="reserved" />Reserved</span><span><i className="maintenance" />Maintenance</span></div>
          <p className="panel-hint">Bays grouped by floor. This is a schematic view, not a navigation map.</p>
        </section><aside className="bay-detail-panel"><span className="eyebrow">{selected ? "YOUR SELECTED BAY" : "TAKE A CLOSER LOOK"}</span>{selected ? <><h2>{selected.slotNumber}</h2><Badge variant={selected.status === "AVAILABLE" ? "success" : "neutral"}>{selected.status}</Badge><dl className="detail-list"><div><dt>Floor</dt><dd>{selected.floor || "General Level"}</dd></div><div><dt>Vehicle</dt><dd>{selected.vehicleType}</dd></div>{typeof selected.hourlyRate === "number" && <div><dt>Hourly rate</dt><dd>₹{selected.hourlyRate}/hr</dd></div>}{selected.isElectric && <div><dt>Charging</dt><dd>EV available</dd></div>}{selected.isAccessible && <div><dt>Access</dt><dd>Accessible bay</dd></div>}</dl><Button variant="outline" size="sm" onClick={() => setSelectedId(null)}>Clear selection</Button></> : <><div className="bay-detail-icon"><Icon name="car" size={42} /></div><h2>A space for your visit.</h2><p>Select a bay to see its status, vehicle type, and available facilities.</p></>}<div className="coming-soon-note"><Icon name="clock" size={18} /><div><strong>Reservations are coming next</strong><p>Bay selection is for viewing details. Booking is not available yet.</p></div></div></aside></div>
      </> : <EmptyState icon={<Icon name="car" size={32} />} title="Parking Availability Unavailable" description={data?.isPendingBackend ? "Parking availability is not connected yet. You can still explore this mall's location, hours and parking rate." : "No parking slots are currently registered for this mall facility."} action={<Button to={mallId ? `/malls/${mallId}` : "/malls"} variant="outline">Return to Mall Profile</Button>} />}
    </>}
  </div></PageContainer>;
}
