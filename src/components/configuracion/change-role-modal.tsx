"use client";

import { useState, useEffect } from "react";
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
  blue:   "bg-blue-100 text-blue-700 border-blue-200",
  green:  "bg-green-100 text-green-700 border-green-200",
  orange: "bg-orange-100 text-orange-700 border-orange-200",
  purple: "bg-purple-100 text-purple-700 border-purple-200",
  red:    "bg-red-100 text-red-700 border-red-200",
};

const MODULE_CHECK_COLORS: Record<string, string> = {
  blue:   "bg-blue-600",
  green:  "bg-green-600",
  orange: "bg-orange-500",
  purple: "bg-purple-600",
  red:    "bg-red-600",
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

  // ── Assign tab state ──
  const [roleId, setRoleId] = useState<number | "">("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [rolesError, setRolesError] = useState("");
  const [lastUserId, setLastUserId] = useState<number | null>(null);

  // ── Create tab state ──
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [newRoleCode, setNewRoleCode] = useState("");
  const [creatingRole, setCreatingRole] = useState(false);
  const [createError, setCreateError] = useState("");

  // ── Permissions tab state ──
  const [permRoleId, setPermRoleId] = useState<number | "">("");
  const [backendModules, setBackendModules] = useState<import("@/services/users").RolePermission[]>([]);
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [permsError, setPermsError] = useState("");
  const [savingPerms, setSavingPerms] = useState(false);

  // Sync when user changes
  if (user && user.id !== lastUserId) {
    setRoleId(user.role?.id ?? "");
    setPermRoleId(user.role?.id ?? "");
    setLastUserId(user.id);
    setTab("assign");
  }

  useEffect(() => {
    if (isOpen) {
      setRolesError("");
      setCreateError("");
      setNewRoleName("");
      setNewRoleDesc("");
      setLoadingRoles(true);
      getAllRoles()
        .then((allRoles) =>
          setRoles(allRoles.filter((r) => r.isActive !== false)),
        )
        .catch((err) => {
          console.error("Error cargando roles:", err);
          setRolesError("No se pudieron cargar los roles");
        })
        .finally(() => setLoadingRoles(false));
    }
  }, [isOpen]);

  // Load permissions when switching to permissions tab
  useEffect(() => {
    if (tab === "permissions" && permRoleId !== "") {
      fetchPermissions(permRoleId as number);
    }
  }, [tab, permRoleId]);

  const fetchPermissions = async (roleId: number) => {
    setLoadingPerms(true);
    setPermsError("");
    setBackendModules([]);
    setSelectedPerms(new Set());
    try {
      const data = await getRolePermissions(roleId);
      // Filtrar módulos que no están implementados en esta rama del frontend
      const filteredData = data.filter((mod) => !HIDDEN_MODULES.has(mod.moduleCode));
      setBackendModules(filteredData);
      // Construir set de permisos activos usando "MODULEKEY.canAction"
      const active: string[] = [];
      for (const mod of filteredData) {
        if (mod.canView)   active.push(`${mod.moduleCode}.canView`);
        if (mod.canCreate) active.push(`${mod.moduleCode}.canCreate`);
        if (mod.canEdit)   active.push(`${mod.moduleCode}.canEdit`);
        if (mod.canDelete) active.push(`${mod.moduleCode}.canDelete`);
      }
      setSelectedPerms(new Set(active));
    } catch (err) {
      console.error("Error cargando permisos:", err);
      setPermsError("No se pudieron cargar los permisos del rol");
    } finally {
      setLoadingPerms(false);
    }
  };

  const loadRoles = async () => {
    setLoadingRoles(true);
    setRolesError("");
    try {
      const allRoles = await getAllRoles();
      setRoles(allRoles.filter((r) => r.isActive !== false));
    } catch (err) {
      console.error("Error cargando roles:", err);
      setRolesError("No se pudieron cargar los roles");
    } finally {
      setLoadingRoles(false);
    }
  };

  const handleClose = () => {
    setTab("assign");
    setCreateError("");
    setNewRoleName("");
    setNewRoleDesc("");
    onClose();
  };

  // ── Assign ──
  const handleAssign = () => {
    if (!user || roleId === "" || roleId === user.role?.id) return;
    onSave(user.id, roleId as number);
  };

  const hasChanged = user && roleId !== "" && roleId !== user.role?.id;
  const selectedRole = roles.find((r) => r.id === roleId);

  // ── Create ──
  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    setCreatingRole(true);
    setCreateError("");
    try {
      const created = await (onRoleCreate
        ? onRoleCreate({
            name: newRoleName.trim(),
            description: newRoleDesc.trim() || undefined,
            code: newRoleCode.trim() || undefined,
          })
        : createRole({
            name: newRoleName.trim(),
            description: newRoleDesc.trim() || undefined,
            code: newRoleCode.trim() || undefined,
          }));
      setNewRoleName("");
      setNewRoleDesc("");
      setNewRoleCode("");
      await loadRoles();

      // Auto-select the new role
      if (created && typeof created === "object" && "id" in created) {
        setRoleId((created as Role).id);
      }
      setTab("assign");
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Error al crear el rol",
      );
    } finally {
      setCreatingRole(false);
    }
  };

  // ── Permissions ──
  const togglePerm = (permId: string) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  };

  const toggleModule = (moduleCode: string) => {
    const actions = ["canView", "canCreate", "canEdit", "canDelete"];
    const keys = actions.map((a) => `${moduleCode}.${a}`);
    const allSelected = keys.every((k) => selectedPerms.has(k));
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => {
        if (allSelected) next.delete(k);
        else next.add(k);
      });
      return next;
    });
  };

  const handleSavePerms = async () => {
    if (permRoleId === "") return;
    setSavingPerms(true);
    setPermsError("");
    try {
      const permissions = backendModules.map((mod) => ({
        moduleId: mod.moduleId,
        canView: selectedPerms.has(`${mod.moduleCode}.canView`),
        canCreate: selectedPerms.has(`${mod.moduleCode}.canCreate`),
        canEdit: selectedPerms.has(`${mod.moduleCode}.canEdit`),
        canDelete: selectedPerms.has(`${mod.moduleCode}.canDelete`),
      }));
      await updateRolePermissions(permRoleId as number, { permissions });
      await fetchPermissions(permRoleId as number);
      handleClose();
    } catch (err) {
      setPermsError(
        err instanceof Error ? err.message : "Error al guardar permisos",
      );
    } finally {
      setSavingPerms(false);
    }
  };

  const permRole = roles.find((r) => r.id === permRoleId);
  const totalPerms = backendModules.length * 4; // 4 acciones por módulo

  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="" size="lg">
      {/* ── Header custom ── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-purple-100 flex items-center justify-center">
            <Shield className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Gestión de Roles
            </h2>
            <p className="text-sm text-gray-500">
              Usuario:{" "}
              <span className="font-medium text-gray-700">{user.fullName}</span>
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1.5">
          <button
            onClick={() => setTab("assign")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-medium transition-all ${
              tab === "assign"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Asignar Rol
          </button>
          {isAdmin && (
            <button
              onClick={() => setTab("create")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-medium transition-all ${
                tab === "create"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Crear Rol
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setTab("permissions")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-medium transition-all ${
                tab === "permissions"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
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
          <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Rol actual
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm text-purple-700 bg-purple-100 px-2.5 py-1 rounded-full font-medium">
              <Shield className="w-3.5 h-3.5" />
              {user.role?.name ?? "Sin rol"}
            </span>
          </div>

          {/* Lista de roles */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Seleccionar nuevo rol
            </label>
            {loadingRoles ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-14 bg-gray-100 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : rolesError ? (
              <div className="flex items-center justify-between gap-2 p-3.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {rolesError}
                </div>
                <button
                  onClick={loadRoles}
                  className="text-xs underline font-medium"
                >
                  Reintentar
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {roles.map((role) => {
                  const isCurrent = role.id === user.role?.id;
                  const isSelected = role.id === roleId;
                  return (
                    <button
                      key={role.id}
                      onClick={() => setRoleId(isCurrent ? "" : role.id)}
                      disabled={isCurrent}
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 text-left transition-all ${
                        isSelected && !isCurrent
                          ? "border-purple-500 bg-purple-50"
                          : isCurrent
                            ? "border-gray-200 bg-gray-50 cursor-default opacity-60"
                            : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isSelected && !isCurrent
                              ? "bg-purple-100"
                              : "bg-gray-100"
                          }`}
                        >
                          <Shield
                            className={`w-4 h-4 ${isSelected && !isCurrent ? "text-purple-600" : "text-gray-400"}`}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                            {role.name}
                            {isCurrent && (
                              <span className="text-xs text-gray-400 font-normal">
                                (actual)
                              </span>
                            )}
                          </p>
                          {role.description && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                              {role.description}
                            </p>
                          )}
                        </div>
                      </div>
                      {isSelected && !isCurrent ? (
                        <Check className="w-5 h-5 text-purple-600 flex-shrink-0" />
                      ) : !isCurrent ? (
                        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      ) : null}
                    </button>
                  );
                })}

                {/* Crear nuevo */}
                {isAdmin && (
                  <button
                    onClick={() => setTab("create")}
                    className="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 border-dashed border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-purple-100 flex items-center justify-center transition-colors">
                      <Plus className="w-4 h-4 text-gray-400 group-hover:text-purple-600" />
                    </div>
                    <span className="text-sm text-gray-400 group-hover:text-purple-600 font-medium transition-colors">
                      Crear nuevo rol...
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
              <ChevronRight className="w-4 h-4 text-purple-400 flex-shrink-0" />
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
              {submitting ? "Asignando..." : "Asignar Rol"}
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
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                <Lock className="w-7 h-7 text-red-400" />
              </div>
              <p className="text-gray-500 text-sm text-center">
                Solo los administradores pueden crear nuevos roles.
              </p>
            </div>
          ) : (
            <>
              {createError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  Nombre del rol{" "}
                  <span className="text-red-500 normal-case">*</span>
                </label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="Ej: Supervisor, Vendedor, Almacenista..."
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  Descripción
                </label>
                <textarea
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="Describe las responsabilidades de este rol..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  Codigo
                </label>
                <textarea
                  value={newRoleCode}
                  onChange={(e) => setNewRoleCode(e.target.value)}
                  placeholder="Codigo del rol..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none"
                />
              </div>

              {/* Preview */}
              {newRoleName.trim() && (
                <div className="flex items-center gap-3 p-3.5 bg-purple-50 border border-purple-200 rounded-xl">
                  <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-purple-900">
                      {newRoleName.trim()}
                    </p>
                    {newRoleDesc.trim() && (
                      <p className="text-xs text-purple-600 mt-0.5">
                        {newRoleDesc.trim()}
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
                  disabled={creatingRole}
                >
                  Volver
                </Button>
                <Button
                  onClick={handleCreateRole}
                  className="flex-1"
                  disabled={!newRoleName.trim() || creatingRole}
                >
                  {creatingRole ? "Creando..." : "Crear Rol"}
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
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                <Lock className="w-7 h-7 text-red-400" />
              </div>
              <p className="text-gray-500 text-sm text-center">
                Solo los administradores pueden gestionar permisos.
              </p>
            </div>
          ) : (
            <>
              {/* Selector de rol */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  Configurar permisos de
                </label>
                {rolesError ? (
                  <div className="flex items-center justify-between gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {rolesError}
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
                    value={permRoleId}
                    onChange={(e) => {
                      const id = e.target.value ? Number(e.target.value) : "";
                      setPermRoleId(id);
                      setSelectedPerms(new Set());
                      if (id !== "") fetchPermissions(id as number);
                    }}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
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

              {permRoleId !== "" && (
                <>
                  {/* Counter */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="font-medium text-gray-700">
                      {permRole?.name}
                    </span>
                    <span>
                      <span className="font-semibold text-purple-600">
                        {selectedPerms.size}
                      </span>
                      /{totalPerms} permisos activos
                    </span>
                  </div>

                  {/* Módulos */}
                  {loadingPerms ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                      ))}
                    </div>
                  ) : permsError ? (
                    <div className="flex items-center justify-between gap-2 p-3.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {permsError}
                      </div>
                      <button
                        onClick={() => fetchPermissions(permRoleId as number)}
                        className="text-xs underline font-medium"
                      >
                        Reintentar
                      </button>
                    </div>
                  ) : (
                  <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
                    {backendModules.map((mod) => {
                      const meta = MODULE_META[mod.moduleCode] ?? { icon: Settings, color: "blue" };
                      const Icon = meta.icon;
                      const colorClass = MODULE_COLORS[meta.color] ?? MODULE_COLORS.blue;
                      const checkColor = MODULE_CHECK_COLORS[meta.color] ?? MODULE_CHECK_COLORS.blue;
                      const actions = (["canView", "canCreate", "canEdit", "canDelete"] as const);
                      const keys = actions.map((a) => `${mod.moduleCode}.${a}`);
                      const allSelected = keys.every((k) => selectedPerms.has(k));
                      const someSelected = keys.some((k) => selectedPerms.has(k));
                      const activeCount = keys.filter((k) => selectedPerms.has(k)).length;

                      return (
                        <div key={mod.moduleCode} className="border border-gray-200 rounded-xl overflow-hidden">
                          {/* Módulo header */}
                          <button
                            onClick={() => toggleModule(mod.moduleCode)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${colorClass}`}>
                                <Icon className="w-3 h-3" />
                                {mod.moduleName}
                              </span>
                              <span className="text-xs text-gray-400">
                                {activeCount}/{actions.length}
                              </span>
                            </div>
                            <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${
                              allSelected
                                ? `${checkColor} border-transparent`
                                : someSelected
                                  ? "bg-gray-200 border-gray-300"
                                  : "bg-white border-gray-300"
                            }`}>
                              {allSelected && <Check className="w-3 h-3 text-white" />}
                              {someSelected && !allSelected && <div className="w-2 h-0.5 bg-gray-500 rounded" />}
                            </div>
                          </button>

                          {/* Acciones individuales */}
                          <div className="divide-y divide-gray-100">
                            {actions.map((action) => {
                              const key = `${mod.moduleCode}.${action}`;
                              const isActive = selectedPerms.has(key);
                              return (
                                <button
                                  key={key}
                                  onClick={() => togglePerm(key)}
                                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                                >
                                  <p className="text-sm text-gray-800 font-medium">
                                    {ACTION_LABELS[action]}
                                  </p>
                                  <div className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 ml-3 transition-all ${
                                    isActive
                                      ? `${checkColor} border-transparent`
                                      : "bg-white border-gray-300"
                                  }`}>
                                    {isActive && <Check className="w-3 h-3 text-white" />}
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
                      onClick={() => setSelectedPerms(new Set())}
                      className="flex-shrink-0"
                      disabled={submitting || selectedPerms.size === 0}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Limpiar
                    </Button>
                    <Button
                      onClick={handleSavePerms}
                      className="flex-1"
                      disabled={submitting || savingPerms || typeof permRoleId !== "number"}
                    >
                      {savingPerms
                        ? "Guardando..."
                        : `Guardar Permisos (${selectedPerms.size})`}
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
