import PageContainer from "../components/PageContainer.jsx";
import Button from "../components/Button.jsx";

/**
 * LoginPage: Placeholder view for user authentication.
 * Awaits backend authentication contract and token integration.
 */
export default function LoginPage() {
  return (
    <PageContainer
      eyebrow="FOUNDATION PREVIEW"
      title="Welcome back."
      description="Authentication and secure role login will be added in the next development sprint. No credentials are required during this foundation phase."
    >
      <div className="auth-placeholder-card">
        <div className="auth-placeholder-header">
          <span className="auth-badge">Sprint 2 Milestone</span>
          <h3>User & Role Sign-In</h3>
          <p>
            Secure JWT authentication, password hashing, and role determination
            (Driver, Mall Owner, Guard, Admin) are currently being built on the
            backend by Ocean.
          </p>
        </div>

        <div className="auth-placeholder-actions">
          <Button to="/" variant="accent">
            Back to Home <span aria-hidden="true">↗</span>
          </Button>
          <Button to="/register" variant="secondary">
            Go to Register
          </Button>
          <Button to="/dashboard" variant="outline">
            Dashboard Preview
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
