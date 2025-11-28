import React from 'react'
import { Outlet } from 'react-router-dom'
import AdminSidebar from './pages/admin/AdminSidebar'

const AdminLayout: React.FC = () => (
  <AdminSidebar>
    <div className="ml-0 lg:ml-64 flex-1">
      <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-6 lg:py-8">
        <Outlet />
      </div>
    </div>
  </AdminSidebar>
)

export default AdminLayout