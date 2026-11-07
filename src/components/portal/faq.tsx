"use client";

import { useMemo, useState } from "react";
import {
  CircleAlert,
  Hammer,
  HandPlatter,
  HelpCircle,
  PawPrint,
  Recycle,
  Search,
  Truck,
  Users,
  Waves,
  X,
} from "lucide-react";
import { EstadoVazio, Secao } from "@/components/portal/ui";
import { DESTAQUES_FAQ, montarFaq, type FaqMontado } from "@/lib/faq";

// ── Perguntas frequentes (morador) ───────────────────────────────
// Regras de convivência do condomínio em formato de busca + acordeão:
// piscina, mudanças, lixo, obras, ruído, pets, portaria e uso do portal.
// Conteúdo estático (lib/faq.ts) — não depende de rede e abre instantâneo.

const ICONE_CATEGORIA: Record<string, typeof Waves> = {
  piscina: Waves,
  mudancas: Truck,
  lixo: Recycle,
  obras: Hammer,
  convivencia: Users,
  pets: PawPrint,
  portaria: HandPlatter,
  portal: HelpCircle,
};

const ICONE_DESTAQUE: Record<string, typeof Waves> = {
  "piscina-proibido-vidro": Waves,
  "mudanca-agendar": Truck,
  "lixo-corredor-proibido": CircleAlert,
  silencio: Users,
};

function normalize(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function Faq({
  condominio,
  aoTrocar,
}: {
  condominio: { nome: string; telefoneContato?: string | null; emailContato?: string | null };
  aoTrocar?: (m: "ocorrencias") => void;
}) {
  const categorias = useMemo(() => montarFaq(condominio.nome), [condominio.nome]);
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<string | null>(null); // null = todas
  const [abertas, setAbertas] = useState<Set<string>>(new Set());

  const termo = normalize(busca.trim());

  const filtradas: FaqMontado[] = useMemo(() => {
    return categorias
      .filter((c) => !categoria || c.id === categoria)
      .map((c) => ({
        ...c,
        perguntas: termo
          ? c.perguntas.filter(
              (p) =>
                normalize(p.pergunta).includes(termo) || normalize(p.resposta).includes(termo),
            )
          : c.perguntas,
      }))
      .filter((c) => c.perguntas.length > 0);
  }, [categorias, categoria, termo]);

  const total = filtradas.reduce((n, c) => n + c.perguntas.length, 0);

  function alternar(chave: string) {
    setAbertas((atuais) => {
      const novas = new Set(atuais);
      if (novas.has(chave)) novas.delete(chave);
      else novas.add(chave);
      return novas;
    });
  }

  return (
    <div className="space-y-5">
      <Secao titulo="Perguntas frequentes" className="max-w-2xl">
        <h1 className="mt-1 text-xl font-bold text-stone-900">Como podemos ajudar?</h1>
        <p className="mt-1 text-sm leading-relaxed text-stone-600">
          Regras de convivência do {condominio.nome} — horários da piscina, mudanças, descarte de
          lixo e mais. Toque em uma pergunta para ver a resposta.
        </p>
      </Secao>

      {/* Busca */}
      <div className="relative max-w-2xl">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar dúvida (ex.: ducha, papelão, barulho…)"
          aria-label="Buscar nas perguntas frequentes"
          className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-10 text-sm text-stone-800 placeholder:text-stone-400 focus:border-[var(--cor-tema,#4D403A)] focus:outline-none focus:ring-2 focus:ring-[var(--cor-tema,#4D403A)]/15"
        />
        {busca && (
          <button
            onClick={() => setBusca("")}
            aria-label="Limpar busca"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filtros por categoria (rolagem horizontal no celular) */}
      <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex sm:flex-wrap sm:px-0">
        <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
          <button
            onClick={() => setCategoria(null)}
            className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
              categoria === null
                ? "border-transparent bg-[var(--cor-tema,#4D403A)] text-white"
                : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-900"
            }`}
          >
            Todas
          </button>
          {categorias.map((c) => {
            const Icone = ICONE_CATEGORIA[c.id] ?? HelpCircle;
            const ativa = categoria === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setCategoria(ativa ? null : c.id)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                  ativa
                    ? "border-transparent bg-[var(--cor-tema,#4D403A)] text-white"
                    : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-900"
                }`}
              >
                <Icone className="h-3.5 w-3.5" />
                {c.rotulo}
              </button>
            );
          })}
        </div>
      </div>

      {/* Avisos rápidos — só sem busca e sem filtro de categoria */}
      {!termo && !categoria && (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {DESTAQUES_FAQ.map((d) => {
            const Icone = ICONE_DESTAQUE[d.id] ?? CircleAlert;
            return (
              <div
                key={d.id}
                className="flex items-start gap-3 rounded-xl border border-stone-200 bg-white p-3.5"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--cor-tema-suave,#f0ebe7)] text-[var(--cor-tema,#4D403A)]">
                  <Icone className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-stone-900">{d.titulo}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-stone-500">{d.texto}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Acordeão de perguntas */}
      {total === 0 ? (
        <EstadoVazio mensagem={`Nenhuma pergunta encontrada${busca ? ` para “${busca}”` : ""}.`} />
      ) : (
        <div className="space-y-5">
          {filtradas.map((c) => {
            const Icone = ICONE_CATEGORIA[c.id] ?? HelpCircle;
            return (
              <section key={c.id}>
                <div className="mb-1.5 flex items-center gap-1.5">
                  <Icone className="h-3.5 w-3.5 text-stone-400" />
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                    {c.rotulo} · {c.perguntas.length}
                  </h2>
                </div>
                <div className="divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200 bg-white">
                  {c.perguntas.map((p, idx) => {
                    const chave = `${c.id}:${idx}`;
                    const aberta = abertas.has(chave);
                    return (
                      <div key={chave}>
                        <button
                          onClick={() => alternar(chave)}
                          aria-expanded={aberta}
                          className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-stone-50"
                        >
                          <span className="text-sm font-medium leading-snug text-stone-800">
                            {p.pergunta}
                          </span>
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                            className={`h-4 w-4 shrink-0 text-stone-400 transition-transform duration-200 ${
                              aberta ? "rotate-180" : ""
                            }`}
                          >
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </button>
                        {aberta && (
                          <p className="px-4 pb-4 text-sm leading-relaxed text-stone-600">
                            {p.resposta}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Ainda tem dúvidas? */}
      <div className="rounded-xl border border-stone-200 bg-[var(--cor-tema-suave,#f7f4f1)] p-4 sm:p-5">
        <p className="text-sm font-semibold text-stone-900">Não encontrou sua dúvida?</p>
        <p className="mt-1 text-sm leading-relaxed text-stone-600">
          Fale com a administração
          {condominio.telefoneContato ? ` (${condominio.telefoneContato})` : ""}
          {condominio.emailContato ? ` ou escreva para ${condominio.emailContato}` : ""}. Para
          reportar algo que precisa de solução, use o menu Ocorrências — você acompanha o andamento
          pelo portal.
        </p>
        {aoTrocar && (
          <button
            onClick={() => aoTrocar("ocorrencias")}
            className="mt-3 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-sm font-semibold text-[var(--cor-tema,#4D403A)] transition hover:bg-white/80"
          >
            Reportar pelo portal
          </button>
        )}
      </div>
    </div>
  );
}
