// ── fetch com diagnóstico — substitui o padrão silencioso ─────────
// Antes:  fetch("/api/x").then(async (r) => (r.ok ? r.json() : null))
// A falha virava "conteúdo que simplesmente não aparece" — foi assim
// que o 500 das campanhas em produção passou despercebido. Este helper
// registra o erro no console (com método, URL e status) e devolve null,
// mantendo o mesmo contrato dos chamadores originais.

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- espelha o `any` de Response.json() que os chamadores já usavam
export async function buscarJSON<T = any>(
  url: string,
  init?: RequestInit,
): Promise<T | null> {
  try {
    const r = await fetch(url, init);
    if (!r.ok) {
      console.error(`[portal] ${init?.method ?? "GET"} ${url} → HTTP ${r.status}`);
      return null;
    }
    return (await r.json()) as T;
  } catch (e) {
    console.error(`[portal] falha de rede em ${init?.method ?? "GET"} ${url}`, e);
    return null;
  }
}
