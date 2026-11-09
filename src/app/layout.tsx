import type { Metadata, Viewport } from "next";
import { Geist_Mono, Manrope } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import RegistroSW from "@/components/registro-sw";

// Manrope: geométrica moderna e macia — única tipografia do portal, do título
// ao corpo (hierarquia por peso e tamanho, sem serifas). Geist Mono fica
// para códigos/números técnicos.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Meu Condomínio — Portal do Morador",
  description:
    "Plataforma multi-condomínio de gestão comunitária: comunicados, reservas, encomendas, autorizações de acesso, documentos e assembleias.",
  keywords: ["condomínio", "portal do morador", "síndico", "portaria", "reservas", "encomendas"],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    title: "Meu Condomínio",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#4D403A",
  // Tema sempre claro: navegadores em modo escuro não devem inverter a UI
  // (sem isso, os seletores do login aparecem escurecidos no celular).
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${manrope.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <RegistroSW />
      </body>
    </html>
  );
}
