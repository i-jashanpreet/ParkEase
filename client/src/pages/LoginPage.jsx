import { useState } from "react";
import { Link } from "react-router-dom";
import Input from "../components/Input.jsx";
import Button from "../components/Button.jsx";
import Modal from "../components/Modal.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import Badge from "../components/Badge.jsx";
import { validateLoginForm } from "../utils/validation.js";

/**
 * LoginPage: Complete authentication login UI with client-side validation,
 * password visibility toggling, accessible error handling, and placeholder boundary responses.
 */
export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Clear field-level error on change
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }

    if (statusMessage) {
      setStatusMessage(null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatusMessage(null);

    const { isValid, errors: validationErrors } = validateLoginForm(formData);
    if (!isValid) {
      setErrors(validationErrors);
      return;
    }

    // Client-side validation passed.
    // In accordance with Milestone 4 boundaries, do not connect to backend or store fake tokens.
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStatusMessage({
        type: "success",
        title: "Validation Successful",
        body: "All inputs verified. Backend authentication integration (Sprint 2) will be connected in Milestone 5.",
      });
    }, 600);
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card-container">
        <div className="auth-card">
          {/* Header & Branding */}
          <div className="auth-header">
            <Link to="/" className="brand auth-brand">
              <span className="brand-mark" aria-hidden="true">
                P
              </span>
              ParkEase<span className="brand-dot">.</span>
            </Link>
            <h1 className="auth-title">Welcome back</h1>
            <p className="auth-subtitle">
              Sign in to manage parking reservations and explore available mall slots.
            </p>
          </div>

          {/* Form-level Error Message */}
          {errors.form && (
            <ErrorMessage
              message={errors.form}
              onDismiss={() =>
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.form;
                  return next;
                })
              }
              style={{ marginBottom: "16px" }}
            />
          )}

          {/* Temporary Milestone Boundary Response */}
          {statusMessage && (
            <div
              className={`auth-status-banner ${statusMessage.type}`}
              role="status"
              style={{ marginBottom: "16px" }}
            >
              <div>
                <strong>{statusMessage.title}: </strong>
                <span>{statusMessage.body}</span>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <Input
              label="Email Address"
              id="login-email"
              name="email"
              type="email"
              placeholder="name@example.com"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              autoComplete="email"
              required
              disabled={isLoading}
            />

            <Input
              label="Password"
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              autoComplete="current-password"
              required
              disabled={isLoading}
              endAdornment={
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      aria-hidden="true"
                    >
                      <path
                        d="M3 3L17 17M8.5 8.5C8.19 8.81 8 9.24 8 9.71C8 10.79 8.88 11.66 9.96 11.66C10.43 11.66 10.86 11.47 11.17 11.16M14.07 14.07C12.87 14.77 11.48 15.17 10 15.17C5.83 15.17 2.27 12.39 1 8.5C1.84 5.92 3.75 3.86 6.18 2.82M9.99 1.83C11.47 1.83 12.86 2.23 14.06 2.93C16.49 4.35 18.23 6.8 19 8.5C18.42 9.8 17.5 11.08 16.32 12.16"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      aria-hidden="true"
                    >
                      <path
                        d="M1 10C1 10 4.27 3.5 10 3.5C15.73 3.5 19 10 19 10C19 10 15.73 16.5 10 16.5C4.27 16.5 1 10 1 10Z"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx="10"
                        cy="10"
                        r="3"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              }
            />

            <div className="auth-options-row">
              <label className="checkbox-control">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="checkbox-input"
                  disabled={isLoading}
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                className="auth-text-link"
                onClick={() => setForgotModalOpen(true)}
                disabled={isLoading}
              >
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              variant="accent"
              size="lg"
              loading={isLoading}
              className="auth-submit-btn"
            >
              Sign In
            </Button>
          </form>

          {/* Footer link to Registration */}
          <div className="auth-footer">
            <p>
              Don&apos;t have an account?{" "}
              <Link to="/register">Create an account</Link>
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Informational Modal */}
      <Modal
        isOpen={forgotModalOpen}
        onClose={() => setForgotModalOpen(false)}
        title="Forgot Password"
        description="Password reset workflows are planned for the backend identity module."
        actions={
          <Button variant="secondary" onClick={() => setForgotModalOpen(false)}>
            Close
          </Button>
        }
      >
        <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", lineHeight: "1.6" }}>
          In the upcoming identity and authentication milestone, registered users will be
          able to initiate secure email password recovery. During this layout milestone,
          no credential reset flow is live.
        </p>
        <div style={{ marginTop: "16px" }}>
          <Badge variant="neutral">Sprint 2 Planned</Badge>
        </div>
      </Modal>
    </div>
  );
}
