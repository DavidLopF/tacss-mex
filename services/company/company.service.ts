import { get, put } from '@/services/http-client';
import type { CompanySettings, UpdateCompanySettingsDto } from './company.types';

const BASE_PATH = '/api/configurations';

/**
 * Obtener la configuración actual de la empresa
 * GET /api/configurations
 */
export async function getCompanySettings(): Promise<CompanySettings> {
  try {
    return await get<CompanySettings>(BASE_PATH);
  } catch (err) {
    console.error('Error al obtener configuración de empresa:', err);
    throw err;
  }
}

/**
 * Actualizar la configuración de la empresa
 * PUT /api/configurations
 */
export async function updateCompanySettings(
  data: UpdateCompanySettingsDto,
): Promise<CompanySettings> {
  try {
    return await put<CompanySettings>(BASE_PATH, data);
  } catch (err) {
    console.error('Error al actualizar configuración de empresa:', err);
    throw err;
  }
}
