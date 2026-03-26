import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
import { DashboardRecentOrder } from '@/services/dashboard';
import { formatCurrency, formatDateTime } from '@/lib/utils';

interface RecentOrdersProps {
  pedidos: DashboardRecentOrder[];
}

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

const estadoVariants: Record<string, BadgeVariant> = {
  COTIZADO: 'info',
  TRANSMITIDO: 'default',
  EN_CURSO: 'warning',
  ENVIADO: 'success',
  CANCELADO: 'danger',
};

const estadoLabels: Record<string, string> = {
  COTIZADO: 'Cotizado',
  TRANSMITIDO: 'Transmitido',
  EN_CURSO: 'En Curso',
  ENVIADO: 'Enviado',
  CANCELADO: 'Cancelado',
};

export function RecentOrders({ pedidos }: RecentOrdersProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Pedidos Recientes</CardTitle>
        <a href="/pedidos" className="text-sm text-primary hover:text-primary/80 font-medium">
          Ver todos
        </a>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Pedido
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Cliente
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Total
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Estado
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pedidos.map((pedido) => (
                <tr key={pedido.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-primary">{pedido.code}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900">{pedido.client}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(pedido.total)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={estadoVariants[pedido.statusCode] ?? 'default'}>
                      {estadoLabels[pedido.statusCode] ?? pedido.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">{formatDateTime(new Date(pedido.createdAt))}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
