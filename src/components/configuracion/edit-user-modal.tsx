'use client';

import { useState } from 'react';
import { Modal, Button } from '@/src/components/ui';
import type { UserDetail, UpdateUserDto } from '@/src/services/users';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: number, data: UpdateUserDto) => void;
  user: UserDetail | null;
  submitting?: boolean;
}

export function EditUserModal({ isOpen, onClose, onSave, user, submitting }: EditUserModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [lastUserId, setLastUserId] = useState<number | null>(null);

  // Sync state when user changes (replaces useEffect)
  if (user && user.id !== lastUserId) {
    setName(user.fullName);
    setEmail(user.email);
    setLastUserId(user.id);
  }

  const handleClose = () => {
    onClose();
  };

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = () => {
    if (!user || !name.trim() || !isValidEmail(email)) return;

    const updates: UpdateUserDto = {};

    if (name.trim() !== user.fullName) updates.fullName = name.trim();
    if (email.trim() !== user.email) updates.email = email.trim();

    // Si no hay cambios reales, solo cerramos
    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }

    onSave(user.id, updates);
  };

  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Editar Usuario" size="md">
      <div className="space-y-5">
        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre completo <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Juan Pérez"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Correo electrónico <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Ej: juan@empresa.com"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {email && !isValidEmail(email) && (
            <p className="mt-1 text-xs text-red-500">Ingresa un correo electrónico válido</p>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-3 pt-2">
          <Button variant="outline" onClick={handleClose} className="flex-1" disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1"
            disabled={!name.trim() || !isValidEmail(email) || submitting}
          >
            {submitting ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
