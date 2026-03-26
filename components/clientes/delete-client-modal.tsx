'use client';

import { AlertTriangle } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { ClientDetail } from '@/services/clients';

interface DeleteClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  client: ClientDetail | null;
  submitting?: boolean;
}

export function DeleteClientModal({ isOpen, onClose, onConfirm, client, submitting }: DeleteClientModalProps) {
  if (!client) return null;

  const handleConfirm = () => {
    onConfirm();
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
            ¿Está seguro de eliminar este cliente?
          </h3>
          <p className="text-gray-600 mb-4">
            El cliente será desactivado y no podrá asignarse a nuevos pedidos.
          </p>
        </div>

        {/* Información del cliente */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Nombre:</span>
              <span className="text-sm text-gray-900 font-semibold">{client.name}</span>
            </div>
            {client.document && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Documento:</span>
                <span className="text-sm text-gray-900 font-mono">{client.document}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Total Pedidos:</span>
              <span className="text-sm text-gray-900 font-semibold">{client.totalOrders}</span>
            </div>
          </div>
        </div>

        {/* Advertencia */}
        {client.totalOrders > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800 text-center">
              ⚠️ Este cliente tiene {client.totalOrders} pedido{client.totalOrders > 1 ? 's' : ''} asociado{client.totalOrders > 1 ? 's' : ''}. El cliente será desactivado pero sus pedidos se mantendrán.
            </p>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            className="flex-1"
            disabled={submitting}
          >
            {submitting ? 'Eliminando...' : 'Eliminar Cliente'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
