'use client';

import { ReactNode, useState, useEffect } from 'react';
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

/** Spinner compartido — renderizado idéntico en servidor y cliente durante hidratación */
function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Cargando...</p>
      </div>
    </div>
  );
}

/**
 * Renders the app shell (sidebar + header) only for authenticated pages.
 * Login and other public pages render children directly.
 *
 * El guard `mounted` garantiza que servidor y cliente rendericen lo mismo
 * durante la hidratación inicial, evitando el hydration mismatch que ocurre
 * porque `isLoading` en el servidor siempre es `true` (no hay localStorage).
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Solo se ejecuta en el cliente, después de la hidratación exitosa.
  useEffect(() => setMounted(true), []);

  const isPublicPage = ['/login', '/forgot-password', '/reset-password'].includes(pathname);

  // Antes de montar (incluye el render de servidor) → spinner idéntico en ambos lados.
  if (!mounted || isLoading) {
    return <LoadingSpinner />;
  }

  // Public pages: no sidebar/header
  if (isPublicPage || !isAuthenticated) {
    return <>{children}</>;
  }

  // Authenticated pages: full layout
  return (
    <div className="min-h-screen bg-transparent">
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
