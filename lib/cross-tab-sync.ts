// ══════════════════════════════════════════════════════════════════════
// ── Cross-tab invalidation via BroadcastChannel ──────────────────────
//
// Problema: Zustand vive en memoria de UNA pestaña. Si el usuario tiene
// abierta Pestaña A (Pedidos) y Pestaña B (Inventario), crear un pedido
// en A no actualiza el inventario en B.
//
// Solución dual:
//  • OTRAS pestañas → BroadcastChannel (canal entre pestañas del mismo origen)
//  • MISMA pestaña  → window.CustomEvent ('crm-local-invalidation')
//
// Esto resuelve el caso donde la acción y el componente que escucha
// están en la misma pestaña del navegador (ej. SSE invalidation).
//
// Uso en pages:
//   1. En el handler que muta: llamar `broadcastInvalidation('inventory')`
//   2. En el useEffect inicial: `useCrossTabSync('inventory', loadFn)`
// ══════════════════════════════════════════════════════════════════════

/** Módulos que pueden emitir invalidaciones */
export type InvalidationModule =
  | 'inventory'
  | 'clients'
  | 'orders'
  | 'suppliers'
  | 'purchase-orders'
  | 'config-users'
  | 'config-roles';

interface InvalidationMessage {
  module: InvalidationModule;
  /** Timestamp para deduplicar */
  ts: number;
  /** Id de la pestaña que originó el cambio (no re-fetch en la misma) */
  sourceTabId: string;
}

const CHANNEL_NAME = 'crm-mex-invalidation';
/** Nombre del CustomEvent para notificaciones dentro de la misma pestaña */
const LOCAL_EVENT = 'crm-local-invalidation';

/**
 * Id único de esta pestaña — se genera una vez al cargar.
 * Se usa para evitar que la pestaña que emitió el cambio
 * también re-fetch (ella ya actualizó su store localmente).
 */
const TAB_ID =
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** Singleton del canal — lazy init */
let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null; // SSR guard
  if (!('BroadcastChannel' in window)) return null; // Safari < 15.4
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
  }
  return channel;
}

// ─── Emitir ──────────────────────────────────────────────────────────

/**
 * Notifica que un módulo cambió:
 *  - A OTRAS pestañas via BroadcastChannel
 *  - A la MISMA pestaña via window.CustomEvent
 *
 * Llamar después de cualquier mutación exitosa (create, update, delete).
 * Se puede pasar un array de módulos cuando una acción afecta a varios.
 */
export function broadcastInvalidation(
  modules: InvalidationModule | InvalidationModule[],
): void {
  const list = Array.isArray(modules) ? modules : [modules];
  const ts = Date.now();

  const ch = getChannel();

  for (const mod of list) {
    // 1. Notificar otras pestañas via BroadcastChannel
    if (ch) {
      const msg: InvalidationMessage = { module: mod, ts, sourceTabId: TAB_ID };
      ch.postMessage(msg);
    }

    // 2. Notificar componentes de la MISMA pestaña via CustomEvent
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(LOCAL_EVENT, { detail: { module: mod } }),
      );
    }
  }
}

// ─── Escuchar ────────────────────────────────────────────────────────

type CleanupFn = () => void;

/**
 * Suscribe un callback que se ejecuta cuando cualquier pestaña
 * (incluyendo la actual) invalida el módulo indicado.
 *
 * Escucha dos canales:
 *  • BroadcastChannel → invalidaciones de OTRAS pestañas
 *  • window CustomEvent → invalidaciones de la MISMA pestaña
 *
 * Devuelve una función cleanup para usar en useEffect.
 *
 * Ejemplo:
 * ```ts
 * useEffect(() => {
 *   return onCrossTabInvalidation('inventory', () => {
 *     loadProducts();
 *   });
 * }, []);
 * ```
 */
export function onCrossTabInvalidation(
  modules: InvalidationModule | InvalidationModule[],
  callback: () => void,
): CleanupFn {
  const set = new Set(Array.isArray(modules) ? modules : [modules]);

  // ── Canal entre pestañas (BroadcastChannel) ──────────────────────
  const ch = getChannel();
  const crossTabHandler = (event: MessageEvent<InvalidationMessage>) => {
    const msg = event.data;
    // Ignorar si viene de esta misma pestaña (ya lo maneja el LocalEvent)
    if (msg.sourceTabId === TAB_ID) return;
    if (set.has(msg.module)) callback();
  };
  ch?.addEventListener('message', crossTabHandler);

  // ── Evento local (misma pestaña) ──────────────────────────────────
  const localHandler = (event: Event) => {
    const { module } = (event as CustomEvent<{ module: InvalidationModule }>).detail;
    if (set.has(module)) callback();
  };
  if (typeof window !== 'undefined') {
    window.addEventListener(LOCAL_EVENT, localHandler);
  }

  return () => {
    ch?.removeEventListener('message', crossTabHandler);
    if (typeof window !== 'undefined') {
      window.removeEventListener(LOCAL_EVENT, localHandler);
    }
  };
}
