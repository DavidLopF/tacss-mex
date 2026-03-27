import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/src/components/ui';
import { DashboardLowStockProduct } from '@/src/services/dashboard';
import { AlertTriangle } from 'lucide-react';

interface LowStockAlertProps {
  productos: DashboardLowStockProduct[];
}

export function LowStockAlert({ productos }: LowStockAlertProps) {
  return (
    <Card className="border-amber-200/80 bg-amber-50/70">
      <CardHeader className="flex flex-row items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-600" />
        <CardTitle className="text-amber-900">Stock Bajo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {productos.map((producto) => (
          <div
            key={producto.id}
            className="flex items-center justify-between rounded-2xl border border-amber-200 bg-white px-3 py-3"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">{producto.nombre}</p>
              <p className="text-xs text-gray-500">{producto.sku}</p>
            </div>
            <Badge variant="danger">{producto.stockTotal} unidades</Badge>
          </div>
        ))}
        <a
          href="/inventario?filter=stock-bajo"
          className="block text-center text-sm text-amber-700 hover:text-amber-800 font-medium pt-2"
        >
          Ver todos los productos con stock bajo
        </a>
      </CardContent>
    </Card>
  );
}

