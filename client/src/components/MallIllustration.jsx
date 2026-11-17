export default function MallIllustration({ compact = false }) {
  return <div className={`mall-illustration ${compact ? "compact" : ""}`} aria-hidden="true">
    <div className="mall-tree tree-left" /><div className="mall-building"><span /><span /><span /><b>ParkEase</b><i /><i /><i /></div><div className="mall-tree tree-right" /><div className="mall-ground" />
  </div>;
}
