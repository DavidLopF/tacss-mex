import { DollarSign, ShoppingCart, TrendingUp, Users } from 'lucide-react';
import { StatCard } from './stat-card';
import { SalesChart } from './sales-chart';
import { RecentOrders } from './recent-orders';
import { DashboardSummary } from '@/src/services/dashboard';
import { formatCurrency } from '@/src/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui';

interface PedidosTabProps {
  data: DashboardSummary;
  loading: boolean;
}

export function PedidosTab({ data, loading }: PedidosTabProps) {
  const salesTrend = data.salesChart.map((day) => day.total);

  return (
    <div className="space-y-7">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-12">
        <StatCard
          title="Ventas del Mes"
          value={loading ? '...' : formatCurrency(data.salesMonth.value)}
          icon={DollarSign}
          trend={
            data.salesMonth.changePercent != null
              ? { value: data.salesMonth.changePercent, isPositive: data.salesMonth.changePercent >= 0 }
              : undefined
          }
          iconClassName="bg-green-100 text-green-600"
          sparklineData={salesTrend}
          className="xl:col-span-4"
        />
        <StatCard
          title="Pedidos Pendientes"
          value={loading ? '...' : data.pendingOrders}
          icon={ShoppingCart}
          iconClassName="bg-amber-100 text-amber-600"
          sparklineData={salesTrend.map((point, index) => Math.max(point - index * 200, 0))}
          trendLabel="colocaciones abiertas"
          className="xl:col-span-3"
        />
        <StatCard
          title="Ventas Hoy"
          value={loading ? '...' : formatCurrency(data.salesToday)}
          icon={TrendingUp}
          iconClassName="bg-emerald-100 text-emerald-600"
          sparklineData={salesTrend.slice(-4)}
          className="xl:col-span-3"
        />
        <StatCard
          title="Pedidos Hoy"
          value={loading ? '...' : data.ordersToday}
          icon={ShoppingCart}
          iconClassName="bg-indigo-100 text-indigo-600"
          sparklineData={[data.ordersToday * 0.35, data.ordersToday * 0.6, data.ordersToday * 0.9, data.ordersToday || 1]}
          className="xl:col-span-2"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <SalesChart data={data.salesChart} />
        <Card className="lg:col-span-4">
          <CardHeader className="pb-4">
            <CardTitle>Resumen Comercial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <div className="flex items-center justify-between rounded-2xl border border-gray-200/80 bg-[#fbfcf8] p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-600" />
                <span className="text-sm text-gray-700">Clientes nuevos (mes)</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {loading ? '...' : data.newClientsMonth}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-gray-200/80 bg-[#fbfcf8] p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-gray-700">Total clientes</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {loading ? '...' : data.totalClients.value}
              </span>
            </div>
            {data.totalClients.changePercent != null && (
              <div className="flex items-center justify-between rounded-2xl border border-gray-200/80 bg-[#fbfcf8] p-4">
                <span className="text-sm text-gray-700">Crecimiento clientes</span>
                <span
                  className={`text-sm font-semibold ${
                    data.totalClients.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {data.totalClients.changePercent >= 0 ? '+' : ''}
                  {data.totalClients.changePercent}%
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <RecentOrders pedidos={data.recentOrders} />
    </div>
  );
}
