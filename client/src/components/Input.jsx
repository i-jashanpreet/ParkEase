import { useId } from "react";

/**
 * Reusable Input component supporting standard HTML input types,
 * labels, helper text, error states, and icon adornments.
 */
export default function Input({
  label,
  id,
  type = "text",
  placeholder,
  value,
  defaultValue,
  onChange,
  helperText,
  error,
  required = false,
  disabled = false,
  readOnly = false,
  name,
  autoComplete,
  icon = null,
  iconPosition = "left",
  className = "",
  inputClassName = "",
  ...rest
}) {
  const generatedId = useId();
  const inputId = id || `input-${generatedId}`;
  const helperId = helperText ? `${inputId}-helper` : undefined;
  const errorId = error && typeof error === "string" ? `${inputId}-error` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(" ") || undefined;

  const hasError = Boolean(error);
  const isIconLeft = icon && iconPosition === "left";
  const isIconRight = icon && iconPosition === "right";

  const wrapperClass = [
    "form-group",
    hasError ? "form-group-error" : "",
    disabled ? "form-group-disabled" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const fieldClass = [
    "form-input",
    isIconLeft ? "form-input-icon-left" : "",
    isIconRight ? "form-input-icon-right" : "",
    hasError ? "form-input-error" : "",
    inputClassName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={wrapperClass}>
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label}
          {required && <span className="required-star" aria-hidden="true">*</span>}
        </label>
      )}

      <div className="input-wrapper">
        {isIconLeft && (
          <span className="input-icon input-icon-left" aria-hidden="true">
            {icon}
          </span>
        )}

        <input
          id={inputId}
          type={type}
          name={name}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          autoComplete={autoComplete}
          aria-invalid={hasError ? "true" : undefined}
          aria-describedby={describedBy}
          className={fieldClass}
          {...rest}
        />

        {isIconRight && (
          <span className="input-icon input-icon-right" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>

      {hasError && typeof error === "string" && (
        <p id={errorId} className="form-error-text" role="alert">
          {error}
        </p>
      )}

      {!hasError && helperText && (
        <p id={helperId} className="form-helper-text">
          {helperText}
        </p>
      )}
    </div>
  );
}
