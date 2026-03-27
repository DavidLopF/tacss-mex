import { useEffect, useRef } from 'react';
import {
  InvalidationModule,
  onCrossTabInvalidation,
} from '@/lib/cross-tab-sync';

/**
 * Hook que re-ejecuta `reloadFn` cuando OTRA pestaña invalida
 * uno de los módulos indicados.
 *
 * @param modules  Módulo(s) a escuchar
 * @param reloadFn Función que recarga los datos (llamar load(), loadStats(), etc.)
 *
 * ```tsx
 * useCrossTabSync('inventory', () => {
 *   load();
 *   loadStatistics();
 * });
 * ```
 */
export function useCrossTabSync(
  modules: InvalidationModule | InvalidationModule[],
  reloadFn: () => void,
): void {
  // Ref estable para no re-suscribir en cada render
  const reloadRef = useRef(reloadFn);
  reloadRef.current = reloadFn;

  useEffect(() => {
    const cleanup = onCrossTabInvalidation(modules, () => {
      reloadRef.current();
    });
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeof modules === 'string' ? modules : modules.join(',')]);
}
