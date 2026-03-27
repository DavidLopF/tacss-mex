'use client';

import { useState } from 'react';
import { MoreVertical, Check, X } from 'lucide-react';
import {
  OrderStatusCode,
  ORDER_STATUS_LABELS,
  canTransitionToStatus,
  getAvailableTransitions,
} from '@/services/orders';

interface ChangeStatusMenuProps {
  currentStatusCode: string;
  onChangeStatus: (newStatusCode: OrderStatusCode) => Promise<void>;
}

export function ChangeStatusMenu({ currentStatusCode, onChangeStatus }: ChangeStatusMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  const availableTransitions = getAvailableTransitions(currentStatusCode);

  const handleStatusChange = async (newStatusCode: OrderStatusCode) => {
    const validation = canTransitionToStatus(currentStatusCode, newStatusCode);

    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    try {
      setIsChanging(true);
      await onChangeStatus(newStatusCode);
      setIsOpen(false);
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      alert(error instanceof Error ? error.message : 'Error al cambiar estado');
    } finally {
      setIsChanging(false);
    }
  };

  const getStatusLabel = (code: OrderStatusCode): string => {
    return ORDER_STATUS_LABELS[code] || 'Desconocido';
  };

  const getStatusColor = (code: OrderStatusCode): string => {
    switch (code) {
      case OrderStatusCode.COTIZADO:
        return 'text-blue-700 hover:bg-blue-50';
      case OrderStatusCode.TRANSMITIDO:
        return 'text-purple-700 hover:bg-purple-50';
      case OrderStatusCode.EN_CURSO:
        return 'text-orange-700 hover:bg-orange-50';
      case OrderStatusCode.ENVIADO:
        return 'text-cyan-700 hover:bg-cyan-50';
      case OrderStatusCode.CANCELADO:
        return 'text-red-700 hover:bg-red-50';
      default:
        return 'text-gray-700 hover:bg-gray-50';
    }
  };

  // Si no hay transiciones disponibles, no mostrar el menú
  if (availableTransitions.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        title="Cambiar estado"
        disabled={isChanging}
      >
        <MoreVertical className="w-4 h-4 text-gray-500" />
      </button>

      {isOpen && (
        <>
          {/* Overlay para cerrar al hacer clic fuera */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Menú desplegable */}
          <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[200px] z-20">
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-500">Cambiar estado a:</p>
            </div>

            {availableTransitions.map((statusCode) => (
              <button
                key={statusCode}
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusChange(statusCode);
                }}
                disabled={isChanging}
                className={`w-full px-3 py-2 text-left text-sm font-medium transition-colors flex items-center justify-between ${getStatusColor(
                  statusCode
                )} disabled:opacity-50`}
              >
                <span>{getStatusLabel(statusCode)}</span>
                <Check className="w-4 h-4" />
              </button>
            ))}

            <div className="border-t border-gray-100 mt-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancelar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
