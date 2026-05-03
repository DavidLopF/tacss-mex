'use client';

import { useState, useEffect } from 'react';

/**
 * NumericInput — reemplazo directo de <input type="number">.
 *
 * Problemas que resuelve:
 *  - Elimina los spinner arrows del navegador (feos e inconsistentes entre browsers)
 *  - Permite escribir libremente durante el foco sin romperse con valores parciales
 *    (ej: el usuario puede borrar todo y escribir "12.5" sin que el campo salte a 0)
 *  - Hace select-all al enfocar para sobreescribir fácilmente
 *  - Nunca expone estado inválido hacia afuera: onChange solo se llama con números válidos
 *  - Clamp a [min, max] al perder el foco
 *  - Teclado numérico correcto en mobile vía inputMode
 *
 * API:
 *   value     — número controlado (requerido)
 *   onChange  — llamado con el número comprometido al blur (requerido)
 *   integer   — solo enteros, sin punto decimal (default: false)
 *   decimals  — cifras decimales para mostrar (default: 0 si integer, 2 si no)
 *   min/max   — clamping en blur
 *   ...rest   — cualquier prop estándar de <input> (className, disabled, placeholder…)
 *               excepto type, inputMode y step (manejados internamente)
 */

type NumericInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'inputMode' | 'step' | 'value' | 'onChange'
> & {
  value: number;
  onChange: (value: number) => void;
  /** Solo permite enteros — deshabilita el punto decimal */
  integer?: boolean;
  /**
   * Cifras decimales fijas para el formato de display.
   * Default: 0 si integer=true, 2 si integer=false
   */
  decimals?: number;
};

export function NumericInput({
  value,
  onChange,
  min,
  max,
  integer = false,
  decimals,
  onBlur: externalOnBlur,
  onFocus: externalOnFocus,
  ...rest
}: NumericInputProps) {
  const dp = decimals ?? (integer ? 0 : 2);

  const format = (n: number): string =>
    integer ? String(Math.round(n)) : n.toFixed(dp);

  const [raw, setRaw] = useState(() => format(value));
  const [focused, setFocused] = useState(false);

  // Sincronizar cuando el valor externo cambia y no estamos editando
  useEffect(() => {
    if (!focused) setRaw(format(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, focused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const s = e.target.value;
    const minNum = typeof min === 'string' ? parseFloat(min) : (min ?? -Infinity);
    const allowNegative = minNum < 0;

    if (integer) {
      if ((allowNegative ? /^-?\d*$/ : /^\d*$/).test(s)) setRaw(s);
    } else {
      if ((allowNegative ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/).test(s)) setRaw(s);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    // Select-all en el siguiente tick (antes de que el browser posicione el cursor)
    requestAnimationFrame(() => e.target.select());
    externalOnFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(false);

    const parsed = parseFloat(raw);
    let committed = Number.isFinite(parsed) ? parsed : value;

    if (integer) committed = Math.round(committed);

    const minNum = typeof min === 'string' ? parseFloat(min) : min;
    const maxNum = typeof max === 'string' ? parseFloat(max) : max;
    if (minNum !== undefined && Number.isFinite(minNum)) committed = Math.max(minNum, committed);
    if (maxNum !== undefined && Number.isFinite(maxNum)) committed = Math.min(maxNum, committed);

    const formatted = format(committed);
    setRaw(formatted);
    if (committed !== value) onChange(committed);

    externalOnBlur?.(e);
  };

  return (
    <input
      {...rest}
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      value={focused ? raw : format(value)}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  );
}
