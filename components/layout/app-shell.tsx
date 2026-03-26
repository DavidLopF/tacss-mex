'use client';

import { ReactNode, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { useSocketInit } from '@/lib/hooks/use-socket-init';

/**
 * Componente invisible que inicializa la conexión SSE.
 * Se renderiza solo cuando el usuario está autenticado.
 */
function SocketInitializer() {
  useSocketInit();
  return null;
}

/**
 * Renders the app shell (sidebar + header) only for authenticated pages.
 * Login and other public pages render children directly.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isPublicPage = ['/login', '/forgot-password', '/reset-password'].includes(pathname);

  // While loading auth state, show a minimal spinner to avoid layout flash
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  // Public pages: no sidebar/header
  if (isPublicPage || !isAuthenticated) {
    return <>{children}</>;
  }

  // Authenticated pages: full layout
  return (
    <div className="min-h-screen bg-gray-50">
      <SocketInitializer />
      <Sidebar collapsed={collapsed} onCollapsedChange={setCollapsed} />
      <div
        className="transition-all duration-300"
        style={{ marginLeft: collapsed ? '5rem' : '16rem' }}
      >
        <Header />
        {children}
      </div>
    </div>
  );
}
