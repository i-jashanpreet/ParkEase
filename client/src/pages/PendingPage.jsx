import Button from "../components/Button.jsx";
import Card from "../components/Card.jsx";
import PageHeader from "../components/PageHeader.jsx";

export default function PendingPage({ title, description, to = "/dashboard", action = "Back to overview" }) {
  return (
    <div className="dashboard-content-grid">
      <PageHeader title={title} description={description} />
      <Card title="Coming soon" subtitle="This section is not available yet.">
        <Button to={to} variant="secondary">{action}</Button>
      </Card>
    </div>
  );
}
