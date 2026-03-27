'use client';

import { useState } from 'react';
import { Modal, Button } from '@/src/components/ui';
import type { CreateRoleDto } from '@/src/services/users';

interface CreateRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateRoleDto) => void;
  submitting?: boolean;
}

export function CreateRoleModal({ isOpen, onClose, onSave, submitting }: CreateRoleModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleReset = () => {
    setName('');
    setDescription('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = () => {
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
    });

    handleReset();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nuevo Rol" size="md">
      <div className="space-y-5">
        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del rol <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Administrador, Vendedor, Supervisor"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descripción
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción breve del rol y sus permisos..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <p className="mt-1 text-xs text-gray-500">
            Opcional. Describe las responsabilidades de este rol.
          </p>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-3 pt-2">
          <Button variant="outline" onClick={handleClose} className="flex-1" disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className="flex-1" disabled={!name.trim() || submitting}>
            {submitting ? 'Creando...' : 'Crear Rol'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
