'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Package, ShoppingCart, Users, Settings,
  LogOut, ChevronLeft, ChevronRight, Truck, Receipt, Tag,
  Search, Star,
} from 'lucide-react';
import { useState, useEffect, useCallback, type ElementType } from 'react';
import { useCompany } from '@/lib/company-context';
import { useAuth } from '@/lib/auth-context';
import { ROUTE_TO_MODULE } from '@/lib/hooks';

// ── Nav model ────────────────────────────────────────────────────────────────
type NavItem = { id: string; name: string; href: string; icon: ElementType };
type NavSection = { id: string; label: string; items: NavItem[] };

const NAV_SECTIONS: NavSection[] = [
  {
    id: 'general',
    label: 'General',
    items: [
      { id: 'dashboard', name: 'Dashboard', href: '/', icon: LayoutDashboard },
    ],
  },
  {
    id: 'operacion',
    label: 'Operación',
    items: [
      { id: 'inventario', name: 'Inventario', href: '/inventario', icon: Package },
      { id: 'pedidos', name: 'Pedidos', href: '/pedidos', icon: ShoppingCart },
      { id: 'clientes', name: 'Clientes', href: '/clientes', icon: Users },
      { id: 'proveedores', name: 'Proveedores', href: '/proveedores', icon: Truck },
    ],
  },
  {
    id: 'finanzas',
    label: 'Finanzas',
    items: [
      { id: 'facturacion', name: 'Facturación', href: '/facturacion', icon: Receipt },
      { id: 'descuentos', name: 'Descuentos', href: '/descuentos', icon: Tag },
    ],
  },
  {
    id: 'ajustes',
    label: 'Ajustes',
    items: [
      { id: 'configuracion', name: 'Configuración', href: '/configuracion', icon: Settings },
    ],
  },
];

const ALL_ITEMS = NAV_SECTIONS.flatMap(s => s.items);
const FAV_KEY = 'sidebar-favorites';
const DEFAULT_FAVS: string[] = ['pedidos', 'descuentos'];

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}

// ── Main component ───────────────────────────────────────────────────────────
interface SidebarProps {
  collapsed: boolean;
  onCollapsedChange: (value: boolean) => void;
}

