import { Package, AlertTriangle, TrendingUp, BarChart2 } from 'lucide-react';
import { StatCard } from './stat-card';
import { TopProducts } from './top-products';
import { LowStockAlert } from './low-stock-alert';
import { DashboardSummary } from '@/services/dashboard';
import { formatCurrency } from '@/lib/utils';

interface InventarioTabProps {
  data: DashboardSummary;
  loading: boolean;
}

export function InventarioTab({ data, loading }: InventarioTabProps) {
  const topRevenue = data.topProducts.reduce((sum, p) => sum + p.revenue, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Productos"
          value={loading ? '...' : data.totalProducts}
          icon={Package}
          iconClassName="bg-blue-100 text-blue-600"
        />
        <StatCard
          title="Con Stock Bajo"
          value={loading ? '...' : data.lowStockCount}
          icon={AlertTriangle}
          iconClassName="bg-red-100 text-red-600"
        />
        <StatCard
          title="Productos Más Vendidos"
          value={loading ? '...' : data.topProducts.length}
          icon={TrendingUp}
          iconClassName="bg-emerald-100 text-emerald-600"
        />
        <StatCard
          title="Ingresos por Top Productos"
          value={loading ? '...' : formatCurrency(topRevenue)}
          icon={BarChart2}
          iconClassName="bg-violet-100 text-violet-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TopProducts productos={data.topProducts} />
        </div>
        <LowStockAlert productos={data.lowStock} />
      </div>
    </div>
  );
}
