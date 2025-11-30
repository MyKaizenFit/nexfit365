"use client"

import { AdminRouteGuard } from "@/components/admin/admin-route-guard"
import { AdminNotificationsPanel } from "../components/notifications-panel"

export default function AdminNotificationsPage() {
  return (
    <AdminRouteGuard>
      <AdminNotificationsPanel variant="standalone" />
    </AdminRouteGuard>
  )
}

