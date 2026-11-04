"use client";

import { useState } from "react";
import Image from "next/image";
import {
  CalendarDays,
  ClipboardList,
  Crown,
  DoorOpen,
  FileText,
  History,
  Home,
  LogOut,
  Megaphone,
  Menu,
  Package,
  ShieldCheck,
  User,
  Users,
  X,
} from "lucide-react";
import { cssVarsDoTema, resolverTema } from "@/lib/tema";
import type { CondominioUI } from "@/components/portal/login-screen";

export type ModuloId =
  | "inicio"
  | "comunicados"
  | "reservas"
  | "encomendas"
  | "autorizacoes"
  | "documentos"
  | "assembleias"
  | "moradores"
  | "auditoria";

export type Perfil = "SINDICO" | "ADMINISTRATIVO" | "PORTARIA" | "MORADOR";

type ItemMenu = { id: ModuloId; rotulo: string; icone: typeof Home };

const MENUS: Record<Perfil, ItemMenu[]> = {
  SINDICO: [
    { id: "inicio", rotulo: "Início", icone: Home },
    { id: "comunicados", rotulo: "Comunicados", icone: Megaphone },
    { id: "reservas", rotulo: "Reservas", icone: CalendarDays },
    { id: "encomendas", rotulo: "Encomendas", icone: Package },
    { id: "autorizacoes", rotulo: "Autorizações", icone: DoorOpen },
    { id: "documentos", rotulo: "Documentos", icone: FileText },
    { id: "assembleias", rotulo: "Assembleias", icone: Users },
    { id: "moradores", rotulo: "Moradores", icone: Users },
    { id: "auditoria", rotulo: "Auditoria", icone: History },
  ],
  ADMINISTRATIVO: [
    { id: "inicio", rotulo: "Início", icone: Home },
    { id: "comunicados", rotulo: "Comunicados", icone: Megaphone },
    { id: "reservas", rotulo: "Reservas", icone: CalendarDays },
    { id: "encomendas", rotulo: "Encomendas", icone: Package },
    { id: "autorizacoes", rotulo: "Autorizações", icone: DoorOpen },
    { id: "documentos", rotulo: "Documentos", icone: FileText },
    { id: "assembleias", rotulo: "Assembleias", icone: Users },
    { id: "moradores", rotulo: "Moradores", icone: Users },
    { id: "auditoria", rotulo: "Auditoria", icone: History },
  ],
  PORTARIA: [
    { id: "inicio", rotulo: "Início", icone: Home },
    { id: "encomendas", rotulo: "Encomendas", icone: Package },
    { id: "autorizacoes", rotulo: "Autorizações", icone: DoorOpen },
  ],
  MORADOR: [
    { id: "inicio", rotulo: "Início", icone: Home },
    { id: "comunicados", rotulo: "Comunicados", icone: Megaphone },
    { id: "reservas", rotulo: "Reservas", icone: CalendarDays },
    { id: "encomendas", rotulo: "Encomendas", icone: Package },
    { id: "autorizacoes", rotulo: "Autorizações", icone: DoorOpen },
  ],
};

const ROTULO_PERFIL: Record<Perfil, string> = {
  SINDICO: "Síndico",
  ADMINISTRATIVO: "Administrativo",
  PORTARIA: "Portaria",
  MORADOR: "Morador",
};

// Ícone por perfil no rodapé — evita repetir a logo do condomínio
const ICONE_PERFIL: Record<Perfil, typeof Home> = {
  SINDICO: Crown,
  ADMINISTRATIVO: ClipboardList,
  PORTARIA: ShieldCheck,
  MORADOR: User,
};

