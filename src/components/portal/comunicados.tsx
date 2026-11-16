"use client";

// ── Comunicados da administração ──────────────────────────────────
// Módulo exclusivo dos comunicados (avisos) do condomínio — as campanhas
// institucionais ganharam módulo próprio (Campanhas). Síndico, administração
// e plataforma publicam e EXCLUEM; toda exclusão fica registrada na auditoria.

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import {
  Badge,
  BotaoPrimario,
  BotaoSecundario,
  BotaoTexto,
  Carregando,
  dataHoraCurta,
  EstadoVazio,
  Lista,
  ROTULO_CATEGORIA_COMUNICADO,
  Secao,
} from "@/components/portal/ui";
import type { Perfil } from "@/components/portal/app-shell";
import { corpoJson, mensagemDeErro, mensagemRede } from "@/lib/api-cliente";
import { buscarJSON } from "@/lib/buscar-json";

type Comunicado = {
  id: string;
  titulo: string;
  conteudo: string;
  categoria: string;
  prioridade: string;
  criadoEm: string;
  autor: { nome: string; perfil: string };
};

type Form = { titulo: string; conteudo: string; categoria: string; prioridade: string };

const VAZIO: Form = { titulo: "", conteudo: "", categoria: "GERAL", prioridade: "NORMAL" };

export default function Comunicados({ perfil }: { perfil: Perfil }) {
  const [lista, setLista] = useState<Comunicado[] | null>(null);
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState<Form>(VAZIO);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [excluirId, setExcluirId] = useState<string | null>(null);
  // Síndico, administração e plataforma publicam e excluem comunicados —
  // a API aplica a mesma régua e registra a exclusão na auditoria.
  const podePublicar = perfil === "SINDICO" || perfil === "ADMINISTRATIVO" || perfil === "PLATAFORMA";

  const carregar = useCallback(() => {
    buscarJSON("/api/comunicados")
      .then((d) => d && setLista(d.lista))
  }, []);

  useEffect(carregar, [carregar]);

  async function publicar() {
    setErro("");
    setEnviando(true);
    try {
      const r = await fetch("/api/comunicados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const corpo = await corpoJson(r);
      if (!corpo) throw new Error(mensagemRede(r.status));
      if (!r.ok) throw new Error(corpo.erro || "Falha ao publicar.");
      setAberto(false);
      setForm(VAZIO);
      carregar();
    } catch (e) {
      setErro(mensagemDeErro(e, "Falha ao publicar."));
    } finally {
      setEnviando(false);
    }
  }

  // Exclusão definitiva — registrada automaticamente na auditoria pela API
  async function excluirComunicado(id: string) {
    await fetch(`/api/comunicados/${id}`, { method: "DELETE" }).catch(() => null);
    setExcluirId(null);
    carregar();
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500 dark:text-stone-400">
          Gestão
        </p>
        <h1 className="text-2xl font-semibold leading-tight text-stone-900 dark:text-stone-100">Comunicados</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          Avisos da administração para moradores e funcionários — manutenções, eventos, obras e
          segurança. A gestão pode publicar e excluir a qualquer momento; cada exclusão fica
          registrada na auditoria.
        </p>
      </header>

      <Secao
        titulo={`Comunicados${lista ? ` · ${lista.length}` : ""}`}
        acao={
          podePublicar && (
            <BotaoPrimario onClick={() => setAberto(true)}>Publicar comunicado</BotaoPrimario>
          )
        }
      >
        {!lista ? (
          <Carregando />
        ) : lista.length === 0 ? (
          <EstadoVazio mensagem="Nenhum comunicado publicado ainda." />
        ) : (
          <Lista>
            {lista.map((c) => (
              <div key={c.id} className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{c.titulo}</p>
                    <p className="mt-0.5 text-xs text-stone-400 dark:text-stone-500">
                      {ROTULO_CATEGORIA_COMUNICADO[c.categoria] ?? c.categoria} · {c.autor.nome} ·{" "}
                      {dataHoraCurta(c.criadoEm)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2.5">
                    {podePublicar && (
                      excluirId === c.id ? (
                        <BotaoTexto tom="vermelho" onClick={() => excluirComunicado(c.id)}>
                          Confirmar
                        </BotaoTexto>
                      ) : (
                        <BotaoTexto tom="vermelho" onClick={() => setExcluirId(c.id)}>
                          Excluir
                        </BotaoTexto>
                      )
                    )}
                    {c.prioridade === "ALTA" ? (
                      <Badge tom="vermelho">Prioridade alta</Badge>
                    ) : (
                      <Badge>{ROTULO_CATEGORIA_COMUNICADO[c.categoria] ?? c.categoria}</Badge>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">{c.conteudo}</p>
              </div>
            ))}
          </Lista>
        )}
      </Secao>

      {/* Modal: publicar comunicado */}
      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            aria-label="Fechar"
            className="absolute inset-0 bg-black/40"
            onClick={() => setAberto(false)}
          />
          <div className="relative max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-lg border border-[var(--cor-neutra)] bg-white dark:bg-stone-900 p-6 shadow-xl">
            <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">Publicar comunicado</h3>
            <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
              Visível para todos os moradores e funcionários.
            </p>
            <div className="mt-4 space-y-3">
              <input
                placeholder="Título"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                className="h-10 w-full rounded-md border border-[var(--cor-neutra-2)] px-3 text-sm outline-none focus:border-[var(--cor-tema-suave)] focus:ring-2 focus:ring-[var(--cor-tema-suave)]/30"
              />
              <textarea
                placeholder="Conteúdo do comunicado"
                rows={5}
                value={form.conteudo}
                onChange={(e) => setForm({ ...form, conteudo: e.target.value })}
                className="w-full rounded-md border border-[var(--cor-neutra-2)] px-3 py-2 text-sm outline-none focus:border-[var(--cor-tema-suave)] focus:ring-2 focus:ring-[var(--cor-tema-suave)]/30"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  className="h-10 w-full rounded-md border border-[var(--cor-neutra-2)] bg-white dark:bg-stone-900 px-3 text-sm outline-none focus:border-[var(--cor-tema-suave)]"
                >
                  {Object.entries(ROTULO_CATEGORIA_COMUNICADO).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <select
                  value={form.prioridade}
                  onChange={(e) => setForm({ ...form, prioridade: e.target.value })}
                  className="h-10 w-full rounded-md border border-[var(--cor-neutra-2)] bg-white dark:bg-stone-900 px-3 text-sm outline-none focus:border-[var(--cor-tema-suave)]"
                >
                  <option value="NORMAL">Prioridade normal</option>
                  <option value="ALTA">Prioridade alta</option>
                </select>
              </div>
              {erro && <p className="rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">{erro}</p>}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <BotaoSecundario onClick={() => setAberto(false)}>Cancelar</BotaoSecundario>
              <BotaoPrimario onClick={publicar} disabled={enviando}>
                {enviando && <LoaderCircle className="h-4 w-4 animate-spin" />} Publicar
              </BotaoPrimario>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
