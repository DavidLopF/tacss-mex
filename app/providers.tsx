'use client';

import { ReactNode } from 'react';
import { CompanyProvider } from '@/lib/company-context';
import { AuthProvider } from '@/lib/auth-context';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CompanyProvider>{children}</CompanyProvider>
    </AuthProvider>
  );
}
