import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Input from "../components/Input.jsx";
import Button from "../components/Button.jsx";
import Modal from "../components/Modal.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import Badge from "../components/Badge.jsx";
import { validateRegisterForm } from "../utils/validation.js";
import useAuth from "../hooks/useAuth.js";

/**
 * RegisterPage: Complete user registration UI with client-side validation,
 * password matching, terms agreement, accessible error presentation, and auth service integration.
 */
export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [termsModalOpen, setTermsModalOpen] = useState(false);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage(null);

    const { isValid, errors: validationErrors } = validateRegisterForm(formData);
    if (!isValid) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    try {
      await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        password: formData.password,
      });
      setStatusMessage({
        type: "success",
        title: "Registration Successful",
        body: "Your ParkEase account has been registered! You may now sign in.",
      });
    } catch (err) {
      if (err.status === 404) {
        setStatusMessage({
          type: "warning",
          title: "Registration Unavailable",
          body: "Backend registration endpoints are not implemented yet (pending Sprint 2 backend release). Registration is currently unavailable.",
        });
      } else if (err.isNetworkError) {
        setStatusMessage({
          type: "warning",
          title: "Server Unavailable",
          body: "Unable to connect to the registration server. Please check your network connection or verify that the backend server is running.",
        });
      } else {
        setErrors((prev) => ({
          ...prev,
          form: err.message || "Registration failed. Please try again.",
        }));
      }
    } finally {
      setIsLoading(false);
    }
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
            <h1 className="auth-title">Create an account</h1>
            <p className="auth-subtitle">
              Join ParkEase to discover parking, reserve slots, and move through malls with ease.
            </p>
          </div>

          {/* Account Role Notice */}
          <div className="auth-role-notice" style={{ marginBottom: "16px" }}>
            <Badge variant="neutral" size="sm">
              Standard User
            </Badge>
            <span>
              Driver &amp; visitor account. Mall Owners &amp; Guards are provisioned administratively.
            </span>
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

          {/* Registration Form */}
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <Input
              label="Full Name"
              id="register-name"
              name="name"
              type="text"
              placeholder="e.g. Alex Morgan"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              autoComplete="name"
              required
              disabled={isLoading}
            />

            <Input
              label="Email Address"
              id="register-email"
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
              label="Phone Number"
              id="register-phone"
              name="phone"
              type="tel"
              placeholder="e.g. 9876543210"
              helperText="Used for parking ticket verification and SMS notifications."
              value={formData.phone}
              onChange={handleChange}
              error={errors.phone}
              autoComplete="tel"
              required
              disabled={isLoading}
            />

            <Input
              label="Password"
              id="register-password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="At least 8 characters"
              helperText="Must be at least 8 characters long."
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              autoComplete="new-password"
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

            <Input
              label="Confirm Password"
              id="register-confirm-password"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              autoComplete="new-password"
              required
              disabled={isLoading}
              endAdornment={
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
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

            {/* Terms & Conditions Checkbox */}
            <div className="form-group">
              <label className="terms-checkbox-label">
                <input
                  type="checkbox"
                  name="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={handleChange}
                  className="checkbox-input"
                  disabled={isLoading}
                  required
                />
                <span>
                  I agree to the{" "}
                  <button
                    type="button"
                    className="auth-text-link"
                    onClick={() => setTermsModalOpen(true)}
                  >
                    Terms of Service
                  </button>{" "}
                  and acknowledge the parking rules.
                </span>
              </label>

              {errors.agreeTerms && (
                <p className="form-error-text" role="alert" style={{ marginTop: "4px" }}>
                  {errors.agreeTerms}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="accent"
              size="lg"
              loading={isLoading}
              className="auth-submit-btn"
            >
              Create Account
            </Button>
          </form>

          {/* Footer link to Login */}
          <div className="auth-footer">
            <p>
              Already have an account?{" "}
              <Link to="/login">Sign in</Link>
            </p>
          </div>
        </div>
      </div>

      {/* Terms and Conditions Informational Modal */}
      <Modal
        isOpen={termsModalOpen}
        onClose={() => setTermsModalOpen(false)}
        title="Terms of Service"
        description="ParkEase Smart Mall Parking Intelligence Guidelines"
        actions={
          <Button variant="secondary" onClick={() => setTermsModalOpen(false)}>
            Close
          </Button>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px", color: "var(--color-text-secondary)", lineHeight: "1.6" }}>
          <p>
            <strong>1. Reservation Policy:</strong> Parking slot reservations are held for
            the designated arrival window. Unclaimed slots may be automatically released.
          </p>
          <p>
            <strong>2. Entry &amp; Exit:</strong> Valid QR codes generated through ParkEase
            must be scanned by parking staff at mall entry and exit checkpoints.
          </p>
          <p>
            <strong>3. Billing &amp; Rates:</strong> Parking fees are calculated based on actual
            elapsed duration in accordance with mall-specific tariff tiers.
          </p>
          <p>
            <strong>4. User Conduct:</strong> Users agree to park only in designated,
            allocated bays and comply with mall facility safety regulations.
          </p>
        </div>
      </Modal>
    </div>
  );
}
