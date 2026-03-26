'use client';

import { Search, User } from 'lucide-react';
import { useCompany } from '@/lib/company-context';
import { useAuth } from '@/lib/auth-context';

export function Header() {
  const { settings } = useCompany();
  const { fullName, roleName } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-6">
        <div className="flex items-center flex-1 gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar productos, pedidos, clientes..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ '--tw-ring-color': settings.primaryColor } as React.CSSProperties}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: settings.accentColor }}
            >
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{fullName || 'Usuario'}</p>
              <p className="text-xs text-gray-500">{roleName || 'Sin rol'}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
