/**
 * Reusable PageContainer component providing consistent layout spacing,
 * header typography, and optional descriptive copy.
 */
export default function PageContainer({
  eyebrow,
  title,
  description,
  actions,
  children,
  className = "",
}) {
  return (
    <section className={`container simple-page ${className}`.trim()}>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      {title && <h1>{title}</h1>}
      {description && <p className="page-description">{description}</p>}
      {actions && <div className="page-actions">{actions}</div>}
      {children}
    </section>
  );
}
