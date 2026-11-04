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
  formatarData,
  Lista,
  ROTULO_ESPACO,
  rotuloStatusAssembleia,
  Secao,
  tomStatusAssembleia,
} from "@/components/portal/ui";
import type { Perfil } from "@/components/portal/app-shell";

type Assembleia = {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  data: string;
  horario: string;
  local: string;
  status: string;
  pauta: string | null;
};

type Form = {
  titulo: string;
  descricao: string;
  tipo: string;
  data: string;
  horario: string;
  local: string;
  pauta: string;
};

const hojeISO = () => new Date().toISOString().slice(0, 10);
const VAZIO: Form = {
  titulo: "",
  descricao: "",
  tipo: "ORDINARIA",
  data: "",
  horario: "19:30",
  local: "SALAO_FESTAS",
  pauta: "",
};

export default function Assembleias({ perfil }: { perfil: Perfil }) {
  const [lista, setLista] = useState<Assembleia[] | null>(null);
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState<Form>(VAZIO);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [pautaAberta, setPautaAberta] = useState<string | null>(null);
  const podeGerenciar = perfil === "SINDICO" || perfil === "ADMINISTRATIVO";

  const carregar = useCallback(() => {
    fetch("/api/assembleias")
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d) => d && setLista(d.lista))
      .catch(() => null);
  }, []);

  useEffect(carregar, [carregar]);

  async function criar() {
    setErro("");
    setEnviando(true);
    try {
      const r = await fetch("/api/assembleias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const corpo = await r.json();
      if (!r.ok) throw new Error(corpo.erro || "Falha ao convocar.");
      setAberto(false);
      setForm(VAZIO);
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao convocar.");
    } finally {
      setEnviando(false);
    }
  }

  async function alterarStatus(id: string, status: string) {
    await fetch("/api/assembleias", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    carregar();
  }

  return (
    <div className="space-y-6">
      <Secao
        titulo={`Assembleias${lista ? ` · ${lista.length}` : ""}`}
        acao={
          podeGerenciar && <BotaoPrimario onClick={() => setAberto(true)}>Convocar assembleia</BotaoPrimario>
        }
      >
        {!lista ? (
          <Carregando />
        ) : lista.length === 0 ? (
          <EstadoVazio mensagem="Nenhuma assembleia convocada." />
        ) : (
          <Lista className="border-t border-[var(--cor-neutra)]">
            {lista.map((a) => (
              <div key={a.id} className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-900">{a.titulo}</p>
                    <p className="mt-0.5 text-sm text-stone-500">
                      {formatarData(a.data)} às {a.horario} ·{" "}
                      {a.local === "VIRTUAL" ? "Virtual" : (ROTULO_ESPACO[a.local] ?? a.local)}
                      {a.tipo === "EXTRAORDINARIA" ? " · Extraordinária" : " · Ordinária"}
                    </p>
                    {a.descricao && (
                      <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{a.descricao}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Badge tom={tomStatusAssembleia(a.status)}>{rotuloStatusAssembleia(a.status)}</Badge>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-4">
                  {a.pauta && (
                    <BotaoTexto
                      onClick={() => setPautaAberta(pautaAberta === a.id ? null : a.id)}
                    >
                      {pautaAberta === a.id ? "Ocultar pauta" : "Ver pauta"}
                    </BotaoTexto>
                  )}
                  {podeGerenciar && a.status === "AGENDADA" && (
                    <>
                      <BotaoTexto tom="verde" onClick={() => alterarStatus(a.id, "REALIZADA")}>
                        Marcar como realizada
                      </BotaoTexto>
                      <BotaoTexto tom="vermelho" onClick={() => alterarStatus(a.id, "CANCELADA")}>
                        Cancelar
                      </BotaoTexto>
                    </>
                  )}
                </div>
                {pautaAberta === a.id && a.pauta && (
                  <pre className="mt-3 whitespace-pre-wrap rounded-md bg-[var(--cor-fundo)] px-4 py-3 font-sans text-sm leading-relaxed text-stone-700">
                    {a.pauta}
                  </pre>
                )}
              </div>
            ))}
          </Lista>
        )}
      </Secao>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            aria-label="Fechar"
            className="absolute inset-0 bg-black/40"
            onClick={() => setAberto(false)}
          />
          <div className="relative w-full max-w-lg rounded-lg border border-[var(--cor-neutra)] bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-stone-900">Convocar assembleia</h3>
            <p className="mt-0.5 text-sm text-stone-500">Todos os moradores recebem a convocação.</p>
            <div className="mt-4 space-y-3">
              <input
                placeholder="Título (ex.: Assembleia Geral Ordinária)"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                className="h-10 w-full rounded-md border border-[var(--cor-neutra-2)] px-3 text-sm outline-none focus:border-[var(--cor-tema-suave)] focus:ring-2 focus:ring-[var(--cor-tema-suave)]/30"
              />
              <textarea
                placeholder="Descrição"
                rows={2}
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                className="w-full rounded-md border border-[var(--cor-neutra-2)] px-3 py-2 text-sm outline-none focus:border-[var(--cor-tema-suave)] focus:ring-2 focus:ring-[var(--cor-tema-suave)]/30"
              />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <select
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  className="h-10 w-full rounded-md border border-[var(--cor-neutra-2)] bg-white px-3 text-sm outline-none focus:border-[var(--cor-tema-suave)]"
                >
                  <option value="ORDINARIA">Ordinária</option>
                  <option value="EXTRAORDINARIA">Extraordinária</option>
                </select>
                <input
                  type="date"
                  min={hojeISO()}
                  value={form.data}
                  onChange={(e) => setForm({ ...form, data: e.target.value })}
                  className="h-10 w-full rounded-md border border-[var(--cor-neutra-2)] bg-white px-3 text-sm outline-none focus:border-[var(--cor-tema-suave)]"
                />
                <input
                  type="time"
                  value={form.horario}
                  onChange={(e) => setForm({ ...form, horario: e.target.value })}
                  className="h-10 w-full rounded-md border border-[var(--cor-neutra-2)] bg-white px-3 text-sm outline-none focus:border-[var(--cor-tema-suave)]"
                />
                <select
                  value={form.local}
                  onChange={(e) => setForm({ ...form, local: e.target.value })}
                  className="h-10 w-full rounded-md border border-[var(--cor-neutra-2)] bg-white px-3 text-sm outline-none focus:border-[var(--cor-tema-suave)]"
                >
                  <option value="SALAO_FESTAS">Salão de festas</option>
                  <option value="VIRTUAL">Virtual</option>
                </select>
              </div>
              <textarea
                placeholder={"Pauta (uma linha por item, ex.:\n1. Abertura\n2. Prestação de contas)"}
                rows={4}
                value={form.pauta}
                onChange={(e) => setForm({ ...form, pauta: e.target.value })}
                className="w-full rounded-md border border-[var(--cor-neutra-2)] px-3 py-2 text-sm outline-none focus:border-[var(--cor-tema-suave)] focus:ring-2 focus:ring-[var(--cor-tema-suave)]/30"
              />
              {erro && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <BotaoSecundario onClick={() => setAberto(false)}>Cancelar</BotaoSecundario>
              <BotaoPrimario onClick={criar} disabled={enviando || !form.titulo || !form.data}>
                {enviando && <LoaderCircle className="h-4 w-4 animate-spin" />} Convocar
              </BotaoPrimario>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
