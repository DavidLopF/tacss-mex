import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Iniciar Sesión - CRM",
  description: "Inicia sesión en el sistema de gestión",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
