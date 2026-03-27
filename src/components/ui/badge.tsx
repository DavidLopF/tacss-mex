import { cn } from '@/src/lib/utils';
import { ReactNode } from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-gray-900/10 text-gray-700 ring-1 ring-gray-700/10',
  success: 'bg-emerald-500/14 text-emerald-700 ring-1 ring-emerald-600/20',
  warning: 'bg-amber-500/18 text-amber-800 ring-1 ring-amber-600/25',
  danger: 'bg-rose-500/14 text-rose-700 ring-1 ring-rose-600/20',
  info: 'bg-sky-500/14 text-sky-700 ring-1 ring-sky-600/20',
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
