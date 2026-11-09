"use client";

// ─────────────────────────────────────────────────────────────
// Identidade visual "Meu Condomínio" (padrão moderno e limpo)
// • Seções abertas: título caixa alta + filete do tema + divisória fina —
//   sem caixas arredondadas, sem sombras (apenas onde a imagem exige)
// • Indicadores em linha plana com divisórias verticais finas
// • Listas com separadores horizontais + hover suave
// • Cartões só para imagens e modais — raio único (rounded-xl)
// • Cores via variáveis de tema (--cor-*) definidas por condomínio
// • Verde/vermelho apenas p/ status
// ─────────────────────────────────────────────────────────────

import type { ReactNode } from "react";
import {
  ROTULO_AUTORIZACAO,
  ROTULO_CATEGORIA_COMUNICADO,
  ROTULO_CATEGORIA_DOCUMENTO,
  ROTULO_CATEGORIA_ENCOMENDA,
  ROTULO_CATEGORIA_OCORRENCIA,
  ROTULO_ESPACO,
  ROTULO_PERIODICIDADE,
  ROTULO_PRIORIDADE_OCORRENCIA,
  dataHoraCurta,
  formatarData,
} from "@/lib/rotulos";

export {
  ROTULO_AUTORIZACAO,
  ROTULO_CATEGORIA_COMUNICADO,
  ROTULO_CATEGORIA_DOCUMENTO,
  ROTULO_CATEGORIA_ENCOMENDA,
  ROTULO_CATEGORIA_OCORRENCIA,
  ROTULO_ESPACO,
  ROTULO_PERIODICIDADE,
  ROTULO_PRIORIDADE_OCORRENCIA,
  formatarData,
  dataHoraCurta,
};

// ── Seção aberta (sem caixa): título + divisória fina + conteúdo ──

export function Secao({
  titulo,
  acao,
  children,
  className = "",
  tour, // marcador data-tour usado pelo tutorial guiado do primeiro acesso
}: {
  titulo: string;
  acao?: ReactNode;
  children: ReactNode;
  className?: string;
  tour?: string;
}) {
  return (
    <section data-tour={tour} className={className}>
      <div className="flex items-center justify-between gap-3 border-b border-[var(--cor-neutra)] pb-2.5">
        <h2 className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
          <span
            aria-hidden
            className="h-3.5 w-[3px] shrink-0 rounded-full bg-[var(--cor-tema)]"
          />
          {titulo}
        </h2>
        {acao}
      </div>
      <div className="pt-3">{children}</div>
    </section>
  );
}

// ── Indicadores em linha plana, com divisórias finas ─────────

export function LinhaIndicadores({
  itens,
  className = "",
}: {
  itens: { rotulo: string; valor: number | string }[];
  className?: string;
}) {
  return (
    <div className={`flex flex-col sm:flex-row ${className}`}>
      {itens.map((item, i) => (
        <div
          key={item.rotulo}
          className={`py-3 sm:flex-1 sm:py-1 ${i > 0 ? "border-t border-[var(--cor-neutra)] sm:border-l sm:border-t-0" : ""} ${
            i === 0 ? "sm:pr-6" : i === itens.length - 1 ? "sm:pl-6" : "sm:px-6"
          }`}
        >
          <p className="text-[27px] font-bold leading-none tabular-nums text-stone-900">
            {item.valor}
          </p>
          <p className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-stone-500">
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
  midia,
  className = "",
}: {
  principal: ReactNode;
  secundaria?: ReactNode;
  detalhe?: ReactNode;
  direita?: ReactNode;
  midia?: ReactNode; // miniatura opcional à esquerda (ex.: foto do espaço)
  className?: string;
}) {
  return (
    <div
      className={`-mx-2 flex items-center gap-3.5 rounded-xl px-2 py-3 transition-colors duration-200 hover:bg-[var(--cor-tema-a06)] sm:-mx-3 sm:px-3 ${className}`}
    >
      {midia && <div className="shrink-0">{midia}</div>}
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
  return <p className="py-7 text-center text-sm text-stone-400">{mensagem}</p>;
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

export function tomStatusOcorrencia(status: string): TomBadge {
  if (status === "RESOLVIDA") return "verde";
  if (status === "ABERTA") return "vermelho";
  return "neutro";
}

export function rotuloStatusOcorrencia(status: string) {
  return { ABERTA: "Aberta", EM_ATENDIMENTO: "Em atendimento", RESOLVIDA: "Resolvida" }[status] ?? status;
}

/** Situação da manutenção preventiva, calculada pelo servidor. */
export function tomSituacaoManutencao(situacao: string): TomBadge {
  if (situacao === "EM_DIA") return "verde";
  if (situacao === "VENCIDA") return "vermelho";
  return "neutro";
}

export function rotuloSituacaoManutencao(situacao: string) {
  return { VENCIDA: "Vencida", A_VENCER: "A vencer", EM_DIA: "Em dia" }[situacao] ?? situacao;
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
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-full bg-[var(--cor-tema)] px-5 text-sm font-semibold text-[var(--cor-fundo)] shadow-sm transition-all duration-200 hover:bg-[var(--cor-tema-hover)] hover:shadow-md active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cor-tema-suave)] disabled:pointer-events-none disabled:opacity-50 ${className}`}
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
  href,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
  href?: string;
}) {
  const classes = `inline-flex h-9 items-center justify-center gap-2 rounded-full border border-[var(--cor-neutra-2)] bg-white px-4 text-sm font-semibold text-stone-700 transition-all duration-200 hover:border-[var(--cor-tema-suave)] hover:bg-[var(--cor-tema-a06)] hover:text-[var(--cor-tema)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cor-tema-suave)] disabled:pointer-events-none disabled:opacity-50 ${className}`;
  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classes}
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
