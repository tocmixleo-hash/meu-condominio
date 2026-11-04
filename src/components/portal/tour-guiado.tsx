"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

// ── Mini tutorial do primeiro acesso (passeio guiado com holofote) ──
// Componente leve e sem dependências: destaca um elemento por vez com
// um recorte na máscara escura e mostra um cartão explicativo ao lado.
// Passos sem alvo (ex.: boas-vindas) aparecem centralizados.

export type PassoTour = {
  /** valores de data-tour no DOM — o primeiro elemento visível vence (fallback desktop→celular) */
  alvos?: string[];
  titulo: string;
  texto: string;
};

const LARGURA_CARTAO = 340;
const ESPACO = 12;

export default function TourGuiado({
  passos,
  aoConcluir,
}: {
  passos: PassoTour[];
  aoConcluir: () => void;
}) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [montado, setMontado] = useState(false);
  const alvoRef = useRef<HTMLElement | null>(null);

  // Alvos só existem no navegador — evita divergência de renderização
  useEffect(() => setMontado(true), []);

  const procurarAlvo = useCallback((alvos?: string[]): HTMLElement | null => {
    if (!alvos?.length) return null;
    for (const id of alvos) {
      const candidatos = document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`);
      for (const el of Array.from(candidatos)) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return el; // ignora versões ocultas (ex.: sidebar no celular)
      }
    }
    return null;
  }, []);

  // Localiza o alvo do passo atual (com tentativas — seções do painel
  // carregam de forma assíncrona) e acompanha rolagem/redimensionamento.
  useEffect(() => {
    if (!montado) return;
    let ativo = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const passo = passos[i];
    if (!passo) return;

    const medir = () => {
      const el = alvoRef.current;
      if (el && el.isConnected) setRect(el.getBoundingClientRect());
    };

    const tentar = (tentativa: number) => {
      if (!ativo) return;
      const el = procurarAlvo(passo.alvos);
      if (el) {
        alvoRef.current = el;
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        // espera a rolagem assentar antes de medir
        timer = setTimeout(() => ativo && medir(), 380);
      } else if (passo.alvos && tentativa < 12) {
        // painel ainda carregando — tenta de novo em instantes
        timer = setTimeout(() => tentar(tentativa + 1), 150);
      } else {
        alvoRef.current = null;
        setRect(null); // passo centralizado (boas-vindas) ou alvo ausente neste perfil
      }
    };

    tentar(0);

    const aoMover = () => medir();
    window.addEventListener("resize", aoMover);
    window.addEventListener("scroll", aoMover, true);
    const aoTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoConcluir();
    };
    window.addEventListener("keydown", aoTecla);

    return () => {
      ativo = false;
      if (timer) clearTimeout(timer);
      window.removeEventListener("resize", aoMover);
      window.removeEventListener("scroll", aoMover, true);
      window.removeEventListener("keydown", aoTecla);
    };
  }, [i, montado, passos, procurarAlvo, aoConcluir]);

  if (!montado) return null;
  const passo = passos[i];
  if (!passo) return null;

  const ultimo = i === passos.length - 1;

  // ── Posição do cartão ─────────────────────────────────────────
  const alturaCartao = 260; // estimativa — usada só para decidir acima/abaixo
  let cartao: React.CSSProperties;
  if (rect) {
    const acima = rect.bottom + alturaCartao + ESPACO > window.innerHeight - 16;
    const top = acima
      ? Math.max(16, rect.top - alturaCartao - ESPACO)
      : rect.bottom + ESPACO;
    const largura = Math.min(LARGURA_CARTAO, window.innerWidth - 32);
    const esquerdaIdeal = rect.left + rect.width / 2 - largura / 2;
    const left = Math.min(Math.max(16, esquerdaIdeal), window.innerWidth - largura - 16);
    cartao = { position: "fixed", top, left, width: largura };
  } else {
    cartao = {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: Math.min(420, window.innerWidth - 40),
    };
  }

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Tutorial do portal">
      {/* Máscara com recorte no elemento destacado */}
      {rect ? (
        <div
          aria-hidden
          className="pointer-events-none absolute transition-all duration-300"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            borderRadius: 14,
            boxShadow: "0 0 0 9999px rgba(28, 25, 23, 0.62)",
            outline: "2px solid rgba(255,255,255,0.85)",
          }}
        />
      ) : (
        <div aria-hidden className="absolute inset-0 bg-stone-900/62" />
      )}

      {/* Área clicável que bloqueia interação com o portal durante o tour */}
      <button aria-label="Fundo do tutorial" className="absolute inset-0 cursor-default" tabIndex={-1} />

      {/* Cartão explicativo */}
      <div
        style={cartao}
        className="rounded-2xl bg-white p-5 shadow-2xl transition-all duration-300"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
            Passo {i + 1} de {passos.length}
          </span>
          <button
            onClick={aoConcluir}
            className="rounded-md p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
            aria-label="Encerrar tutorial"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <h3 className="mt-1.5 text-[17px] font-bold leading-snug text-stone-900">{passo.titulo}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{passo.texto}</p>

        {/* Rodapé em duas linhas: cabe em qualquer largura de cartão
            (na versão anterior, Pular + pontos + Voltar + Próximo na mesma
            linha somavam ~337px numa área interna de 300px e o botão de
            confirmação saía para fora do cartão — inclusive da tela no
            celular). */}
        <div className="mt-4 space-y-3">
          {/* Linha 1: progresso + pular */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-1.5" aria-hidden>
              {passos.map((_, n) => (
                <span
                  key={n}
                  className={`h-1.5 rounded-full transition-all ${
                    n === i ? "w-4 bg-[var(--cor-tema,#4D403A)]" : "w-1.5 bg-stone-200"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={aoConcluir}
              className="shrink-0 text-sm font-medium text-stone-400 underline-offset-4 transition hover:text-stone-600 hover:underline"
            >
              Pular
            </button>
          </div>
          {/* Linha 2: navegação (botões dividem a largura total) */}
          <div className="flex items-center gap-2">
            {i > 0 && (
              <button
                onClick={() => setI((v) => Math.max(0, v - 1))}
                className="flex flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-50"
              >
                <ChevronLeft className="h-4 w-4" /> Voltar
              </button>
            )}
            <button
              onClick={() => (ultimo ? aoConcluir() : setI((v) => v + 1))}
              className="flex flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-lg bg-[var(--cor-tema,#4D403A)] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--cor-tema-botao-hover,#3f3730)]"
            >
              {ultimo ? (
                <>
                  Concluir <ChevronRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  Próximo <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
