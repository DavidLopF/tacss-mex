'use client';

import { useState } from 'react';
import { Modal, Button } from '@/src/components/ui';
import type { Role, UpdateRoleDto } from '@/src/services/users';

interface EditRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: number, data: UpdateRoleDto) => void;
  role: Role | null;
  submitting?: boolean;
}

export function EditRoleModal({ isOpen, onClose, onSave, role, submitting }: EditRoleModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [lastRoleId, setLastRoleId] = useState<number | null>(null);

  // Sync state when role changes (replaces useEffect)
  if (role && role.id !== lastRoleId) {
    setName(role.name);
    setDescription(role.description || '');
    setLastRoleId(role.id);
  }

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = () => {
    if (!role || !name.trim()) return;

    onSave(role.id, {
      name: name.trim(),
      description: description.trim() || undefined,
    });
  };

  if (!role) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Editar Rol" size="md">
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
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-3 pt-2">
          <Button variant="outline" onClick={handleClose} className="flex-1" disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className="flex-1" disabled={!name.trim() || submitting}>
            {submitting ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