export default function AppShell({
  perfil,
  nome,
  unidade,
  condominio,
  modulo,
  aoTrocar,
  aoSair,
  children,
}: {
  perfil: Perfil;
  nome: string;
  unidade?: { bloco: string; numero: string } | null;
  condominio: CondominioUI;
  modulo: ModuloId;
  aoTrocar: (m: ModuloId) => void;
  aoSair: () => void;
  children: React.ReactNode;
}) {
  const [menuAberto, setMenuAberto] = useState(false);
  const itens = MENUS[perfil];
  const IconePerfil = ICONE_PERFIL[perfil];
  const temaVars = cssVarsDoTema(
    resolverTema(condominio.slug, condominio.corTema),
  ) as React.CSSProperties;

  function trocar(m: ModuloId) {
    aoTrocar(m);
    setMenuAberto(false);
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
      {itens.map((item) => {
        const ativo = item.id === modulo;
        const Icone = item.icone;
        return (
          <button
            key={item.id}
            onClick={() => trocar(item.id)}
            aria-current={ativo ? "page" : undefined}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              ativo
                ? "bg-[var(--cor-tema-hover)] font-medium text-[var(--cor-fundo)]"
                : "text-[var(--cor-clara-a85)] hover:bg-[var(--cor-tema-hover-a60)] hover:text-[var(--cor-fundo)]"
            }`}
          >
            <Icone className="h-4 w-4 shrink-0" />
            {item.rotulo}
          </button>
        );
      })}
    </nav>
  );

  const marca = (
    <div className="border-b border-[var(--cor-tema-hover)] px-4 py-4">
      {/* Marca da plataforma — logo criada pelo usuário (versão horizontal legível) */}
      <div className="flex h-14 items-center justify-center rounded-xl bg-white px-3 shadow-sm">
        <Image
          src="/fotos/logo-meu-condominio-horizontal.png"
          alt="Meu Condomínio"
          width={605}
          height={158}
          className="h-10 w-auto object-contain"
          priority
        />
      </div>
      {/* Condomínio conectado */}
      <div className="mt-3 flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white p-1">
          <Image
            src={condominio.logo}
            alt={`Logo do ${condominio.nome}`}
            width={32}
            height={32}
            className="h-full w-auto object-contain"
          />
        </span>
        <p className="min-w-0 truncate text-xs font-medium text-[var(--cor-clara-a70)]">
          {condominio.nome}
        </p>
      </div>
    </div>
  );

  const rodape = (
    <div className="border-t border-[var(--cor-tema-hover)] px-5 py-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--cor-tema-hover)] text-[var(--cor-fundo)]"
        >
          <IconePerfil className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[var(--cor-fundo)]">{nome}</p>
          <p className="truncate text-xs text-[var(--cor-clara-a70)]">
            {ROTULO_PERFIL[perfil]}
            {unidade ? ` · Unidade ${unidade.bloco}-${unidade.numero}` : ""}
          </p>
        </div>
      </div>
      <button
        onClick={aoSair}
        className="mt-3 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--cor-clara-a85)] transition-colors hover:bg-[var(--cor-tema-hover-a60)] hover:text-[var(--cor-fundo)]"
      >
        <LogOut className="h-4 w-4" /> Sair da conta
      </button>
    </div>
  );

  return (
    <div style={temaVars} className="flex h-dvh overflow-hidden bg-[var(--cor-fundo)]">
      {/* Sidebar desktop */}
      <aside className="hidden w-60 shrink-0 flex-col bg-[var(--cor-tema)] md:flex">
        {marca}
        {nav}
        {rodape}
      </aside>

      {/* Sidebar mobile */}
      {menuAberto && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuAberto(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-[var(--cor-tema)] shadow-xl">
            <button
              aria-label="Fechar"
              className="absolute right-3 top-3 text-[var(--cor-clara-a80)] hover:text-[var(--cor-fundo)]"
              onClick={() => setMenuAberto(false)}
            >
              <X className="h-5 w-5" />
            </button>
            {marca}
            {nav}
            {rodape}
          </aside>
        </div>
      )}

      {/* Conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-[var(--cor-neutra)] bg-white px-4 py-2.5 md:hidden">
          <button
            aria-label="Abrir menu"
            onClick={() => setMenuAberto(true)}
            className="rounded-md p-1.5 text-[var(--cor-fg-suave)] hover:bg-[var(--cor-neutra)]"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <Image
              src="/fotos/logo-meu-condominio-horizontal.png"
              alt="Meu Condomínio"
              width={605}
              height={158}
              className="h-8 w-auto object-contain"
            />
            <span className="truncate text-xs text-stone-500">{condominio.nome}</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
