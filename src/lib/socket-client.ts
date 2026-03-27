// ══════════════════════════════════════════════════════════════════════
// ── SSE Client — sincronización entre computadores ──────────────────
//
// Usa la API nativa EventSource del navegador (sin paquetes npm).
// Se conecta a /api/sse del backend, que emite eventos "invalidate"
// cuando cambian órdenes, inventario, etc.
//
// Al recibir un evento "invalidate", llama a broadcastInvalidation()
// del sistema existente de cross-tab-sync, que dispara re-fetch en
// la pestaña actual y en todas las demás del mismo navegador.
//
// EventSource reconecta automáticamente — no necesitamos lógica extra.
// ══════════════════════════════════════════════════════════════════════

import {
  broadcastInvalidation,
  type InvalidationModule,
} from "./cross-tab-sync";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const TOKEN_KEY = "crm-auth-access-token";

let eventSource: EventSource | null = null;

/**
 * Conecta el cliente SSE al backend.
 * Si ya hay conexión activa, no hace nada.
 * Usa el JWT de localStorage como query param (EventSource no soporta headers).
 */
export function connectSocket(): void {
  if (typeof window === "undefined") return; // SSR guard

  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return;

  // Si ya hay una conexión activa o conectándose, no crear otra
  if (
    eventSource &&
    (eventSource.readyState === EventSource.OPEN ||
      eventSource.readyState === EventSource.CONNECTING)
  ) {
    return;
  }

  // Limpiar EventSource anterior si existe
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }

  const url = `${API_URL}/sse?token=${encodeURIComponent(token)}`;
  eventSource = new EventSource(url);

  // ── Escuchar eventos de invalidación del servidor ─────────────
  eventSource.addEventListener(
    "invalidate",
    (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data) as {
          module: InvalidationModule;
          ts: number;
        };
        // Reutilizar el sistema existente de cross-tab-sync
        // Notifica la pestaña actual + otras del mismo navegador
        broadcastInvalidation(payload.module);
      } catch {
        // Ignorar mensajes malformados
      }
    },
  );

  // ── Logging (solo dev) ────────────────────────────────────────
  eventSource.onopen = () => {
    console.log("[SSE] Conectado al servidor");
  };

  eventSource.onerror = () => {
    // EventSource reconecta automáticamente, solo logueamos
    // No cerramos manualmente — el navegador reintenta solo
    console.warn("[SSE] Reconectando...");
  };
}

/**
 * Desconecta el SSE (ej. al hacer logout).
 */
export function disconnectSocket(): void {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
    console.log("[SSE] Desconectado");
  }
}

/**
 * Reconecta el SSE con un nuevo token (ej. después de refresh de token).
 */
export function reconnectSocket(): void {
  disconnectSocket();
  connectSocket();
}

/**
 * Indica si el SSE está actualmente conectado.
 */
export function isSocketConnected(): boolean {
  return eventSource?.readyState === EventSource.OPEN;
}
