'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCompany } from '@/lib/company-context';
import { resetPassword } from '@/services/auth';
import {
  ShieldCheck,
  ArrowLeft,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings } = useCompany();

  const email = searchParams.get('email') ?? '';

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first code input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Redirect if no email
  useEffect(() => {
    if (!email) {
      router.replace('/forgot-password');
    }
  }, [email, router]);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const chars = value.replace(/\D/g, '').slice(0, 6).split('');
      const newCode = [...code];
      chars.forEach((ch, i) => {
        if (index + i < 6) newCode[index + i] = ch;
      });
      setCode(newCode);
      const nextIdx = Math.min(index + chars.length, 5);
      inputRefs.current[nextIdx]?.focus();
      return;
    }

    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const passwordChecks = [
    { label: 'Al menos 8 caracteres', ok: newPassword.length >= 8 },
    { label: 'Al menos una mayúscula', ok: /[A-Z]/.test(newPassword) },
    { label: 'Al menos un número', ok: /\d/.test(newPassword) },
    { label: 'Las contraseñas coinciden', ok: newPassword === confirmPassword && confirmPassword.length > 0 },
  ];

  const allPasswordChecksPass = passwordChecks.every((c) => c.ok);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError('Ingresa el código completo de 6 dígitos');
      return;
    }

    if (!allPasswordChecksPass) {
      setError('La contraseña no cumple todos los requisitos');
      return;
    }

    setLoading(true);
    try {
      await resetPassword({ email, code: fullCode, password: newPassword, confirmPassword });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2500);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error al restablecer la contraseña. Intenta de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!email) return null;

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
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-white mb-4 tracking-tight animate-slideUp" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
            Restablece tu contraseña
          </h1>
          <p className="text-lg text-white/80 mb-12 max-w-sm mx-auto leading-relaxed animate-slideUp" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
            Ingresa el código que enviamos a tu correo y crea una nueva contraseña
          </p>

          {/* Steps */}
          <div className="flex flex-col items-center gap-4 animate-slideUp" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
            {[
              { step: '1', text: 'Ingresa tu correo', active: false, done: true },
              { step: '2', text: 'Recibe el código', active: true, done: false },
              { step: '3', text: 'Nueva contraseña', active: true, done: false },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    item.done
                      ? 'bg-green-400 text-white'
                      : item.active
                      ? 'bg-white text-blue-600'
                      : 'bg-white/10 text-white/60 border border-white/20'
                  }`}
                >
                  {item.done ? '✓' : item.step}
                </div>
                <span className={`text-sm ${item.active || item.done ? 'text-white font-medium' : 'text-white/50'}`}>
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
            href="/forgot-password"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Cambiar correo electrónico
          </Link>

          {/* Success State */}
          {success ? (
            <div className="text-center py-12 animate-slideUp">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                ¡Contraseña restablecida!
              </h3>
              <p className="text-gray-500 mb-4">
                Tu contraseña se ha cambiado exitosamente. Redirigiendo al inicio de sesión...
              </p>
              <div className="w-8 h-1 bg-green-500 rounded-full mx-auto animate-pulse" />
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Restablecer contraseña
                </h2>
                <p className="text-gray-500 text-sm">
                  Enviamos un código de verificación a{' '}
                  <span className="font-medium text-gray-700">{email}</span>
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

                {/* Code Input */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 block">
                    Código de verificación
                  </label>
                  <div className="flex gap-2 justify-between">
                    {code.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { inputRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleCodeChange(i, e.target.value)}
                        onKeyDown={(e) => handleCodeKeyDown(i, e)}
                        onFocus={(e) => e.target.select()}
                        className="w-12 h-14 text-center text-xl font-bold bg-white border border-gray-200 rounded-xl text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-gray-300"
                      />
                    ))}
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-1.5">
                  <label htmlFor="newPassword" className="text-sm font-medium text-gray-700 block">
                    Nueva contraseña
                  </label>
                  <div className="relative group">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 transition-colors group-focus-within:text-blue-600" />
                    <input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Tu nueva contraseña"
                      className="w-full pl-11 pr-11 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 block">
                    Confirmar contraseña
                  </label>
                  <div className="relative group">
                    <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 transition-colors group-focus-within:text-blue-600" />
                    <input
                      id="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repite tu nueva contraseña"
                      className="w-full pl-11 pr-11 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      tabIndex={-1}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showConfirm ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                </div>

                {/* Password Checks */}
                {newPassword.length > 0 && (
                  <div className="space-y-1.5 animate-slideUp">
                    {passwordChecks.map((check) => (
                      <div
                        key={check.label}
                        className={`flex items-center gap-2 text-xs transition-colors ${
                          check.ok ? 'text-green-600' : 'text-gray-400'
                        }`}
                      >
                        <CheckCircle2
                          className={`w-3.5 h-3.5 transition-all ${
                            check.ok ? 'text-green-500 scale-100' : 'text-gray-300 scale-90'
                          }`}
                        />
                        {check.label}
                      </div>
                    ))}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || !allPasswordChecksPass || code.join('').length !== 6}
                  className="w-full py-3 px-4 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
                  style={{
                    background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.accentColor})`,
                    boxShadow: `0 4px 14px 0 ${settings.primaryColor}40`,
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Restableciendo...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Restablecer contraseña
                    </>
                  )}
                </button>
              </form>
            </>
          )}

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
