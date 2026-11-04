/**
 * Tema visual por condomínio. O California mantém a paleta aprovada
 * (marrom #4D403A + neutros quentes); o Florida usa a variante cinza.
 * Condomínios novos recebem paleta derivada da cor cadastrada no banco.
 */

export type Tema = {
  tema: string; // cor primária (sidebar, botões, overlay)
  hover: string; // item ativo da sidebar
  botaoHover: string; // botão Entrar em hover
  escura: string; // gradiente do login (inferior)
  escura2: string; // gradiente do login (topo)
  suave: string; // foco/anel
  fundo: string; // fundo geral
  neutra: string; // bordas/divisórias claras
  neutra2: string; // bordas de input
  clara: string; // texto claro sobre a cor primária
  fg: string; // texto principal
  mutedFg: string; // texto secundário
  sombra: string; // "r,g,b" para sombra do cartão de login
};

const CALIFORNIA: Tema = {
  tema: "#4D403A",
  hover: "#61514A",
  botaoHover: "#3f352e",
  escura: "#2e2620",
  escura2: "#3a2f28",
  suave: "#a3968d",
  fundo: "#f7f6f3",
  neutra: "#EFE9E1",
  neutra2: "#dfdacf",
  clara: "#EFE9E1",
  fg: "#292524",
  mutedFg: "#78716c",
  sombra: "61,48,39",
};

const FLORIDA: Tema = {
  tema: "#404040",
  hover: "#525252",
  botaoHover: "#333333",
  escura: "#262626",
  escura2: "#303030",
  suave: "#a3a3a3",
  fundo: "#f5f5f5",
  neutra: "#e5e5e5",
  neutra2: "#d4d4d4",
  clara: "#e5e5e5",
  fg: "#262626",
  mutedFg: "#737373",
  sombra: "50,50,50",
};

export const TEMAS: Record<string, Tema> = {
  california: CALIFORNIA,
  florida: FLORIDA,
};

function hexParaRgb(hex: string): string {
  const h = hex.replace("#", "");
  const cheio = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(cheio, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

function misturar(hex: string, alvo: [number, number, number], f: number): string {
  const h = hex.replace("#", "");
  const cheio = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(cheio, 16);
  const canais = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const [r, g, b] = canais.map((c) => Math.round(c * (1 - f) + alvo * f));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

const BRANCO: [number, number, number] = [255, 255, 255];
const PRETO: [number, number, number] = [0, 0, 0];

function derivarTema(corTema: string): Tema {
  return {
    tema: corTema,
    hover: misturar(corTema, BRANCO, 0.15),
    botaoHover: misturar(corTema, PRETO, 0.15),
    escura: misturar(corTema, PRETO, 0.45),
    escura2: misturar(corTema, PRETO, 0.32),
    suave: misturar(corTema, BRANCO, 0.55),
    fundo: "#f5f5f5",
    neutra: "#e5e5e5",
    neutra2: "#d4d4d4",
    clara: "#e5e5e5",
    fg: "#262626",
    mutedFg: "#737373",
    sombra: hexParaRgb(corTema),
  };
}

export function resolverTema(slug: string, corTema: string): Tema {
  return TEMAS[slug] ?? derivarTema(corTema);
}

/** Variáveis CSS a aplicar no elemento raiz (login ou shell). */
export function cssVarsDoTema(t: Tema): Record<string, string> {
  const rgb = hexParaRgb(t.tema);
  const hoverRgb = hexParaRgb(t.hover);
  const escuraRgb = hexParaRgb(t.escura);
  const escura2Rgb = hexParaRgb(t.escura2);
  const claraRgb = hexParaRgb(t.clara);
  return {
    "--cor-tema": t.tema,
    "--cor-tema-hover": t.hover,
    "--cor-tema-hover-a60": `rgba(${hoverRgb}, 0.60)`,
    "--cor-tema-botao-hover": t.botaoHover,
    "--cor-tema-escura": t.escura,
    "--cor-tema-escura-a70": `rgba(${escuraRgb}, 0.70)`,
    "--cor-tema-escura2": t.escura2,
    "--cor-tema-escura2-a50": `rgba(${escura2Rgb}, 0.50)`,
    "--cor-tema-a75": `rgba(${rgb}, 0.75)`,
    "--cor-tema-a20": `rgba(${rgb}, 0.20)`,
    "--cor-tema-suave": t.suave,
    "--cor-fundo": t.fundo,
    "--cor-neutra": t.neutra,
    "--cor-neutra-2": t.neutra2,
    "--cor-clara": t.clara,
    "--cor-clara-a85": `rgba(${claraRgb}, 0.85)`,
    "--cor-clara-a70": `rgba(${claraRgb}, 0.70)`,
    "--cor-clara-a80": `rgba(${claraRgb}, 0.80)`,
    "--cor-fg": t.fg,
    "--cor-fg-suave": t.mutedFg,
    "--sombra-cartao": `0 24px 60px -24px rgba(${t.sombra}, 0.30)`,
  };
}
