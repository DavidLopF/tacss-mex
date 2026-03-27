import { EstadoPedido } from '@/types';

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Validar que la fecha sea válida
  if (isNaN(dateObj.getTime())) {
    return 'Fecha inválida';
  }
  
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(dateObj);
}

export function getEstadoColor(estado: EstadoPedido): string {
  const colors: Record<EstadoPedido, string> = {
    cotizado: 'bg-blue-100 text-blue-700',
    transmitido: 'bg-purple-100 text-purple-700',
    en_curso: 'bg-orange-100 text-orange-700',
    enviado: 'bg-cyan-100 text-cyan-700',
    cancelado: 'bg-red-100 text-red-700',
  };
  return colors[estado];
}

export function getEstadoLabel(estado: EstadoPedido): string {
  const labels: Record<EstadoPedido, string> = {
    cotizado: 'Cotizado',
    transmitido: 'Transmitido',
    en_curso: 'En Curso',
    enviado: 'Enviado',
    cancelado: 'Cancelado',
  };
  return labels[estado];
}
