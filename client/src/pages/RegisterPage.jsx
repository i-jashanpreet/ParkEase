import PageContainer from "../components/PageContainer.jsx";
import Button from "../components/Button.jsx";

/**
 * RegisterPage: Placeholder view for user registration.
 * Awaits backend user schema and registration endpoint integration.
 */
export default function RegisterPage() {
  return (
    <PageContainer
      eyebrow="FOUNDATION PREVIEW"
      title="Your next visit starts here."
      description="Registration workflows for Drivers, Mall Owners, and staff will be integrated in the authentication milestone. Accounts cannot be created yet."
    >
      <div className="auth-placeholder-card">
        <div className="auth-placeholder-header">
          <span className="auth-badge">Sprint 2 Milestone</span>
          <h3>Account Registration</h3>
          <p>
            Registration APIs with input validation, password security, and safe
            role allocation are in progress. You will soon be able to register
            as a standard user or mall operator.
          </p>
        </div>

        <div className="auth-placeholder-actions">
          <Button to="/" variant="accent">
            Back to Home <span aria-hidden="true">↗</span>
          </Button>
          <Button to="/login" variant="secondary">
            Go to Login
          </Button>
          <Button to="/dashboard" variant="outline">
            Dashboard Preview
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
