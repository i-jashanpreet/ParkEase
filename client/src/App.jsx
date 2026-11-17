import { createElement } from "react";
import { Routes, Route, useParams } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import useAuth from "./hooks/useAuth.js";
import AccountDashboard from "./pages/AccountDashboard.jsx";
import { ROLES } from "./constants/roles.js";
import PublicLayout from "./layouts/PublicLayout.jsx";
import DashboardLayout from "./layouts/DashboardLayout.jsx";
import HomePage from "./pages/HomePage.jsx";
import MallDiscoveryPage from "./pages/MallDiscoveryPage.jsx";
import MallDetailsPage from "./pages/MallDetailsPage.jsx";
import ParkingAvailabilityPage from "./pages/ParkingAvailabilityPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";

function RoleDashboard() {
  const { user } = useAuth();
  return user.role === ROLES.USER ? <DashboardPage /> : <AccountDashboard key={user._id} />;
}

function MallPage({ Component }) {
  const { id } = useParams();
  return createElement(Component, { key: id });
}

/**
 * Main application router defining public and dashboard layout hierarchies,
 * wrapped in the central AuthProvider with protected dashboard access.
 */
export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public layout route tree */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route element={<DashboardLayout />}>
          <Route path="/malls" element={<MallDiscoveryPage />} />
          <Route path="/malls/:id" element={<MallPage Component={MallDetailsPage} />} />
          <Route path="/malls/:id/parking" element={<MallPage Component={ParkingAvailabilityPage} />} />
          <Route path="/malls/:id/availability" element={<MallPage Component={ParkingAvailabilityPage} />} />
        </Route>

        {/* Protected dashboard layout */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<RoleDashboard />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
