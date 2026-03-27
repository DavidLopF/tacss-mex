'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/src/lib/auth-context';
import { login as loginService } from '@/src/services/auth';
import { useCompany } from '@/src/lib/company-context';
import {
  Package,
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
} from 'lucide-react';

const REMEMBER_KEY = 'crm-remember-me';

function loadRemembered(): { email: string; password: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(REMEMBER_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

export default function LoginPage() {
  const { setSession } = useAuth();
  const { settings } = useCompany();

  const remembered = loadRemembered();
  const [email, setEmail] = useState(remembered?.email ?? '');
  const [password, setPassword] = useState(remembered?.password ?? '');
  const [rememberMe, setRememberMe] = useState(!!remembered);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync remember-me to localStorage when it changes
  useEffect(() => {
    if (!rememberMe) {
      localStorage.removeItem(REMEMBER_KEY);
    }
  }, [rememberMe]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Por favor completa todos los campos');
      return;
    }

    // Save / clear remember-me
    if (rememberMe) {
      localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email, password }));
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }

    setLoading(true);
    try {
      const data = await loginService({ email, password });
      setSession(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error al iniciar sesión. Verifica tus credenciales.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ═══ Panel Izquierdo – Branding ═══ */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${settings.primaryColor} 0%, ${settings.accentColor} 50%, ${settings.primaryColor}dd 100%)`,
        }}
      >
        {/* Decorative shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-white/5 animate-pulse" />
          <div
            className="absolute top-1/3 -right-16 w-72 h-72 rounded-full bg-white/5"
            style={{ animation: 'pulse 4s ease-in-out infinite' }}
          />
          <div
            className="absolute -bottom-12 left-1/4 w-80 h-80 rounded-full bg-white/5"
            style={{ animation: 'pulse 5s ease-in-out infinite 1s' }}
          />
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 text-center px-12 animate-fadeIn">
          {/* 3D Illustration */}
          <div className="flex justify-center mb-8">
            <div className="animate-slideUp" style={{ animation: 'float 6s ease-in-out infinite' }}>
              <svg
                width="220"
                height="220"
                viewBox="0 0 220 220"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-2xl"
              >
                {/* Shadow ellipse */}
                <ellipse cx="110" cy="200" rx="70" ry="12" fill="rgba(0,0,0,0.1)" />

                {/* Main cube - bottom face */}
                <path d="M110 170 L50 135 L50 75 L110 110 Z" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                <path d="M110 170 L170 135 L170 75 L110 110 Z" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                <path d="M110 110 L50 75 L110 40 L170 75 Z" fill="rgba(255,255,255,0.25)" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />

                {/* Chart bars on top face */}
                <rect x="72" y="65" width="10" height="25" rx="2" fill="rgba(255,255,255,0.6)" transform="skewY(-30) translate(32, 55)" />
                <rect x="88" y="55" width="10" height="35" rx="2" fill="rgba(255,255,255,0.8)" transform="skewY(-30) translate(32, 55)" />
                <rect x="104" y="60" width="10" height="30" rx="2" fill="rgba(255,255,255,0.5)" transform="skewY(-30) translate(32, 55)" />
                <rect x="120" y="50" width="10" height="40" rx="2" fill="rgba(255,255,255,0.9)" transform="skewY(-30) translate(32, 55)" />

                {/* Floating small cube 1 */}
                <g style={{ animation: 'float 4s ease-in-out infinite 1s' }}>
                  <path d="M170 60 L150 48 L150 28 L170 40 Z" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
                  <path d="M170 60 L190 48 L190 28 L170 40 Z" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
                  <path d="M170 40 L150 28 L170 16 L190 28 Z" fill="rgba(255,255,255,0.3)" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
                </g>

                {/* Floating small cube 2 */}
                <g style={{ animation: 'float 5s ease-in-out infinite 2s' }}>
                  <path d="M38 95 L25 87 L25 73 L38 81 Z" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" />
                  <path d="M38 95 L51 87 L51 73 L38 81 Z" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" />
                  <path d="M38 81 L25 73 L38 65 L51 73 Z" fill="rgba(255,255,255,0.3)" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" />
                </g>

                {/* Sparkle dots */}
                <circle cx="185" cy="55" r="2" fill="rgba(255,255,255,0.6)">
                  <animate attributeName="opacity" values="0.6;0.1;0.6" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle cx="30" cy="110" r="1.5" fill="rgba(255,255,255,0.5)">
                  <animate attributeName="opacity" values="0.5;0.1;0.5" dur="3s" repeatCount="indefinite" />
                </circle>
                <circle cx="160" cy="155" r="1.5" fill="rgba(255,255,255,0.4)">
                  <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2.5s" repeatCount="indefinite" />
                </circle>

                {/* Connecting lines / data flow */}
                <line x1="170" y1="40" x2="150" y2="55" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3 3">
                  <animate attributeName="stroke-dashoffset" values="0;6" dur="1.5s" repeatCount="indefinite" />
                </line>
                <line x1="38" y1="81" x2="55" y2="78" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3 3">
                  <animate attributeName="stroke-dashoffset" values="0;6" dur="2s" repeatCount="indefinite" />
                </line>
              </svg>
            </div>
          </div>

          <h1 className="text-4xl font-bold text-white mb-4 tracking-tight animate-slideUp" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
            {settings.companyName}
          </h1>
          <p className="text-lg text-white/80 mb-12 max-w-sm mx-auto leading-relaxed animate-slideUp" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
            Sistema de Gestión de Inventarios, Ventas y Clientes
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-3 animate-slideUp" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
            {['Inventario', 'Pedidos', 'Clientes', 'Reportes'].map((feature) => (
              <span
                key={feature}
                className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm font-medium border border-white/10 transition-all duration-300 hover:bg-white/20 hover:scale-105"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ Panel Derecho – Formulario ═══ */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md animate-slideUp">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg"
              style={{ backgroundColor: settings.primaryColor }}
            >
              <Package className="w-7 h-7 text-white" />
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Bienvenido de nuevo
            </h2>
            <p className="text-gray-500">
              Ingresa tus credenciales para acceder
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error message */}
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-2 animate-slideUp">
                <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Email field */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-gray-700 block">
                Correo electrónico
              </label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 transition-colors group-focus-within:text-blue-600" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  autoComplete="email"
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-gray-300"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-gray-700 block">
                Contraseña
              </label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 transition-colors group-focus-within:text-blue-600" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-11 pr-12 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-gray-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4.5 h-4.5" />
                  ) : (
                    <Eye className="w-4.5 h-4.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember me & Forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/20 transition-colors"
                />
                <span className="text-sm text-gray-600">Recordarme</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-sm font-medium transition-colors hover:underline"
                style={{ color: settings.primaryColor }}
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
              style={{
                background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.accentColor})`,
                boxShadow: `0 4px 14px 0 ${settings.primaryColor}40`,
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                <>
                  Iniciar sesión
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400">
              © {new Date().getFullYear()} {settings.companyName}. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
