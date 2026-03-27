import { Package, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import { StatCard } from '@/src/components/dashboard';
import { Producto } from '@/src/types';
import { ProductStatistics } from '@/src/services/products';

interface InventoryStatsProps {
  productos?: Producto[];
  statistics?: ProductStatistics;
}

export function InventoryStats({ productos, statistics }: InventoryStatsProps) {
  // Si tenemos estadísticas del servidor, usarlas; sino, calcular desde el array local
  const totalProductos = statistics?.totalProducts ?? (productos ?? []).length;
  const stockDisponible = statistics?.totalStockOnHand ?? (productos ?? []).reduce((sum, p) => sum + p.stockTotal, 0);
  const productosActivos = statistics?.activeProducts ?? (productos ?? []).filter(p => p.activo).length;
  const productosInactivos = statistics?.inactiveProducts ?? (productos ?? []).filter(p => !p.activo).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <StatCard
        title="Total Productos"
        value={totalProductos}
        icon={Package}
        iconClassName="bg-blue-100 text-blue-600"
      />
      <StatCard
        title="Stock Disponible"
        value={stockDisponible}
        icon={TrendingUp}
        iconClassName="bg-green-100 text-green-600"
      />
      <StatCard
        title="Productos Activos"
        value={productosActivos}
        icon={CheckCircle}
        iconClassName="bg-emerald-100 text-emerald-600"
      />
      <StatCard
        title="Productos Inactivos"
        value={productosInactivos}
        icon={XCircle}
        iconClassName="bg-gray-100 text-gray-600"
      />
    </div>
  );
}