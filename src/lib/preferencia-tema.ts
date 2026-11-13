/**
 * Preferência de tema claro/escuro do usuário.
 *
 * O tema é aplicado como classe `dark` no <html> por um script de pré-pintura
 * (layout.tsx) — antes do React hidratar — para não haver flash. Aqui ficam a
 * leitura, a troca e o gancho React para os componentes reagirem (as variáveis
 * do condomínio são estilos inline e precisam ser rederivadas quando o tema
 * muda; ver cssVarsDoTema em tema.ts).
 */

import { useEffect, useState } from "react";

export type PreferenciaTema = "claro" | "escuro" | "sistema";

const CHAVE = "tema-preferencia";

/** Tema efetivamente aplicado agora (classe .dark no html). */
export function temaAplicado(): "claro" | "escuro" {
  if (typeof document === "undefined") return "claro";
  return document.documentElement.classList.contains("dark") ? "escuro" : "claro";
}

function resolverSistema(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-color-scheme: dark)").matches
  );
}

function aplicarClasse(escuro: boolean) {
  document.documentElement.classList.toggle("dark", escuro);
}

/** Grava a preferência e aplica na hora, avisando os componentes abertos. */
export function definirTema(preferencia: PreferenciaTema) {
  try {
    localStorage.setItem(CHAVE, preferencia);
  } catch {
    // armazenamento indisponível (modo privado): aplica só nesta sessão
  }
  const escuro = preferencia === "escuro" || (preferencia === "sistema" && resolverSistema());
  aplicarClasse(escuro);
  window.dispatchEvent(new CustomEvent("tema-mudou", { detail: escuro }));
}

export function alternarTema() {
  definirTema(temaAplicado() === "escuro" ? "claro" : "escuro");
}

/** Estado reativo do tema atual para componentes que rederivam variáveis. */
export function useTema(): { escuro: boolean; alternar: () => void } {
  const [escuro, setEscuro] = useState(false);

  useEffect(() => {
    const sincronizar = () => setEscuro(temaAplicado() === "escuro");
    sincronizar();
    window.addEventListener("tema-mudou", sincronizar);
    window.addEventListener("storage", sincronizar);
    const midia = window.matchMedia("(prefers-color-scheme: dark)");
    midia.addEventListener?.("change", sincronizar);
    return () => {
      window.removeEventListener("tema-mudou", sincronizar);
      window.removeEventListener("storage", sincronizar);
      midia.removeEventListener?.("change", sincronizar);
    };
  }, []);

  return { escuro, alternar: alternarTema };
}
