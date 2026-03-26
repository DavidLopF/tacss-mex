import { useEffect, useState } from 'react';

/**
 * Hook para retrasar la actualización de un valor hasta que pase cierto tiempo
 * sin cambios. Útil para búsquedas que no queremos disparar en cada tecla.
 * 
 * @param value - El valor a "debounce"
 * @param delay - Milisegundos de espera (default: 500ms)
 * @returns El valor debounced
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Setea un timeout para actualizar el valor después del delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Limpia el timeout si el valor cambia antes de que termine el delay
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Re-export useToast
export { useToast } from './hooks/use-toast';
export { usePermissions, getModuleForRoute, ROUTE_TO_MODULE, HIDDEN_MODULES } from './hooks/use-permissions';
export { useCrossTabSync } from './hooks/use-cross-tab-sync';
