'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCompany } from '@/src/lib/company-context';
import { forgotPassword } from '@/src/services/auth';
import {
  Mail,
  ArrowLeft,
  ArrowRight,
  Loader2,
  KeyRound,
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { settings } = useCompany();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Por favor ingresa tu correo electrónico');
      return;
    }

    setLoading(true);
    try {
      await forgotPassword({ email });
      // Navigate to reset-password page with email pre-filled
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error al enviar el código. Intenta de nuevo.'
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
          <div className="flex justify-center mb-8">
            <div
              className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-2xl border border-white/20 animate-slideUp"
              style={{ animation: 'float 6s ease-in-out infinite' }}
            >
              <KeyRound className="w-10 h-10 text-white" />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-white mb-4 tracking-tight animate-slideUp" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
            Recupera tu acceso
          </h1>
          <p className="text-lg text-white/80 mb-12 max-w-sm mx-auto leading-relaxed animate-slideUp" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
            Te enviaremos un código de verificación a tu correo electrónico
          </p>

          {/* Steps */}
          <div className="flex flex-col items-center gap-4 animate-slideUp" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
            {[
              { step: '1', text: 'Ingresa tu correo', active: true },
              { step: '2', text: 'Recibe el código', active: false },
              { step: '3', text: 'Nueva contraseña', active: false },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    item.active
                      ? 'bg-white text-blue-600'
                      : 'bg-white/10 text-white/60 border border-white/20'
                  }`}
                >
                  {item.step}
                </div>
                <span className={`text-sm ${item.active ? 'text-white font-medium' : 'text-white/50'}`}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ Panel Derecho – Formulario ═══ */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md animate-slideUp">
          {/* Back link */}
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio de sesión
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              ¿Olvidaste tu contraseña?
            </h2>
            <p className="text-gray-500">
              Ingresa tu correo electrónico y te enviaremos un código para restablecer tu contraseña.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-2 animate-slideUp">
                <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Email */}
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
                  autoFocus
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-gray-300"
                />
              </div>
            </div>

            {/* Submit */}
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
                  Enviando código...
                </>
              ) : (
                <>
                  Enviar código de verificación
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
