# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (uses --webpack flag, not Turbopack)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

Requires `NEXT_PUBLIC_API_URL` env var pointing to the backend (e.g. `http://localhost:3001`). Without it, API calls resolve to the same origin.

No test framework is configured.

## Architecture Overview

This is a Next.js 16 (App Router) CRM frontend for a Mexican business, using React 19, TypeScript, Zustand, and Tailwind CSS 4.

### Layer Structure

```
app/          → Next.js App Router pages (route segments)
components/   → Feature-based UI components
services/     → API layer (HTTP calls + type mappers)
stores/       → Zustand global state
lib/          → Auth context, company context, hooks, utilities
types/        → Shared TypeScript types
```

### State Management (Zustand)

Each domain has a store in `stores/`: `useClientsStore`, `useOrdersStore`, `useInventoryStore`, `useSuppliersStore`, `usePurchaseOrdersStore`, `useConfigStore`, `useCfdiStore`. All are exported from `stores/index.ts`.

Store pattern: data arrays + pagination/filter fields + loading flags + bulk setters (`setClients`) + granular mutations (`upsertClient`, `patchClient`, `removeClient`). Pages use **shallow subscriptions** to avoid unnecessary re-renders.

`useCfdiStore` is the exception: it uses Zustand `persist` middleware (localStorage-backed) to track CFDI invoice status per order across page reloads.

### API Services

- **HTTP client:** `services/http-client.ts` — centralized fetch wrapper with Bearer token auth, automatic token refresh on 401 (singleton guard), paginated results support.
- Each domain has a subfolder (e.g., `services/products/`) with:
  - `*.service.ts` — functions calling the HTTP client
  - `*.types.ts` — API DTOs and frontend models with mapper functions
- All services re-exported from `services/index.ts`.

### Authentication

`lib/auth-context.tsx` manages JWT tokens in localStorage (`crm-auth-access-token`, `crm-auth-refresh-token`, `crm-auth-fullname`, `crm-auth-rolename`, `crm-auth-permissions`). Listens for `auth-tokens-updated` and `auth-session-expired` events emitted by the HTTP client. Module-based permissions (DASHBOARD, INVENTARIO, PEDIDOS, CLIENTES, PROVEEDORES, CONFIG) exposed via `usePermissions` hook (`lib/hooks/use-permissions.ts`).

### Real-Time Synchronization

Two complementary systems:

1. **SSE** (`lib/socket-client.ts`) — Server-Sent Events to `/api/sse`. Initialized once in `AppShell` via `useSocketInit()` hook.
2. **Cross-tab sync** (`lib/cross-tab-sync.ts`) — BroadcastChannel API between tabs + CustomEvent for same-tab SSE-triggered invalidations.

Pages subscribe via `useCrossTabSync(modules, reloadFn)` to re-fetch when remote changes arrive.

### Company / Branding

`lib/company-context.tsx` loads company settings (colors, branding) from API on mount, caches in localStorage, and applies CSS custom properties to `document.root`.

### Key Utilities

- `lib/utils.ts`: `cn()` for conditional classes, `formatCurrency()` (MXN), `formatDate()` / `formatDateTime()` (Spanish), `getEstadoColor()`, `getEstadoLabel()`
- `lib/hooks.ts`: re-exports from `lib/hooks/` — `useDebounce`, `useToast`, `usePermissions`, `useCrossTabSync`, `useSocketInit`

### Routing & Layout

- All pages wrapped in `AppShell` (collapsible sidebar) → authenticated routes
- `PermissionGuard` component for component-level access control
- Public routes: `/login`, `/forgot-password`, `/reset-password`
- Auth logic in `AuthProvider` auto-redirects unauthenticated users to `/login`

### Key Entities

Core types in `types/index.ts`: `User`, `Producto`, `ProductoVariacion`, `Pedido`, `Cliente`, `MovimientoInventario`, `DashboardStats`.

The `facturacion` module (`app/facturacion/`, `services/invoices/`) handles CFDI 4.0 Mexican electronic invoicing — fiscal data (RFC, razón social), invoice creation, PPD payment registration (REP), and cancellations.

Status enums: `EstadoPedido` (`cotizado | transmitido | en_curso | enviado | cancelado`), `TipoMovimiento` (`reserva | venta | cancelacion | ajuste | entrada`), `UserRole` (`admin | vendedor`).

### Notable Libraries

| Library | Purpose |
|---------|---------|
| zustand 5 | State management |
| recharts 3 | Charts/graphs |
| lucide-react | Icons |
| jspdf | PDF generation |
| tailwindcss 4 | Styling (via `@tailwindcss/postcss`) |

Product images are served from `tacs-crm-bucket.s3.us-east-1.amazonaws.com` (configured in `next.config.ts` `remotePatterns`).
