import { useId } from "react";

/**
 * Reusable Select component supporting options arrays or children,
 * placeholder prompts, error indicators, and disabled states.
 */
export default function Select({
  label,
  id,
  options = [],
  placeholder,
  value,
  defaultValue,
  onChange,
  helperText,
  error,
  required = false,
  disabled = false,
  name,
  className = "",
  selectClassName = "",
  children,
  ...rest
}) {
  const generatedId = useId();
  const selectId = id || `select-${generatedId}`;
  const helperId = helperText ? `${selectId}-helper` : undefined;
  const errorId = error && typeof error === "string" ? `${selectId}-error` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(" ") || undefined;

  const hasError = Boolean(error);

  const wrapperClass = [
    "form-group",
    hasError ? "form-group-error" : "",
    disabled ? "form-group-disabled" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const fieldClass = [
    "form-select",
    hasError ? "form-select-error" : "",
    selectClassName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={wrapperClass}>
      {label && (
        <label htmlFor={selectId} className="form-label">
          {label}
          {required && <span className="required-star" aria-hidden="true">*</span>}
        </label>
      )}

      <div className="select-wrapper">
        <select
          id={selectId}
          name={name}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          required={required}
          disabled={disabled}
          aria-invalid={hasError ? "true" : undefined}
          aria-describedby={describedBy}
          className={fieldClass}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}

          {options.length > 0
            ? options.map((opt) => {
                const optValue = typeof opt === "object" ? opt.value : opt;
                const optLabel = typeof opt === "object" ? opt.label : opt;
                const optDisabled = typeof opt === "object" ? opt.disabled : false;

                return (
                  <option key={String(optValue)} value={optValue} disabled={optDisabled}>
                    {optLabel}
                  </option>
                );
              })
            : children}
        </select>

        <span className="select-chevron" aria-hidden="true">
          <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M5 7.5L10 12.5L15 7.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
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
