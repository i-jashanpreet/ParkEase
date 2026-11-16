/**
 * Reusable Card component for framing content, metrics, forms, and lists.
 * Supports title/subtitle headers, custom header and footer slots,
 * padding variations, and hoverable elevation.
 */
export default function Card({
  title,
  subtitle,
  header,
  footer,
  children,
  variant = "default",
  padding = "md",
  hoverable = false,
  onClick,
  className = "",
  ...rest
}) {
  const variantClass = `card-${variant}`;
  const paddingClass = padding !== "md" ? `card-padding-${padding}` : "";
  const hoverClass = hoverable || onClick ? "card-hoverable" : "";

  const cardClasses = [
    "card",
    variantClass,
    paddingClass,
    hoverClass,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const hasHeader = Boolean(header || title || subtitle);

  return (
    <article
      className={cardClasses}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
      {...rest}
    >
      {hasHeader && (
        <div className="card-header">
          {header || (
            <div className="card-heading-group">
              {title && <h3 className="card-title">{title}</h3>}
              {subtitle && <p className="card-subtitle">{subtitle}</p>}
            </div>
          )}
        </div>
      )}

      <div className="card-body">{children}</div>

      {footer && <div className="card-footer">{footer}</div>}
    </article>
  );
}

function CardHeader({ children, className = "", ...rest }) {
  return (
    <div className={`card-header ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}

function CardBody({ children, className = "", ...rest }) {
  return (
    <div className={`card-body ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}

function CardFooter({ children, className = "", ...rest }) {
  return (
    <div className={`card-footer ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;
