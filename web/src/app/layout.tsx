import type { Metadata, Viewport } from "next";
import { OfflineBanner } from "@/components/offline-banner";
import { RegisterSW } from "@/components/register-sw";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Avanza", template: "%s · Avanza" },
  description: "Seguimiento de cada alumno para familias, maestros y dirección.",
  applicationName: "Avanza",
  appleWebApp: { capable: true, title: "Avanza", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#1d4f57",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-MX">
      <body className="min-h-dvh">
        <OfflineBanner />
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