export function Sidebar({ collapsed, onCollapsedChange }: SidebarProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [favs, setFavs] = useState<string[]>(DEFAULT_FAVS);
  const { settings } = useCompany();
  const { logout, can, permissions, fullName, roleName } = useAuth();

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(FAV_KEY);
      if (stored) setFavs(JSON.parse(stored));
    } catch {}
  }, []);

  const toggleFav = useCallback((id: string) => {
    setFavs(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      try { localStorage.setItem(FAV_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const filterByPermission = useCallback((items: NavItem[]) => {
    if (!mounted) return items;
    return items.filter(item => {
      const moduleCode = ROUTE_TO_MODULE[item.href];
      if (!moduleCode) return true;
      const perm = permissions.find(p => p.moduleCode === moduleCode);
      if (!perm) return true;
      return can(moduleCode, 'canView');
    });
  }, [mounted, permissions, can]);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const initials = fullName ? getInitials(fullName) : '?';
  const roleLabel = roleName === 'admin' ? 'Administrador' : roleName === 'vendedor' ? 'Vendedor' : (roleName ?? '');

  const primaryColor = settings.primaryColor || '#2563eb';

  return (
    <aside
      style={{ width: collapsed ? 72 : 264, transition: 'width 320ms cubic-bezier(0.2,0.8,0.2,1)' }}
      className="fixed left-0 top-0 z-40 h-screen bg-white border-r border-gray-200/80 flex flex-col overflow-hidden"
    >
      {/* ── Lockup ── */}
      <div
        className={cn(
          'flex items-center border-b border-gray-100 flex-shrink-0',
          collapsed ? 'justify-center px-2' : 'justify-between px-4'
        )}
        style={{ height: 72 }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0"
            style={{
              background: `linear-gradient(155deg, ${primaryColor}bb 0%, ${primaryColor} 55%, ${primaryColor}dd 100%)`,
              boxShadow: `0 1px 3px rgba(0,0,0,0.12), 0 6px 14px -4px ${primaryColor}66`,
            }}
          >
            <Package className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0" style={{ transition: 'opacity 180ms ease-out' }}>
              <div className="text-[17px] font-bold tracking-tight text-gray-900 leading-none truncate">
                {settings.companyName || 'TACSS'}
              </div>
              <div className="text-[11px] text-gray-400 mt-1 leading-none">Sistema de gestión</div>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={() => onCollapsedChange(true)}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0"
            aria-label="Colapsar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Search ── */}
      <div className={cn('flex-shrink-0', collapsed ? 'flex justify-center pt-3 px-2' : 'px-3 pt-3')}>
        {collapsed ? (
          <button
            className="w-10 h-10 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 inline-flex items-center justify-center transition-colors"
            title="Buscar · ⌘K"
          >
            <Search className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex items-center gap-2 h-9 px-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-400 hover:bg-gray-100 transition-colors cursor-pointer">
            <Search className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="flex-1 text-[13px]">Buscar módulo</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white border border-gray-200 text-gray-500">⌘K</span>
          </div>
        )}
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 min-h-0">

        {/* Favorites */}
        {mounted && favs.length > 0 && (
          <div className="mb-3">
            {collapsed
              ? <div className="h-px bg-gray-100 mx-2 mb-2" />
              : (
                <div className="flex items-center justify-between px-3 pb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">Atajos</span>
                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                </div>
              )
            }
            <div className="space-y-0.5">
              {favs.map(id => {
                const item = ALL_ITEMS.find(i => i.id === id);
                if (!item) return null;
                return (
                  <NavItemRow
                    key={`fav-${id}`}
                    item={item}
                    collapsed={collapsed}
                    active={isActive(item.href)}
                    isFav={true}
                    onFav={() => toggleFav(item.id)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Sections */}
        {NAV_SECTIONS.map((section, sIdx) => {
          const items = filterByPermission(section.items);
          if (items.length === 0) return null;
          return (
            <div key={section.id} className={sIdx > 0 ? 'mt-4' : ''}>
              {collapsed
                ? (sIdx > 0 && <div className="h-px bg-gray-100 mx-2 mb-2" />)
                : (
                  <div className="px-3 pb-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                      {section.label}
                    </span>
                  </div>
                )
              }
              <div className="space-y-0.5">
                {items.map(item => (
                  <NavItemRow
                    key={item.id}
                    item={item}
                    collapsed={collapsed}
                    active={isActive(item.href)}
                    isFav={favs.includes(item.id)}
                    onFav={() => toggleFav(item.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── Bottom ── */}
      <div className="border-t border-gray-100 p-2 flex-shrink-0">
        {/* User chip */}
        <div className={cn('flex items-center gap-3 px-2 py-2 rounded-xl', collapsed && 'justify-center')}>
          <div className="relative flex-shrink-0">
            <div
              className="w-8 h-8 rounded-full text-white text-[12px] font-semibold inline-flex items-center justify-center shadow-sm"
              style={{ background: primaryColor }}
            >
              {initials}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-gray-800 truncate leading-tight">
                {fullName ?? 'Usuario'}
              </div>
              <div className="text-[11px] text-gray-500 truncate leading-tight capitalize">
                {roleLabel}
              </div>
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          title={collapsed ? 'Cerrar sesión' : undefined}
          className={cn(
            'w-full mt-1 flex items-center gap-3 px-3 py-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors',
            collapsed && 'justify-center'
          )}
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && <span className="text-[13px] font-medium">Cerrar sesión</span>}
        </button>
      </div>

      {/* ── Floating expand tab (collapsed only) ── */}
      {collapsed && (
        <button
          onClick={() => onCollapsedChange(false)}
          className="absolute top-[88px] -right-3 w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300 shadow-[0_2px_6px_rgba(2,6,23,0.08)] inline-flex items-center justify-center transition-colors z-10"
          aria-label="Expandir"
        >
          <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </aside>
  );
}

// ── NavItemRow ───────────────────────────────────────────────────────────────
interface NavItemRowProps {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
  isFav?: boolean;
  onFav?: () => void;
}

function NavItemRow({ item, collapsed, active, isFav, onFav }: NavItemRowProps) {
  const [hover, setHover] = useState(false);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      title={collapsed ? item.name : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={cn(
        'relative flex items-center gap-3 rounded-lg transition-colors duration-150',
        collapsed ? 'justify-center h-10 px-0' : 'px-3 py-2',
        !active && 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      )}
      style={active ? {
        backgroundColor: 'var(--primary-soft, #dbeafe)',
        color: 'var(--primary-color, #2563eb)',
      } : {}}
    >
      {/* Left indicator strip */}
      {active && (
        <span
          className={cn('absolute left-0 rounded-r-full', collapsed ? 'top-2 bottom-2' : 'top-1.5 bottom-1.5')}
          style={{ width: 3, background: 'var(--primary-color, #2563eb)' }}
        />
      )}

      <Icon
        style={{
          width: 18, height: 18,
          strokeWidth: active ? 2 : 1.75,
          flexShrink: 0,
          transition: 'transform 160ms cubic-bezier(0.2,0.8,0.2,1)',
          transform: hover && !active ? 'translateX(1px)' : 'none',
        }}
      />

      {!collapsed && (
        <>
          <span className={cn('text-[13.5px] flex-1 truncate', active ? 'font-semibold' : 'font-medium')}>
            {item.name}
          </span>
          {onFav && hover && (
            <span
              role="button"
              onClick={e => { e.preventDefault(); e.stopPropagation(); onFav(); }}
              className="cursor-pointer transition-colors"
              style={{ color: isFav ? '#f59e0b' : '#d1d5db' }}
            >
              <Star style={{ width: 13, height: 13, fill: isFav ? '#f59e0b' : 'none' }} />
            </span>
          )}
        </>
      )}

      {/* Collapsed badge dot position preserved for future */}
    </Link>
  );
}
