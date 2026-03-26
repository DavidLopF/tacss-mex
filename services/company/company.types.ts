// ── Configuración de la empresa ─────────────────────────────────────

export interface CompanySettings {
  id?: number;
  companyName: string;
  primaryColor: string;   // Color principal (sidebar activo, botones, iconos)
  accentColor: string;    // Color de acento (fondos de avatares, badges)
  updatedAt?: string;
}

export interface UpdateCompanySettingsDto {
  companyName?: string;
  primaryColor?: string;
  accentColor?: string;
}

/** Valores por defecto */
export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  companyName: 'CRM',
  primaryColor: '#2563eb',  // blue-600
  accentColor: '#3b82f6',   // blue-500
};
