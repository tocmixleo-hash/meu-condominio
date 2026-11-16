"use client";

// ── Campanhas em destaque (módulo próprio de gestão) ──────────────
// Separado dos comunicados: aqui ficam apenas as campanhas institucionais
// de conscientização exibidas com destaque no painel inicial (banner
// rotativo). Síndico, administração e plataforma criam, editam, pausam
// e EXCLUEM — toda exclusão fica registrada na auditoria.

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import {
  Badge,
  BotaoPrimario,
  BotaoSecundario,
  BotaoTexto,
  Carregando,
  dataHoraCurta,
  EMOJIS_CAMPANHA,
  EstadoVazio,
  formatarData,
  Lista,
  ROTULO_CATEGORIA_CAMPANHA,
  Secao,
} from "@/components/portal/ui";
import type { Perfil } from "@/components/portal/app-shell";
import { corpoJson, mensagemDeErro, mensagemRede } from "@/lib/api-cliente";
import { buscarJSON } from "@/lib/buscar-json";
import { DESTINOS_CAMPANHA } from "@/lib/destinos-campanha";

type Campanha = {
  id: string;
  titulo: string;
  mensagem: string;
  descricao: string | null;
  categoria: string;
  emoji: string;
  destino?: string | null;
  ativa: boolean;
  inicioEm: string | null;
  fimEm: string | null;
  criadoEm: string;
  autor?: { nome: string; perfil: string } | null;
};

type FormCampanha = {
  titulo: string;
  mensagem: string;
  descricao: string;
  categoria: string;
  emoji: string;
  destino: string; // módulo aberto ao clicar no banner ("" = apenas detalhes)
  inicioEm: string; // yyyy-MM-dd ou ""
  fimEm: string;
};

const VAZIO_CAMPANHA: FormCampanha = {
  titulo: "",
  mensagem: "",
  descricao: "",
  categoria: "CONVIVENCIA",
  emoji: "🐾",
  destino: "",
  inicioEm: "",
  fimEm: "",
};

function paraFormCampanha(c: Campanha): FormCampanha {
  return {
    titulo: c.titulo,
    mensagem: c.mensagem,
    descricao: c.descricao ?? "",
    categoria: c.categoria,
    emoji: c.emoji,
    destino: c.destino ?? "",
    inicioEm: c.inicioEm ? c.inicioEm.slice(0, 10) : "",
    fimEm: c.fimEm ? c.fimEm.slice(0, 10) : "",
  };
}

// Situação da campanha para a lista da gestão
function situacaoCampanha(c: Campanha): { rotulo: string; tom: "verde" | "neutro" } {
  const agora = new Date();
  if (!c.ativa) return { rotulo: "Pausada", tom: "neutro" };
  if (c.inicioEm && new Date(c.inicioEm) > agora) return { rotulo: "Agendada", tom: "neutro" };
  if (c.fimEm && new Date(c.fimEm) < agora) return { rotulo: "Encerrada", tom: "neutro" };
  return { rotulo: "Ativa", tom: "verde" };
}

function periodoCampanha(c: Pick<Campanha, "inicioEm" | "fimEm">): string {
  if (c.inicioEm && c.fimEm) return `De ${formatarData(c.inicioEm)} a ${formatarData(c.fimEm)}`;
  if (c.inicioEm) return `A partir de ${formatarData(c.inicioEm)}`;
  if (c.fimEm) return `Até ${formatarData(c.fimEm)}`;
  return "Permanente";
}

