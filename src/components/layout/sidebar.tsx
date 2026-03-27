'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/src/lib/utils';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  Truck,
  Receipt,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useCompany } from '@/src/lib/company-context';
import { useAuth } from '@/src/lib/auth-context';
import { ROUTE_TO_MODULE } from '@/src/lib/hooks';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Inventario', href: '/inventario', icon: Package },
  { name: 'Pedidos', href: '/pedidos', icon: ShoppingCart },
  { name: 'Clientes', href: '/clientes', icon: Users },
  { name: 'Proveedores', href: '/proveedores', icon: Truck },
  { name: 'Facturación', href: '/facturacion', icon: Receipt },
  { name: 'Configuración', href: '/configuracion', icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onCollapsedChange: (value: boolean) => void;
}

export function Sidebar({ collapsed, onCollapsedChange }: SidebarProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const { settings } = useCompany();
  const { logout, can, permissions } = useAuth();

  useEffect(() => setMounted(true), []);

  // Before hydration completes, show all navigation items to avoid SSR mismatch.
  // After mount, filter by actual permissions loaded from localStorage.
  // If a module code is NOT present in the backend permissions list at all,
  // show the item by default (unknown module = not restricted).
  // Only hide when the module explicitly exists AND canView === false.
  const visibleNavigation = navigation.filter((item) => {
    if (!mounted) return true;
    const moduleCode = ROUTE_TO_MODULE[item.href];
    if (!moduleCode) return true;
    const modulePermission = permissions.find((p) => p.moduleCode === moduleCode);
    if (!modulePermission) return true;
    return can(moduleCode, 'canView');
  });

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-white/95 border-r border-gray-200/80 shadow-[0_0_0_1px_rgba(255,255,255,0.6),0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-all duration-300',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col">
        <div className={cn(
          'flex items-center h-20 px-4 border-b border-gray-100',
          collapsed ? 'justify-center' : 'justify-between'
        )}>
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: settings.primaryColor }}
              >
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">{settings.companyName} </span>
            </Link>
          )}
          {collapsed && (
            <Link href="/" className="flex items-center justify-center">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: settings.primaryColor }}
              >
                <Package className="w-5 h-5 text-white" />
              </div>
            </Link>
          )}
          <button
            onClick={() => onCollapsedChange(!collapsed)}
            className="p-2.5 rounded-xl text-gray-500 hover:bg-gray-900/5 hover:text-gray-900 transition-colors"
            aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          >
            {collapsed ? (
              <Menu className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
          {visibleNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                title={collapsed ? item.name : undefined}
                className={cn(
                  'group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all',
                  isActive
                    ? 'text-white'
                    : 'text-gray-600 hover:bg-gray-900/5 hover:text-gray-900',
                  collapsed && 'justify-center'
                )}
                style={isActive ? { backgroundColor: settings.primaryColor + '15', color: settings.primaryColor } : undefined}
              >
                <item.icon
                  className={cn('w-[18px] h-[18px] flex-shrink-0 transition-transform', !isActive && 'group-hover:scale-105')}
                  style={isActive ? { color: settings.primaryColor } : undefined}
                />
                {!collapsed && (
                  <span className="text-[13px] font-medium tracking-wide">{item.name}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-200">
          <button
            onClick={logout}
            className={cn(
              'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-900/5 hover:text-gray-900 transition-colors',
              collapsed && 'justify-center'
            )}
            title={collapsed ? 'Cerrar sesión' : undefined}
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
            {!collapsed && <span className="text-[13px] font-medium tracking-wide">Cerrar sesión</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
