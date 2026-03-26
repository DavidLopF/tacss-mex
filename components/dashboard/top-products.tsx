import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { DashboardTopProduct } from '@/services/dashboard';
import { formatCurrency } from '@/lib/utils';

interface TopProductsProps {
  productos: DashboardTopProduct[];
}

export function TopProducts({ productos }: TopProductsProps) {
  const maxQty = productos.length > 0 ? Math.max(...productos.map(p => p.qtySold)) : 1;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Productos Más Vendidos</CardTitle>
        <a href="/inventario" className="text-sm text-primary hover:text-primary/80 font-medium">
          Ver todos
        </a>
      </CardHeader>
      <CardContent className="space-y-4">
        {productos.map((producto, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                  {index + 1}
                </span>
                <span className="text-sm font-medium text-gray-900 truncate max-w-[180px]">
                  {producto.name}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{formatCurrency(producto.revenue)}</p>
                <p className="text-xs text-gray-500">{producto.qtySold} vendidos</p>
              </div>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${(producto.qtySold / maxQty) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
