export default function FloorRows({ rows, renderBay }) {
  return <div className="floor-rows" tabIndex={0} role="region" aria-label="Parking rows">
    {rows.map((row, rowIndex) => (
      <div className="floor-row" key={rowIndex}>
        {row.map((bay, index) => bay
          ? renderBay(bay, rowIndex, index)
          : <span key={index} className={bay === null ? "floor-gap" : "floor-gap is-filtered"} aria-hidden="true" />)}
      </div>
    ))}
  </div>;
}
