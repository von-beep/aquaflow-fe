import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/app/AppShell'
import { LandingPage } from '@/LandingPage'
import { InviteAcceptPage } from '@/features/onboarding/InviteAcceptPage'
import { LoginPage } from '@/features/onboarding/LoginPage'
import { PlatformAdminPage } from '@/features/platform/PlatformAdminPage'
import { CollectionsPage } from '@/features/collections/CollectionsPage'
import { ChatPage } from '@/features/chat/ChatPage'
import { CustomersPage } from '@/features/customers/CustomersPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { DeliveriesPage } from '@/features/deliveries/DeliveriesPage'
import { InventoryPage } from '@/features/inventory/InventoryPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { RoutesPage } from '@/features/routes/RoutesPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { UtangPage } from '@/features/utang/UtangPage'
import { RiderApp } from '@/features/rider/RiderApp'
import { AquaFlowProvider } from '@/store/AquaFlowContext'

export default function App() {
  return (
    <AquaFlowProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/rider" element={<RiderApp />} />
          <Route path="/signup" element={<Navigate to="/platform" replace />} />
          <Route path="/invite/:token" element={<InviteAcceptPage />} />
          <Route path="/platform" element={<PlatformAdminPage />} />
          <Route path="/admin" element={<AppShell />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="deliveries" element={<DeliveriesPage />} />
            <Route path="routes" element={<RoutesPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="utang" element={<UtangPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="collections" element={<CollectionsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AquaFlowProvider>
  )
}
