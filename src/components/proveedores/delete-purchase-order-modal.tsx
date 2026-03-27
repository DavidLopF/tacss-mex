'use client';

import { AlertTriangle } from 'lucide-react';
import { Modal, Button } from '@/src/components/ui';
import { PurchaseOrder, PURCHASE_ORDER_STATUS_LABELS } from '@/src/services/suppliers';
import { formatCurrency } from '@/src/lib/utils';

interface DeletePurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  order: PurchaseOrder | null;
  submitting?: boolean;
}

export function DeletePurchaseOrderModal({ isOpen, onClose, onConfirm, order, submitting }: DeletePurchaseOrderModalProps) {
  if (!order) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cancelar Orden de Compra" size="md">
      <div className="space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            ¿Está seguro de cancelar esta orden?
          </h3>
          <p className="text-gray-600 mb-4">
            La orden de compra será cancelada y no se podrá revertir.
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Código:</span>
              <span className="text-sm text-gray-900 font-semibold font-mono">{order.code}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Proveedor:</span>
              <span className="text-sm text-gray-900 font-semibold">{order.supplierName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Estado:</span>
              <span className="text-sm text-gray-900">{PURCHASE_ORDER_STATUS_LABELS[order.status]}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Total:</span>
              <span className="text-sm text-gray-900 font-semibold">{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={submitting}>
            No, Mantener
          </Button>
          <Button variant="danger" onClick={onConfirm} className="flex-1" disabled={submitting}>
            {submitting ? 'Cancelando...' : 'Sí, Cancelar Orden'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
