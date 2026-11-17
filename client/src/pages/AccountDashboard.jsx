import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import Badge from "../components/Badge.jsx";
import Button from "../components/Button.jsx";
import Card from "../components/Card.jsx";
import AdminDashboard from "./AdminDashboard.jsx";
import OwnerMalls from "../components/OwnerMalls.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { ROLES } from "../constants/roles.js";
import useAuth from "../hooks/useAuth.js";

export default function AccountDashboard() {
  const [params] = useSearchParams();
  const view = params.get("view") || "overview";
  const { user, refreshUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const isOwner = user.role === ROLES.MALL_OWNER;
  const isAdmin = user.role === ROLES.ADMIN;
  const pending = user.status === "PENDING_APPROVAL";

  async function checkStatus() {
    setRefreshing(true);
    setError("");
    try {
      await refreshUser();
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  }

  if (isAdmin && user.status === "ACTIVE") return <AdminDashboard />;

  return (
    <div className="dashboard-content-grid">
      <PageHeader title={isAdmin ? "Platform overview" : isOwner ? "Your malls, one workspace." : "Guard workspace"} description={isOwner ? "Submit your mall and follow its journey to publication." : "Your ParkEase account and access details."} />
      {(view === "overview" || pending) && <Card title={user.name} subtitle={user.email}>
        <div className="account-status-row">
          <Badge variant={pending ? "neutral" : "success"}>{pending ? "Pending approval" : "Active account"}</Badge>
          {isOwner && <Button size="sm" variant="secondary" loading={refreshing} onClick={checkStatus}>Check account status</Button>}
        </div>
        {pending && <p>An admin needs to approve your mall-owner account.</p>}
        {error && <p className="form-error-text" role="alert">{error}</p>}
      </Card>}
      {user.role === ROLES.GUARD && <Card title="Your gate workspace" subtitle="Your account is ready."><p className="panel-hint">Entry scanning and parking operations will be available in a future update.</p></Card>}
      {isOwner && user.status === "ACTIVE" && <OwnerMalls />}

    </div>
  );
}
