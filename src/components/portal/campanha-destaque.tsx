"use client";

// ── Campanhas em destaque (seção aberta do painel inicial) ────────
// Conteúdo institucional divulgado pela administração do condomínio:
// conscientização, boas práticas e campanhas de convivência. Aparece
// para todos os perfis, com rotação automática e navegação por setas.
// Visual propositalmente sem cartão: título, texto e metadados soltos
// sobre o fundo do painel, como as demais seções abertas do portal.

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Secao, ROTULO_CATEGORIA_CAMPANHA, formatarData } from "@/components/portal/ui";
import type { ModuloId } from "@/components/portal/app-shell";
import { buscarJSON } from "@/lib/buscar-json";
import { DESTINOS_VALIDOS, rotuloDestino } from "@/lib/destinos-campanha";

type Campanha = {
  id: string;
  titulo: string;
  mensagem: string;
  descricao: string | null;
  categoria: string;
  emoji: string;
  destino?: string | null;
  inicioEm: string | null;
  fimEm: string | null;
  autor?: { nome: string } | null;
};

const INTERVALO_MS = 6500;

export default function CampanhaDestaque({
  aoNavegar,
  modulosPermitidos,
}: {
  /** Navega o portal até o módulo de destino da campanha (setModulo do SPA). */
  aoNavegar: (destino: ModuloId) => void;
  /** Módulos que o perfil enxerga no menu; null = todos (plataforma). */
  modulosPermitidos?: Set<string> | null;
}) {
  const podeNavegar = (destino: string | null | undefined): destino is ModuloId =>
    !!destino &&
    DESTINOS_VALIDOS.has(destino) &&
    (!modulosPermitidos || modulosPermitidos.has(destino));
  const [lista, setLista] = useState<Campanha[] | null>(null);
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [detalhe, setDetalhe] = useState<Campanha | null>(null);
  const toqueInicio = useRef<number | null>(null);

  useEffect(() => {
    buscarJSON("/api/campanhas").then((d) => d && setLista(d.lista));
  }, []);

  // Fecha o detalhe com Esc (e limpa o ouvinte ao fechar)
  useEffect(() => {
    if (!detalhe) return;
    const aoTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDetalhe(null);
    };
    window.addEventListener("keydown", aoTecla);
    return () => window.removeEventListener("keydown", aoTecla);
  }, [detalhe]);

  const total = lista?.length ?? 0;
  // Índice sempre dentro da faixa — derivado, sem efeito extra de sincronização
  const i = total ? Math.min(indice, total - 1) : 0;
  const avancar = useCallback(() => setIndice((atual) => (total ? (atual + 1) % total : 0)), [total]);
  const voltar = useCallback(
    () => setIndice((atual) => (total ? (atual - 1 + total) % total : 0)),
    [total],
  );

  // Rotação automática (pausa com o ponteiro sobre a seção ou detalhe aberto)
  useEffect(() => {
    if (!total || pausado || detalhe || total < 2) return;
    const t = setInterval(avancar, INTERVALO_MS);
    return () => clearInterval(t);
  }, [total, pausado, detalhe, avancar, i]);

  if (!lista || total === 0) return null;

  const campanha = lista[i];
  const destinoBanner: ModuloId | null = podeNavegar(campanha.destino)
    ? campanha.destino
    : null;
  const destinoDetalhe: ModuloId | null =
    detalhe && podeNavegar(detalhe.destino) ? detalhe.destino : null;

  return (
    <>
      <Secao
        titulo="Campanhas em destaque"
        tour="campanhas"
        className="animar-aparecer"
        acao={
          total > 1 ? (
            <div
              className="flex shrink-0 items-center gap-0.5"
              onMouseEnter={() => setPausado(true)}
              onMouseLeave={() => setPausado(false)}
            >
              {/* Celular: pontinhos (o toque desliza); desktop: contador + setas */}
              <span className="mr-1.5 hidden text-xs tabular-nums text-stone-400 dark:text-stone-500 sm:inline" aria-hidden>
                {i + 1} de {total}
              </span>
              <span className="mr-1.5 flex items-center gap-1.5 sm:hidden" aria-hidden>
                {lista.map((c, idx) => (
                  <span
                    key={c.id}
                    className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${
                      idx === i ? "bg-[var(--cor-tema)]" : "bg-[var(--cor-neutra-2)]"
                    }`}
                  />
                ))}
              </span>
              <button
                type="button"
                onClick={voltar}
                aria-label="Campanha anterior"
                className="hidden h-7 w-7 items-center justify-center rounded-lg text-stone-400 dark:text-stone-500 transition hover:bg-[var(--cor-tema-a06)] hover:text-[var(--cor-tema)] sm:flex"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={avancar}
                aria-label="Próxima campanha"
                className="hidden h-7 w-7 items-center justify-center rounded-lg text-stone-400 dark:text-stone-500 transition hover:bg-[var(--cor-tema-a06)] hover:text-[var(--cor-tema)] sm:flex"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : undefined
        }
      >
        <div
          key={campanha.id}
          className="animar-entrada"
          onMouseEnter={() => setPausado(true)}
          onMouseLeave={() => setPausado(false)}
          onTouchStart={(e) => {
            toqueInicio.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            const x0 = toqueInicio.current;
            if (x0 === null) return;
            const dx = (e.changedTouches[0]?.clientX ?? x0) - x0;
            if (Math.abs(dx) > 40) (dx < 0 ? avancar : voltar)();
            toqueInicio.current = null;
          }}
        >
          <button
            type="button"
            onClick={() => (destinoBanner ? aoNavegar(destinoBanner) : setDetalhe(campanha))}
            className="group -mx-2 flex w-full items-start gap-3.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[var(--cor-tema-a06)] focus-visible:outline-none sm:-mx-3 sm:px-3"
            aria-label={`Campanha: ${campanha.titulo} — ${destinoBanner ? `ir para ${rotuloDestino(destinoBanner)}` : "abrir detalhes"}`}
          >
            <span aria-hidden className="mt-0.5 shrink-0 text-2xl leading-none">
              {campanha.emoji}
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold leading-snug text-stone-900 dark:text-stone-100 sm:text-base">
                {campanha.titulo}
              </span>
              <span className="mt-0.5 line-clamp-2 block text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                {campanha.mensagem}
              </span>
              <span className="mt-1.5 block text-xs text-stone-500 dark:text-stone-400">
                {ROTULO_CATEGORIA_CAMPANHA[campanha.categoria] ?? campanha.categoria}
                {campanha.fimEm ? ` · Até ${formatarData(campanha.fimEm)}` : ""}
                <span className="font-medium text-[var(--cor-tema)]">
                  {" "}
                  · {destinoBanner ? `Toque para ir a ${rotuloDestino(destinoBanner)}` : "Ler na íntegra"}
                </span>
                {destinoBanner && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetalhe(campanha);
                    }}
                    className="ms-1 rounded font-medium text-stone-400 underline decoration-stone-300 underline-offset-2 transition hover:text-[var(--cor-tema)] focus-visible:outline-none"
                  >
                    · detalhes
                  </button>
                )}
              </span>
            </span>
          </button>
        </div>
      </Secao>

      {/* Detalhe da campanha */}
      {detalhe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            aria-label="Fechar"
            className="absolute inset-0 bg-black/40"
            onClick={() => setDetalhe(null)}
          />
          <div className="relative max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-xl border border-[var(--cor-neutra)] bg-white dark:bg-stone-900 p-6 shadow-xl">
            <button
              aria-label="Fechar detalhes"
              className="absolute right-4 top-4 text-stone-400 dark:text-stone-500 transition hover:text-stone-700"
              onClick={() => setDetalhe(null)}
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-start gap-3">
              <span aria-hidden className="mt-0.5 shrink-0 text-3xl leading-none">
                {detalhe.emoji}
              </span>
              <div className="min-w-0 pr-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--cor-tema)]">
                  Campanha · {ROTULO_CATEGORIA_CAMPANHA[detalhe.categoria] ?? detalhe.categoria}
                </p>
                <h3 className="text-base font-bold leading-snug text-stone-900 dark:text-stone-100">{detalhe.titulo}</h3>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-stone-700 dark:text-stone-200">{detalhe.mensagem}</p>
            {detalhe.descricao && (
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                {detalhe.descricao}
              </p>
            )}
            {destinoDetalhe && (
              <button
                type="button"
                onClick={() => {
                  setDetalhe(null);
                  aoNavegar(destinoDetalhe);
                }}
                className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--cor-tema)] px-4 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline-none"
              >
                Ir para {rotuloDestino(destinoDetalhe)}
              </button>
            )}
            {(detalhe.inicioEm || detalhe.fimEm) && (
              <p className="mt-4 text-xs font-medium text-stone-400 dark:text-stone-500">
                {detalhe.inicioEm ? `Veiculação a partir de ${formatarData(detalhe.inicioEm)}` : "Em veiculação"}
                {detalhe.fimEm ? ` até ${formatarData(detalhe.fimEm)}.` : "."}
              </p>
            )}
            {detalhe.autor?.nome && (
              <p className="mt-3 text-xs text-stone-400 dark:text-stone-500">Divulgada por {detalhe.autor.nome}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
