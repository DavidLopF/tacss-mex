'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Calendar, LayoutDashboard, Package, ShoppingCart, Building2 } from 'lucide-react';
import { InventarioTab, PedidosTab, ComprasTab, ExecutiveInsights } from '@/components/dashboard';
import { PermissionGuard } from '@/components/layout';
import { getDashboard, getDashboardCompras, DashboardSummary, DashboardComprasSummary } from '@/services/dashboard';
import { cn } from '@/lib/utils';

function todayLabel(): string {
  return new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

type TabId = 'resumen' | 'inventario' | 'pedidos' | 'compras';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
  { id: 'inventario', label: 'Inventario', icon: Package },
  { id: 'pedidos', label: 'Pedidos', icon: ShoppingCart },
  { id: 'compras', label: 'Compras & Proveedores', icon: Building2 },
];

export default function DashboardPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>('resumen');

  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  const [comprasData, setComprasData] = useState<DashboardComprasSummary | null>(null);
  const [comprasLoading, setComprasLoading] = useState(true);
  const [comprasFetched, setComprasFetched] = useState(false);

  useEffect(() => {
    getDashboard()
      .then(setDashboardData)
      .catch(console.error)
      .finally(() => setDashboardLoading(false));

    getDashboardCompras()
      .then((data) => {
        setComprasData(data);
        setComprasFetched(true);
      })
      .catch(console.error)
      .finally(() => setComprasLoading(false));
  }, []);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'inventario' || tabParam === 'pedidos' || tabParam === 'compras' || tabParam === 'resumen') {
      setActiveTab(tabParam);
      return;
    }
    setActiveTab('resumen');
  }, [searchParams]);

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    if (tabId === 'resumen') {
      router.replace(pathname);
      return;
    }
    router.replace(`${pathname}?tab=${tabId}`);
  };

  useEffect(() => {
    if (activeTab !== 'compras' || comprasFetched || comprasLoading) return;
    setComprasLoading(true);
    getDashboardCompras()
      .then((data) => {
        setComprasData(data);
        setComprasFetched(true);
      })
      .catch(console.error)
      .finally(() => setComprasLoading(false));
  }, [activeTab, comprasFetched]);

  return (
    <PermissionGuard moduleCode="DASHBOARD">
      <main className="px-6 py-8 md:px-8 md:py-10">
        <div className="space-y-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">Panel de control de CRM</p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-4 py-2 text-sm text-gray-600 shadow-sm">
              <Calendar className="h-4 w-4" />
              <span>{todayLabel()}</span>
            </div>
          </div>

          <div className="inline-flex w-full max-w-2xl flex-wrap items-center gap-2 rounded-2xl border border-gray-200/80 bg-white/80 p-2 shadow-sm">
            <nav className="flex w-full flex-wrap gap-2">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => handleTabChange(id)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
                    activeTab === id
                      ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                      : 'text-gray-500 hover:bg-gray-100/70 hover:text-gray-800',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {activeTab === 'resumen' && (
            <>
              <ExecutiveInsights
                dashboardData={dashboardData}
                comprasData={comprasData}
                dashboardLoading={dashboardLoading}
                comprasLoading={comprasLoading}
              />
              <div className="rounded-2xl border border-gray-200/80 bg-white/80 px-5 py-4 text-sm text-gray-600">
                Vista ejecutiva consolidada de los modulos. Usa las pestañas para ver cada dashboard detallado por area.
              </div>
            </>
          )}

          {activeTab === 'inventario' && dashboardData && (
            <InventarioTab data={dashboardData} loading={dashboardLoading} />
          )}
          {activeTab === 'inventario' && dashboardLoading && (
            <InventarioTab
              data={{
                salesMonth: { value: 0, changePercent: null },
                pendingOrders: 0,
                totalProducts: 0,
                totalClients: { value: 0, changePercent: null },
                salesToday: 0,
                ordersToday: 0,
                newClientsMonth: 0,
                lowStockCount: 0,
                salesChart: [],
                topProducts: [],
                recentOrders: [],
                lowStock: [],
              }}
              loading
            />
          )}

          {activeTab === 'pedidos' && dashboardData && (
            <PedidosTab data={dashboardData} loading={dashboardLoading} />
          )}
          {activeTab === 'pedidos' && dashboardLoading && (
            <PedidosTab
              data={{
                salesMonth: { value: 0, changePercent: null },
                pendingOrders: 0,
                totalProducts: 0,
                totalClients: { value: 0, changePercent: null },
                salesToday: 0,
                ordersToday: 0,
                newClientsMonth: 0,
                lowStockCount: 0,
                salesChart: [],
                topProducts: [],
                recentOrders: [],
                lowStock: [],
              }}
              loading
            />
          )}

          {activeTab === 'compras' && (
            <ComprasTab
              data={comprasData}
              loading={comprasLoading}
            />
          )}
        </div>
      </main>
    </PermissionGuard>
  );
}
