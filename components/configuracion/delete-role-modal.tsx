'use client';

import { AlertTriangle } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import type { Role } from '@/services/users';

interface DeleteRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  role: Role | null;
  submitting?: boolean;
}

export function DeleteRoleModal({ isOpen, onClose, onConfirm, role, submitting }: DeleteRoleModalProps) {
  if (!role) return null;

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
            ¿Está seguro de eliminar este rol?
          </h3>
          <p className="text-gray-600 mb-4">
            Esta acción no se puede deshacer. El rol será eliminado permanentemente.
          </p>
        </div>

        {/* Información del rol */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Nombre:</span>
              <span className="text-sm text-gray-900 font-semibold">{role.name}</span>
            </div>
            {role.description && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Descripción:</span>
                <span className="text-sm text-gray-900">{role.description}</span>
              </div>
            )}
            {role.usersCount !== undefined && role.usersCount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Usuarios asignados:</span>
                <span className="text-sm text-gray-900 font-semibold">{role.usersCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Advertencia si tiene usuarios */}
        {role.usersCount !== undefined && role.usersCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800 text-center">
              ⚠️ Este rol tiene {role.usersCount} usuario{role.usersCount > 1 ? 's' : ''} asignado{role.usersCount > 1 ? 's' : ''}.
              Deberás reasignar su rol antes de eliminar.
            </p>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex items-center gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={submitting}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm} className="flex-1" disabled={submitting}>
            {submitting ? 'Eliminando...' : 'Eliminar Rol'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
