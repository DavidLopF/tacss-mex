'use client';

import { CSSProperties, ElementType, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Building2,
  LayoutDashboard,
  Package,
  Search,
  Settings,
  ShoppingCart,
  Truck,
  User,
  Users,
} from 'lucide-react';
import { useCompany } from '@/lib/company-context';
import { useAuth } from '@/lib/auth-context';

interface CommandAction {
  label: string;
  description: string;
  href: string;
  icon: ElementType;
}

const COMMAND_ACTIONS: CommandAction[] = [
  { label: 'Dashboard', description: 'Panel principal', href: '/', icon: LayoutDashboard },
  { label: 'Inventario', description: 'Productos y stock', href: '/inventario', icon: Package },
  { label: 'Pedidos', description: 'Pedidos y seguimiento', href: '/pedidos', icon: ShoppingCart },
  { label: 'Clientes', description: 'Gestión de clientes', href: '/clientes', icon: Users },
  { label: 'Proveedores', description: 'Compras y proveedores', href: '/proveedores', icon: Truck },
  { label: 'Configuración', description: 'Usuarios y ajustes', href: '/configuracion', icon: Settings },
  { label: 'Módulo Compras', description: 'Vista de compras del dashboard', href: '/?tab=compras', icon: Building2 },
];

export function Header() {
  const { settings } = useCompany();
  const { fullName, roleName } = useAuth();
  const router = useRouter();

  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filteredActions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return COMMAND_ACTIONS;
    return COMMAND_ACTIONS.filter((action) => {
      return (
        action.label.toLowerCase().includes(normalized)
        || action.description.toLowerCase().includes(normalized)
      );
    });
  }, [query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsPaletteOpen((prev) => !prev);
      }
      if (event.key === 'Escape') {
        setIsPaletteOpen(false);
      }
      if (event.key === 'Enter' && isPaletteOpen && filteredActions.length > 0) {
        event.preventDefault();
        router.push(filteredActions[0].href);
        setIsPaletteOpen(false);
        setQuery('');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [filteredActions, isPaletteOpen, router]);

  const openPalette = () => setIsPaletteOpen(true);
  const closePalette = () => {
    setIsPaletteOpen(false);
    setQuery('');
  };

  const goToAction = (href: string) => {
    router.push(href);
    closePalette();
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/70 bg-[#f5f6f1]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-20 items-center justify-between gap-5 px-7">
          <button
            type="button"
            onClick={openPalette}
            className="group relative flex w-full max-w-xl items-center gap-3 rounded-2xl border border-gray-300/70 bg-white/90 px-4 py-3 text-left shadow-[0_10px_25px_rgba(15,23,42,0.06)] transition-all hover:border-gray-400/70"
            style={{ '--tw-ring-color': settings.primaryColor } as CSSProperties}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900/5 text-gray-500">
              <Search className="h-[18px] w-[18px]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">Buscar módulos, atajos o acciones</p>
              <p className="truncate text-xs text-gray-500">Escribe para abrir la paleta de comandos</p>
            </div>
            <div className="hidden items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-500 sm:flex">
              <span>⌘</span>
              <span>K</span>
            </div>
          </button>

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 rounded-full border border-gray-200/80 bg-white px-3 py-1.5 text-xs font-medium text-gray-500 md:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Sistema en línea
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-gray-200/70 bg-white/90 px-3 py-2 shadow-sm">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: settings.accentColor }}
              >
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold tracking-tight text-gray-900">{fullName || 'Usuario'}</p>
                <p className="text-xs text-gray-500">{roleName || 'Sin rol'}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {isPaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-gray-950/30 p-4 pt-24 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-white/50 bg-white p-3 shadow-[0_24px_56px_rgba(15,23,42,0.24)]">
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-[#f9faf8] px-3 py-2">
              <Search className="h-[18px] w-[18px] text-gray-500" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ir a inventario, pedidos, clientes..."
                className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={closePalette}
                className="rounded-lg px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-200/70"
              >
                Esc
              </button>
            </div>

            <div className="mt-3 space-y-1">
              {filteredActions.length === 0 && (
                <p className="rounded-xl px-4 py-6 text-center text-sm text-gray-500">
                  Sin resultados para esta búsqueda
                </p>
              )}
              {filteredActions.map((action) => (
                <button
                  key={action.href}
                  type="button"
                  onClick={() => goToAction(action.href)}
                  className="group flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-colors hover:bg-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-900/5 text-gray-600">
                      <action.icon className="h-[18px] w-[18px]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{action.label}</p>
                      <p className="text-xs text-gray-500">{action.description}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </div>
        </div>

      )}
    </>
  );
}
