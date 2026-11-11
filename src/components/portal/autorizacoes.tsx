"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, QrCode } from "lucide-react";
import QRCode from "qrcode";
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
import { corpoJson, mensagemDeErro, mensagemRede } from "@/lib/api-cliente";
import { buscarJSON } from "@/lib/buscar-json";

type Autorizacao = {
  id: string;
  visitanteNome: string;
  tipo: string;
  documento: string | null;
  veiculo: string | null;
  codigo: string | null;
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
  // QR do visitante (morador mostra/envia) e validação na portaria
  const [qr, setQr] = useState<{ nome: string; codigo: string; imagem: string } | null>(null);
  const [codigoValidar, setCodigoValidar] = useState("");
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null);
  const [validando, setValidando] = useState(false);
  const ehMorador = perfil === "MORADOR";
  const ehEquipePortaria = perfil !== "MORADOR";

  const carregar = useCallback(() => {
    buscarJSON("/api/autorizacoes")
      .then((d) => d && setLista(d.lista))
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
      const corpo = await corpoJson(r);
      if (!corpo) throw new Error(mensagemRede(r.status));
      if (!r.ok) throw new Error(corpo.erro || "Falha ao autorizar.");
      setAberto(false);
      setForm(VAZIO);
      carregar();
    } catch (e) {
      setErro(mensagemDeErro(e, "Falha ao autorizar."));
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

  async function mostrarQR(a: Autorizacao) {
    if (!a.codigo) return;
    const imagem = await QRCode.toDataURL(`${window.location.origin}/validar/${a.codigo}`, {
      width: 320,
      margin: 1,
      color: { dark: "#1c1917", light: "#ffffff" },
    });
    setQr({ nome: a.visitanteNome, codigo: a.codigo, imagem });
  }

  async function validarEntrada() {
    setErro("");
    setResultado(null);
    setValidando(true);
    try {
      const r = await fetch("/api/autorizacoes/validar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: codigoValidar.trim() }),
      });
      const corpo = await corpoJson<{ autorizacao?: Autorizacao; erro?: string }>(r);
      if (!corpo) throw new Error(mensagemRede(r.status));
      if (!r.ok) {
        setResultado({ ok: false, texto: corpo.erro || "Não foi possível validar o código." });
        return;
      }
      const a = corpo.autorizacao;
      if (!a) throw new Error("Resposta inesperada do servidor.");
      const un = a.morador?.unidade ? `Un. ${a.morador.unidade.bloco}-${a.morador.unidade.numero} · ` : "";
      setResultado({ ok: true, texto: `Entrada registrada: ${a.visitanteNome} (${un}${a.morador?.nome ?? ""})` });
      setCodigoValidar("");
      carregar();
    } catch (e) {
      setResultado({ ok: false, texto: mensagemDeErro(e, "Falha ao validar o código.") });
    } finally {
      setValidando(false);
    }
  }

  const campo =
    "h-10 w-full rounded-md border border-[var(--cor-neutra-2)] px-3 text-sm outline-none focus:border-[var(--cor-tema-suave)] focus:ring-2 focus:ring-[var(--cor-tema-suave)]/30";

  return (
    <div className="space-y-6">
      {/* Validação de entrada — portaria/equipe */}
      {ehEquipePortaria && (
        <Secao titulo="Validar entrada pelo QR Code">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              placeholder="Código do visitante (escaneie ou digite os 6 dígitos)"
              inputMode="numeric"
              value={codigoValidar}
              onChange={(e) => setCodigoValidar(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => e.key === "Enter" && codigoValidar.length === 6 && validarEntrada()}
              className={`${campo} flex-1 tabular-nums`}
            />
            <BotaoPrimario onClick={validarEntrada} disabled={validando || codigoValidar.length !== 6}>
              {validando && <LoaderCircle className="h-4 w-4 animate-spin" />} Registrar entrada
            </BotaoPrimario>
          </div>
          {resultado && (
            <p
              className={`mt-2 rounded-md px-3 py-2 text-sm ${
                resultado.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
              }`}
            >
              {resultado.texto}
            </p>
          )}
        </Secao>
      )}

      <Secao
        titulo={ehMorador ? "Minhas autorizações" : "Autorizações de acesso"}
        acao={
          ehMorador && (
            <BotaoPrimario onClick={() => setAberto(true)}>Autorizar acesso</BotaoPrimario>
          )
        }
      >
        <p className="mb-4 text-sm text-[var(--cor-fg-suave)]">
          {ehMorador
            ? "Cada autorização gera um QR Code — envie ao visitante ou mostre na portaria para registrar a entrada."
            : "Consulte as autorizações e registre a entrada pelo código do QR."}
        </p>
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
          <Lista>
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
                    {ehMorador && a.status === "ATIVA" && a.codigo && (
                      <BotaoTexto onClick={() => mostrarQR(a)}>
                        <span className="inline-flex items-center gap-1">
                          <QrCode className="h-4 w-4" /> QR
                        </span>
                      </BotaoTexto>
                    )}
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
          <div className="relative max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-lg border border-[var(--cor-neutra)] bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-stone-900">Autorizar acesso</h3>
            <p className="mt-0.5 text-sm text-stone-500">
              A portaria recebe a autorização imediatamente.
            </p>
            <div className="mt-4 space-y-3">
              <input
                placeholder="Nome do visitante ou prestador"
                value={form.visitanteNome}
                onChange={(e) => setForm({ ...form, visitanteNome: e.target.value })}
                className={campo}
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  className={`${campo} bg-white`}
                >
                  <option value="VISITANTE">Visitante</option>
                  <option value="PRESTADOR">Prestador de serviço</option>
                </select>
                <input
                  placeholder="Documento (opcional)"
                  value={form.documento}
                  onChange={(e) => setForm({ ...form, documento: e.target.value })}
                  className={campo}
                />
              </div>
              <input
                placeholder="Veículo (opcional — placa/modelo)"
                value={form.veiculo}
                onChange={(e) => setForm({ ...form, veiculo: e.target.value })}
                className={campo}
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
                    className={`${campo} bg-white`}
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
                    className={`${campo} bg-white`}
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

      {qr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            aria-label="Fechar"
            className="absolute inset-0 bg-black/40"
            onClick={() => setQr(null)}
          />
          <div className="relative max-h-[88dvh] w-full max-w-xs overflow-y-auto rounded-lg border border-[var(--cor-neutra)] bg-white p-6 text-center shadow-xl">
            <h3 className="text-base font-semibold text-stone-900">{qr.nome}</h3>
            <p className="mt-0.5 text-xs text-stone-500">
              Mostre este QR na portaria — a entrada é registrada na hora.
            </p>
            { }
            <img src={qr.imagem} alt={`QR Code de entrada de ${qr.nome}`} className="mx-auto mt-3 h-56 w-56" />
            <p className="mt-3 text-2xl font-bold tracking-[0.3em] tabular-nums text-stone-900">
              {qr.codigo}
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-stone-400">
              Código de entrada
            </p>
            <div className="mt-4 flex justify-center">
              <BotaoSecundario onClick={() => setQr(null)}>Fechar</BotaoSecundario>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
