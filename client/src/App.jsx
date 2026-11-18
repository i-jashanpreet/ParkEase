import { createElement } from "react";
import { Routes, Route, useParams } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import useAuth from "./hooks/useAuth.js";
import InventoryPage from "./pages/InventoryPage.jsx";
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
import PendingPage from "./pages/PendingPage.jsx";

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
          <Route element={<ProtectedRoute allowedRoles={[ROLES.MALL_OWNER, ROLES.ADMIN]} />}>
            <Route path="/dashboard/malls/:id/inventory" element={<MallPage Component={InventoryPage} />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={[ROLES.USER]} />}>
            <Route path="/dashboard/bookings" element={<PendingPage title="My bookings" description="The dedicated bookings page is being built. Your current bookings are still available on the overview." to="/dashboard#recent-bookings-section" action="View bookings on overview" />} />
            <Route path="/dashboard/bookings/:id" element={<PendingPage title="Booking details" description="The booking detail page is being built." />} />
            <Route path="/dashboard/bookings/:id/bill" element={<PendingPage title="Booking receipt" description="Final receipts will be available after the booking and billing service is ready." />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={[ROLES.MALL_OWNER, ROLES.ADMIN]} />}>
            <Route path="/dashboard/guards" element={<PendingPage title="Guards" description="Guard management is being built." />} />
            <Route path="/dashboard/analytics" element={<PendingPage title="Analytics" description="Reporting will be available when the analytics service is ready." />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={[ROLES.MALL_OWNER]} />}>
            <Route path="/dashboard/malls/:id/edit" element={<PendingPage title="Edit mall" description="Mall profile editing is being built. You can still manage the parking layout from My malls." to="/dashboard?view=my-malls" action="Go to My malls" />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={[ROLES.GUARD]} />}>
            <Route path="/dashboard/operations" element={<PendingPage title="Gate console" description="Gate operations are being built. An assigned guard will be able to scan passes here." />} />
            <Route path="/dashboard/activity" element={<PendingPage title="Recent activity" description="Gate activity will appear here when operations are available." />} />
          </Route>
          <Route path="/dashboard/profile" element={<PendingPage title="Profile" description="Profile editing is being built. Your account details are available in the navigation." />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
