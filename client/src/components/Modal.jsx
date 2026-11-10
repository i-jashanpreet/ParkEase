import { useEffect, useId } from "react";
import { createPortal } from "react-dom";

/**
 * Reusable Modal component providing an accessible dialog overlay
 * with header title, description, body content, actions footer,
 * backdrop dismissal, and keyboard escape handling.
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  actions,
  size = "md",
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
  className = "",
}) {
  const generatedId = useId();
  const titleId = `modal-title-${generatedId}`;
  const descId = `modal-desc-${generatedId}`;

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (closeOnEscape && e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) return null;

  const sizeClass = `modal-${size}`;
  const modalContent = (
    <div
      className="modal-backdrop"
      onClick={closeOnBackdrop ? () => onClose?.() : undefined}
      aria-hidden="true"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        className={`modal-container ${sizeClass} ${className}`.trim()}
        onClick={(e) => e.stopPropagation()}
        aria-hidden="false"
      >
        <div className="modal-header">
          <div className="modal-title-group">
            {title && (
              <h2 id={titleId} className="modal-title">
                {title}
              </h2>
            )}
            {description && (
              <p id={descId} className="modal-description">
                {description}
              </p>
            )}
          </div>

          {showCloseButton && (
            <button
              type="button"
              className="modal-close-button"
              onClick={() => onClose?.()}
              aria-label="Close dialog"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M18 6L6 18M6 6L18 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>

        <div className="modal-body">{children}</div>

        {actions && <div className="modal-footer">{actions}</div>}
      </div>
    </div>
  );

  if (typeof document !== "undefined" && document.body) {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
}
