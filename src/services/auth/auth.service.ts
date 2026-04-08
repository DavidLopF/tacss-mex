import type { LoginDto, LoginResponse, AuthTokens, LogoutDto, ForgotPasswordDto, ResetPasswordDto } from './auth.types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

function getBaseUrl(): string {
  if (API_BASE_URL) return API_BASE_URL;
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

/**
 * Wrapper para endpoints de auth que NO requieren interceptor de refresh.
 * Usa fetch directamente para evitar ciclos al hacer refresh dentro del http-client.
 */
async function authRequest<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${getBaseUrl()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor. Verifica tu conexión.');
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      res.ok
        ? 'El servidor respondió en un formato inesperado.'
        : `Error del servidor (${res.status}). Intenta de nuevo más tarde.`,
    );
  }

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.message || `HTTP ${res.status}`);
  }

  return json.data as T;
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Response: { auth: { accessToken, refreshToken, expiresIn }, fullName }
 */
export async function login(dto: LoginDto): Promise<LoginResponse> {
  return authRequest<LoginResponse>('/auth/login', dto);
}

/**
 * POST /api/auth/refresh
 * Body: { refreshToken }
 * Response: { accessToken, refreshToken, expiresIn }
 */
export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  return authRequest<AuthTokens>('/auth/refresh', { refreshToken });
}

/**
 * POST /api/auth/logout
 * Body: { refreshToken }
 * Revoca la sesión del dispositivo actual.
 */
export async function logout(dto: LogoutDto): Promise<void> {
  await authRequest<{ message: string }>('/auth/logout', dto);
}

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 * Envía un código de recuperación al email.
 */
export async function forgotPassword(dto: ForgotPasswordDto): Promise<void> {
  await authRequest<{ message: string }>('/auth/forgot-password', dto);
}

/**
 * POST /api/auth/reset-password
 * Body: { email, code, password, confirmPassword }
 * Restablece la contraseña usando el código recibido.
 */
export async function resetPassword(dto: ResetPasswordDto): Promise<void> {
  await authRequest<{ message: string }>('/auth/reset-password', dto);
}
