'use client';

import { Calendar, User, Package, FileText } from 'lucide-react';
import { Badge } from '@/components/ui';
import { Pedido } from '@/src/types';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { ChangeStatusMenu } from './change-status-menu';
import { OrderStatusCode } from '@/src/services/orders';
import { useCfdiStore } from '@/src/stores';

interface OrderCardProps {
  pedido: Pedido;
  onClick: () => void;
  onStatusChange?: (orderId: string, newStatusCode: OrderStatusCode) => Promise<void>;
}

const estadoColors = {
  cotizado: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'default' as const, dot: 'bg-blue-500', label: 'Cotizado' },
  transmitido: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'default' as const, dot: 'bg-purple-500', label: 'Transmitido' },
  en_curso: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'warning' as const, dot: 'bg-orange-500', label: 'En Curso' },
  enviado: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', badge: 'default' as const, dot: 'bg-cyan-500', label: 'Enviado' },
  pagado: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'success' as const, dot: 'bg-green-500', label: 'Pagado' },
  cancelado: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'danger' as const, dot: 'bg-red-500', label: 'Cancelado' },
};

const CFDI_STATUS_BADGE = {
  no_facturado: { variant: 'default' as const, label: '📄 Sin facturar' },
  en_proceso: { variant: 'warning' as const, label: '⏳ En proceso' },
  facturado: { variant: 'success' as const, label: '✓ Facturado' },
  cancelado: { variant: 'danger' as const, label: '✗ Cancelado' },
};

export function OrderCard({ pedido, onClick, onStatusChange }: OrderCardProps) {
  const colors = estadoColors[pedido.estado];
  const cantidadTotal = pedido.lineas.reduce((sum, linea) => sum + linea.cantidad, 0);
  const cfdiStatuses = useCfdiStore((s) => s.cfdiStatuses);
  const cfdiStatus = cfdiStatuses[pedido.id] || { invoiceStatus: 'no_facturado' };
  const cfdiInfo = CFDI_STATUS_BADGE[cfdiStatus.invoiceStatus];

  // Mapeo de estado del frontend al código del backend
  const getStatusCodeFromEstado = (estado: string): string => {
    const mapping: Record<string, string> = {
      'cotizado': 'COTIZADO',
      'transmitido': 'TRANSMITIDO',
      'en_curso': 'EN_CURSO',
      'enviado': 'ENVIADO',
      'cancelado': 'CANCELADO',
    };
    return mapping[estado] || 'COTIZADO';
  };

  const handleStatusChange = async (newStatusCode: OrderStatusCode) => {
    if (onStatusChange) {
      await onStatusChange(pedido.id, newStatusCode);
    }
  };

  return (
    <div
      onClick={onClick}
      className={`w-full cursor-pointer rounded-2xl border p-4 ${colors.border} ${colors.bg} group flex flex-col transition-all hover:-translate-y-0.5 hover:shadow-lg`}
    >
      {/* Header */}
      <div className="mb-3 flex flex-shrink-0 items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <p className="font-mono text-sm font-semibold text-gray-900">{pedido.numero}</p>
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${colors.text} ${colors.bg} border ${colors.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
              {colors.label}
            </span>
          </div>
          <p className="flex items-center gap-1 text-xs text-gray-500">
            <Calendar className="w-3 h-3" />
            {formatDateTime(pedido.createdAt)}
          </p>
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0">
          {!pedido.transmitido && pedido.estado === 'cotizado' && (
            <Badge variant="warning" className="text-xs">
              Editable
            </Badge>
          )}
          
          {onStatusChange && (
            <ChangeStatusMenu
              currentStatusCode={getStatusCodeFromEstado(pedido.estado)}
              onChangeStatus={handleStatusChange}
            />
          )}
        </div>
      </div>

      {/* Cliente */}
      <div className="mb-3 flex-shrink-0 border-b border-gray-200 pb-3">
        <div className="mb-1 flex items-center gap-2">
          <User className="w-3 h-3 text-gray-500" />
          <p className="text-sm font-medium leading-snug text-gray-900 break-words">{pedido.clienteNombre}</p>
        </div>
        {pedido.clienteEmail && (
          <p className="ml-5 text-xs text-gray-500 break-all">{pedido.clienteEmail}</p>
        )}
        <div className="ml-5 mt-2 pt-2 border-t border-gray-200">
          <Badge variant={cfdiInfo.variant} className="text-xs">
            {cfdiInfo.label}
          </Badge>
        </div>
      </div>

      {/* Productos */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
          <span className="flex items-center gap-1">
            <Package className="w-3 h-3" />
            {pedido.lineas.length} {pedido.lineas.length === 1 ? 'producto' : 'productos'}
          </span>
          <span>{cantidadTotal} unidades</span>
        </div>
        
        <div className="space-y-1.5">
          {pedido.lineas.slice(0, 3).map((linea) => (
            <div key={linea.id} className="rounded-lg bg-white/70 px-2 py-1 text-xs text-gray-700">
              <span className="font-medium">{linea.cantidad}x</span>{' '}
              <span className="leading-snug break-words">{linea.productoNombre}</span>
            </div>
          ))}
          {pedido.lineas.length > 3 && (
            <p className="text-xs text-gray-500 italic">
              +{pedido.lineas.length - 3} más...
            </p>
          )}
        </div>
      </div>

      {/* Total */}
      <div className="flex flex-shrink-0 items-center justify-between border-t border-gray-200 pt-3">
        <span className="text-xs font-medium text-gray-600">Total:</span>
        <span className={`text-base font-bold ${colors.text}`}>
          {formatCurrency(pedido.total)}
        </span>
      </div>

      {/* Notas */}
      {pedido.notas && (
        <div className="mt-2 pt-2 border-t border-gray-200 flex-shrink-0">
          <div className="flex items-start gap-1">
            <FileText className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-600 line-clamp-2">{pedido.notas}</p>
          </div>
        </div>
      )}
    </div>
  );
}
