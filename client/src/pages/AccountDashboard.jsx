import { useState } from "react";
import Badge from "../components/Badge.jsx";
import Button from "../components/Button.jsx";
import Card from "../components/Card.jsx";
import OwnerApprovals from "../components/OwnerApprovals.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { ROLES } from "../constants/roles.js";
import useAuth from "../hooks/useAuth.js";

export default function AccountDashboard() {
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

  return (
    <div className="dashboard-content-grid">
      <PageHeader title={isAdmin ? "Admin dashboard" : isOwner ? "Mall-owner dashboard" : "Guard dashboard"} />
      <Card title={user.name} subtitle={user.email}>
        <div className="account-status-row">
          <Badge variant={pending ? "neutral" : "success"}>{pending ? "Pending approval" : "Active account"}</Badge>
          {isOwner && <Button size="sm" variant="secondary" loading={refreshing} onClick={checkStatus}>Check account status</Button>}
        </div>
        {pending && <p>An admin needs to approve your mall-owner account.</p>}
        {error && <p className="form-error-text" role="alert">{error}</p>}
      </Card>
      {isAdmin && user.status === "ACTIVE" && <OwnerApprovals />}
    </div>
  );
}
