import { Building2, ShoppingBag, DollarSign, Clock, FileText } from 'lucide-react';
import { StatCard } from './stat-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import {
  DashboardComprasSummary,
  DashboardRecentPurchaseOrder,
} from '@/services/dashboard';
import {
  PURCHASE_ORDER_STATUS_LABELS,
  PURCHASE_ORDER_STATUS_COLORS,
  PurchaseOrderStatus,
} from '@/services/suppliers';

interface ComprasTabProps {
  data: DashboardComprasSummary | null;
  loading: boolean;
}

export function ComprasTab({ data, loading }: ComprasTabProps) {
  const { supplierStats, poStats, recentOrders } = data ?? {
    supplierStats: null,
    poStats: null,
    recentOrders: [] as DashboardRecentPurchaseOrder[],
  };

  const pendingOrders = (poStats?.sentOrders ?? 0) + (poStats?.confirmedOrders ?? 0);
  const poTrend = [
    Math.max((poStats?.totalOrders ?? 0) - 8, 0),
    Math.max((poStats?.totalOrders ?? 0) - 4, 0),
    poStats?.totalOrders ?? 0,
  ];

  return (
    <div className="space-y-7">
      {/* ── Stats row ── */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-12">
        <StatCard
          title="Total Órdenes de Compra"
          value={loading ? '...' : (poStats?.totalOrders ?? 0)}
          icon={ShoppingBag}
          iconClassName="bg-blue-100 text-blue-600"
          sparklineData={poTrend}
          className="xl:col-span-4"
        />
        <StatCard
          title="OC en Proceso"
          value={loading ? '...' : pendingOrders}
          icon={Clock}
          iconClassName="bg-amber-100 text-amber-600"
          sparklineData={[Math.max(pendingOrders - 3, 0), Math.max(pendingOrders - 1, 0), pendingOrders]}
          className="xl:col-span-2"
        />
        <StatCard
          title="Total Gastado"
          value={loading ? '...' : formatCurrency(poStats?.totalSpent ?? 0)}
          icon={DollarSign}
          iconClassName="bg-emerald-100 text-emerald-600"
          sparklineData={[
            (poStats?.totalSpent ?? 0) * 0.4,
            (poStats?.totalSpent ?? 0) * 0.65,
            poStats?.totalSpent ?? 0,
          ]}
          className="xl:col-span-3"
        />
        <StatCard
          title="Proveedores Activos"
          value={loading ? '...' : (supplierStats?.activeSuppliers ?? 0)}
          icon={Building2}
          iconClassName="bg-violet-100 text-violet-600"
          sparklineData={[
            Math.max((supplierStats?.activeSuppliers ?? 0) - 2, 0),
            Math.max((supplierStats?.activeSuppliers ?? 0) - 1, 0),
            supplierStats?.activeSuppliers ?? 0,
          ]}
          className="xl:col-span-3"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ── Desglose estados OC ── */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Estado de Órdenes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Borrador', value: poStats?.draftOrders ?? 0, color: 'bg-gray-100 text-gray-700' },
              { label: 'Enviadas', value: poStats?.sentOrders ?? 0, color: 'bg-blue-100 text-blue-700' },
              { label: 'Confirmadas', value: poStats?.confirmedOrders ?? 0, color: 'bg-purple-100 text-purple-700' },
              { label: 'Recibidas', value: poStats?.receivedOrders ?? 0, color: 'bg-green-100 text-green-700' },
              { label: 'Canceladas', value: poStats?.cancelledOrders ?? 0, color: 'bg-red-100 text-red-700' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-2xl border border-gray-200/70 bg-[#fbfcf8] p-3">
                <span className={cn('text-xs font-medium px-2 py-1 rounded-full', item.color)}>
                  {item.label}
                </span>
                <span className="text-sm font-semibold text-gray-900">{loading ? '—' : item.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ── Stats proveedores ── */}
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Proveedores</CardTitle>
            <a href="/proveedores" className="text-sm text-primary hover:text-primary/80 font-medium">
              Ver todos
            </a>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Total proveedores', value: supplierStats?.totalSuppliers ?? 0, color: 'text-gray-900' },
              { label: 'Activos', value: supplierStats?.activeSuppliers ?? 0, color: 'text-green-700' },
              { label: 'Inactivos', value: supplierStats?.inactiveSuppliers ?? 0, color: 'text-gray-500' },
              { label: 'Nuevos (último mes)', value: supplierStats?.newSuppliersLastMonth ?? 0, color: 'text-blue-700' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-2xl border border-gray-200/70 bg-[#fbfcf8] p-3">
                <span className="text-sm text-gray-700">{item.label}</span>
                <span className={cn('text-sm font-semibold', item.color)}>
                  {loading ? '—' : item.value}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-2xl border border-gray-200/70 bg-[#fbfcf8] p-3">
              <span className="text-sm text-gray-700">Total compras históricas</span>
              <span className="text-sm font-semibold text-gray-900">
                {loading ? '—' : formatCurrency(supplierStats?.totalPurchases ?? 0)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ── OC recientes ── */}
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Órdenes Recientes</CardTitle>
            <a href="/proveedores" className="text-sm text-primary hover:text-primary/80 font-medium">
              Ver todas
            </a>
          </CardHeader>
          <CardContent className="space-y-2 p-0 pb-4">
            {loading ? (
              <p className="text-sm text-gray-500 px-6 py-4">Cargando...</p>
            ) : recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center px-6">
                <FileText className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">Sin órdenes recientes</p>
              </div>
            ) : (
              recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="mx-3 flex items-center justify-between rounded-2xl border border-transparent px-4 py-3 transition-colors hover:border-gray-200 hover:bg-gray-50"
                >
                  <div>
                    <p className="text-sm font-medium text-primary">{order.code}</p>
                    <p className="text-xs text-gray-500">{order.supplierName}</p>
                    <p className="text-xs text-gray-400">{formatDate(new Date(order.createdAt))}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(order.total)}</p>
                    <span
                      className={cn(
                        'text-xs font-medium px-2 py-0.5 rounded-full',
                        PURCHASE_ORDER_STATUS_COLORS[order.status as PurchaseOrderStatus] ?? 'bg-gray-100 text-gray-700',
                      )}
                    >
                      {PURCHASE_ORDER_STATUS_LABELS[order.status as PurchaseOrderStatus] ?? order.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
