'use client';

import { AlertTriangle } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import type { UserDetail } from '@/services/users';

interface DeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  user: UserDetail | null;
  submitting?: boolean;
}

export function DeleteUserModal({ isOpen, onClose, onConfirm, user, submitting }: DeleteUserModalProps) {
  if (!user) return null;

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
            ¿Está seguro de eliminar este usuario?
          </h3>
          <p className="text-gray-600 mb-4">
            El usuario será desactivado y no podrá acceder al sistema.
          </p>
        </div>

        {/* Información del usuario */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Nombre:</span>
              <span className="text-sm text-gray-900 font-semibold">{user.fullName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Email:</span>
              <span className="text-sm text-gray-900">{user.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Rol:</span>
              <span className="text-sm text-gray-900">{user.role?.name ?? '—'}</span>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={submitting}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm} className="flex-1" disabled={submitting}>
            {submitting ? 'Eliminando...' : 'Eliminar Usuario'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
