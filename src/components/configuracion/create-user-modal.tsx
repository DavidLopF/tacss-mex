'use client';

import { useState, useReducer } from 'react';
import { Modal, Button } from '@/components/ui';
import type { CreateUserDto, Role } from '@/services/users';
import { getAllRoles } from '@/services/users';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateUserDto) => void;
  submitting?: boolean;
}

type FormState = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  roleId: number | '';
};

type FormAction =
  | { type: 'setField'; field: keyof FormState; value: string | number | '' }
  | { type: 'reset' };

const initialFormState: FormState = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  roleId: '',
};

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'setField':
      return { ...state, [action.field]: action.value };
    case 'reset':
      return initialFormState;
    default:
      return state;
  }
}

export function CreateUserModal({ isOpen, onClose, onSave, submitting }: CreateUserModalProps) {
  const [formState, dispatch] = useReducer(formReducer, initialFormState);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [rolesError, setRolesError] = useState('');


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
    dispatch({ type: 'reset' });
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const passwordsMatch = formState.password === formState.confirmPassword;
  const isFormValid =
    formState.name.trim() &&
    formState.email.trim() &&
    isValidEmail(formState.email) &&
    formState.password.length >= 6 &&
    passwordsMatch &&
    formState.roleId !== '';

  const handleSubmit = () => {
    if (!isFormValid) return;

    onSave({
      fullName: formState.name.trim(),
      email: formState.email.trim(),
      password: formState.password,
      confirmPassword: formState.confirmPassword,
      roleId: formState.roleId as number,
    });

    handleReset();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nuevo Usuario" size="md" onOpen={loadRoles}>
      <div className="space-y-5">
        {/* Nombre */}
        <div>
          <label htmlFor="create-user-name" className="block text-sm font-medium text-zinc-700 mb-1">
            Nombre completo <span className="text-red-500">*</span>
          </label>
          <input
            id="create-user-name"
            type="text"
            value={formState.name}
            onChange={(e) => dispatch({ type: 'setField', field: 'name', value: e.target.value })}
            placeholder="Ej: Juan Pérez"
            className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="create-user-email" className="block text-sm font-medium text-zinc-700 mb-1">
            Correo electrónico <span className="text-red-500">*</span>
          </label>
          <input
            id="create-user-email"
            type="email"
            value={formState.email}
            onChange={(e) => dispatch({ type: 'setField', field: 'email', value: e.target.value })}
            placeholder="Ej: juan@empresa.com"
            className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {formState.email && !isValidEmail(formState.email) && (
            <p className="mt-1 text-xs text-red-500">Ingresa un correo electrónico válido</p>
          )}
        </div>

        {/* Rol */}
        <div>
          <label htmlFor="create-user-role" className="block text-sm font-medium text-zinc-700 mb-1">
            Rol <span className="text-red-500">*</span>
          </label>
          {loadingRoles ? (
            <div className="w-full px-3 py-2 border border-zinc-200 rounded-lg bg-zinc-50 text-sm text-zinc-400">
              Cargando roles…
            </div>
          ) : rolesError ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 border border-red-200 rounded-lg bg-red-50 text-sm text-red-600">
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
              id="create-user-role"
              value={formState.roleId}
              onChange={(e) =>
                dispatch({ type: 'setField', field: 'roleId', value: e.target.value ? Number(e.target.value) : '' })
              }
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Seleccionar rol…</option>
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
          <label htmlFor="create-user-password" className="block text-sm font-medium text-zinc-700 mb-1">
            Contraseña <span className="text-red-500">*</span>
          </label>
          <input
            id="create-user-password"
            type="password"
            value={formState.password}
            onChange={(e) => dispatch({ type: 'setField', field: 'password', value: e.target.value })}
            placeholder="Mínimo 6 caracteres"
            className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {formState.password && formState.password.length < 6 && (
            <p className="mt-1 text-xs text-red-500">La contraseña debe tener al menos 6 caracteres</p>
          )}
        </div>

        {/* Confirmar contraseña */}
        <div>
          <label htmlFor="create-user-confirm-password" className="block text-sm font-medium text-zinc-700 mb-1">
            Confirmar contraseña <span className="text-red-500">*</span>
          </label>
          <input
            id="create-user-confirm-password"
            type="password"
            value={formState.confirmPassword}
            onChange={(e) => dispatch({ type: 'setField', field: 'confirmPassword', value: e.target.value })}
            placeholder="Repetir contraseña"
            className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {formState.confirmPassword && !passwordsMatch && (
            <p className="mt-1 text-xs text-red-500">Las contraseñas no coinciden</p>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-3 pt-2">
          <Button variant="outline" onClick={handleClose} className="flex-1" disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className="flex-1" disabled={!isFormValid || submitting}>
            {submitting ? 'Creando…' : 'Crear Usuario'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
