export default function PageContainer({ eyebrow, title, children }) {
  return (
    <section className="container simple-page">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1>{title}</h1>
      {children}
    </section>
  );
}
