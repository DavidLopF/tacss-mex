import Link from 'next/link';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { DashboardComprasSummary, DashboardSummary } from '@/services/dashboard';
import { cn, formatCurrency, formatDateTime } from '@/lib/utils';
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpRight, Boxes, ClipboardList, FileWarning, TrendingUp, Users } from 'lucide-react';

interface ExecutiveInsightsProps {
  dashboardData: DashboardSummary | null;
  comprasData: DashboardComprasSummary | null;
  dashboardLoading: boolean;
  comprasLoading: boolean;
}

type InsightSeverity = 'high' | 'medium' | 'low';

interface InsightAlert {
  id: string;
  title: string;
  detail: string;
  severity: InsightSeverity;
}

function alertStyle(severity: InsightSeverity): string {
  if (severity === 'high') return 'border-rose-200/80 bg-rose-50/60 text-rose-800';
  if (severity === 'medium') return 'border-amber-200/80 bg-amber-50/60 text-amber-800';
  return 'border-sky-200/80 bg-sky-50/60 text-sky-800';
}

function hoursSince(date: string): number {
  const created = new Date(date).getTime();
  if (Number.isNaN(created)) return 0;
  return Math.max((Date.now() - created) / (1000 * 60 * 60), 0);
}

export function ExecutiveInsights({ dashboardData, comprasData, dashboardLoading, comprasLoading }: ExecutiveInsightsProps) {
  const pendingRiskOrders = (dashboardData?.recentOrders ?? []).filter((order) => {
    const notResolved = order.statusCode !== 'ENVIADO' && order.statusCode !== 'CANCELADO';
    return notResolved && hoursSince(order.createdAt) >= 48;
  }).length;

  const stockCritical = dashboardData?.lowStockCount ?? 0;
  const openPurchaseOrders = (comprasData?.poStats.draftOrders ?? 0) + (comprasData?.poStats.sentOrders ?? 0) + (comprasData?.poStats.confirmedOrders ?? 0);
  const activeClients = (dashboardData?.totalClients.value ?? 0) - (dashboardData?.newClientsMonth ?? 0);
  const salesDelta = dashboardData?.salesMonth.changePercent ?? null;
  const clientDelta = dashboardData?.totalClients.changePercent ?? null;
  const topStockRisk = (dashboardData?.lowStock ?? []).slice().sort((a, b) => a.stockTotal - b.stockTotal)[0];

  const alerts: InsightAlert[] = [];
  if (pendingRiskOrders > 0) {
    alerts.push({
      id: 'pending-risk',
      title: `${pendingRiskOrders} pedidos en riesgo operativo`,
      detail: 'Pedidos con mas de 48h sin estatus final. Priorizar seguimiento comercial.',
      severity: 'high',
    });
  }
  if (stockCritical > 0) {
    alerts.push({
      id: 'stock',
      title: `${stockCritical} SKUs en nivel critico`,
      detail: topStockRisk ? `${topStockRisk.nombre} esta en ${topStockRisk.stockTotal} unidades.` : 'Revisar reposicion inmediata en inventario.',
      severity: stockCritical >= 5 ? 'high' : 'medium',
    });
  }
  if (openPurchaseOrders > 0) {
    alerts.push({
      id: 'purchase-open',
      title: `${openPurchaseOrders} OCs abiertas`,
      detail: 'Validar confirmaciones pendientes con proveedores para evitar quiebres.',
      severity: openPurchaseOrders >= 8 ? 'medium' : 'low',
    });
  }
  if ((salesDelta ?? 0) < 0) {
    alerts.push({
      id: 'sales-drop',
      title: `Ventas con caida de ${Math.abs(salesDelta ?? 0)}%`,
      detail: 'Comparado con el mes anterior. Ajustar pipeline y promociones.',
      severity: 'high',
    });
  }
  if ((clientDelta ?? 0) < 0) {
    alerts.push({
      id: 'client-drop',
      title: 'Cartera de clientes desacelerada',
      detail: 'El crecimiento de clientes esta por debajo del periodo anterior.',
      severity: 'medium',
    });
  }

  const activityFeed = [
    ...(dashboardData?.recentOrders ?? []).map((order) => ({
      id: `so-${order.id}`,
      date: order.createdAt,
      title: order.code,
      subtitle: order.client,
      amount: formatCurrency(order.total),
      status: order.status,
      type: 'Pedido',
      href: `/pedidos?order=${order.id}`,
    })),
    ...(comprasData?.recentOrders ?? []).map((order) => ({
      id: `po-${order.id}`,
      date: order.createdAt,
      title: order.code,
      subtitle: order.supplierName,
      amount: formatCurrency(order.total),
      status: order.status,
      type: 'Compra',
      href: `/proveedores?po=${order.id}`,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  const inventoryValue = dashboardData?.inventoryValue;
  const inventoryValueAtCost = dashboardData?.inventoryValueAtCost;

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardContent className="space-y-2">
            <div className="inline-flex rounded-xl bg-rose-100 p-2 text-rose-700">
              <FileWarning className="h-4 w-4" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Pedidos en riesgo</p>
            <p className="text-3xl font-semibold tracking-tight text-gray-900">{dashboardLoading ? '...' : pendingRiskOrders}</p>
            <p className="text-xs text-gray-500">Sin cierre en mas de 48h</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2">
            <div className="inline-flex rounded-xl bg-amber-100 p-2 text-amber-700">
              <Boxes className="h-4 w-4" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">SKUs criticos</p>
            <p className="text-3xl font-semibold tracking-tight text-gray-900">{dashboardLoading ? '...' : stockCritical}</p>
            <p className="text-xs text-gray-500">Con riesgo de quiebre de stock</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2">
            <div className="inline-flex rounded-xl bg-sky-100 p-2 text-sky-700">
              <ClipboardList className="h-4 w-4" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">OCs abiertas</p>
            <p className="text-3xl font-semibold tracking-tight text-gray-900">{comprasLoading ? '...' : openPurchaseOrders}</p>
            <p className="text-xs text-gray-500">Borrador, enviadas y confirmadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2">
            <div className="inline-flex rounded-xl bg-emerald-100 p-2 text-emerald-700">
              <Users className="h-4 w-4" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Clientes activos</p>
            <p className="text-3xl font-semibold tracking-tight text-gray-900">{dashboardLoading ? '...' : Math.max(activeClients, 0)}</p>
            <div className="inline-flex items-center gap-1 text-xs text-gray-500">
              {clientDelta != null && clientDelta >= 0 && <ArrowUp className="h-3 w-3 text-emerald-600" />}
              {clientDelta != null && clientDelta < 0 && <ArrowDown className="h-3 w-3 text-rose-600" />}
              {clientDelta != null ? `${clientDelta >= 0 ? '+' : ''}${clientDelta}% vs mes anterior` : 'Sin comparativo disponible'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2">
            <div className="inline-flex rounded-xl bg-violet-100 p-2 text-violet-700">
              <TrendingUp className="h-4 w-4" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Valor en inventario</p>
            <p className="text-3xl font-semibold tracking-tight text-gray-900">
              {dashboardLoading ? '...' : inventoryValue != null ? formatCurrency(inventoryValue) : '—'}
            </p>
            {inventoryValueAtCost != null ? (
              <p className="text-xs text-gray-500">Costo: {formatCurrency(inventoryValueAtCost)}</p>
            ) : (
              <p className="text-xs text-gray-500">A precio de venta</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Alertas Accionables</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.length === 0 && (
              <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-4 text-sm text-emerald-800">
                Sin alertas criticas activas. Operacion estable en este momento.
              </div>
            )}

            {alerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className={cn('rounded-2xl border p-4', alertStyle(alert.severity))}>
                <div className="mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  <p className="text-sm font-semibold">{alert.title}</p>
                </div>
                <p className="text-xs leading-5 opacity-85">{alert.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-7">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Actividad Transversal</CardTitle>
            <Badge variant="info">Ventas + Compras</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {activityFeed.length === 0 && (
              <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                Sin actividad reciente
              </div>
            )}

            {activityFeed.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="group flex items-center justify-between rounded-2xl border border-gray-200/80 bg-[#fbfcf8] px-4 py-3 transition-all hover:border-gray-300 hover:bg-white hover:shadow-sm"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                    <ArrowUpRight className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </div>
                  <p className="text-xs text-gray-500">{item.type} · {item.subtitle}</p>
                  <p className="text-xs text-gray-400">{formatDateTime(item.date)}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-sm font-semibold text-gray-900">{item.amount}</p>
                  <span className="text-xs text-gray-500">{item.status}</span>
                </div>
              </Link>
            ))}

            <div className="rounded-2xl border border-gray-200/70 bg-white px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500">Balance de ventas mensual</p>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-lg font-semibold text-gray-900">
                  {dashboardLoading ? '...' : formatCurrency(dashboardData?.salesMonth.value ?? 0)}
                </p>
                <p className={cn('text-sm font-semibold', (salesDelta ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700')}>
                  {salesDelta != null ? `${salesDelta >= 0 ? '+' : ''}${salesDelta}%` : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}