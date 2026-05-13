"use client";

import { useState, useEffect, useRef, useId } from "react";
import {
  Shield,
  Plus,
  ChevronRight,
  Check,
  Lock,
  Users,
  BarChart2,
  Package,
  ShoppingCart,
  Settings,
  AlertCircle,
  X,
} from "lucide-react";
import { Modal, Button } from "@/components/ui";
import type { UserDetail, Role, CreateRoleDto } from "@/services/users";
import { getAllRoles, createRole, getRolePermissions, updateRolePermissions } from "@/services/users";
import { HIDDEN_MODULES } from "@/lib/hooks";
import { cn } from "@/lib/utils";

// ── Metadatos visuales por moduleCode del backend ───────────────────────────
type IconComponent = React.ComponentType<{ className?: string }>;

const MODULE_META: Record<string, { icon: IconComponent; color: string }> = {
  DASHBOARD:  { icon: BarChart2,    color: "blue"   },
  PEDIDOS:    { icon: ShoppingCart, color: "orange" },
  INVENTARIO: { icon: Package,      color: "green"  },
  CLIENTES:   { icon: Users,        color: "purple" },
  CONFIG:     { icon: Settings,     color: "red"    },
};

// Etiquetas legibles para cada acción
const ACTION_LABELS: Record<string, string> = {
  canView:   "Ver",
  canCreate: "Crear",
  canEdit:   "Editar",
  canDelete: "Eliminar",
};

const MODULE_COLORS: Record<string, string> = {
  blue:   "text-blue-700 border-blue-200",
  green:  "text-green-700 border-green-200",
  orange: "text-orange-700 border-orange-200",
  purple: "text-purple-700 border-purple-200",
  red:    "text-red-700 border-red-200",
};

const MODULE_CHECK_COLORS: Record<string, string> = {
  blue:   "bg-blue-600",
  green:  "bg-green-600",
  orange: "bg-orange-500",
  purple: "bg-purple-600",
  red:    "bg-red-600",
};

type RolesState = {
  roleId: number | "";
  roles: Role[];
  loading: boolean;
  error: string;
};

type AssignRoleTabProps = {
  rolesState: RolesState;
  setRolesState: React.Dispatch<React.SetStateAction<RolesState>>;
  user: UserDetail;
  isAdmin: boolean;
  assignLabelId: string;
  loadRoles: () => Promise<void>;
  onAssign: () => void;
  onCreate: () => void;
  hasChanged: boolean;
  selectedRole?: Role;
  submitting?: boolean;
};