export default function Campanhas({ perfil }: { perfil: Perfil }) {
  const [campanhas, setCampanhas] = useState<Campanha[] | null>(null);
  const [campanhaAberta, setCampanhaAberta] = useState(false);
  const [editando, setEditando] = useState<Campanha | null>(null);
  const [formCampanha, setFormCampanha] = useState<FormCampanha>(VAZIO_CAMPANHA);
  const [erroCampanha, setErroCampanha] = useState("");
  const [enviandoCampanha, setEnviandoCampanha] = useState(false);
  const [excluirId, setExcluirId] = useState<string | null>(null);
  // Síndico, administração e plataforma gerenciam; demais perfis só acompanham.
  const podeGerenciarCampanhas =
    perfil === "SINDICO" || perfil === "ADMINISTRATIVO" || perfil === "PLATAFORMA";

  const carregarCampanhas = useCallback(() => {
    buscarJSON(podeGerenciarCampanhas ? "/api/campanhas?todas=1" : "/api/campanhas")
      .then((d) => d && setCampanhas(d.lista))
  }, [podeGerenciarCampanhas]);

  useEffect(carregarCampanhas, [carregarCampanhas]);

  function novaCampanha() {
    setEditando(null);
    setFormCampanha(VAZIO_CAMPANHA);
    setErroCampanha("");
    setCampanhaAberta(true);
  }

  function editarCampanha(c: Campanha) {
    setEditando(c);
    setFormCampanha(paraFormCampanha(c));
    setErroCampanha("");
    setCampanhaAberta(true);
  }

  async function salvarCampanha() {
    setErroCampanha("");
    setEnviandoCampanha(true);
    try {
      const corpo = {
        titulo: formCampanha.titulo,
        mensagem: formCampanha.mensagem,
        descricao: formCampanha.descricao,
        categoria: formCampanha.categoria,
        emoji: formCampanha.emoji,
        destino: formCampanha.destino || null,
        inicioEm: formCampanha.inicioEm || null,
        fimEm: formCampanha.fimEm || null,
      };
      const r = await fetch(editando ? `/api/campanhas/${editando.id}` : "/api/campanhas", {
        method: editando ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const resposta = await corpoJson(r);
      if (!resposta) throw new Error(mensagemRede(r.status));
      if (!r.ok) throw new Error(resposta.erro || "Falha ao salvar a campanha.");
      setCampanhaAberta(false);
      carregarCampanhas();
    } catch (e) {
      setErroCampanha(mensagemDeErro(e, "Falha ao salvar a campanha."));
    } finally {
      setEnviandoCampanha(false);
    }
  }

  async function alternarCampanha(c: Campanha) {
    await fetch(`/api/campanhas/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativa: !c.ativa }),
    }).catch(() => null);
    carregarCampanhas();
  }

  // Exclusão definitiva — registrada automaticamente na auditoria pela API
  async function excluirCampanha(id: string) {
    await fetch(`/api/campanhas/${id}`, { method: "DELETE" }).catch(() => null);
    setExcluirId(null);
    carregarCampanhas();
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500 dark:text-stone-400">
          Gestão
        </p>
        <h1 className="text-2xl font-semibold leading-tight text-stone-900 dark:text-stone-100">Campanhas</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          Campanhas institucionais de conscientização e boas práticas, exibidas com destaque no
          painel inicial de todos os moradores. A gestão pode criar, editar, pausar ou excluir —
          cada alteração fica registrada na auditoria.
        </p>
      </header>

      <Secao
        titulo={`Campanhas em destaque${campanhas ? ` · ${campanhas.length}` : ""}`}
        acao={
          podeGerenciarCampanhas && (
            <BotaoPrimario onClick={novaCampanha}>Nova campanha</BotaoPrimario>
          )
        }
      >
        {!campanhas ? (
          <Carregando />
        ) : campanhas.length === 0 ? (
          <EstadoVazio mensagem="Nenhuma campanha em veiculação. A gestão pode divulgar ações de conscientização com destaque no painel inicial." />
        ) : (
          <Lista>
            {campanhas.map((c) => {
              const situacao = situacaoCampanha(c);
              return (
                <div key={c.id} className="py-4">
                  <div className="flex items-start gap-3.5">
                    <span
                      aria-hidden
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--cor-tema-a06)] text-xl"
                    >
                      {c.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{c.titulo}</p>
                      <p className="mt-0.5 text-xs text-stone-400 dark:text-stone-500">
                        {ROTULO_CATEGORIA_CAMPANHA[c.categoria] ?? c.categoria} ·{" "}
                        {periodoCampanha(c)}
                        {c.autor?.nome ? ` · ${c.autor.nome}` : ""} ·{" "}
                        {dataHoraCurta(c.criadoEm)}
                      </p>
                      <p className="mt-1.5 text-sm leading-relaxed text-stone-600 dark:text-stone-400">{c.mensagem}</p>
                      {c.descricao && (
                        <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                          {c.descricao}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      {podeGerenciarCampanhas && situacao ? (
                        <Badge tom={situacao.tom}>{situacao.rotulo}</Badge>
                      ) : (
                        <Badge>
                          {ROTULO_CATEGORIA_CAMPANHA[c.categoria] ?? c.categoria}
                        </Badge>
                      )}
                      {podeGerenciarCampanhas && (
                        <div className="flex items-center gap-2.5">
                          <BotaoTexto onClick={() => editarCampanha(c)}>Editar</BotaoTexto>
                          <BotaoTexto onClick={() => alternarCampanha(c)}>
                            {c.ativa ? "Pausar" : "Retomar"}
                          </BotaoTexto>
                          {excluirId === c.id ? (
                            <BotaoTexto tom="vermelho" onClick={() => excluirCampanha(c.id)}>
                              Confirmar
                            </BotaoTexto>
                          ) : (
                            <BotaoTexto tom="vermelho" onClick={() => setExcluirId(c.id)}>
                              Excluir
                            </BotaoTexto>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </Lista>
        )}
      </Secao>

      {/* Modal: nova campanha / editar campanha */}
      {campanhaAberta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            aria-label="Fechar"
            className="absolute inset-0 bg-black/40"
            onClick={() => setCampanhaAberta(false)}
          />
          <div className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-xl border border-[var(--cor-neutra)] bg-white dark:bg-stone-900 p-6 shadow-xl">
            <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">
              {editando ? "Editar campanha" : "Nova campanha em destaque"}
            </h3>
            <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
              Divulgada com destaque no painel inicial para todos os moradores.
            </p>
            <div className="mt-4 space-y-3">
              {/* Emblema */}
              <div>
                <p className="mb-1.5 text-xs font-medium text-stone-500 dark:text-stone-400">Emblema da campanha</p>
                <div className="flex flex-wrap gap-1.5">
                  {EMOJIS_CAMPANHA.map((e) => (
                    <button
                      key={e}
                      type="button"
                      aria-label={`Escolher emblema ${e}`}
                      aria-pressed={formCampanha.emoji === e}
                      onClick={() => setFormCampanha({ ...formCampanha, emoji: e })}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition ${
                        formCampanha.emoji === e
                          ? "border-[var(--cor-tema)] bg-[var(--cor-tema-a06)]"
                          : "border-[var(--cor-neutra-2)] bg-white dark:bg-stone-900 hover:border-[var(--cor-tema-suave)]"
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <input
                placeholder="Título da campanha (ex.: Recolha as fezes do seu pet)"
                maxLength={80}
                value={formCampanha.titulo}
                onChange={(e) => setFormCampanha({ ...formCampanha, titulo: e.target.value })}
                className="h-10 w-full rounded-md border border-[var(--cor-neutra-2)] px-3 text-sm outline-none focus:border-[var(--cor-tema-suave)] focus:ring-2 focus:ring-[var(--cor-tema-suave)]/30"
              />
              <textarea
                placeholder="Mensagem curta exibida no banner (até 200 caracteres)"
                rows={2}
                maxLength={200}
                value={formCampanha.mensagem}
                onChange={(e) => setFormCampanha({ ...formCampanha, mensagem: e.target.value })}
                className="w-full rounded-md border border-[var(--cor-neutra-2)] px-3 py-2 text-sm outline-none focus:border-[var(--cor-tema-suave)] focus:ring-2 focus:ring-[var(--cor-tema-suave)]/30"
              />
              <textarea
                placeholder="Descrição complementar (opcional) — boas práticas, orientações"
                rows={4}
                value={formCampanha.descricao}
                onChange={(e) => setFormCampanha({ ...formCampanha, descricao: e.target.value })}
                className="w-full rounded-md border border-[var(--cor-neutra-2)] px-3 py-2 text-sm outline-none focus:border-[var(--cor-tema-suave)] focus:ring-2 focus:ring-[var(--cor-tema-suave)]/30"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={formCampanha.categoria}
                  onChange={(e) => setFormCampanha({ ...formCampanha, categoria: e.target.value })}
                  className="h-10 w-full rounded-md border border-[var(--cor-neutra-2)] bg-white dark:bg-stone-900 px-3 text-sm outline-none focus:border-[var(--cor-tema-suave)]"
                >
                  {Object.entries(ROTULO_CATEGORIA_CAMPANHA).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Destino do banner ao clicar"
                  value={formCampanha.destino}
                  onChange={(e) => setFormCampanha({ ...formCampanha, destino: e.target.value })}
                  className="h-10 w-full rounded-md border border-[var(--cor-neutra-2)] bg-white dark:bg-stone-900 px-3 text-sm outline-none focus:border-[var(--cor-tema-suave)]"
                >
                  <option value="">Ao clicar: só abrir detalhes</option>
                  {DESTINOS_CAMPANHA.map((d) => (
                    <option key={d.id} value={d.id}>
                      Ao clicar: ir para {d.rotulo}
                    </option>
                  ))}
                </select>
                <div className="col-span-2 flex items-center gap-2">
                  <input
                    type="date"
                    aria-label="Início da veiculação"
                    value={formCampanha.inicioEm}
                    onChange={(e) => setFormCampanha({ ...formCampanha, inicioEm: e.target.value })}
                    className="h-10 w-full rounded-md border border-[var(--cor-neutra-2)] bg-white dark:bg-stone-900 px-2 text-xs outline-none focus:border-[var(--cor-tema-suave)]"
                  />
                  <span className="text-xs text-stone-400 dark:text-stone-500">até</span>
                  <input
                    type="date"
                    aria-label="Encerramento da veiculação"
                    value={formCampanha.fimEm}
                    onChange={(e) => setFormCampanha({ ...formCampanha, fimEm: e.target.value })}
                    className="h-10 w-full rounded-md border border-[var(--cor-neutra-2)] bg-white dark:bg-stone-900 px-2 text-xs outline-none focus:border-[var(--cor-tema-suave)]"
                  />
                </div>
              </div>
              <p className="text-xs text-stone-400 dark:text-stone-500">
                Período opcional — sem datas, a campanha fica em veiculação até ser pausada ou excluída.
              </p>
              {erroCampanha && (
                <p className="rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">{erroCampanha}</p>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <BotaoSecundario onClick={() => setCampanhaAberta(false)}>Cancelar</BotaoSecundario>
              <BotaoPrimario onClick={salvarCampanha} disabled={enviandoCampanha}>
                {enviandoCampanha && <LoaderCircle className="h-4 w-4 animate-spin" />}{" "}
                {editando ? "Salvar" : "Divulgar campanha"}
              </BotaoPrimario>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
