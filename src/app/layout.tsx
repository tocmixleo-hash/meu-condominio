import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import RegistroSW from "@/components/registro-sw";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <RegistroSW />
      </body>
    </html>
  );
}
