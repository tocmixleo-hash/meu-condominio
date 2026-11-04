"use client";

// ─────────────────────────────────────────────────────────────
// Identidade visual "Meu Condomínio" (padrão da tela de início)
// • Seções SEM caixa: título em caixa alta + filete
// • Indicadores em linha com divisórias verticais
// • Listas com separadores horizontais
// • Cores via variáveis de tema (--cor-*) definidas por condomínio
// • Verde/vermelho apenas p/ status
// • Sem sombras, sem caixas coloridas, sem cards de dimensões exageradas
// ─────────────────────────────────────────────────────────────

import type { ReactNode } from "react";
import {
  ROTULO_AUTORIZACAO,
  ROTULO_CATEGORIA_COMUNICADO,
  ROTULO_CATEGORIA_DOCUMENTO,
  ROTULO_CATEGORIA_ENCOMENDA,
  ROTULO_ESPACO,
  dataHoraCurta,
  formatarData,
} from "@/lib/rotulos";

export {
  ROTULO_AUTORIZACAO,
  ROTULO_CATEGORIA_COMUNICADO,
  ROTULO_CATEGORIA_DOCUMENTO,
  ROTULO_CATEGORIA_ENCOMENDA,
  ROTULO_ESPACO,
  formatarData,
  dataHoraCurta,
};

// ── Seção sem caixa ──────────────────────────────────────────

export function Secao({
  titulo,
  acao,
  children,
  className = "",
}: {
  titulo: string;
  acao?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
          {titulo}
        </h2>
        {acao}
      </div>
      {children}
    </section>
  );
}

// ── Indicadores com divisórias verticais (sem caixa) ─────────

export function LinhaIndicadores({
  itens,
  className = "",
}: {
  itens: { rotulo: string; valor: number | string }[];
  className?: string;
}) {
  return (
    <div className={`flex flex-col sm:flex-row sm:divide-x sm:divide-[var(--cor-neutra-2)] ${className}`}>
      {itens.map((item, i) => (
        <div
          key={item.rotulo}
          className={`py-2.5 sm:flex-1 sm:py-1 ${i === 0 ? "sm:pl-0" : "sm:px-5"} ${
            i === itens.length - 1 ? "sm:pr-0" : ""
          }`}
        >
          <p className="text-2xl font-semibold tabular-nums text-stone-900">{item.valor}</p>
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.12em] text-stone-500">
            {item.rotulo}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Linha de lista com separador horizontal ──────────────────

export function Lista({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`divide-y divide-[var(--cor-neutra)] ${className}`}>{children}</div>;
}

export function LinhaLista({
  principal,
  secundaria,
  detalhe,
  direita,
  className = "",
}: {
  principal: ReactNode;
  secundaria?: ReactNode;
  detalhe?: ReactNode;
  direita?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-4 py-3 ${className}`}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-stone-900">{principal}</p>
        {secundaria && <p className="mt-0.5 truncate text-sm text-stone-500">{secundaria}</p>}
        {detalhe && <div className="mt-1 text-xs text-stone-400">{detalhe}</div>}
      </div>
      {direita && <div className="shrink-0 text-right">{direita}</div>}
    </div>
  );
}

// ── Estados ──────────────────────────────────────────────────

export function EstadoVazio({ mensagem }: { mensagem: string }) {
  return <p className="py-6 text-sm text-stone-400">{mensagem}</p>;
}

export function Carregando() {
  return (
    <div className="flex items-center gap-2 py-6 text-sm text-stone-400">
      <span className="h-3 w-3 animate-spin rounded-full border border-[var(--cor-neutra-2)] border-t-[var(--cor-tema)]" />
      Carregando…
    </div>
  );
}

// ── Badge discreto (cor apenas para status) ──────────────────

type TomBadge = "neutro" | "verde" | "vermelho";

export function Badge({
  children,
  tom = "neutro",
}: {
  children: ReactNode;
  tom?: TomBadge;
}) {
  const estilos: Record<TomBadge, string> = {
    neutro: "bg-[var(--cor-neutra)] text-[var(--cor-fg-suave)]",
    verde: "bg-green-50 text-green-700",
    vermelho: "bg-red-50 text-red-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${estilos[tom]}`}
    >
      {children}
    </span>
  );
}

export function tomStatusReserva(status: string): TomBadge {
  if (status === "CONFIRMADA") return "verde";
  if (status === "REJEITADA" || status === "CANCELADA") return "vermelho";
  return "neutro";
}

export function rotuloStatusReserva(status: string) {
  return {
    PENDENTE: "Pendente",
    CONFIRMADA: "Confirmada",
    REJEITADA: "Rejeitada",
    CANCELADA: "Cancelada",
  }[status] ?? status;
}

export function tomStatusEncomenda(status: string): TomBadge {
  if (status === "RETIRADA") return "verde";
  return "neutro";
}

export function rotuloStatusEncomenda(status: string) {
  return { AGUARDANDO: "Aguardando", RETIRADA: "Retirada" }[status] ?? status;
}

export function tomStatusAutorizacao(status: string): TomBadge {
  if (status === "ATIVA") return "verde";
  if (status === "CANCELADA") return "vermelho";
  return "neutro";
}

export function rotuloStatusAutorizacao(status: string) {
  return { ATIVA: "Ativa", UTILIZADA: "Utilizada", CANCELADA: "Cancelada" }[status] ?? status;
}

export function tomStatusAssembleia(status: string): TomBadge {
  if (status === "AGENDADA") return "verde";
  if (status === "CANCELADA") return "vermelho";
  return "neutro";
}

export function rotuloStatusAssembleia(status: string) {
  return { AGENDADA: "Agendada", REALIZADA: "Realizada", CANCELADA: "Cancelada" }[status] ?? status;
}

// ── Botões da identidade ─────────────────────────────────────

export function BotaoPrimario({
  children,
  onClick,
  disabled,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[var(--cor-tema)] px-4 text-sm font-medium text-[var(--cor-fundo)] transition-colors hover:bg-[var(--cor-tema-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cor-tema-suave)] disabled:pointer-events-none disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function BotaoSecundario({
  children,
  onClick,
  disabled,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[var(--cor-neutra-2)] bg-white px-4 text-sm font-medium text-stone-700 transition-colors hover:bg-[var(--cor-neutra)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cor-tema-suave)] disabled:pointer-events-none disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function BotaoTexto({
  children,
  onClick,
  tom = "tema",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  tom?: "tema" | "vermelho" | "verde";
  disabled?: boolean;
}) {
  const cores = {
    tema: "text-[var(--cor-tema)] hover:text-[var(--cor-tema-hover)]",
    vermelho: "text-red-600 hover:text-red-700",
    verde: "text-green-700 hover:text-green-800",
  }[tom];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`text-sm font-medium underline-offset-4 hover:underline disabled:pointer-events-none disabled:opacity-50 ${cores}`}
    >
      {children}
    </button>
  );
}
