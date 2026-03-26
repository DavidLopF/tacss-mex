/**
 * HTTP Client base reutilizable para todos los servicios.
 *
 * - Centraliza base URL, headers, manejo de errores e interceptores.
 * - Intercepta 401 y refresca el token automáticamente (1 vez por request).
 * - Cada módulo de servicio lo importa en lugar de usar fetch directamente.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

const ACCESS_TOKEN_KEY = 'crm-auth-access-token';
const REFRESH_TOKEN_KEY = 'crm-auth-refresh-token';

function getBaseUrl(): string {
  if (API_BASE_URL) return API_BASE_URL;
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

function buildUrl(path: string, params?: Record<string, unknown>): string {
  const url = new URL(path, getBaseUrl());
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      url.searchParams.append(key, String(value));
    });
  }
  return url.toString();
}

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

interface ApiPaginatedSuccessResponse<T> {
  success: true;
  data: T;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
    hasNextPage?: boolean;
    hasPrevPage?: boolean;
  };
}

interface ApiErrorResponse {
  success: false;
  message: string;
  error?: string;
}

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ── Token helpers (shared with auth-context via localStorage) ────────────────

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

function saveTokens(accessToken: string, refreshToken: string): void {
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } catch {
    // ignore
  }
}

function clearTokens(): void {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // ignore
  }
}

// ── Refresh token logic (prevents concurrent refresh calls) ──────────────────

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  const rt = getRefreshToken();
  if (!rt) return false;

  try {
    const res = await fetch(`${getBaseUrl()}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    });

    if (!res.ok) {
      clearTokens();
      return false;
    }

    const json = await res.json();
    if (!json.success) {
      clearTokens();
      return false;
    }

    saveTokens(json.data.auth.accessToken, json.data.auth.refreshToken);
    // Dispatch event so AuthProvider can sync its React state
    window.dispatchEvent(new Event('auth-tokens-updated'));
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

/** Singleton guard: only one refresh at a time. */
function refreshOnce(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = tryRefreshToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// ── Core request function ────────────────────────────────────────────────────

function buildHeaders(extra?: HeadersInit): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extra as Record<string, string> | undefined),
  };
  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  params?: Record<string, unknown>,
): Promise<T> {
  const url = buildUrl(path, params);
  const headers = buildHeaders(options.headers as Record<string, string>);

  let res = await fetch(url, { ...options, headers });

  // 401 → try to refresh and retry once
  if (res.status === 401) {
    const refreshed = await refreshOnce();
    if (refreshed) {
      const retryHeaders = buildHeaders(options.headers as Record<string, string>);
      res = await fetch(url, { ...options, headers: retryHeaders });
    } else {
      // Refresh failed → force logout
      clearTokens();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth-session-expired'));
      }
      throw new Error('Sesión expirada. Inicia sesión nuevamente.');
    }
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  const json: ApiResponse<T> = await res.json();

  if (!json.success) {
    throw new Error((json as ApiErrorResponse).message || 'Error desconocido');
  }

  return (json as ApiSuccessResponse<T>).data;
}

/** GET request */
export function get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  return request<T>(path, { method: 'GET' }, params);
}

/** POST request */
export function post<T>(path: string, body?: unknown, params?: Record<string, unknown>): Promise<T> {
  return request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }, params);
}

/** PUT request */
export function put<T>(path: string, body?: unknown, params?: Record<string, unknown>): Promise<T> {
  return request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }, params);
}

/** PATCH request */
export function patch<T>(path: string, body?: unknown, params?: Record<string, unknown>): Promise<T> {
  return request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }, params);
}

/** DELETE request */
export function del<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  return request<T>(path, { method: 'DELETE' }, params);
}

/** Resultado paginado genérico */
export interface PaginatedResult<T> {
  data: T;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
    hasNextPage?: boolean;
    hasPrevPage?: boolean;
  };
}

/**
 * GET request que preserva la metadata de paginación.
 * Útil para endpoints que devuelven { success, data, pagination }.
 */
export async function getPaginated<T>(
  path: string,
  params?: Record<string, unknown>,
): Promise<PaginatedResult<T>> {
  const url = buildUrl(path, params);
  const headers = buildHeaders();

  let res = await fetch(url, { method: 'GET', headers });

  // 401 → try refresh and retry
  if (res.status === 401) {
    const refreshed = await refreshOnce();
    if (refreshed) {
      const retryHeaders = buildHeaders();
      res = await fetch(url, { method: 'GET', headers: retryHeaders });
    } else {
      clearTokens();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth-session-expired'));
      }
      throw new Error('Sesión expirada. Inicia sesión nuevamente.');
    }
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  const json: ApiPaginatedSuccessResponse<T> | ApiErrorResponse = await res.json();

  if (!json.success) {
    throw new Error((json as ApiErrorResponse).message || 'Error desconocido');
  }

  const success = json as ApiPaginatedSuccessResponse<T>;
  return {
    data: success.data,
    pagination: success.pagination,
  };
}
