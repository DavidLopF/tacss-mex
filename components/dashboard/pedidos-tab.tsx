import { DollarSign, ShoppingCart, TrendingUp, Users } from 'lucide-react';
import { StatCard } from './stat-card';
import { SalesChart } from './sales-chart';
import { RecentOrders } from './recent-orders';
import { DashboardSummary } from '@/services/dashboard';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';

interface PedidosTabProps {
  data: DashboardSummary;
  loading: boolean;
}

export function PedidosTab({ data, loading }: PedidosTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
        />
        <StatCard
          title="Pedidos Pendientes"
          value={loading ? '...' : data.pendingOrders}
          icon={ShoppingCart}
          iconClassName="bg-amber-100 text-amber-600"
        />
        <StatCard
          title="Ventas Hoy"
          value={loading ? '...' : formatCurrency(data.salesToday)}
          icon={TrendingUp}
          iconClassName="bg-emerald-100 text-emerald-600"
        />
        <StatCard
          title="Pedidos Hoy"
          value={loading ? '...' : data.ordersToday}
          icon={ShoppingCart}
          iconClassName="bg-indigo-100 text-indigo-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SalesChart data={data.salesChart} />
        <Card>
          <CardHeader>
            <CardTitle>Resumen Comercial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span className="text-sm text-gray-700">Clientes nuevos (mes)</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {loading ? '...' : data.newClientsMonth}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-700">Total clientes</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {loading ? '...' : data.totalClients.value}
              </span>
            </div>
            {data.totalClients.changePercent != null && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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
