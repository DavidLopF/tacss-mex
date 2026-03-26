'use client';

import { useState } from 'react';
import { Pedido, EstadoPedido } from '@/types';
import { OrderCard } from './order-card';
import { OrderStatusCode } from '@/services/orders';

interface KanbanColumnProps {
  titulo?: string;
  estado: EstadoPedido;
  pedidos: Pedido[];
  color: string;
  onOrderClick: (pedido: Pedido) => void;
  onDrop: (pedido: Pedido, nuevoEstado: EstadoPedido) => void;
  onStatusChange?: (orderId: string, newStatusCode: OrderStatusCode) => Promise<void>;
}

export function KanbanColumn({ estado, pedidos, onOrderClick, onDrop, onStatusChange }: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Solo cambiar estado si realmente salimos del contenedor
    if (e.currentTarget === e.target) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    try {
      const pedidoData = e.dataTransfer.getData('application/json');
      const pedido = JSON.parse(pedidoData) as Pedido;
      
      // No permitir drop en la misma columna
      if (pedido.estado === estado) return;
      
      onDrop(pedido, estado);
    } catch (error) {
      console.error('Error al mover pedido:', error);
    }
  };

  return (
    <div 
      className={`w-[280px] flex-shrink-0 bg-gray-50 rounded-b-lg transition-all p-3 space-y-3 ${isDragOver ? 'ring-2 ring-blue-400 ring-offset-2 shadow-lg bg-blue-50' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {pedidos.length > 0 ? (
        pedidos.map((pedido) => (
          <OrderCard
            key={pedido.id}
            pedido={pedido}
            onClick={() => onOrderClick(pedido)}
            onStatusChange={onStatusChange}
          />
        ))
      ) : (
        <div className={`flex items-center justify-center h-32 text-sm border-2 border-dashed rounded-lg ${
          isDragOver ? 'border-blue-400 text-blue-600 bg-blue-50' : 'border-gray-200 text-gray-400'
        }`}>
          {isDragOver ? 'Suelta aquí' : 'Sin pedidos'}
        </div>
      )}
    </div>
  );
}
