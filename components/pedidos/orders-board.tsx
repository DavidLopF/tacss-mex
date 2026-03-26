'use client';

import { useState, useMemo } from 'react';
import { Pedido, EstadoPedido } from '@/types';
import { OrderCard } from './order-card';
import { OrderStatusCode } from '@/services/orders';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';

interface OrdersBoardProps {
  pedidos: Pedido[];
  onOrderClick: (pedido: Pedido) => void;
  onOrderUpdate: (pedido: Pedido, nuevoEstado: EstadoPedido) => void;
  onStatusChange?: (orderId: string, newStatusCode: OrderStatusCode) => Promise<void>;
}

type StatusTab = 'todos' | EstadoPedido;

const STATUS_TABS: { key: StatusTab; label: string; color: string; dot: string }[] = [
  { key: 'todos', label: 'Todos', color: 'text-gray-700 border-gray-800', dot: 'bg-gray-500' },
  { key: 'cotizado', label: 'Cotizado', color: 'text-blue-700 border-blue-600', dot: 'bg-blue-500' },
  { key: 'transmitido', label: 'Transmitido', color: 'text-purple-700 border-purple-600', dot: 'bg-purple-500' },
  { key: 'en_curso', label: 'En Curso', color: 'text-orange-700 border-orange-600', dot: 'bg-orange-500' },
  { key: 'enviado', label: 'Enviado', color: 'text-cyan-700 border-cyan-600', dot: 'bg-cyan-500' },
  { key: 'cancelado', label: 'Cancelado', color: 'text-red-700 border-red-600', dot: 'bg-red-500' },
];

const ITEMS_PER_PAGE = 12;

export function OrdersBoard({ pedidos, onOrderClick, onStatusChange }: OrdersBoardProps) {
  const [activeTab, setActiveTab] = useState<StatusTab>('todos');
  const [page, setPage] = useState(1);

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
    if (activeTab === 'todos') return pedidos;
    return pedidos.filter((p) => p.estado === activeTab);
  }, [pedidos, activeTab]);

  // Paginación
  const totalPages = Math.max(1, Math.ceil(filteredPedidos.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginatedPedidos = useMemo(() => {
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    return filteredPedidos.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPedidos, safePage]);

  // Reset page on tab change
  const handleTabChange = (tab: StatusTab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  };

  return (
    <div className="space-y-4">
      {/* Status Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {STATUS_TABS.map((tab) => {
          const count = counts[tab.key] ?? 0;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                isActive
                  ? `bg-white shadow-sm border border-gray-200 ${tab.color.split(' ')[0]}`
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${isActive ? tab.dot : 'bg-gray-300'}`}
              />
              {tab.label}
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-gray-100 text-gray-700' : 'bg-gray-100 text-gray-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Cards Grid */}
      {paginatedPedidos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Inbox className="w-12 h-12 mb-3" />
          <p className="text-sm font-medium">No hay pedidos en este estado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {paginatedPedidos.map((pedido) => (
            <OrderCard
              key={pedido.id}
              pedido={pedido}
              onClick={() => onOrderClick(pedido)}
              onStatusChange={onStatusChange}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-500">
            Mostrando {((safePage - 1) * ITEMS_PER_PAGE) + 1}–
            {Math.min(safePage * ITEMS_PER_PAGE, filteredPedidos.length)} de {filteredPedidos.length} pedidos
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(safePage - 1)}
              disabled={safePage <= 1}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1,
              )
              .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === '...' ? (
                  <span key={`e-${i}`} className="px-1.5 text-xs text-gray-400">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p as number)}
                    className={`min-w-[32px] h-8 rounded-lg border text-sm transition-colors ${
                      p === safePage
                        ? 'bg-primary border-primary text-white font-medium'
                        : 'border-gray-200 hover:bg-white text-gray-700'
                    }`}
                  >
                    {p}
                  </button>
                ),
              )}
            <button
              onClick={() => handlePageChange(safePage + 1)}
              disabled={safePage >= totalPages}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
