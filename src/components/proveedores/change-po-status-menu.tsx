'use client';

import { useState } from 'react';
import { MoreVertical, Check, X, ArrowRight } from 'lucide-react';
import {
  PurchaseOrderStatus,
  PURCHASE_ORDER_STATUS_LABELS,
  PURCHASE_ORDER_STATUS_COLORS,
  PO_STATUS_TRANSITION_RULES,
  canTransitionPO,
  getAvailablePOTransitions,
} from '@/src/services/suppliers';

interface ChangePOStatusMenuProps {
  currentStatus: PurchaseOrderStatus;
  onChangeStatus: (newStatus: PurchaseOrderStatus) => Promise<void>;
}

const STATUS_ICON_COLORS: Record<PurchaseOrderStatus, string> = {
  draft: 'text-gray-700 hover:bg-gray-50',
  sent: 'text-blue-700 hover:bg-blue-50',
  confirmed: 'text-purple-700 hover:bg-purple-50',
  partial: 'text-orange-700 hover:bg-orange-50',
  received: 'text-green-700 hover:bg-green-50',
  cancelled: 'text-red-700 hover:bg-red-50',
};

export function ChangePOStatusMenu({ currentStatus, onChangeStatus }: ChangePOStatusMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  const availableTransitions = getAvailablePOTransitions(currentStatus);

  const handleStatusChange = async (newStatus: PurchaseOrderStatus) => {
    const validation = canTransitionPO(currentStatus, newStatus);

    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    try {
      setIsChanging(true);
      await onChangeStatus(newStatus);
      setIsOpen(false);
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      alert(error instanceof Error ? error.message : 'Error al cambiar estado');
    } finally {
      setIsChanging(false);
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
        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
        title="Cambiar estado"
        disabled={isChanging}
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          {/* Overlay para cerrar al hacer clic fuera */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Menú desplegable */}
          <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[220px] z-20">
            {/* Header */}
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                Cambiar estado
                <ArrowRight className="w-3 h-3" />
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Actual: <span className={`font-semibold ${PURCHASE_ORDER_STATUS_COLORS[currentStatus].replace('bg-', 'text-').split(' ')[1]}`}>
                  {PURCHASE_ORDER_STATUS_LABELS[currentStatus]}
                </span>
              </p>
            </div>

            {/* Opciones */}
            {availableTransitions.map((status) => (
              <button
                key={status}
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusChange(status);
                }}
                disabled={isChanging}
                className={`w-full px-3 py-2 text-left text-sm font-medium transition-colors flex items-center justify-between gap-2 ${STATUS_ICON_COLORS[status]} disabled:opacity-50`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${PURCHASE_ORDER_STATUS_COLORS[status].split(' ')[0]}`} />
                  <span>{PO_STATUS_TRANSITION_RULES[status].label}</span>
                </div>
                <Check className="w-4 h-4 opacity-0 group-hover:opacity-100" />
              </button>
            ))}

            {/* Cerrar */}
            <div className="border-t border-gray-100 mt-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <X className="w-3.5 h-3.5" />
                Cerrar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
