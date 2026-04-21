'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import type { Tenant, Profile } from '@/types/database'

interface DashboardShellProps {
  tenant: Tenant
  profile: Profile
  productMode?: string
  isStaff?: boolean
  children: React.ReactNode
}

export function DashboardShell({ tenant, profile, productMode = 'nexoomnix', isStaff = false, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Aplica o nicho como data attribute no html para trocar as CSS vars
  useEffect(() => {
    document.documentElement.setAttribute('data-niche', tenant.niche)
    return () => {
      document.documentElement.removeAttribute('data-niche')
    }
  }, [tenant.niche])

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar
        tenant={tenant}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        productMode={productMode}
        isStaff={isStaff}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <Topbar
          tenant={tenant}
          profile={profile}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 p-4 md:p-6 lg:p-8 animate-fade-in">
          {children}
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
