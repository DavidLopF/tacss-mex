'use client';

import { useEffect, useState } from 'react';
import { Calendar, Package, ShoppingCart, Building2 } from 'lucide-react';
import { InventarioTab, PedidosTab, ComprasTab } from '@/components/dashboard';
import { PermissionGuard } from '@/components/layout';
import { getDashboard, getDashboardCompras, DashboardSummary, DashboardComprasSummary } from '@/services/dashboard';
import { cn } from '@/lib/utils';

function todayLabel(): string {
  return new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

type TabId = 'inventario' | 'pedidos' | 'compras';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'inventario', label: 'Inventario', icon: Package },
  { id: 'pedidos', label: 'Pedidos', icon: ShoppingCart },
  { id: 'compras', label: 'Compras & Proveedores', icon: Building2 },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>('inventario');

  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  const [comprasData, setComprasData] = useState<DashboardComprasSummary | null>(null);
  const [comprasLoading, setComprasLoading] = useState(false);
  const [comprasFetched, setComprasFetched] = useState(false);

  useEffect(() => {
    getDashboard()
      .then(setDashboardData)
      .catch(console.error)
      .finally(() => setDashboardLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab !== 'compras' || comprasFetched) return;
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
      <main className="p-6">
        <div className="space-y-6">
          {/* ── Header ── */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-500">Panel de control de CRM</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>{todayLabel()}</span>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex gap-1">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                    activeTab === id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {/* ── Tab content ── */}
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
