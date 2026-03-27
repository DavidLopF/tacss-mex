import type { Metadata } from "next";
import { Manrope, Geist_Mono } from "next/font/google";
import { Providers } from './providers';
import { AppShell } from '@/components/layout/app-shell';
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CRM  - Sistema de Gestión",
  description: "Sistema de gestión de inventarios, ventas y clientes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${manrope.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <AppShell>
            {children}
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}
