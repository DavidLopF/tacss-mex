// ── Configuración de la empresa ─────────────────────────────────────

export interface CompanySettings {
  id?: number;
  companyName: string;
  primaryColor: string;   // Color principal (sidebar activo, botones, iconos)
  accentColor: string;    // Color de acento (fondos de avatares, badges)
  defaultIvaPct?: number; // Tasa de IVA por defecto en % (ej. 16)
  updatedAt?: string;
}

export interface UpdateCompanySettingsDto {
  companyName?: string;
  primaryColor?: string;
  accentColor?: string;
  defaultIvaPct?: number;
}

/** Valores por defecto */
export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  companyName: 'CRM',
  primaryColor: '#2563eb',  // blue-600
  accentColor: '#3b82f6',   // blue-500
  defaultIvaPct: 16,
};
