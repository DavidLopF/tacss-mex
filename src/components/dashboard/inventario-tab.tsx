import { Package, AlertTriangle, TrendingUp, BarChart2 } from 'lucide-react';
import { StatCard } from './stat-card';
import { TopProducts } from './top-products';
import { LowStockAlert } from './low-stock-alert';
import { DashboardSummary } from '@/src/services/dashboard';
import { formatCurrency } from '@/src/lib/utils';

interface InventarioTabProps {
  data: DashboardSummary;
  loading: boolean;
}

export function InventarioTab({ data, loading }: InventarioTabProps) {
  const topRevenue = data.topProducts.reduce((sum, p) => sum + p.revenue, 0);
  const topProductTrend = data.topProducts.map((product) => product.qtySold);
  const lowStockTrend = [
    Math.max(data.lowStockCount - 3, 0),
    Math.max(data.lowStockCount - 1, 0),
    data.lowStockCount,
  ];

  return (
    <div className="space-y-7">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-12">
        <StatCard
          title="Total Productos"
          value={loading ? '...' : data.totalProducts}
          icon={Package}
          iconClassName="bg-blue-100 text-blue-600"
          sparklineData={topProductTrend}
          className="xl:col-span-4"
        />
        <StatCard
          title="Con Stock Bajo"
          value={loading ? '...' : data.lowStockCount}
          icon={AlertTriangle}
          iconClassName="bg-red-100 text-red-600"
          sparklineData={lowStockTrend}
          trendLabel="productos críticos"
          className="xl:col-span-2"
        />
        <StatCard
          title="Productos Más Vendidos"
          value={loading ? '...' : data.topProducts.length}
          icon={TrendingUp}
          iconClassName="bg-emerald-100 text-emerald-600"
          sparklineData={topProductTrend}
          className="xl:col-span-3"
        />
        <StatCard
          title="Ingresos por Top Productos"
          value={loading ? '...' : formatCurrency(topRevenue)}
          icon={BarChart2}
          iconClassName="bg-violet-100 text-violet-600"
          sparklineData={data.topProducts.map((product) => product.revenue)}
          className="xl:col-span-3"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <TopProducts productos={data.topProducts} />
        </div>
        <div className="lg:col-span-4">
          <LowStockAlert productos={data.lowStock} />
        </div>
      </div>
    </div>
  );
}
