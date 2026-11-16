import { useEffect, useState } from "react";
import OwnerApprovals from "../components/OwnerApprovals.jsx";
import PageContainer from "../components/PageContainer.jsx";
import useAuth from "../hooks/useAuth.js";
import { syncProfile } from "../services/authSession.js";

const titles = {
  USER: "Driver dashboard",
  MALL_OWNER: "Mall-owner dashboard",
  GUARD: "Guard dashboard",
  ADMIN: "Admin dashboard",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    function refreshOnFocus() {
      syncProfile().catch((err) => setError(err.message));
    }
    window.addEventListener("focus", refreshOnFocus);
    return () => window.removeEventListener("focus", refreshOnFocus);
  }, []);

  async function refreshAccount() {
    setError("");
    setRefreshing(true);
    try {
      await syncProfile();
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  }

  const pending = user.status === "PENDING_APPROVAL";
  return (
    <PageContainer title={titles[user.role]}>
      <div className="account-card">
        <h2>{user.name}</h2>
        <p>{user.email}</p>
        <p className="account-status">{pending ? "Pending approval" : "Active account"}</p>
        {pending && <p>An admin needs to approve your mall-owner account.</p>}
        {user.role === "MALL_OWNER" && (
          <button className="button button-small secondary" disabled={refreshing} onClick={refreshAccount}>
            {refreshing ? "Checking…" : "Check account status"}
          </button>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
      {user.role === "ADMIN" && user.status === "ACTIVE" && <OwnerApprovals />}
    </PageContainer>
  );
}
