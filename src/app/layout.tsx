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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#4D403A" },
    { media: "(prefers-color-scheme: dark)", color: "#191512" },
  ],
  colorScheme: "light dark",
};

// Pré-pintura do tema: resolve a preferência (localStorage → sistema) e aplica
// a classe .dark no <html> ANTES da primeira pintura — sem flash claro→escuro.
// A tela de login é sempre clara, então o escuro só é pré-aplicado quando há
// marca de sessão prévia (mc-logado, gravada pelo portal) — assim o login
// nunca pinta escuro e volta aclarado (o componente devolve o tema ao sair).
// Deve rodar inline no head; React só hidrata por cima.
const INICIAR_TEMA = `(function(){try{var p=localStorage.getItem('tema-preferencia');var l=localStorage.getItem('mc-logado')==='1';var e=l&&(p==='escuro'||((!p||p==='sistema')&&window.matchMedia('(prefers-color-scheme: dark)').matches));document.documentElement.classList.toggle('dark',e);}catch(_){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INICIAR_TEMA }} />
      </head>
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
