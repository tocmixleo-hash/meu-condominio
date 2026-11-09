/**
 * Tema visual por condomínio — a partir das variáveis de identidade do banco.
 *
 * Ordem de resolução (garante que ausência de configuração nunca quebra a UI):
 * 1. Preset por slug (California/Flórida, aparência aprovada) ou derivação
 *    automática a partir da corTema cadastrada;
 * 2. Cores explícitas da identidade visual do condomínio (corPrimaria etc.)
 *    sobrescrevem os slots correspondentes. Quando a cor principal muda em
 *    relação ao preset, os tons dependentes são rederivados para coerência.
 *
 * Todas as cores da interface são consumidas via variáveis CSS geradas aqui —
 * nenhum componente usa cores fixas do tema do condomínio.
 */

export type IdentidadeTema = {
  corPrimaria?: string | null;
  corSecundaria?: string | null;
  corDestaque?: string | null;
  corSidebar?: string | null;
  corFundo?: string | null;
  corTexto?: string | null;
};

export type Tema = {
  tema: string; // cor primária (sidebar, botões, overlay)
  sidebar: string; // fundo da barra lateral (padrão: cor primária)
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
  sidebar: "#4D403A",
  hover: "#61514A",
  botaoHover: "#3f352e",
  escura: "#2e2620",
  escura2: "#3a2f28",
  suave: "#a3968d",
  fundo: "#faf9f7",
  neutra: "#EAE4DB",
  neutra2: "#E3DCCF",
  clara: "#EFE9E1",
  fg: "#292524",
  mutedFg: "#78716c",
  sombra: "61,48,39",
};

const FLORIDA: Tema = {
  tema: "#404040",
  sidebar: "#404040",
  hover: "#525252",
  botaoHover: "#333333",
  escura: "#262626",
  escura2: "#303030",
  suave: "#a3a3a3",
  fundo: "#f6f6f5",
  neutra: "#e7e7e5",
  neutra2: "#d9d9d6",
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
  const [r, g, b] = canais.map((c, i) => Math.round(c * (1 - f) + alvo[i] * f));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

const BRANCO: [number, number, number] = [255, 255, 255];
const PRETO: [number, number, number] = [0, 0, 0];

function derivarTema(corTema: string): Tema {
  return {
    tema: corTema,
    sidebar: corTema,
    hover: misturar(corTema, BRANCO, 0.15),
    botaoHover: misturar(corTema, PRETO, 0.15),
    escura: misturar(corTema, PRETO, 0.45),
    escura2: misturar(corTema, PRETO, 0.32),
    suave: misturar(corTema, BRANCO, 0.55),
    fundo: "#faf9f7",
    neutra: "#EAE4DB",
    neutra2: "#E3DCCF",
    clara: "#e5e5e5",
    fg: "#262626",
    mutedFg: "#737373",
    sombra: hexParaRgb(corTema),
  };
}

function hexValido(valor?: string | null): valor is string {
  return !!valor && /^#[0-9a-fA-F]{6}$/.test(valor.trim());
}

/** Normaliza uma cor recebida da identidade (aceita #rgb e #rrggbb). */
export function corHex(valor?: string | null): string | null {
  if (!valor) return null;
  const h = valor.trim().replace("#", "");
  const cheio = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (!/^[0-9a-fA-F]{6}$/.test(cheio)) return null;
  return `#${cheio.toUpperCase()}`;
}

export function resolverTema(
  slug: string,
  corTema: string,
  identidade?: IdentidadeTema | null,
): Tema {
  const t: Tema = { ...(TEMAS[slug] ?? derivarTema(corTema)) };

  const primaria = corHex(identidade?.corPrimaria);
  if (primaria && primaria.toLowerCase() !== t.tema.toLowerCase()) {
    // A cor principal mudou em relação ao preset — rederiva os tons dependentes.
    Object.assign(t, derivarTema(primaria));
  }
  const secundaria = corHex(identidade?.corSecundaria);
  if (secundaria) t.hover = secundaria;
  const destaque = corHex(identidade?.corDestaque);
  if (destaque) t.suave = destaque;
  const fundo = corHex(identidade?.corFundo);
  if (fundo) t.fundo = fundo;
  const texto = corHex(identidade?.corTexto);
  if (texto) t.fg = texto;
  const sidebar = corHex(identidade?.corSidebar);
  t.sidebar = sidebar ?? t.tema;
  return t;
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
    "--cor-sidebar": t.sidebar,
    "--cor-tema-hover": t.hover,
    "--cor-tema-hover-a60": `rgba(${hoverRgb}, 0.60)`,
    "--cor-tema-botao-hover": t.botaoHover,
    "--cor-tema-escura": t.escura,
    "--cor-tema-escura-a70": `rgba(${escuraRgb}, 0.70)`,
    "--cor-tema-escura2": t.escura2,
    "--cor-tema-escura2-a50": `rgba(${escura2Rgb}, 0.50)`,
    "--cor-tema-a75": `rgba(${rgb}, 0.75)`,
    "--cor-tema-a55": `rgba(${rgb}, 0.55)`,
    "--cor-tema-a20": `rgba(${rgb}, 0.20)`,
    "--cor-tema-a10": `rgba(${rgb}, 0.10)`,
    "--cor-tema-a06": `rgba(${rgb}, 0.06)`,
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
    "--sombra-suave": `0 1px 2px rgba(${t.sombra}, 0.05), 0 10px 30px -14px rgba(${t.sombra}, 0.14)`,
  };
}