const AssignRoleTab = ({
  rolesState,
  setRolesState,
  user,
  isAdmin,
  assignLabelId,
  loadRoles,
  onAssign,
  onCreate,
  hasChanged,
  selectedRole,
  submitting,
}: AssignRoleTabProps) => (
  <div className="space-y-5">
    <div className="flex items-center justify-between p-3.5 bg-zinc-50 rounded-xl border border-zinc-200">
      <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
        Rol actual
      </span>
      <span className="inline-flex items-center gap-1.5 text-sm text-purple-700 bg-purple-100 px-2.5 py-1 rounded-full font-medium">
        <Shield className="size-3.5" />
        {user.role?.name ?? "Sin rol"}
      </span>
    </div>

    <div>
      <p id={assignLabelId} className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
        Seleccionar nuevo rol
      </p>
      {rolesState.loading ? (
        <div className="space-y-2">
          {[
            { id: "skeleton-1" },
            { id: "skeleton-2" },
            { id: "skeleton-3" },
          ].map((item) => (
            <div
              key={item.id}
              className="h-14 bg-zinc-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : rolesState.error ? (
        <div className="flex items-center justify-between gap-2 p-3.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 flex-shrink-0" />
            {rolesState.error}
          </div>
          <button
            onClick={loadRoles}
            className="text-xs underline font-medium"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1" aria-labelledby={assignLabelId}>
          {rolesState.roles.map((role) => {
            const isCurrent = role.id === user.role?.id;
            const isSelected = role.id === rolesState.roleId;
            return (
              <button
                key={role.id}
                onClick={() => setRolesState((prev) => ({ ...prev, roleId: isCurrent ? "" : role.id }))}
                disabled={isCurrent}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 text-left transition-all ${
                  isSelected && !isCurrent
                    ? "border-purple-500 bg-purple-50"
                    : isCurrent
                      ? "border-zinc-200 bg-zinc-50 cursor-default opacity-60"
                      : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`size-8 rounded-lg flex items-center justify-center ${
                      isSelected && !isCurrent
                        ? "bg-purple-100"
                        : "bg-zinc-100"
                    }`}
                  >
                    <Shield
                      className={`size-4 ${isSelected && !isCurrent ? "text-purple-600" : "text-zinc-400"}`}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900 flex items-center gap-2">
                      {role.name}
                      {isCurrent && (
                        <span className="text-xs text-zinc-400 font-normal">
                          (actual)
                        </span>
                      )}
                    </p>
                    {role.description && (
                      <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">
                        {role.description}
                      </p>
                    )}
                  </div>
                </div>
                {isSelected && !isCurrent ? (
                  <Check className="size-5 text-purple-600 flex-shrink-0" />
                ) : !isCurrent ? (
                  <ChevronRight className="size-4 text-zinc-300 flex-shrink-0" />
                ) : null}
              </button>
            );
          })}

          {isAdmin && (
            <button
              onClick={onCreate}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 border-dashed border-zinc-200 hover:border-purple-300 hover:bg-purple-50 transition-all group"
            >
              <div className="size-8 rounded-lg bg-zinc-100 group-hover:bg-purple-100 flex items-center justify-center transition-colors">
                <Plus className="size-4 text-zinc-400 group-hover:text-purple-600" />
              </div>
              <span className="text-sm text-zinc-400 group-hover:text-purple-600 font-medium transition-colors">
                Crear nuevo rol…
              </span>
            </button>
          )}
        </div>
      )}
    </div>

    {hasChanged && selectedRole && (
      <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-xl text-sm">
        <span className="text-purple-700 font-medium">
          {user.role?.name ?? "Sin rol"}
        </span>
        <ChevronRight className="size-4 text-purple-400 flex-shrink-0" />
        <span className="text-purple-700 font-semibold">
          {selectedRole.name}
        </span>
      </div>
    )}

    <div className="flex gap-3 pt-3">
      <Button
        variant="outline"
        onClick={onAssign}
        className="flex-1"
        disabled={!hasChanged || submitting}
      >
        {submitting ? "Asignando…" : "Asignar Rol"}
      </Button>
    </div>
  </div>
);

type CreateRoleTabProps = {
  isAdmin: boolean;
  onRoleCreate?: (data: CreateRoleDto) => Promise<Role | void>;
  onRoleCreated: (roleId: number) => void;
  onBack: () => void;
  loadRoles: () => Promise<void>;
};

const CreateRoleTab = ({ isAdmin, onRoleCreate, onRoleCreated, onBack, loadRoles }: CreateRoleTabProps) => {
  const [form, setForm] = useState({
    name: "",
    description: "",
    code: "",
    error: "",
    creating: false,
  });
  const nameId = useId();
  const descriptionId = useId();
  const codeId = useId();

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setForm((prev) => ({ ...prev, creating: true, error: "" }));
    try {
      const created = await (onRoleCreate
        ? onRoleCreate({
            name: form.name.trim(),
            description: form.description.trim() || undefined,
            code: form.code.trim() || undefined,
          })
        : createRole({
            name: form.name.trim(),
            description: form.description.trim() || undefined,
            code: form.code.trim() || undefined,
          }));

      setForm({ name: "", description: "", code: "", error: "", creating: false });
      await loadRoles();

      if (created && typeof created === "object" && "id" in created) {
        onRoleCreated((created as Role).id);
      }
      onBack();
    } catch (err) {
      setForm((prev) => ({
        ...prev,
        creating: false,
        error: err instanceof Error ? err.message : "Error al crear el rol",
      }));
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <div className="size-14 rounded-full bg-red-100 flex items-center justify-center">
          <Lock className="size-7 text-red-400" />
        </div>
        <p className="text-zinc-500 text-sm text-center">
          Solo los administradores pueden crear nuevos roles.
        </p>
      </div>
    );
  }

  return (
    <>
      {form.error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
          <AlertCircle className="size-4 flex-shrink-0" />
          {form.error}
        </div>
      )}

      <div>
        <label htmlFor={nameId} className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">
          Nombre del rol <span className="text-red-500 normal-case">*</span>
        </label>
        <input
          id={nameId}
          type="text"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="Ej: Supervisor, Vendedor, Almacenista…"
          className="w-full px-3.5 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
        />
      </div>

      <div>
        <label htmlFor={descriptionId} className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">
          Descripción
        </label>
        <textarea
          id={descriptionId}
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Describe las responsabilidades de este rol…"
          rows={3}
          className="w-full px-3.5 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none"
        />
      </div>

      <div>
        <label htmlFor={codeId} className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">
          Codigo
        </label>
        <textarea
          id={codeId}
          value={form.code}
          onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
          placeholder="Codigo del rol…"
          rows={3}
          className="w-full px-3.5 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none"
        />
      </div>

      {form.name.trim() && (
        <div className="flex items-center gap-3 p-3.5 bg-purple-50 border border-purple-200 rounded-xl">
          <div className="size-9 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
            <Shield className="size-5 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-purple-900">
              {form.name.trim()}
            </p>
            {form.description.trim() && (
              <p className="text-xs text-purple-600 mt-0.5">
                {form.description.trim()}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-3">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1"
          disabled={form.creating}
        >
          Volver
        </Button>
        <Button
          onClick={handleCreate}
          className="flex-1"
          disabled={!form.name.trim() || form.creating}
        >
          {form.creating ? "Creando…" : "Crear Rol"}
        </Button>
      </div>
    </>
  );
};

type PermissionsTabProps = {
  isAdmin: boolean;
  rolesState: RolesState;
  loadRoles: () => Promise<void>;
  onClose: () => void;
  submitting?: boolean;
  initialRoleId?: number;
};

const PermissionsTab = ({ isAdmin, rolesState, loadRoles, onClose, submitting, initialRoleId }: PermissionsTabProps) => {
  const [permsState, setPermsState] = useState({
    roleId: (initialRoleId ?? "") as number | "",
    backendModules: [] as import("@/services/users").RolePermission[],
    selectedPerms: new Set<string>(),
    loading: false,
    error: "",
    saving: false,
  });
  const permsRoleLabelId = useId();
  const permsRoleSelectId = useId();

  useEffect(() => {
    setPermsState((prev) => ({ ...prev, roleId: initialRoleId ?? "", selectedPerms: new Set() }));
  }, [initialRoleId]);

  const fetchPermissions = async (roleId: number) => {
    setPermsState((prev) => ({
      ...prev,
      loading: true,
      error: "",
      backendModules: [],
      selectedPerms: new Set(),
    }));
    try {
      const data = await getRolePermissions(roleId);
      const filteredData = data.filter((mod) => !HIDDEN_MODULES.has(mod.moduleCode));
      const active: string[] = [];
      for (const mod of filteredData) {
        if (mod.canView) active.push(`${mod.moduleCode}.canView`);
        if (mod.canCreate) active.push(`${mod.moduleCode}.canCreate`);
        if (mod.canEdit) active.push(`${mod.moduleCode}.canEdit`);
        if (mod.canDelete) active.push(`${mod.moduleCode}.canDelete`);
      }
      setPermsState((prev) => ({
        ...prev,
        backendModules: filteredData,
        selectedPerms: new Set(active),
      }));
    } catch (err) {
      console.error("Error cargando permisos:", err);
      setPermsState((prev) => ({ ...prev, error: "No se pudieron cargar los permisos del rol" }));
    } finally {
      setPermsState((prev) => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    if (permsState.roleId !== "") {
      fetchPermissions(permsState.roleId as number);
    }
  }, [permsState.roleId]);

  const togglePerm = (permId: string) => {
    setPermsState((prev) => {
      const next = new Set(prev.selectedPerms);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return { ...prev, selectedPerms: next };
    });
  };

  const toggleModule = (moduleCode: string) => {
    const actions = ["canView", "canCreate", "canEdit", "canDelete"];
    const keys = actions.map((a) => `${moduleCode}.${a}`);
    const allSelected = keys.every((k) => permsState.selectedPerms.has(k));
    setPermsState((prev) => {
      const next = new Set(prev.selectedPerms);
      keys.forEach((k) => {
        if (allSelected) next.delete(k);
        else next.add(k);
      });
      return { ...prev, selectedPerms: next };
    });
  };

  const handleSavePerms = async () => {
    if (permsState.roleId === "") return;
    setPermsState((prev) => ({ ...prev, saving: true, error: "" }));
    try {
      const permissions = permsState.backendModules.map((mod) => ({
        moduleId: mod.moduleId,
        canView: permsState.selectedPerms.has(`${mod.moduleCode}.canView`),
        canCreate: permsState.selectedPerms.has(`${mod.moduleCode}.canCreate`),
        canEdit: permsState.selectedPerms.has(`${mod.moduleCode}.canEdit`),
        canDelete: permsState.selectedPerms.has(`${mod.moduleCode}.canDelete`),
      }));
      await updateRolePermissions(permsState.roleId as number, { permissions });
      await fetchPermissions(permsState.roleId as number);
      onClose();
    } catch (err) {
      setPermsState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Error al guardar permisos",
      }));
    } finally {
      setPermsState((prev) => ({ ...prev, saving: false }));
    }
  };

  const permRole = rolesState.roles.find((r) => r.id === permsState.roleId);
  const totalPerms = permsState.backendModules.length * 4;

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <div className="size-14 rounded-full bg-red-100 flex items-center justify-center">
          <Lock className="size-7 text-red-400" />
        </div>
        <p className="text-zinc-500 text-sm text-center">
          Solo los administradores pueden gestionar permisos.
        </p>
      </div>
    );
  }

  return (
    <>
      <div>
        <label htmlFor={permsRoleSelectId} id={permsRoleLabelId} className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">
          Configurar permisos de
        </label>
        {rolesState.error ? (
          <div className="flex items-center justify-between gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 flex-shrink-0" />
              {rolesState.error}
            </div>
            <button
              onClick={loadRoles}
              className="text-xs underline font-medium"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <select
            id={permsRoleSelectId}
            value={permsState.roleId}
            onChange={(e) => {
              const id = e.target.value ? Number(e.target.value) : "";
              setPermsState((prev) => ({ ...prev, roleId: id, selectedPerms: new Set() }));
            }}
            aria-labelledby={permsRoleLabelId}
            className="w-full px-3.5 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
          >
            <option value="">Seleccionar rol…</option>
            {rolesState.roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {permsState.roleId !== "" && (
        <>
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span className="font-medium text-zinc-700">
              {permRole?.name}
            </span>
            <span>
              <span className="font-semibold text-purple-600">
                {permsState.selectedPerms.size}
              </span>
              /{totalPerms} permisos activos
            </span>
          </div>

          {permsState.loading ? (
            <div className="space-y-2">
              {[
                { id: "perm-skeleton-1" },
                { id: "perm-skeleton-2" },
                { id: "perm-skeleton-3" },
              ].map((item) => (
                <div key={item.id} className="h-12 bg-zinc-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : permsState.error ? (
            <div className="flex items-center justify-between gap-2 p-3.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-4 flex-shrink-0" />
                {permsState.error}
              </div>
              <button
                onClick={() => fetchPermissions(permsState.roleId as number)}
                className="text-xs underline font-medium"
              >
                Reintentar
              </button>
            </div>
          ) : (
            <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
              {permsState.backendModules.map((mod) => {
                const meta = MODULE_META[mod.moduleCode] ?? { icon: Settings, color: "blue" };
                const Icon = meta.icon;
                const colorClass = MODULE_COLORS[meta.color] ?? MODULE_COLORS.blue;
                const checkColor = MODULE_CHECK_COLORS[meta.color] ?? MODULE_CHECK_COLORS.blue;
                const actions = (["canView", "canCreate", "canEdit", "canDelete"] as const);
                const keys = actions.map((a) => `${mod.moduleCode}.${a}`);
                const allSelected = keys.every((k) => permsState.selectedPerms.has(k));
                const someSelected = keys.some((k) => permsState.selectedPerms.has(k));
                const activeCount = keys.filter((k) => permsState.selectedPerms.has(k)).length;

                return (
                  <div key={mod.moduleCode} className="border border-zinc-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleModule(mod.moduleCode)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 hover:bg-zinc-100 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border",
                            colorClass,
                          )}
                          style={{ background: "color-mix(in srgb, currentColor 12%, transparent)" }}
                        >
                          <Icon className="size-3" />
                          {mod.moduleName}
                        </span>
                        <span className="text-xs text-zinc-400">
                          {activeCount}/{actions.length}
                        </span>
                      </div>
                      <div className={`size-5 rounded flex items-center justify-center border-2 transition-all ${
                        allSelected
                          ? `${checkColor} border-transparent`
                          : someSelected
                            ? "bg-zinc-200 border-zinc-300"
                            : "bg-white border-zinc-300"
                      }`}>
                        {allSelected && <Check className="size-3 text-white" />}
                        {someSelected && !allSelected && <div className="w-2 h-0.5 bg-zinc-500 rounded" />}
                      </div>
                    </button>

                    <div className="divide-y divide-zinc-100">
                      {actions.map((action) => {
                        const key = `${mod.moduleCode}.${action}`;
                        const isActive = permsState.selectedPerms.has(key);
                        return (
                          <button
                            key={key}
                            onClick={() => togglePerm(key)}
                            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-zinc-50 transition-colors text-left"
                          >
                            <p className="text-sm text-zinc-800 font-medium">
                              {ACTION_LABELS[action]}
                            </p>
                            <div className={`size-5 rounded flex items-center justify-center border-2 flex-shrink-0 ml-3 transition-all ${
                              isActive
                                ? `${checkColor} border-transparent`
                                : "bg-white border-zinc-300"
                            }`}>
                              {isActive && <Check className="size-3 text-white" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-3 pt-3">
            <Button
              variant="outline"
              onClick={() => setPermsState((prev) => ({ ...prev, selectedPerms: new Set() }))}
              className="flex-shrink-0"
              disabled={submitting || permsState.selectedPerms.size === 0}
            >
              <X className="size-4 mr-1" />
              Limpiar
            </Button>
            <Button
              onClick={handleSavePerms}
              className="flex-1"
              disabled={submitting || permsState.saving || typeof permsState.roleId !== "number"}
            >
              {permsState.saving
                ? "Guardando…"
                : `Guardar Permisos (${permsState.selectedPerms.size})`}
            </Button>
          </div>
        </>
      )}
    </>
  );
};

// ── Tipos de tab dentro del modal ────────────────────────────────────────────
type ModalTab = "assign" | "create" | "permissions";

interface ChangeRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userId: number, roleId: number) => void;
  onRoleCreate?: (data: CreateRoleDto) => Promise<Role | void>;
  user: UserDetail | null;
  isAdmin?: boolean;
  submitting?: boolean;
}

export function ChangeRoleModal({
  isOpen,
  onClose,
  onSave,
  onRoleCreate,
  user,
  isAdmin = true,
  submitting,
}: ChangeRoleModalProps) {
  const [tab, setTab] = useState<ModalTab>("assign");
  const assignLabelId = useId();
  const createNameId = useId();
  const createDescriptionId = useId();
  const createCodeId = useId();
  const permsRoleLabelId = useId();
  const permsRoleSelectId = useId();

  // ── Assign tab state ──
  const [rolesState, setRolesState] = useState({
    roleId: "" as number | "",
    roles: [] as Role[],
    loading: false,
    error: "",
  });
  const lastUserIdRef = useRef<number | null>(null);
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    code: "",
    error: "",
    creating: false,
  });
  const [permsState, setPermsState] = useState({
    roleId: "" as number | "",
    backendModules: [] as import("@/services/users").RolePermission[],
    selectedPerms: new Set<string>(),
    loading: false,
    error: "",
    saving: false,
  });

  const fetchPermissions = async (roleId: number) => {
    setPermsState((prev) => ({
      ...prev,
      loading: true,
      error: "",
      backendModules: [],
      selectedPerms: new Set(),
    }));
    try {
      const data = await getRolePermissions(roleId);
      const filteredData = data.filter((mod) => !HIDDEN_MODULES.has(mod.moduleCode));
      const active: string[] = [];
      for (const mod of filteredData) {
        if (mod.canView) active.push(`${mod.moduleCode}.canView`);
        if (mod.canCreate) active.push(`${mod.moduleCode}.canCreate`);
        if (mod.canEdit) active.push(`${mod.moduleCode}.canEdit`);
        if (mod.canDelete) active.push(`${mod.moduleCode}.canDelete`);
      }
      setPermsState((prev) => ({
        ...prev,
        backendModules: filteredData,
        selectedPerms: new Set(active),
      }));
    } catch (err) {
      console.error("Error cargando permisos:", err);
      setPermsState((prev) => ({ ...prev, error: "No se pudieron cargar los permisos del rol" }));
    } finally {
      setPermsState((prev) => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    if (permsState.roleId !== "") {
      fetchPermissions(permsState.roleId as number);
    }
  }, [permsState.roleId]);

  const togglePerm = (permId: string) => {
    setPermsState((prev) => {
      const next = new Set(prev.selectedPerms);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return { ...prev, selectedPerms: next };
    });
  };

  const toggleAllPerms = (mod: import("@/services/users").RolePermission, keys: string[]) => {
    const allSelected = keys.every((k) => permsState.selectedPerms.has(k));
    setPermsState((prev) => {
      const next = new Set(prev.selectedPerms);
      if (allSelected) {
        keys.forEach((k) => next.delete(k));
      } else {
        keys.forEach((k) => next.add(k));
      }
      return { ...prev, selectedPerms: next };
    });
  };

  const toggleModule = (moduleCode: string) => {
    const actions = ["canView", "canCreate", "canEdit", "canDelete"];
    const keys = actions.map((a) => `${moduleCode}.${a}`);
    const allSelected = keys.every((k) => permsState.selectedPerms.has(k));
    setPermsState((prev) => {
      const next = new Set(prev.selectedPerms);
      keys.forEach((k) => {
        if (allSelected) next.delete(k);
        else next.add(k);
      });
      return { ...prev, selectedPerms: next };
    });
  };

  const handleSavePerms = async () => {
    if (permsState.roleId === "") return;
    setPermsState((prev) => ({ ...prev, saving: true, error: "" }));
    try {
      const permissions = permsState.backendModules.map((mod) => ({
        moduleId: mod.moduleId,
        canView: permsState.selectedPerms.has(`${mod.moduleCode}.canView`),
        canCreate: permsState.selectedPerms.has(`${mod.moduleCode}.canCreate`),
        canEdit: permsState.selectedPerms.has(`${mod.moduleCode}.canEdit`),
        canDelete: permsState.selectedPerms.has(`${mod.moduleCode}.canDelete`),
      }));
      await updateRolePermissions(permsState.roleId as number, { permissions });
      await fetchPermissions(permsState.roleId as number);
      setPermsState((prev) => ({
        ...prev,
        saving: false,
        error: "",
      }));
    } catch (err) {
      console.error("Error guardando permisos:", err);
      setPermsState((prev) => ({
        ...prev,
        saving: false,
        error: err instanceof Error ? err.message : "Error al guardar permisos",
      }));
    }
  };

  const handleOpen = () => {
    setTab("assign");
    setRolesState((prev) => ({
      ...prev,
      roleId: user?.role?.id ?? "",
      error: "",
    }));
    loadRoles();
  };

  const loadRoles = async () => {
    setRolesState((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const allRoles = await getAllRoles();
      setRolesState((prev) => ({
        ...prev,
        roles: allRoles.filter((r) => r.isActive !== false),
      }));
    } catch (err) {
      console.error("Error cargando roles:", err);
      setRolesState((prev) => ({ ...prev, error: "No se pudieron cargar los roles" }));
    } finally {
      setRolesState((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleClose = () => {
    setTab("assign");
    setCreateForm({
      name: "",
      description: "",
      code: "",
      error: "",
      creating: false,
    });
    onClose();
  };

  const handleCreateRole = async () => {
    if (!createForm.name.trim() || !onRoleCreate) return;
    setCreateForm((prev) => ({ ...prev, creating: true, error: "" }));
    try {
      const newRole = await onRoleCreate({
        name: createForm.name.trim(),
        description: createForm.description.trim(),
        code: createForm.code.trim(),
      });
      if (newRole && "id" in newRole) {
        setCreateForm({
          name: "",
          description: "",
          code: "",
          error: "",
          creating: false,
        });
        setTab("assign");
        setRolesState((prev) => ({
          ...prev,
          roleId: (newRole as Role).id,
        }));
        loadRoles();
      }
    } catch (err) {
      setCreateForm((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Error al crear rol",
        creating: false,
      }));
    }
  };

  // ── Assign ──
  const handleAssign = () => {
    if (!user || rolesState.roleId === "" || rolesState.roleId === user.role?.id) return;
    onSave(user.id, rolesState.roleId as number);
  };

  const hasChanged = user && rolesState.roleId !== "" && rolesState.roleId !== user.role?.id;
  const selectedRole = rolesState.roles.find((r) => r.id === rolesState.roleId);

  const totalPerms = rolesState.roles.length * 4;
  const permRole = rolesState.roles.find((r) => r.id === permsState.roleId);

  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="" size="lg" onOpen={handleOpen}>
      {/* ── Header custom ── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="size-11 rounded-xl bg-purple-100 flex items-center justify-center">
            <Shield className="size-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              Gestión de Roles
            </h2>
            <p className="text-sm text-zinc-500">
              Usuario:{" "}
              <span className="font-medium text-zinc-700">{user.fullName}</span>
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-100 rounded-xl p-1.5">
          <button
            onClick={() => setTab("assign")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-medium transition-all ${
              tab === "assign"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            <Shield className="size-3.5" />
            Asignar Rol
          </button>
          {isAdmin && (
            <button
              onClick={() => setTab("create")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-medium transition-all ${
                tab === "create"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              <Plus className="size-3.5" />
              Crear Rol
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setTab("permissions")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-medium transition-all ${
                tab === "permissions"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              <Lock className="size-3.5" />
              Permisos
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          TAB: ASIGNAR ROL
      ══════════════════════════════════════════════════════════ */}
      {tab === "assign" && (
        <div className="space-y-5">
          {/* Rol actual */}
          <div className="flex items-center justify-between p-3.5 bg-zinc-50 rounded-xl border border-zinc-200">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
              Rol actual
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm text-purple-700 bg-purple-100 px-2.5 py-1 rounded-full font-medium">
              <Shield className="size-3.5" />
              {user.role?.name ?? "Sin rol"}
            </span>
          </div>

          {/* Lista de roles */}
          <div>
            <label id={assignLabelId} className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
              Seleccionar nuevo rol
            </label>
            {rolesState.loading ? (
              <div className="space-y-2">
                {[
                  { id: "skeleton-1" },
                  { id: "skeleton-2" },
                  { id: "skeleton-3" },
                ].map((item) => (
                  <div
                    key={item.id}
                    className="h-14 bg-zinc-100 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : rolesState.error ? (
              <div className="flex items-center justify-between gap-2 p-3.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                <div className="flex items-center gap-2">
                  <AlertCircle className="size-4 flex-shrink-0" />
                  {rolesState.error}
                </div>
                <button
                  onClick={loadRoles}
                  className="text-xs underline font-medium"
                >
                  Reintentar
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1" aria-labelledby={assignLabelId}>
                {rolesState.roles.map((role) => {
                  const isCurrent = role.id === user.role?.id;
                  const isSelected = role.id === rolesState.roleId;
                  return (
                    <button
                      key={role.id}
                      onClick={() => setRolesState((prev) => ({ ...prev, roleId: isCurrent ? "" : role.id }))}
                      disabled={isCurrent}
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 text-left transition-all ${
                        isSelected && !isCurrent
                          ? "border-purple-500 bg-purple-50"
                          : isCurrent
                            ? "border-zinc-200 bg-zinc-50 cursor-default opacity-60"
                            : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`size-8 rounded-lg flex items-center justify-center ${
                            isSelected && !isCurrent
                              ? "bg-purple-100"
                              : "bg-zinc-100"
                          }`}
                        >
                          <Shield
                            className={`size-4 ${isSelected && !isCurrent ? "text-purple-600" : "text-zinc-400"}`}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-900 flex items-center gap-2">
                            {role.name}
                            {isCurrent && (
                              <span className="text-xs text-zinc-400 font-normal">
                                (actual)
                              </span>
                            )}
                          </p>
                          {role.description && (
                            <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">
                              {role.description}
                            </p>
                          )}
                        </div>
                      </div>
                      {isSelected && !isCurrent ? (
                        <Check className="size-5 text-purple-600 flex-shrink-0" />
                      ) : !isCurrent ? (
                        <ChevronRight className="size-4 text-zinc-300 flex-shrink-0" />
                      ) : null}
                    </button>
                  );
                })}

                {/* Crear nuevo */}
                {isAdmin && (
                  <button
                    onClick={() => setTab("create")}
                    className="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 border-dashed border-zinc-200 hover:border-purple-300 hover:bg-purple-50 transition-all group"
                  >
                    <div className="size-8 rounded-lg bg-zinc-100 group-hover:bg-purple-100 flex items-center justify-center transition-colors">
                      <Plus className="size-4 text-zinc-400 group-hover:text-purple-600" />
                    </div>
                  <span className="text-sm text-zinc-400 group-hover:text-purple-600 font-medium transition-colors">
                    Crear nuevo rol…
                  </span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Preview cambio */}
          {hasChanged && selectedRole && (
            <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-xl text-sm">
              <span className="text-purple-700 font-medium">
                {user.role?.name ?? "Sin rol"}
              </span>
              <ChevronRight className="size-4 text-purple-400 flex-shrink-0" />
              <span className="text-purple-700 font-semibold">
                {selectedRole.name}
              </span>
            </div>
          )}

          <div className="flex gap-3 pt-3">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAssign}
              className="flex-1"
              disabled={!hasChanged || submitting}
            >
                  {submitting ? "Asignando…" : "Asignar Rol"}
            </Button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB: CREAR ROL (solo admin)
      ══════════════════════════════════════════════════════════ */}
      {tab === "create" && (
        <div className="space-y-5">
          {!isAdmin ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <div className="size-14 rounded-full bg-red-100 flex items-center justify-center">
                  <Lock className="size-7 text-red-400" />
                </div>
                <p className="text-zinc-500 text-sm text-center">
                  Solo los administradores pueden crear nuevos roles.
                </p>
              </div>
            ) : (
            <>
              {createForm.error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                  <AlertCircle className="size-4 flex-shrink-0" />
                  {createForm.error}
                </div>
              )}

              <div>
                <label htmlFor={createNameId} className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">
                  Nombre del rol{" "}
                  <span className="text-red-500 normal-case">*</span>
                </label>
                <input
                  id={createNameId}
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Supervisor, Vendedor, Almacenista…"
                  className="w-full px-3.5 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              <div>
                <label htmlFor={createDescriptionId} className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">
                  Descripción
                </label>
                <textarea
                  id={createDescriptionId}
                  value={createForm.description}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe las responsabilidades de este rol…"
                  rows={3}
                  className="w-full px-3.5 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none"
                />
              </div>
              <div>
                <label htmlFor={createCodeId} className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">
                  Codigo
                </label>
                <textarea
                  id={createCodeId}
                  value={createForm.code}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, code: e.target.value }))}
                  placeholder="Codigo del rol…"
                  rows={3}
                  className="w-full px-3.5 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none"
                />
              </div>

              {/* Preview */}
              {createForm.name.trim() && (
                <div className="flex items-center gap-3 p-3.5 bg-purple-50 border border-purple-200 rounded-xl">
                  <div className="size-9 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Shield className="size-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-purple-900">
                      {createForm.name.trim()}
                    </p>
                    {createForm.description.trim() && (
                      <p className="text-xs text-purple-600 mt-0.5">
                        {createForm.description.trim()}
                      </p>
                    )}
                  </div>
                </div>
                )}

              <div className="flex gap-3 pt-3">
                <Button
                  variant="outline"
                  onClick={() => setTab("assign")}
                  className="flex-1"
                  disabled={createForm.creating}
                >
                  Volver
                </Button>
                <Button
                  onClick={handleCreateRole}
                  className="flex-1"
                  disabled={!createForm.name.trim() || createForm.creating}
                >
                  {createForm.creating ? "Creando…" : "Crear Rol"}
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB: PERMISOS (solo admin)
      ══════════════════════════════════════════════════════════ */}
      {tab === "permissions" && (
        <div className="space-y-5">
          {!isAdmin ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <div className="size-14 rounded-full bg-red-100 flex items-center justify-center">
                  <Lock className="size-7 text-red-400" />
                </div>
                <p className="text-zinc-500 text-sm text-center">
                  Solo los administradores pueden gestionar permisos.
                </p>
              </div>
            ) : (
            <>
              {/* Selector de rol */}
              <div>
                  <label htmlFor={permsRoleSelectId} id={permsRoleLabelId} className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">
                    Configurar permisos de
                  </label>
                {rolesState.error ? (
                  <div className="flex items-center justify-between gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="size-4 flex-shrink-0" />
                      {rolesState.error}
                    </div>
                    <button
                      onClick={loadRoles}
                      className="text-xs underline font-medium"
                    >
                      Reintentar
                    </button>
                  </div>
                ) : (
                  <select
                    id={permsRoleSelectId}
                    value={permsState.roleId}
                    onChange={(e) => {
                      const id = e.target.value ? Number(e.target.value) : "";
                      setPermsState((prev) => ({ ...prev, roleId: id, selectedPerms: new Set() }));
                      if (id !== "") fetchPermissions(id as number);
                    }}
                    aria-labelledby={permsRoleLabelId}
                    className="w-full px-3.5 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
                  >
                    <option value="">Seleccionar rol…</option>
                    {rolesState.roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {permsState.roleId !== "" && (
                <>
                  {/* Counter */}
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span className="font-medium text-zinc-700">
                      {permRole?.name}
                    </span>
                    <span>
                      <span className="font-semibold text-purple-600">
                        {permsState.selectedPerms.size}
                      </span>
                      /{totalPerms} permisos activos
                    </span>
                  </div>

                  {/* Módulos */}
                  {permsState.loading ? (
                    <div className="space-y-2">
                      {[
                        { id: "perm-skeleton-1" },
                        { id: "perm-skeleton-2" },
                        { id: "perm-skeleton-3" },
                      ].map((item) => (
                        <div key={item.id} className="h-12 bg-zinc-100 rounded-xl animate-pulse" />
                      ))}
                    </div>
                  ) : permsState.error ? (
                    <div className="flex items-center justify-between gap-2 p-3.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="size-4 flex-shrink-0" />
                        {permsState.error}
                      </div>
                      <button
                        onClick={() => fetchPermissions(permsState.roleId as number)}
                        className="text-xs underline font-medium"
                      >
                        Reintentar
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
                      {permsState.backendModules.map((mod) => {
                        const meta = MODULE_META[mod.moduleCode] ?? { icon: Settings, color: "blue" };
                        const Icon = meta.icon;
                        const colorClass = MODULE_COLORS[meta.color] ?? MODULE_COLORS.blue;
                        const checkColor = MODULE_CHECK_COLORS[meta.color] ?? MODULE_CHECK_COLORS.blue;
                        const actions = (["canView", "canCreate", "canEdit", "canDelete"] as const);
                        const keys = actions.map((a) => `${mod.moduleCode}.${a}`);
                        const allSelected = keys.every((k) => permsState.selectedPerms.has(k));
                        const someSelected = keys.some((k) => permsState.selectedPerms.has(k));
                        const activeCount = keys.filter((k) => permsState.selectedPerms.has(k)).length;

                      return (
                        <div key={mod.moduleCode} className="border border-zinc-200 rounded-xl overflow-hidden">
                          {/* Módulo header */}
                          <button
                            onClick={() => toggleModule(mod.moduleCode)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 hover:bg-zinc-100 transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border",
                                  colorClass,
                                )}
                                style={{ background: "color-mix(in srgb, currentColor 12%, transparent)" }}
                              >
                                <Icon className="size-3" />
                                {mod.moduleName}
                              </span>
                              <span className="text-xs text-zinc-400">
                                {activeCount}/{actions.length}
                              </span>
                            </div>
                            <div className={`size-5 rounded flex items-center justify-center border-2 transition-all ${
                              allSelected
                                ? `${checkColor} border-transparent`
                                : someSelected
                                  ? "bg-zinc-200 border-zinc-300"
                                  : "bg-white border-zinc-300"
                            }`}>
                              {allSelected && <Check className="size-3 text-white" />}
                              {someSelected && !allSelected && <div className="w-2 h-0.5 bg-zinc-500 rounded" />}
                            </div>
                          </button>

                          {/* Acciones individuales */}
                          <div className="divide-y divide-zinc-100">
                            {actions.map((action) => {
                              const key = `${mod.moduleCode}.${action}`;
                              const isActive = permsState.selectedPerms.has(key);
                              return (
                                <button
                                  key={key}
                                  onClick={() => togglePerm(key)}
                                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-zinc-50 transition-colors text-left"
                                >
                                  <p className="text-sm text-zinc-800 font-medium">
                                    {ACTION_LABELS[action]}
                                  </p>
                                  <div className={`size-5 rounded flex items-center justify-center border-2 flex-shrink-0 ml-3 transition-all ${
                                    isActive
                                      ? `${checkColor} border-transparent`
                                      : "bg-white border-zinc-300"
                                  }`}>
                                    {isActive && <Check className="size-3 text-white" />}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  )} {/* fin loadingPerms ? ... : permsError ? ... : (...) */}

                  <div className="flex gap-3 pt-3">
                    <Button
                      variant="outline"
                      onClick={() => setPermsState((prev) => ({ ...prev, selectedPerms: new Set() }))}
                      className="flex-shrink-0"
                      disabled={submitting || permsState.selectedPerms.size === 0}
                    >
                      <X className="size-4 mr-1" />
                      Limpiar
                    </Button>
                    <Button
                      onClick={handleSavePerms}
                      className="flex-1"
                      disabled={submitting || permsState.saving || typeof permsState.roleId !== "number"}
                    >
                      {permsState.saving
                        ? "Guardando…"
                        : `Guardar Permisos (${permsState.selectedPerms.size})`}
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
