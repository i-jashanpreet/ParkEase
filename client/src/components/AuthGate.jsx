import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";
import PageContainer from "./PageContainer.jsx";

export default function AuthGate({ children, guest = false }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <PageContainer title="Checking your session"><p role="status">Please wait…</p></PageContainer>;
  }
  if (guest && user) return <Navigate to="/dashboard" replace />;
  if (!guest && !user) return <Navigate to="/login" replace />;
  return children;
}
