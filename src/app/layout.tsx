import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CBTIS 270 · Plataforma de Logística",
    template: "%s · Logística CBTIS 270",
  },
  description:
    "Plataforma educativa del CBTIS No. 270 dedicada exclusivamente a la carrera técnica en Logística: cadena de suministro, almacenes, inventarios, transporte, compras y comercio exterior.",
  applicationName: "CBTIS 270 Logística",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CBTIS 270",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#1d5bd5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-MX">
      <body className="min-h-screen text-slate-900 antialiased">{children}</body>
    </html>
  );
}
