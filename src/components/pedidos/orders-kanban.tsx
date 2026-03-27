'use client';

import { Pedido, EstadoPedido } from '@/types';
import { KanbanColumn } from './kanban-column';
import { OrderStatusCode } from '@/services/orders';

interface OrdersKanbanProps {
  pedidos: Pedido[];
  onOrderClick: (pedido: Pedido) => void;
  onOrderUpdate: (pedido: Pedido, nuevoEstado: EstadoPedido) => void;
  onStatusChange?: (orderId: string, newStatusCode: OrderStatusCode) => Promise<void>;
}

const columnas: Array<{ estado: EstadoPedido; titulo: string; color: string }> = [
  { estado: 'cotizado', titulo: 'Cotizado', color: 'blue' },
  { estado: 'transmitido', titulo: 'Transmitido', color: 'purple' },
  { estado: 'en_curso', titulo: 'En Curso', color: 'orange' },
  { estado: 'enviado', titulo: 'Enviado', color: 'cyan' },
  { estado: 'cancelado', titulo: 'Cancelado', color: 'red' },
];

export function OrdersKanban({ pedidos, onOrderClick, onOrderUpdate, onStatusChange }: OrdersKanbanProps) {
  const handleDrop = (pedido: Pedido, nuevoEstado: EstadoPedido) => {
    onOrderUpdate(pedido, nuevoEstado);
  };

  const getPedidosPorEstado = (estado: EstadoPedido) => {
    return pedidos.filter(p => p.estado === estado);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Contenedor con scroll horizontal */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <div className="inline-flex flex-col h-full min-w-full">
          {/* Headers fijos verticalmente */}
          <div className="sticky top-0 z-10 bg-white flex gap-4 p-1 pb-0 flex-shrink-0">
            {columnas.map((columna) => {
              const pedidosColumna = getPedidosPorEstado(columna.estado);
              const totalVentas = pedidosColumna.reduce((sum, p) => sum + p.total, 0);
              const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
                blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
                purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
                orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
                cyan: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' },
                green: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
                red: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
              };
              const colorClass = colorClasses[columna.color] || colorClasses.blue;

              return (
                <div key={`header-${columna.estado}`} className="w-[280px] flex-shrink-0">
                  <div className={`p-4 ${colorClass.bg} border-b-2 ${colorClass.border} rounded-t-lg`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`font-semibold ${colorClass.text}`}>{columna.titulo}</h3>
                      <span className={`${colorClass.bg} ${colorClass.text} text-xs font-bold px-2 py-1 rounded-full`}>
                        {pedidosColumna.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Total:</span>
                      <span className={`font-bold ${colorClass.text}`}>
                        ${(totalVentas / 1000).toFixed(1)}K
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Columnas de contenido */}
          <div className="flex gap-4 p-1 pt-0 flex-1">
            {columnas.map((columna) => (
              <KanbanColumn
                key={columna.estado}
                titulo={columna.titulo}
                estado={columna.estado}
                pedidos={getPedidosPorEstado(columna.estado)}
                color={columna.color}
                onOrderClick={onOrderClick}
                onDrop={handleDrop}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
