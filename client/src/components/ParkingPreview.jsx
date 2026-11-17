import Icon from "./Icon.jsx";

/** Decorative illustration only; never represents a mall's actual availability. */
export default function ParkingPreview() {
  return <div className="parking-preview" aria-label="Illustrative parking layout, not live availability">
    <div className="preview-top"><span><span className="preview-dot" /> A smoother arrival</span><span>B1 / LEVEL</span></div>
    <div className="preview-bays">{[1, 2, 3, 4, 5].map((bay) => <div key={bay} className={`preview-bay ${bay === 3 ? "has-car" : ""}`}><span>A0{bay}</span>{bay === 3 && <Icon name="car" size={32} />}</div>)}</div>
    <div className="preview-road"><span>ENTRY</span><i /><Icon name="arrow" /><i /><Icon name="arrow" /></div>
    <div className="preview-bays">{[6, 7, 8, 9, 10].map((bay) => <div key={bay} className={`preview-bay ${bay === 8 ? "selected-bay" : bay === 6 ? "has-car" : ""}`}><span>A{String(bay).padStart(2, "0")}</span>{bay === 8 ? <Icon name="check" size={24} /> : bay === 6 ? <Icon name="car" size={32} /> : null}</div>)}</div>
    <div className="preview-bottom"><span>Less searching. More arriving.</span><span>Illustration</span></div>
  </div>;
}
