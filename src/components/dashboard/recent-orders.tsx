import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/src/components/ui';
import { DashboardRecentOrder } from '@/src/services/dashboard';
import { formatCurrency, formatDateTime } from '@/src/lib/utils';
import { ArrowUpRight, Eye } from 'lucide-react';

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

function initialsOf(clientName: string): string {
  return clientName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() || '')
    .join('');
}

export function RecentOrders({ pedidos }: RecentOrdersProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Pedidos Recientes</CardTitle>
        <a href="/pedidos" className="text-sm text-primary hover:text-primary/80 font-medium">
          Ver todos
        </a>
      </CardHeader>
      <CardContent className="space-y-3">
        {pedidos.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-7 text-center text-sm text-gray-500">
            Sin pedidos recientes
          </div>
        )}

        {pedidos.map((pedido) => (
          <div
            key={pedido.id}
            className="group flex flex-col gap-4 rounded-2xl border border-gray-200/80 bg-white px-4 py-4 transition-all hover:-translate-y-0.5 hover:border-gray-300/80 hover:shadow-[0_14px_28px_rgba(15,23,42,0.1)] md:flex-row md:items-center md:justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-800 to-slate-600 text-xs font-semibold text-white">
                {initialsOf(pedido.client)}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{pedido.client}</p>
                <p className="text-xs text-gray-500">Pedido {pedido.code}</p>
                <p className="text-xs text-gray-400">{formatDateTime(new Date(pedido.createdAt))}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 md:gap-4">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(pedido.total)}</p>
                <Badge variant={estadoVariants[pedido.statusCode] ?? 'default'}>
                  {estadoLabels[pedido.statusCode] ?? pedido.status}
                </Badge>
              </div>

              <div className="flex items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                  aria-label={`Ver pedido ${pedido.code}`}
                >
                  <Eye className="h-4 w-4" />
                </button>
                <a
                  href="/pedidos"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                  aria-label="Ir a pedidos"
                >
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
