import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui';
import { DashboardTopProduct } from '@/src/services/dashboard';
import { formatCurrency } from '@/src/lib/utils';

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
          <div key={index} className="space-y-2 rounded-2xl border border-gray-200/80 bg-[#fbfcf8] p-3">
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 items-start gap-3 pr-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900/7 text-xs font-semibold text-gray-700">
                  {index + 1}
                </span>
                <span className="text-sm font-medium leading-snug text-gray-900 break-words" title={producto.name}>
                  {producto.name}
                </span>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-medium text-gray-900">{formatCurrency(producto.revenue)}</p>
                <p className="text-xs text-gray-500">{producto.qtySold} vendidos</p>
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200/70">
              <div
                className="h-full rounded-full bg-primary/80 transition-all"
                style={{ width: `${(producto.qtySold / maxQty) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
