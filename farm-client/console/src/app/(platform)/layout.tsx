'use client';

import React, { useState } from 'react';
import '@/app/globals.css';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Sidebar
        collapsed={sidebarCollapsed}
        open={mobileOpen}
        onNavigate={() => setMobileOpen(false)}
      />
      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        }`}
      >
        <Header sidebarOpen={mobileOpen} onToggleSidebar={() => setMobileOpen(!mobileOpen)} />
        <main className="p-4 lg:p-6">
          <ProtectedRoute>{children}</ProtectedRoute>
        </main>
      </div>
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
