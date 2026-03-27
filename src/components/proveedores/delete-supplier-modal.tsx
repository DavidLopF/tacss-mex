'use client';

import { AlertTriangle } from 'lucide-react';
import { Modal, Button } from '@/src/components/ui';
import { SupplierDetail } from '@/src/services/suppliers';

interface DeleteSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  supplier: SupplierDetail | null;
  submitting?: boolean;
}

export function DeleteSupplierModal({ isOpen, onClose, onConfirm, supplier, submitting }: DeleteSupplierModalProps) {
  if (!supplier) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmar Eliminación" size="md">
      <div className="space-y-4">
        {/* Icono de advertencia */}
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        {/* Mensaje */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            ¿Está seguro de eliminar este proveedor?
          </h3>
          <p className="text-gray-600 mb-4">
            El proveedor será desactivado y no podrá asignarse a nuevas órdenes de compra.
          </p>
        </div>

        {/* Información del proveedor */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Nombre:</span>
              <span className="text-sm text-gray-900 font-semibold">{supplier.name}</span>
            </div>
            {supplier.rfc && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">RFC:</span>
                <span className="text-sm text-gray-900 font-mono">{supplier.rfc}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Órdenes de Compra:</span>
              <span className="text-sm text-gray-900 font-semibold">{supplier.totalPurchases}</span>
            </div>
          </div>
        </div>

        {/* Advertencia */}
        {supplier.totalPurchases > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800 text-center">
              ⚠️ Este proveedor tiene {supplier.totalPurchases} orden{supplier.totalPurchases > 1 ? 'es' : ''} de compra asociada{supplier.totalPurchases > 1 ? 's' : ''}. El proveedor será desactivado pero sus órdenes se mantendrán.
            </p>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex items-center gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={submitting}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm} className="flex-1" disabled={submitting}>
            {submitting ? 'Eliminando...' : 'Eliminar Proveedor'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
