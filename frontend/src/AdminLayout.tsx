import React from 'react'
import { Outlet } from 'react-router-dom'
import AdminSidebar from './pages/admin/AdminSidebar'

const AdminLayout: React.FC = () => (
<<<<<<< HEAD
  <AdminSidebar>
    <div className="ml-0 lg:ml-64 flex-1">
      <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-6 lg:py-8">
=======
<AdminSidebar>
    <div className="flex-1 min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
>>>>>>> f7d8d7e9870d391ca5e99729cc66eec90d465059
        <Outlet />
      </div>
    </div>
  </AdminSidebar>
)

export default AdminLayout