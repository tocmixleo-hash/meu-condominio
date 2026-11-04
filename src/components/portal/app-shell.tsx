"use client";

import { useState } from "react";
import Image from "next/image";
import {
  CalendarDays,
  DoorOpen,
  FileText,
  Home,
  LogOut,
  Megaphone,
  Menu,
  Package,
  Users,
  X,
} from "lucide-react";

export type ModuloId =
  | "inicio"
  | "comunicados"
  | "reservas"
  | "encomendas"
  | "autorizacoes"
  | "documentos"
  | "assembleias"
  | "moradores";

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

export default function AppShell({
  perfil,
  nome,
  unidade,
  modulo,
  aoTrocar,
  aoSair,
  children,
}: {
  perfil: Perfil;
  nome: string;
  unidade?: { bloco: string; numero: string } | null;
  modulo: ModuloId;
  aoTrocar: (m: ModuloId) => void;
  aoSair: () => void;
  children: React.ReactNode;
}) {
  const [menuAberto, setMenuAberto] = useState(false);
  const itens = MENUS[perfil];

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
                ? "bg-[#61514A] font-medium text-[#f7f6f3]"
                : "text-[#EFE9E1]/85 hover:bg-[#61514A]/60 hover:text-[#f7f6f3]"
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
    <div className="flex items-center gap-3 border-b border-[#61514A] px-5 py-4">
      <Image
        src="/fotos/logo-parque-california.png"
        alt="Logo do Parque Califórnia"
        width={36}
        height={36}
        className="h-9 w-9 shrink-0 rounded-md bg-white object-contain p-0.5"
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-tight text-[#f7f6f3]">Meu Condomínio</p>
        <p className="truncate text-xs text-[#EFE9E1]/70">Parque Califórnia</p>
      </div>
    </div>
  );

  const rodape = (
    <div className="border-t border-[#61514A] px-5 py-4">
      <div className="flex items-center gap-3">
        <Image
          src="/fotos/logo-parque-california.png"
          alt="Logo do Parque Califórnia"
          width={36}
          height={36}
          className="h-9 w-9 shrink-0 rounded-md bg-white object-contain p-0.5"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[#f7f6f3]">{nome}</p>
          <p className="truncate text-xs text-[#EFE9E1]/70">
            {ROTULO_PERFIL[perfil]}
            {unidade ? ` · Unidade ${unidade.bloco}-${unidade.numero}` : ""}
          </p>
        </div>
      </div>
      <button
        onClick={aoSair}
        className="mt-3 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[#EFE9E1]/85 transition-colors hover:bg-[#61514A]/60 hover:text-[#f7f6f3]"
      >
        <LogOut className="h-4 w-4" /> Sair da conta
      </button>
    </div>
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-[#f7f6f3]">
      {/* Sidebar desktop */}
      <aside className="hidden w-60 shrink-0 flex-col bg-[#4D403A] md:flex">
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
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-[#4D403A] shadow-xl">
            <button
              aria-label="Fechar"
              className="absolute right-3 top-3 text-[#EFE9E1]/80 hover:text-[#f7f6f3]"
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
        <header className="flex items-center gap-3 border-b border-[#EFE9E1] bg-white px-4 py-3 md:hidden">
          <button
            aria-label="Abrir menu"
            onClick={() => setMenuAberto(true)}
            className="rounded-md p-1.5 text-stone-600 hover:bg-[#EFE9E1]"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight text-stone-900">Meu Condomínio</p>
            <p className="truncate text-xs text-stone-500">Parque Califórnia</p>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
