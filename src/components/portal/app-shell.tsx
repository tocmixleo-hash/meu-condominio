"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Bell,
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
import { dataHoraCurta } from "@/lib/rotulos";
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

// ── Sino de notificações ─────────────────────────────────────────

type Notificacao = {
  id: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  criadoEm: string;
};

function SinoNotificacoes({ sobreClaro = false }: { sobreClaro?: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [lista, setLista] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  async function carregar() {
    setCarregando(true);
    try {
      const r = await fetch("/api/notificacoes");
      if (r.ok) {
        const d = await r.json();
        setLista(d.lista ?? []);
        setNaoLidas(d.naoLidas ?? 0);
      }
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 60_000); // atualiza a cada minuto
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function fora(e: MouseEvent) {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, []);

  async function marcarTodas() {
    await fetch("/api/notificacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }).catch(() => null);
    carregar();
  }

  return (
    <div ref={caixa} className="relative">
      <button
        aria-label={`Notificações${naoLidas ? ` (${naoLidas} não lidas)` : ""}`}
        onClick={() => {
          setAberto((v) => !v);
          if (!aberto) carregar();
        }}
        className={`relative flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
          sobreClaro
            ? "text-stone-600 hover:bg-[var(--cor-neutra)]"
            : "text-[var(--cor-clara-a85)] hover:bg-[var(--cor-tema-hover-a60)] hover:text-[var(--cor-fundo)]"
        }`}
      >
        <Bell className="h-[18px] w-[18px]" />
        {naoLidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-[var(--cor-neutra)] bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-[var(--cor-neutra)] px-4 py-3">
            <p className="text-sm font-semibold text-stone-900">Notificações</p>
            {naoLidas > 0 && (
              <button
                onClick={marcarTodas}
                className="text-xs font-medium text-[var(--cor-tema)] underline-offset-4 hover:underline"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {carregando && lista.length === 0 ? (
              <p className="px-4 py-6 text-sm text-stone-400">Carregando…</p>
            ) : lista.length === 0 ? (
              <p className="px-4 py-6 text-sm text-stone-400">
                Nenhuma notificação por aqui. Você será avisado quando houver novidades.
              </p>
            ) : (
              lista.map((n) => (
                <div
                  key={n.id}
                  className={`border-b border-[var(--cor-neutra)] px-4 py-3 last:border-0 ${
                    n.lida ? "" : "bg-[var(--cor-fundo)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-stone-900">{n.titulo}</p>
                    {!n.lida && (
                      <span
                        aria-hidden
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--cor-tema)]"
                      />
                    )}
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-stone-500">{n.mensagem}</p>
                  <p className="mt-1 text-[11px] text-stone-400">{dataHoraCurta(n.criadoEm)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
    <div className="flex items-center gap-3 border-b border-[var(--cor-tema-hover)] px-5 py-4">
      <Image
        src={condominio.logo}
        alt={`Logo do ${condominio.nome}`}
        width={36}
        height={36}
        className="h-9 w-9 shrink-0 rounded-md bg-white object-contain p-0.5"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight text-[var(--cor-fundo)]">Meu Condomínio</p>
        <p className="truncate text-xs text-[var(--cor-clara-a70)]">{condominio.nome}</p>
      </div>
      <SinoNotificacoes />
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
        <header className="flex items-center gap-3 border-b border-[var(--cor-neutra)] bg-white px-4 py-3 md:hidden">
          <button
            aria-label="Abrir menu"
            onClick={() => setMenuAberto(true)}
            className="rounded-md p-1.5 text-[var(--cor-fg-suave)] hover:bg-[var(--cor-neutra)]"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight text-[var(--cor-fg)]">Meu Condomínio</p>
            <p className="truncate text-xs text-stone-500">{condominio.nome}</p>
          </div>
          <SinoNotificacoes sobreClaro />
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
