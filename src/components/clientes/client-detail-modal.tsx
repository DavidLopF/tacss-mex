'use client';

import { User, FileText, Calendar, ShoppingCart, DollarSign } from 'lucide-react';
import { Modal, Badge } from '@/src/components/ui';
import { ClientDetail } from '@/src/services/clients';
import { formatCurrency, formatDateTime } from '@/src/lib/utils';

interface ClientDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: ClientDetail | null;
}

export function ClientDetailModal({ isOpen, onClose, client }: ClientDetailModalProps) {
  if (!client) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detalle del Cliente"
      size="lg"
    >
      <div className="space-y-6">
        {/* Header con avatar e info principal */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900">{client.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={client.isActive ? 'success' : 'danger'}>
                {client.isActive ? 'Activo' : 'Inactivo'}
              </Badge>
              {client.document && (
                <span className="text-sm text-gray-500 font-mono">{client.document}</span>
              )}
            </div>
          </div>
        </div>

        {/* Estadísticas del cliente */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Total Pedidos</span>
            </div>
            <p className="text-2xl font-bold text-primary/90">{client.totalOrders}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Total Gastado</span>
            </div>
            <p className="text-2xl font-bold text-green-900">{formatCurrency(client.totalSpent)}</p>
          </div>
        </div>

        {/* Información detallada */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Información</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-xs text-gray-500 block">Nombre</span>
                <span className="text-sm font-medium text-gray-900">{client.name}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-xs text-gray-500 block">Documento</span>
                <span className="text-sm font-medium text-gray-900">
                  {client.document || 'No especificado'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-xs text-gray-500 block">Fecha de Registro</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatDateTime(client.createdAt)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-xs text-gray-500 block">Última Actualización</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatDateTime(client.updatedAt)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Historial de precios */}
        {client.hystoricalPrices && client.hystoricalPrices.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              Historial de Precios
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {client.hystoricalPrices.map((price) => (
                <div
                  key={price.orderId}
                  className="bg-white rounded-lg p-3 border border-gray-200 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{price.variantName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">
                        Pedido #{price.orderCode}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">
                        {formatDateTime(price.orderDate)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">
                      {formatCurrency(price.unitPrice)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Cant: {price.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
