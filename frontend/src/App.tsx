import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import './App.css';
import './design.css';
import ProtectedRoute from './components/ProtectedRoute';
import PublicOnlyRoute from './components/PublicOnlyRoute';
import Login from './pages/Login';
import Dashboard from './pages/dashboard/Dashboard';
import RoleOverview from './pages/dashboard/views/RoleOverview';
import ParkirView from './pages/dashboard/views/ParkirView';
import EventDataView from './pages/dashboard/views/EventDataView';
import EventDetailView from './pages/dashboard/views/EventDetailView';
import FloorDataView from './pages/dashboard/views/FloorDataView';
import TenantDataView from './pages/dashboard/views/TenantDataView';
import LeaseRequestsView from './pages/dashboard/views/LeaseRequestsView';
import UserDataView from './pages/dashboard/views/UserDataView';
import ActivityLogView from './pages/dashboard/views/ActivityLogView';
import BackupView from './pages/dashboard/views/BackupView';
import TrashView from './pages/dashboard/views/TrashView';
import PermissionView from './pages/dashboard/views/PermissionView';
import SettingsView from './pages/dashboard/views/SettingsView';
import ReportView from './pages/dashboard/views/ReportView';
import ProfileView from './pages/dashboard/views/ProfileView';
import LandingLayout from './pages/landing/LandingLayout';
import Home from './pages/landing/Home';
import TenantDirectory from './pages/landing/TenantDirectory';
import IndoorMapPage from './pages/landing/IndoorMapPage';
import IndoorMapView from './pages/dashboard/views/IndoorMapView';
import Facilities from './pages/landing/Facilities';
import LocationPage from './pages/landing/Location';
import EventsPage from './pages/landing/EventsPage';
import ToastContainer from './components/ToastContainer';
import AppSettingsLoader from './components/AppSettingsLoader';
import PermissionGate from './components/PermissionGate';
import { loadPermissions } from './permissionBus';
import TenantLayout from './pages/tenant/TenantLayout';
import BrowseUnits from './pages/tenant/BrowseUnits';
import MyRequests from './pages/tenant/MyRequests';
import CostsPage from './pages/tenant/CostsPage';
import ParkirLayout from './pages/parkir/ParkirLayout';
import ProfilePage from './pages/parkir/ProfilePage';

export default function App() {
  return (
    <Router>
      <AppSettingsLoader />
      <PermissionLoader />
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnlyRoute redirectTo="/dashboard">
              <Login />
            </PublicOnlyRoute>
          }
        />
        <Route path="/" element={<LandingLayout />}>
          <Route index element={<Home />} />
          <Route path="tenant-directory" element={<TenantDirectory />} />
          <Route path="tenant-directory/map" element={<IndoorMapPage />} />
          <Route path="facilities" element={<Facilities />} />
          <Route path="location" element={<LocationPage />} />
          <Route path="events" element={<EventsPage />} />
        </Route>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={
            <PermissionGate page="dashboard">
              <RoleOverview />
            </PermissionGate>
          } />
          <Route path="parkir" element={
            <PermissionGate page="parkir">
              <ParkirView showOperator />
            </PermissionGate>
          } />
          <Route path="map" element={
            <PermissionGate page="map">
              <IndoorMapView />
            </PermissionGate>
          } />
          <Route path="event-data" element={
            <PermissionGate page="event-data">
              <EventDataView />
            </PermissionGate>
          } />
          <Route path="event-data/:id" element={
            <PermissionGate page="event-data">
              <EventDetailView />
            </PermissionGate>
          } />
          <Route path="floor-data" element={
            <PermissionGate page="floor-data">
              <FloorDataView />
            </PermissionGate>
          } />
          <Route path="tenant-data" element={
            <PermissionGate page="tenant-data">
              <TenantDataView />
            </PermissionGate>
          } />
          <Route path="lease-requests" element={
            <PermissionGate page="lease-requests">
              <LeaseRequestsView />
            </PermissionGate>
          } />
          <Route path="user-data" element={
            <PermissionGate page="user-data">
              <UserDataView />
            </PermissionGate>
          } />
          <Route path="activity-log" element={
            <PermissionGate page="activity-log">
              <ActivityLogView />
            </PermissionGate>
          } />
          <Route path="backup" element={
            <PermissionGate page="backup">
              <BackupView />
            </PermissionGate>
          } />
          <Route path="trash" element={
            <PermissionGate page="trash">
              <TrashView />
            </PermissionGate>
          } />
          <Route path="permission" element={
            <PermissionGate page="permission">
              <PermissionView />
            </PermissionGate>
          } />
          <Route path="setting" element={
            <PermissionGate page="setting">
              <SettingsView />
            </PermissionGate>
          } />
          <Route path="report" element={
            <PermissionGate page="report">
              <Navigate to="/dashboard/report/daily" replace />
            </PermissionGate>
          } />
          <Route path="report/:period" element={
            <PermissionGate page="report">
              <ReportRoute />
            </PermissionGate>
          } />
          <Route path="profile" element={
            <PermissionGate page="profile">
              <ProfileView />
            </PermissionGate>
          } />
        </Route>
        <Route
          path="/parkir"
          element={
            <ProtectedRoute>
              <ParkirLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<ParkirView />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        <Route
          path="/tenant"
          element={
            <ProtectedRoute>
              <TenantLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<BrowseUnits />} />
          <Route path="requests" element={<MyRequests />} />
          <Route path="costs" element={<CostsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
    </Router>
  );
}

function PermissionLoader() {
  useEffect(() => {
    void loadPermissions();
  }, []);
  return null;
}

const REPORT_PERIODS = ['daily', 'weekly', 'monthly', 'yearly'] as const;

function ReportRoute() {
  const { period } = useParams<{ period: string }>();
  const granularity = (REPORT_PERIODS as readonly string[]).includes(period ?? '')
    ? (period as (typeof REPORT_PERIODS)[number])
    : 'daily';
  return <ReportView granularity={granularity} />;
}

// MARKERX
