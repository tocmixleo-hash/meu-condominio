"use client";

// ── Campanhas em destaque (banner rotativo do painel inicial) ─────
// Conteúdo institucional divulgado pela administração do condomínio:
// conscientização, boas práticas e campanhas de convivência. Aparece
// para todos os perfis, com rotação automática e navegação por pontos.

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { ROTULO_CATEGORIA_CAMPANHA, formatarData } from "@/components/portal/ui";

type Campanha = {
  id: string;
  titulo: string;
  mensagem: string;
  descricao: string | null;
  categoria: string;
  emoji: string;
  inicioEm: string | null;
  fimEm: string | null;
  autor?: { nome: string } | null;
};

const INTERVALO_MS = 6500;

export default function CampanhaDestaque() {
  const [lista, setLista] = useState<Campanha[] | null>(null);
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [detalhe, setDetalhe] = useState<Campanha | null>(null);
  const toqueInicio = useRef<number | null>(null);

  useEffect(() => {
    fetch("/api/campanhas")
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d) => d && setLista(d.lista))
      .catch(() => null);
  }, []);

  const total = lista?.length ?? 0;
  const avancar = useCallback(() => setIndice((i) => (total ? (i + 1) % total : 0)), [total]);
  const voltar = useCallback(
    () => setIndice((i) => (total ? (i - 1 + total) % total : 0)),
    [total],
  );

  // Rotação automática (pausa com o ponteiro sobre o banner ou detalhe aberto)
  useEffect(() => {
    if (!total || pausado || detalhe || total < 2) return;
    const t = setInterval(avancar, INTERVALO_MS);
    return () => clearInterval(t);
  }, [total, pausado, detalhe, avancar, indice]);

  // Índice seguro quando a lista muda
  useEffect(() => {
    if (total && indice >= total) setIndice(0);
  }, [total, indice]);

  if (!lista || total === 0) return null;

  const campanha = lista[Math.min(indice, total - 1)];

  return (
    <>
      <section
        data-tour="campanhas"
        aria-roledescription="carrossel"
        aria-label="Campanhas em destaque"
        className="animar-aparecer relative overflow-hidden rounded-xl border border-[var(--cor-neutra)] bg-gradient-to-r from-[var(--cor-tema-a10)] via-[var(--cor-tema-a06)] to-white"
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
        <div key={campanha.id} className="animar-entrada flex items-center gap-4 px-4 py-4 sm:gap-5 sm:px-6 sm:py-5">
          {/* Emblema da campanha */}
          <span
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm sm:h-14 sm:w-14 sm:text-3xl"
          >
            {campanha.emoji}
          </span>

          {/* Texto */}
          <button
            type="button"
            onClick={() => setDetalhe(campanha)}
            className="min-w-0 flex-1 text-left focus-visible:outline-none"
            aria-label={`Campanha: ${campanha.titulo} — abrir detalhes`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--cor-tema)] sm:text-[11px]">
              Campanha · {ROTULO_CATEGORIA_CAMPANHA[campanha.categoria] ?? campanha.categoria}
            </p>
            <p className="mt-0.5 truncate text-[15px] font-bold leading-tight text-stone-900 sm:text-lg">
              {campanha.titulo}
            </p>
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-stone-600 sm:text-sm">
              {campanha.mensagem}
            </p>
            {campanha.fimEm && (
              <p className="mt-1 text-[11px] font-medium text-stone-400">
                Até {formatarData(campanha.fimEm)}
              </p>
            )}
          </button>

          {/* Navegação (desktop) */}
          {total > 1 && (
            <div className="hidden shrink-0 items-center gap-1 sm:flex">
              <button
                type="button"
                onClick={voltar}
                aria-label="Campanha anterior"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--cor-neutra-2)] bg-white text-stone-500 transition hover:border-[var(--cor-tema-suave)] hover:text-[var(--cor-tema)]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={avancar}
                aria-label="Próxima campanha"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--cor-neutra-2)] bg-white text-stone-500 transition hover:border-[var(--cor-tema-suave)] hover:text-[var(--cor-tema)]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Pontos de navegação */}
        {total > 1 && (
          <div className="absolute bottom-2.5 right-4 flex items-center gap-1.5 sm:right-6">
            {lista.map((c, i) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setIndice(i)}
                aria-label={`Ver campanha ${i + 1}: ${c.titulo}`}
                aria-current={i === indice}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === indice
                    ? "w-5 bg-[var(--cor-tema)]"
                    : "w-1.5 bg-[var(--cor-tema-a20)] hover:bg-[var(--cor-tema-a55)]"
                }`}
              />
            ))}
          </div>
        )}
      </section>

      {/* Detalhe da campanha */}
      {detalhe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            aria-label="Fechar"
            className="absolute inset-0 bg-black/40"
            onClick={() => setDetalhe(null)}
          />
          <div className="relative max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-xl border border-[var(--cor-neutra)] bg-white p-6 shadow-xl">
            <button
              aria-label="Fechar detalhes"
              className="absolute right-4 top-4 text-stone-400 transition hover:text-stone-700"
              onClick={() => setDetalhe(null)}
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--cor-tema-a06)] text-2xl">
                {detalhe.emoji}
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--cor-tema)]">
                  Campanha · {ROTULO_CATEGORIA_CAMPANHA[detalhe.categoria] ?? detalhe.categoria}
                </p>
                <h3 className="truncate text-base font-bold text-stone-900">{detalhe.titulo}</h3>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-stone-700">{detalhe.mensagem}</p>
            {detalhe.descricao && (
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-stone-600">
                {detalhe.descricao}
              </p>
            )}
            {(detalhe.inicioEm || detalhe.fimEm) && (
              <p className="mt-4 rounded-lg bg-[var(--cor-tema-a06)] px-3 py-2 text-xs font-medium text-stone-600">
                {detalhe.inicioEm ? `Veiculação a partir de ${formatarData(detalhe.inicioEm)}` : "Em veiculação"}
                {detalhe.fimEm ? ` até ${formatarData(detalhe.fimEm)}.` : "."}
              </p>
            )}
            {detalhe.autor?.nome && (
              <p className="mt-3 text-xs text-stone-400">Divulgada por {detalhe.autor.nome}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
