"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import {
  Badge,
  BotaoPrimario,
  BotaoSecundario,
  BotaoTexto,
  Carregando,
  EstadoVazio,
  dataHoraCurta,
  Lista,
  LinhaLista,
  ROTULO_CATEGORIA_OCORRENCIA,
  ROTULO_PRIORIDADE_OCORRENCIA,
  rotuloStatusOcorrencia,
  Secao,
  tomStatusOcorrencia,
} from "@/components/portal/ui";
import type { Perfil } from "@/components/portal/app-shell";
import { corpoJson, mensagemDeErro, mensagemRede } from "@/lib/api-cliente";
import { buscarJSON } from "@/lib/buscar-json";

type Ocorrencia = {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  prioridade: string;
  local: string | null;
  status: string;
  resolucao: string | null;
  criadoEm: string;
  abertaPor: { nome: string; unidade?: { bloco: string; numero: string } | null };
};

type Form = { titulo: string; descricao: string; categoria: string; prioridade: string; local: string };

const VAZIO: Form = { titulo: "", descricao: "", categoria: "OUTROS", prioridade: "NORMAL", local: "" };

export default function Ocorrencias({ perfil }: { perfil: Perfil }) {
  const [lista, setLista] = useState<Ocorrencia[] | null>(null);
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState<Form>(VAZIO);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  // Atendimento (equipe): ocorrência em foco + campos de status
  const [atendimento, setAtendimento] = useState<Ocorrencia | null>(null);
  const [resolucao, setResolucao] = useState("");
  const [atendendo, setAtendendo] = useState(false);
  const ehMorador = perfil === "MORADOR";
  const ehEquipeGestao = perfil === "SINDICO" || perfil === "ADMINISTRATIVO" || perfil === "PLATAFORMA";

  const carregar = useCallback(() => {
    buscarJSON("/api/ocorrencias")
      .then((d) => d && setLista(d.lista))
  }, []);

  useEffect(carregar, [carregar]);

  async function criar() {
    setErro("");
    setEnviando(true);
    try {
      const r = await fetch("/api/ocorrencias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const corpo = await corpoJson(r);
      if (!corpo) throw new Error(mensagemRede(r.status));
      if (!r.ok) throw new Error(corpo.erro || "Falha ao registrar a ocorrência.");
      setAberto(false);
      setForm(VAZIO);
      carregar();
    } catch (e) {
      setErro(mensagemDeErro(e, "Falha ao registrar a ocorrência."));
    } finally {
      setEnviando(false);
    }
  }

  async function atender(id: string, status: string) {
    setAtendendo(true);
    setErro("");
    try {
      const r = await fetch("/api/ocorrencias", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, ...(status === "RESOLVIDA" ? { resolucao } : {}) }),
      });
      const corpo = await corpoJson(r);
      if (!corpo) throw new Error(mensagemRede(r.status));
      if (!r.ok) throw new Error(corpo.erro || "Falha ao atualizar a ocorrência.");
      setAtendimento(null);
      setResolucao("");
      carregar();
    } catch (e) {
      setErro(mensagemDeErro(e, "Falha ao atualizar a ocorrência."));
    } finally {
      setAtendendo(false);
    }
  }

  const campo =
    "h-10 w-full rounded-md border border-[var(--cor-neutra-2)] px-3 text-sm outline-none focus:border-[var(--cor-tema-suave)] focus:ring-2 focus:ring-[var(--cor-tema-suave)]/30";

  return (
    <div className="space-y-6">
      <Secao
        titulo={ehMorador ? "Minhas ocorrências" : "Ocorrências do condomínio"}
        acao={<BotaoPrimario onClick={() => setAberto(true)}>Registrar ocorrência</BotaoPrimario>}
      >
        <p className="mb-4 text-sm text-[var(--cor-fg-suave)]">
          {ehMorador
            ? "Reporte um problema do condomínio — a administração recebe na hora e atualiza o andamento."
            : "Chamados abertos por moradores e pela equipe, com prioridade e andamento."}
        </p>
        {!lista ? (
          <Carregando />
        ) : lista.length === 0 ? (
          <EstadoVazio mensagem="Nenhuma ocorrência registrada. Tudo em ordem!" />
        ) : (
          <Lista>
            {lista.map((o) => (
              <LinhaLista
                key={o.id}
                principal={o.titulo}
                secundaria={`${
                  !ehMorador
                    ? `${o.abertaPor.unidade ? `Un. ${o.abertaPor.unidade.bloco}-${o.abertaPor.unidade.numero} · ` : ""}${o.abertaPor.nome} · `
                    : ""
                }${ROTULO_CATEGORIA_OCORRENCIA[o.categoria] ?? o.categoria}${
                  o.local ? ` · ${o.local}` : ""
                }`}
                detalhe={
                  <>
                    {o.status !== "ABERTA" && (
                      <span>
                        {o.status === "RESOLVIDA" && o.resolucao ? `${o.resolucao} · ` : ""}
                      </span>
                    )}
                    <span>Aberta {dataHoraCurta(o.criadoEm)}</span>
                  </>
                }
                direita={
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Badge tom={o.prioridade === "URGENTE" || o.prioridade === "ALTA" ? "vermelho" : "neutro"}>
                      {ROTULO_PRIORIDADE_OCORRENCIA[o.prioridade] ?? o.prioridade}
                    </Badge>
                    <Badge tom={tomStatusOcorrencia(o.status)}>{rotuloStatusOcorrencia(o.status)}</Badge>
                    {ehEquipeGestao && o.status !== "RESOLVIDA" && (
                      <BotaoTexto
                        onClick={() => {
                          setAtendimento(o);
                          setResolucao(o.resolucao ?? "");
                          setErro("");
                        }}
                      >
                        Atender
                      </BotaoTexto>
                    )}
                  </div>
                }
              />
            ))}
          </Lista>
        )}
      </Secao>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button aria-label="Fechar" className="absolute inset-0 bg-black/40" onClick={() => setAberto(false)} />
          <div className="relative max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-lg border border-[var(--cor-neutra)] bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-stone-900">Registrar ocorrência</h3>
            <p className="mt-0.5 text-sm text-stone-500">
              Descreva o problema — quanto mais claro, mais rápido o atendimento.
            </p>
            <div className="mt-4 space-y-3">
              <input
                placeholder="Título (ex.: Vazamento na tubulação do 3º andar)"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                className={campo}
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  className={`${campo} bg-white`}
                >
                  {Object.entries(ROTULO_CATEGORIA_OCORRENCIA).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <select
                  value={form.prioridade}
                  onChange={(e) => setForm({ ...form, prioridade: e.target.value })}
                  className={`${campo} bg-white`}
                >
                  {Object.entries(ROTULO_PRIORIDADE_OCORRENCIA).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <input
                placeholder="Local (opcional — ex.: Bloco B, área da piscina)"
                value={form.local}
                onChange={(e) => setForm({ ...form, local: e.target.value })}
                className={campo}
              />
              <textarea
                placeholder="Descreva o que está acontecendo"
                rows={4}
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                className="w-full rounded-md border border-[var(--cor-neutra-2)] px-3 py-2 text-sm outline-none focus:border-[var(--cor-tema-suave)] focus:ring-2 focus:ring-[var(--cor-tema-suave)]/30"
              />
              {erro && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <BotaoSecundario onClick={() => setAberto(false)}>Cancelar</BotaoSecundario>
              <BotaoPrimario onClick={criar} disabled={enviando || !form.titulo.trim() || !form.descricao.trim()}>
                {enviando && <LoaderCircle className="h-4 w-4 animate-spin" />} Registrar
              </BotaoPrimario>
            </div>
          </div>
        </div>
      )}

      {atendimento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            aria-label="Fechar"
            className="absolute inset-0 bg-black/40"
            onClick={() => setAtendimento(null)}
          />
          <div className="relative max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-lg border border-[var(--cor-neutra)] bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-stone-900">{atendimento.titulo}</h3>
            <p className="mt-1 text-sm text-stone-600">{atendimento.descricao}</p>
            <p className="mt-1 text-xs text-stone-400">
              {!ehMorador && atendimento.abertaPor.unidade
                ? `Un. ${atendimento.abertaPor.unidade.bloco}-${atendimento.abertaPor.unidade.numero} · `
                : ""}
              {atendimento.abertaPor.nome} · {dataHoraCurta(atendimento.criadoEm)}
            </p>
            <div className="mt-4 space-y-3">
              <textarea
                placeholder="Resolução / encaminhamento (opcional)"
                rows={3}
                value={resolucao}
                onChange={(e) => setResolucao(e.target.value)}
                className="w-full rounded-md border border-[var(--cor-neutra-2)] px-3 py-2 text-sm outline-none focus:border-[var(--cor-tema-suave)] focus:ring-2 focus:ring-[var(--cor-tema-suave)]/30"
              />
              {erro && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <BotaoSecundario onClick={() => setAtendimento(null)}>Fechar</BotaoSecundario>
              {atendimento.status === "ABERTA" && (
                <BotaoSecundario onClick={() => atender(atendimento.id, "EM_ATENDIMENTO")} disabled={atendendo}>
                  {atendendo && <LoaderCircle className="h-4 w-4 animate-spin" />} Iniciar atendimento
                </BotaoSecundario>
              )}
              <BotaoPrimario onClick={() => atender(atendimento.id, "RESOLVIDA")} disabled={atendendo}>
                Marcar como resolvida
              </BotaoPrimario>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
