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
  LinhaLista,
  ROTULO_AUTORIZACAO,
  rotuloStatusAutorizacao,
  Secao,
  tomStatusAutorizacao,
} from "@/components/portal/ui";
import type { Perfil } from "@/components/portal/app-shell";

type Autorizacao = {
  id: string;
  visitanteNome: string;
  tipo: string;
  documento: string | null;
  veiculo: string | null;
  dataInicio: string;
  dataFim: string;
  status: string;
  morador: { nome: string; unidade?: { bloco: string; numero: string } | null };
};

type Form = {
  visitanteNome: string;
  tipo: string;
  documento: string;
  veiculo: string;
  dataInicio: string;
  dataFim: string;
};

const hojeISO = () => new Date().toISOString().slice(0, 10);
const VAZIO: Form = {
  visitanteNome: "",
  tipo: "VISITANTE",
  documento: "",
  veiculo: "",
  dataInicio: "",
  dataFim: "",
};

export default function Autorizacoes({ perfil }: { perfil: Perfil }) {
  const [lista, setLista] = useState<Autorizacao[] | null>(null);
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState<Form>(VAZIO);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const ehMorador = perfil === "MORADOR";

  const carregar = useCallback(() => {
    fetch("/api/autorizacoes")
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d) => d && setLista(d.lista))
      .catch(() => null);
  }, []);

  useEffect(carregar, [carregar]);

  async function criar() {
    setErro("");
    setEnviando(true);
    try {
      const r = await fetch("/api/autorizacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const corpo = await r.json();
      if (!r.ok) throw new Error(corpo.erro || "Falha ao autorizar.");
      setAberto(false);
      setForm(VAZIO);
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao autorizar.");
    } finally {
      setEnviando(false);
    }
  }

  async function cancelar(id: string) {
    await fetch("/api/autorizacoes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "CANCELADA" }),
    });
    carregar();
  }

  return (
    <div className="space-y-6">
      <Secao
        titulo={ehMorador ? "Minhas autorizações" : "Autorizações de acesso"}
        acao={
          ehMorador && (
            <BotaoPrimario onClick={() => setAberto(true)}>Autorizar acesso</BotaoPrimario>
          )
        }
      >
        {!lista ? (
          <Carregando />
        ) : lista.length === 0 ? (
          <EstadoVazio
            mensagem={
              ehMorador
                ? "Nenhuma autorização registrada. Toque em “Autorizar acesso”."
                : "Nenhuma autorização de acesso registrada."
            }
          />
        ) : (
          <Lista className="border-t border-[#EFE9E1]">
            {lista.map((a) => (
              <LinhaLista
                key={a.id}
                principal={a.visitanteNome}
                secundaria={
                  ehMorador
                    ? `${ROTULO_AUTORIZACAO[a.tipo] ?? a.tipo}${
                        a.veiculo ? ` · ${a.veiculo}` : ""
                      }`
                    : `${
                        a.morador.unidade
                          ? `Un. ${a.morador.unidade.bloco}-${a.morador.unidade.numero} · `
                          : ""
                      }${a.morador.nome} · ${ROTULO_AUTORIZACAO[a.tipo] ?? a.tipo}${
                        a.veiculo ? ` · ${a.veiculo}` : ""
                      }`
                }
                detalhe={`${formatarData(a.dataInicio)} até ${formatarData(a.dataFim)}${
                  a.documento ? ` · ${a.documento}` : ""
                }`}
                direita={
                  <div className="flex items-center gap-3">
                    <Badge tom={tomStatusAutorizacao(a.status)}>
                      {rotuloStatusAutorizacao(a.status)}
                    </Badge>
                    {ehMorador && a.status === "ATIVA" && (
                      <BotaoTexto tom="vermelho" onClick={() => cancelar(a.id)}>
                        Cancelar
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
          <button
            aria-label="Fechar"
            className="absolute inset-0 bg-black/40"
            onClick={() => setAberto(false)}
          />
          <div className="relative w-full max-w-md rounded-lg border border-[#EFE9E1] bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-stone-900">Autorizar acesso</h3>
            <p className="mt-0.5 text-sm text-stone-500">
              A portaria recebe a autorização imediatamente.
            </p>
            <div className="mt-4 space-y-3">
              <input
                placeholder="Nome do visitante ou prestador"
                value={form.visitanteNome}
                onChange={(e) => setForm({ ...form, visitanteNome: e.target.value })}
                className="h-10 w-full rounded-md border border-[#dfdacf] px-3 text-sm outline-none focus:border-[#a3968d] focus:ring-2 focus:ring-[#a3968d]/30"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  className="h-10 w-full rounded-md border border-[#dfdacf] bg-white px-3 text-sm outline-none focus:border-[#a3968d]"
                >
                  <option value="VISITANTE">Visitante</option>
                  <option value="PRESTADOR">Prestador de serviço</option>
                </select>
                <input
                  placeholder="Documento (opcional)"
                  value={form.documento}
                  onChange={(e) => setForm({ ...form, documento: e.target.value })}
                  className="h-10 w-full rounded-md border border-[#dfdacf] px-3 text-sm outline-none focus:border-[#a3968d] focus:ring-2 focus:ring-[#a3968d]/30"
                />
              </div>
              <input
                placeholder="Veículo (opcional — placa/modelo)"
                value={form.veiculo}
                onChange={(e) => setForm({ ...form, veiculo: e.target.value })}
                className="h-10 w-full rounded-md border border-[#dfdacf] px-3 text-sm outline-none focus:border-[#a3968d] focus:ring-2 focus:ring-[#a3968d]/30"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                    De
                  </label>
                  <input
                    type="date"
                    min={hojeISO()}
                    value={form.dataInicio}
                    onChange={(e) => setForm({ ...form, dataInicio: e.target.value })}
                    className="h-10 w-full rounded-md border border-[#dfdacf] bg-white px-3 text-sm outline-none focus:border-[#a3968d]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                    Até
                  </label>
                  <input
                    type="date"
                    min={form.dataInicio || hojeISO()}
                    value={form.dataFim}
                    onChange={(e) => setForm({ ...form, dataFim: e.target.value })}
                    className="h-10 w-full rounded-md border border-[#dfdacf] bg-white px-3 text-sm outline-none focus:border-[#a3968d]"
                  />
                </div>
              </div>
              {erro && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <BotaoSecundario onClick={() => setAberto(false)}>Cancelar</BotaoSecundario>
              <BotaoPrimario onClick={criar} disabled={enviando || !form.dataInicio || !form.dataFim}>
                {enviando && <LoaderCircle className="h-4 w-4 animate-spin" />} Autorizar
              </BotaoPrimario>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
