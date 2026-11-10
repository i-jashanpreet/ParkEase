/**
 * Reusable PageHeader component for consistent page titles,
 * descriptive subtitles, category eyebrows, and contextual action buttons.
 */
export default function PageHeader({
  title,
  description,
  eyebrow,
  badge = null,
  actions = null,
  breadcrumbs = null,
  className = "",
  children = null,
  ...rest
}) {
  const combinedClass = ["page-header", className].filter(Boolean).join(" ");

  return (
    <header className={combinedClass} {...rest}>
      {breadcrumbs && <div className="page-header-breadcrumbs">{breadcrumbs}</div>}

      <div className="page-header-main">
        <div className="page-header-content">
          {(eyebrow || badge) && (
            <div className="page-header-eyebrow-row">
              {eyebrow && <span className="eyebrow">{eyebrow}</span>}
              {badge}
            </div>
          )}

          {title && <h1 className="page-header-title">{title}</h1>}

          {description && (
            <p className="page-header-description">{description}</p>
          )}

          {children}
        </div>

        {actions && <div className="page-header-actions">{actions}</div>}
      </div>
    </header>
  );
}
