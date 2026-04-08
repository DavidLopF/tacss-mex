'use client';

import { useState, useMemo } from 'react';
import { Pedido, EstadoPedido } from '@/types';
import { OrderStatusCode } from '@/services/orders';
import { Badge, Button } from '@/components/ui';
import { Eye, Send, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { useCfdiStore } from '@/stores';
import { ChangeStatusMenu } from './change-status-menu';

interface OrdersTableProps {
  pedidos: Pedido[];
  onOrderClick: (pedido: Pedido) => void;
  onOrderUpdate: (pedido: Pedido, nuevoEstado: EstadoPedido) => void;
  onStatusChange?: (orderId: string, newStatusCode: OrderStatusCode) => Promise<void>;
  onEmitirCFDI?: (pedido: Pedido) => void;
}

type StatusTab = 'todos' | EstadoPedido;

const STATUS_TABS: { key: StatusTab; label: string; color: string }[] = [
  { key: 'todos', label: 'Todos', color: 'text-gray-700' },
  { key: 'cotizado', label: 'Cotizado', color: 'text-blue-700' },
  { key: 'transmitido', label: 'Transmitido', color: 'text-purple-700' },
  { key: 'en_curso', label: 'En Curso', color: 'text-orange-700' },
  { key: 'enviado', label: 'Enviado', color: 'text-cyan-700' },
  { key: 'cancelado', label: 'Cancelado', color: 'text-red-700' },
];

const CFDI_STATUS_BADGE = {
  no_facturado: { variant: 'default' as const, label: 'Sin facturar' },
  en_proceso: { variant: 'warning' as const, label: 'En proceso' },
  facturado: { variant: 'success' as const, label: 'Facturado' },
  cancelado: { variant: 'danger' as const, label: 'Cancelado' },
};

const ESTADO_COLORS: Record<EstadoPedido, { bg: string; text: string; badge: string }> = {
  cotizado: { bg: 'bg-blue-50', text: 'text-blue-700', badge: 'default' },
  transmitido: { bg: 'bg-purple-50', text: 'text-purple-700', badge: 'default' },
  en_curso: { bg: 'bg-orange-50', text: 'text-orange-700', badge: 'warning' },
  enviado: { bg: 'bg-cyan-50', text: 'text-cyan-700', badge: 'default' },
  cancelado: { bg: 'bg-red-50', text: 'text-red-700', badge: 'danger' },
  pagado: { bg: 'bg-green-50', text: 'text-green-700', badge: 'success' },
};

export function OrdersTable({ pedidos, onOrderClick, onStatusChange, onEmitirCFDI }: OrdersTableProps) {
  const [activeTab, setActiveTab] = useState<StatusTab>('todos');
  const [page, setPage] = useState(1);
  const [showOnlyNotBilled, setShowOnlyNotBilled] = useState(false);

  const cfdiStatuses = useCfdiStore((s) => s.cfdiStatuses);

  // Conteo por estado
  const counts = useMemo(() => {
    const c: Record<string, number> = { todos: pedidos.length };
    for (const p of pedidos) {
      c[p.estado] = (c[p.estado] || 0) + 1;
    }
    return c;
  }, [pedidos]);

  // Filtrar por tab activo
  const filteredPedidos = useMemo(() => {
    let result = activeTab === 'todos'
      ? pedidos
      : pedidos.filter((p) => p.estado === activeTab);

    // Filtro "Solo no facturados"
    if (showOnlyNotBilled) {
      result = result.filter((p) => {
        const cfdiStatus = cfdiStatuses[p.id];
        return !cfdiStatus || cfdiStatus.invoiceStatus === 'no_facturado';
      });
    }

    return result;
  }, [pedidos, activeTab, showOnlyNotBilled, cfdiStatuses]);

  // Paginación
  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredPedidos.length / itemsPerPage));
  const safePage = Math.min(page, totalPages);
  const paginatedPedidos = useMemo(() => {
    const start = (safePage - 1) * itemsPerPage;
    return filteredPedidos.slice(start, start + itemsPerPage);
  }, [filteredPedidos, safePage]);

  const handleTabChange = (tab: StatusTab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  };

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

  const getCfdiStatusForOrder = (pedidoId: string) => {
    return cfdiStatuses[pedidoId] || { invoiceStatus: 'no_facturado' };
  };

  const canEmitirCFDI = (pedido: Pedido) => {
    const cfdiStatus = getCfdiStatusForOrder(pedido.id);
    return pedido.estado === 'enviado' && cfdiStatus.invoiceStatus !== 'facturado';
  };

  return (
    <div className="space-y-4">
      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const count = counts[tab.key] ?? 0;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? `${ESTADO_COLORS[tab.key as EstadoPedido]?.bg || 'bg-gray-100'} ${tab.color}`
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
              }`}
            >
              {tab.label} <span className="ml-1 font-semibold">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Filtro "Solo no facturados" */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showOnlyNotBilled}
            onChange={(e) => {
              setShowOnlyNotBilled(e.target.checked);
              setPage(1);
            }}
            className="w-4 h-4 rounded border-gray-300"
          />
          <span className="text-sm text-gray-600">Solo no facturados</span>
        </label>
      </div>

      {/* Table */}
      {paginatedPedidos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Inbox className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">No hay pedidos para mostrar</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Pedido</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Cliente</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Est. Logística</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-900">Total</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-900">Est. CFDI</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-900">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPedidos.map((pedido) => {
                const cfdiStatus = getCfdiStatusForOrder(pedido.id);
                const estatoColors = ESTADO_COLORS[pedido.estado];
                const cfdiInfo = CFDI_STATUS_BADGE[cfdiStatus.invoiceStatus];

                return (
                  <tr key={pedido.id} className="border-b border-gray-100 hover:bg-gray-50">
                    {/* Pedido */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onOrderClick(pedido)}
                        className="font-mono font-semibold text-blue-600 hover:text-blue-800"
                      >
                        {pedido.numero}
                      </button>
                    </td>

                    {/* Cliente */}
                    <td className="px-4 py-3 text-gray-700">{pedido.clienteNombre}</td>

                    {/* Est. Logística */}
                    <td className="px-4 py-3">
                      <Badge variant={estatoColors?.badge === 'warning' ? 'warning' : 'default'} className="text-xs">
                        {pedido.estado.charAt(0).toUpperCase() + pedido.estado.slice(1).replace(/_/g, ' ')}
                      </Badge>
                    </td>

                    {/* Total */}
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {formatCurrency(pedido.total)}
                    </td>

                    {/* Est. CFDI */}
                    <td className="px-4 py-3 text-center">
                      <Badge variant={cfdiInfo.variant} className="text-xs">
                        {cfdiInfo.label}
                      </Badge>
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onOrderClick(pedido)}
                          className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {canEmitirCFDI(pedido) && onEmitirCFDI && (
                          <button
                            onClick={() => onEmitirCFDI(pedido)}
                            className="p-1 text-green-600 hover:text-green-800 hover:bg-green-100 rounded transition-colors"
                            title="Emitir CFDI"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}

                        {onStatusChange && (
                          <ChangeStatusMenu
                            currentStatusCode={getStatusCodeFromEstado(pedido.estado)}
                            onChangeStatus={(code) => onStatusChange(pedido.id, code)}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(safePage - 1)}
            disabled={safePage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-600">
            Página {safePage} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(safePage + 1)}
            disabled={safePage === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
