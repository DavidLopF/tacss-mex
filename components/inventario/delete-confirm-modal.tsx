'use client';

import { AlertTriangle } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { Producto } from '@/types';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  producto: Producto | null;
}

export function DeleteConfirmModal({ isOpen, onClose, onConfirm, producto }: DeleteConfirmModalProps) {
  if (!producto) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirmar Eliminación"
      size="md"
    >
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
            ¿Está seguro de eliminar este producto?
          </h3>
          <p className="text-gray-600 mb-4">
            Esta acción no se puede deshacer. Se eliminará permanentemente:
          </p>
        </div>

        {/* Información del producto */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Producto:</span>
              <span className="text-sm text-gray-900 font-semibold">{producto.nombre}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">SKU:</span>
              <span className="text-sm text-gray-900 font-mono">{producto.sku}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Categoría:</span>
              <span className="text-sm text-gray-900">{producto.categoria}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Stock Total:</span>
              <span className="text-sm text-gray-900 font-semibold">{producto.stockTotal} unidades</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Variaciones:</span>
              <span className="text-sm text-gray-900">{producto.variaciones.length} variaciones</span>
            </div>
          </div>
        </div>

        {/* Advertencia */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800 text-center">
            ⚠️ Se eliminarán todas las variaciones y el historial asociado a este producto
          </p>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            Eliminar Producto
          </Button>
        </div>
      </div>
    </Modal>
  );
}
