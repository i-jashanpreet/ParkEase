import { Link } from "react-router-dom";

/**
 * Reusable Button component supporting multiple visual variants,
 * sizes, and rendering as either <button>, <Link>, or <a>.
 */
export default function Button({
  children,
  variant = "primary",
  size = "md",
  to,
  href,
  onClick,
  type = "button",
  disabled = false,
  className = "",
  icon = null,
  iconPosition = "right",
  ...rest
}) {
  const variantClass = `button-${variant}`;
  const sizeClass = size !== "md" ? `button-${size}` : "";
  const combinedClass = ["button", variantClass, sizeClass, className]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {icon && iconPosition === "left" && (
        <span className="button-icon-left" aria-hidden="true">
          {icon}
        </span>
      )}
      <span>{children}</span>
      {icon && iconPosition === "right" && (
        <span className="button-icon-right" aria-hidden="true">
          {icon}
        </span>
      )}
    </>
  );

  if (to && !disabled) {
    return (
      <Link to={to} className={combinedClass} {...rest}>
        {content}
      </Link>
    );
  }

  if (href && !disabled) {
    return (
      <a href={href} className={combinedClass} {...rest}>
        {content}
      </a>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={combinedClass}
      {...rest}
    >
      {content}
    </button>
  );
}
