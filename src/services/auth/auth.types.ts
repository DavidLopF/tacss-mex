/** Tipos para el módulo de autenticación */

export interface LoginDto {
  email: string;
  password: string;
}

/** Tokens que devuelve el servidor dentro de data.auth */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

/** Permiso por módulo tal como viene en el login/refresh */
export interface ModulePermission {
  moduleCode: string;
  moduleName: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

/** Respuesta completa del login (data) */
export interface LoginResponse {
  auth: AuthTokens;
  fullName: string;
  roleName?: string;
  permissions: ModulePermission[];
}

export interface RefreshDto {
  refreshToken: string;
}

export interface LogoutDto {
  refreshToken: string;
}

/** POST /api/auth/forgot-password */
export interface ForgotPasswordDto {
  email: string;
}

/** POST /api/auth/reset-password */
export interface ResetPasswordDto {
  email: string;
  code: string;
  password: string;
  confirmPassword: string;
}
