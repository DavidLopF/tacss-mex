'use client';

import { useState, useEffect } from 'react';
import { Modal, Button } from '@/src/components/ui';
import type { CreateUserDto, Role } from '@/src/services/users';
import { getAllRoles } from '@/src/services/users';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateUserDto) => void;
  submitting?: boolean;
}

export function CreateUserModal({ isOpen, onClose, onSave, submitting }: CreateUserModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [roleId, setRoleId] = useState<number | ''>('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [rolesError, setRolesError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadRoles();
    }
  }, [isOpen]);

  const loadRoles = async () => {
    setLoadingRoles(true);
    setRolesError('');
    try {
      const allRoles = await getAllRoles();
      setRoles(allRoles.filter(r => r.isActive !== false));
    } catch (err) {
      console.error('Error al cargar roles:', err);
      setRolesError('No se pudieron cargar los roles');
    } finally {
      setLoadingRoles(false);
    }
  };

  const handleReset = () => {
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setRoleId('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const passwordsMatch = password === confirmPassword;
  const isFormValid = name.trim() && email.trim() && isValidEmail(email) && password.length >= 6 && passwordsMatch && roleId !== '';

  const handleSubmit = () => {
    if (!isFormValid) return;

    onSave({
      fullName: name.trim(),
      email: email.trim(),
      password,
      confirmPassword,
      roleId: roleId as number,
    });

    handleReset();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nuevo Usuario" size="md">
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

        {/* Rol */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rol <span className="text-red-500">*</span>
          </label>
          {loadingRoles ? (
            <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-400">
              Cargando roles...
            </div>
          ) : rolesError ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 border border-red-200 rounded-lg bg-red-50 text-sm text-red-500">
                {rolesError}
              </div>
              <button
                type="button"
                onClick={loadRoles}
                className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800 underline whitespace-nowrap"
              >
                Reintentar
              </button>
            </div>
          ) : (
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Seleccionar rol...</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Contraseña */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contraseña <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {password && password.length < 6 && (
            <p className="mt-1 text-xs text-red-500">La contraseña debe tener al menos 6 caracteres</p>
          )}
        </div>

        {/* Confirmar contraseña */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirmar contraseña <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repetir contraseña"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {confirmPassword && !passwordsMatch && (
            <p className="mt-1 text-xs text-red-500">Las contraseñas no coinciden</p>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-3 pt-2">
          <Button variant="outline" onClick={handleClose} className="flex-1" disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className="flex-1" disabled={!isFormValid || submitting}>
            {submitting ? 'Creando...' : 'Crear Usuario'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
