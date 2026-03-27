'use client';

import { ReactNode } from 'react';
import { CompanyProvider } from '@/src/lib/company-context';
import { AuthProvider } from '@/src/lib/auth-context';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CompanyProvider>{children}</CompanyProvider>
    </AuthProvider>
  );
}
