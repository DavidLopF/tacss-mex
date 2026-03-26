'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { LoginResponse, ModulePermission } from '@/services/auth';
import { logout as logoutService } from '@/services/auth';

const ACCESS_TOKEN_KEY = 'crm-auth-access-token';
const REFRESH_TOKEN_KEY = 'crm-auth-refresh-token';
const FULLNAME_KEY = 'crm-auth-fullname';
const ROLENAME_KEY = 'crm-auth-rolename';
const PERMISSIONS_KEY = 'crm-auth-permissions';

interface AuthContextValue {
  accessToken: string | null;
  fullName: string | null;
  roleName: string | null;
  permissions: ModulePermission[];
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Guarda tokens + fullName + permisos tras login exitoso */
  setSession: (data: LoginResponse) => void;
  /** Cierra sesión: revoca refresh token en el server y limpia localStorage */
  logout: () => void;
  /** Verifica si el usuario tiene un permiso específico para un módulo */
  can: (moduleCode: string, action: 'canView' | 'canCreate' | 'canEdit' | 'canDelete') => boolean;
}

const AuthContext = createContext<AuthContextValue>({
  accessToken: null,
  fullName: null,
  roleName: null,
  permissions: [],
  isAuthenticated: false,
  isLoading: true,
  setSession: () => {},
  logout: () => {},
  can: () => false,
});

function loadString(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function loadPermissions(): ModulePermission[] {
  const raw = loadString(PERMISSIONS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ModulePermission[];
  } catch {
    return [];
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [accessToken, setAccessToken] = useState<string | null>(() => loadString(ACCESS_TOKEN_KEY));
  const [fullName, setFullName] = useState<string | null>(() => loadString(FULLNAME_KEY));
  const [roleName, setRoleName] = useState<string | null>(() => loadString(ROLENAME_KEY));
  const [permissions, setPermissions] = useState<ModulePermission[]>(() => loadPermissions());
  const [isLoading] = useState(() => typeof window === 'undefined');

  // ── Listen for http-client events ─────────────────────────────────────────
  useEffect(() => {
    const handleTokensUpdated = () => {
      setAccessToken(loadString(ACCESS_TOKEN_KEY));
    };
    const handleSessionExpired = () => {
      setAccessToken(null);
      setFullName(null);
      setRoleName(null);
      setPermissions([]);
      router.replace('/login');
    };

    window.addEventListener('auth-tokens-updated', handleTokensUpdated);
    window.addEventListener('auth-session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('auth-tokens-updated', handleTokensUpdated);
      window.removeEventListener('auth-session-expired', handleSessionExpired);
    };
  }, [router]);

  // ── Redirect logic ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading) return;
    const publicPages = ['/login', '/forgot-password', '/reset-password'];
    const isPublicPage = publicPages.includes(pathname);

    if (!accessToken && !isPublicPage) {
      router.replace('/login');
    } else if (accessToken && isPublicPage) {
      router.replace('/');
    }
  }, [accessToken, isLoading, pathname, router]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const setSession = useCallback((data: LoginResponse) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, data.auth.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.auth.refreshToken);
    localStorage.setItem(FULLNAME_KEY, data.fullName);
    if (data.roleName) localStorage.setItem(ROLENAME_KEY, data.roleName);
    localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(data.permissions ?? []));
    setAccessToken(data.auth.accessToken);
    setFullName(data.fullName);
    setRoleName(data.roleName ?? null);
    setPermissions(data.permissions ?? []);
  }, []);

  const logout = useCallback(async () => {
    const rt = loadString(REFRESH_TOKEN_KEY);
    if (rt) {
      try {
        await logoutService({ refreshToken: rt });
      } catch {
        // ignore
      }
    }
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(FULLNAME_KEY);
    localStorage.removeItem(ROLENAME_KEY);
    localStorage.removeItem(PERMISSIONS_KEY);
    setAccessToken(null);
    setFullName(null);
    setRoleName(null);
    setPermissions([]);
    router.replace('/login');
  }, [router]);

  const can = useCallback(
    (moduleCode: string, action: 'canView' | 'canCreate' | 'canEdit' | 'canDelete'): boolean => {
      const mod = permissions.find((p) => p.moduleCode === moduleCode);
      return mod ? mod[action] : false;
    },
    [permissions],
  );

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        fullName,
        roleName,
        permissions,
        isAuthenticated: !!accessToken,
        isLoading,
        setSession,
        logout,
        can,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
