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
  dataHoraCurta,
  EstadoVazio,
  Lista,
  LinhaLista,
  ROTULO_CATEGORIA_ENCOMENDA,
  rotuloStatusEncomenda,
  Secao,
  tomStatusEncomenda,
} from "@/components/portal/ui";
import type { Perfil } from "@/components/portal/app-shell";
import { corpoJson, mensagemDeErro, mensagemRede } from "@/lib/api-cliente";

type Encomenda = {
  id: string;
  descricao: string;
  remetente: string | null;
  categoria: string;
  codigo: string;
  status: string;
  recebidaEm: string;
  retiradaEm: string | null;
  destinatario: { nome: string; unidade?: { bloco: string; numero: string } | null };
};

type Morador = { id: string; nome: string; unidade?: { bloco: string; numero: string } | null };

type Form = { descricao: string; remetente: string; categoria: string; destinatarioId: string };

const VAZIO: Form = { descricao: "", remetente: "", categoria: "CORREIO", destinatarioId: "" };

export default function Encomendas({ perfil }: { perfil: Perfil }) {
  const [lista, setLista] = useState<Encomenda[] | null>(null);
  const [moradores, setMoradores] = useState<Morador[]>([]);
  const [registrar, setRegistrar] = useState(false);
  const [form, setForm] = useState<Form>(VAZIO);
  const [erroForm, setErroForm] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [liberar, setLiberar] = useState<Encomenda | null>(null);
  const [codigo, setCodigo] = useState("");
  const [erroCodigo, setErroCodigo] = useState("");
  const [qr, setQr] = useState<{ descricao: string; codigo: string; imagem: string } | null>(null);

  const naPortaria = perfil === "PORTARIA" || perfil === "SINDICO" || perfil === "ADMINISTRATIVO";

  const carregar = useCallback(() => {
    fetch("/api/encomendas")
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d) => d && setLista(d.lista))
      .catch(() => null);
  }, []);

  useEffect(carregar, [carregar]);

  useEffect(() => {
    if (!naPortaria) return;
    fetch("/api/moradores")
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d) => d && setMoradores(d.lista ?? []))
      .catch(() => null);
  }, [naPortaria]);

  async function criar() {
    setErroForm("");
    setEnviando(true);
    try {
      const r = await fetch("/api/encomendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const corpo = await corpoJson(r);
      if (!corpo) throw new Error(mensagemRede(r.status));
      if (!r.ok) throw new Error(corpo.erro || "Falha ao registrar.");
      setRegistrar(false);
      setForm(VAZIO);
      carregar();
    } catch (e) {
      setErroForm(mensagemDeErro(e, "Falha ao registrar."));
    } finally {
      setEnviando(false);
    }
  }

  async function liberarRetirada() {
    if (!liberar) return;
    setErroCodigo("");
    setEnviando(true);
    try {
      const r = await fetch("/api/encomendas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: liberar.id, acao: "LIBERAR_RETIRADA", codigo }),
      });
      const corpo = await corpoJson(r);
      if (!corpo) throw new Error(mensagemRede(r.status));
      if (!r.ok) throw new Error(corpo.erro || "Falha ao liberar.");
      setLiberar(null);
      setCodigo("");
      carregar();
    } catch (e) {
      setErroCodigo(mensagemDeErro(e, "Falha ao liberar."));
    } finally {
      setEnviando(false);
    }
  }

  async function mostrarQR(e: Encomenda) {
    const imagem = await QRCode.toDataURL(e.codigo, {
      width: 320,
      margin: 1,
      color: { dark: "#1c1917", light: "#ffffff" },
    });
    setQr({ descricao: e.descricao, codigo: e.codigo, imagem });
  }

  return (
    <div className="space-y-6">
      <Secao
        titulo={naPortaria ? "Encomendas recebidas" : "Minhas encomendas"}
        acao={
          naPortaria && (
            <BotaoPrimario onClick={() => setRegistrar(true)}>Registrar encomenda</BotaoPrimario>
          )
        }
      >
        {!lista ? (
          <Carregando />
        ) : lista.length === 0 ? (
          <EstadoVazio
            mensagem={
              naPortaria
                ? "Nenhuma encomenda registrada."
                : "Nenhuma encomenda sua na portaria."
            }
          />
        ) : (
          <Lista className="border-t border-[var(--cor-neutra)]">
            {lista.map((e) => (
              <LinhaLista
                key={e.id}
                principal={e.descricao}
                secundaria={
                  naPortaria
                    ? `${
                        e.destinatario.unidade
                          ? `Un. ${e.destinatario.unidade.bloco}-${e.destinatario.unidade.numero} · `
                          : ""
                      }${e.destinatario.nome}${e.remetente ? ` · ${e.remetente}` : ""}`
                    : e.remetente ?? undefined
                }
                detalhe={`Recebida ${dataHoraCurta(e.recebidaEm)}${
                  e.retiradaEm ? ` · Retirada ${dataHoraCurta(e.retiradaEm)}` : ""
                }`}
                direita={
                  <div className="flex items-center gap-3">
                    {e.status === "AGUARDANDO" && (
                      <span className="text-xs text-stone-500">
                        Código <span className="font-semibold text-stone-900">{e.codigo}</span>
                      </span>
                    )}
                    <Badge tom={tomStatusEncomenda(e.status)}>{rotuloStatusEncomenda(e.status)}</Badge>
                    {!naPortaria && e.status === "AGUARDANDO" && (
                      <BotaoTexto onClick={() => mostrarQR(e)}>
                        <span className="inline-flex items-center gap-1">
                          <QrCode className="h-4 w-4" /> QR
                        </span>
                      </BotaoTexto>
                    )}
                    {naPortaria && e.status === "AGUARDANDO" && (
                      <BotaoTexto
                        onClick={() => {
                          setLiberar(e);
                          setCodigo("");
                          setErroCodigo("");
                        }}
                      >
                        Liberar retirada
                      </BotaoTexto>
                    )}
                  </div>
                }
              />
            ))}
          </Lista>
        )}
      </Secao>

      {registrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            aria-label="Fechar"
            className="absolute inset-0 bg-black/40"
            onClick={() => setRegistrar(false)}
          />
          <div className="relative w-full max-w-md rounded-lg border border-[var(--cor-neutra)] bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-stone-900">Registrar encomenda</h3>
            <p className="mt-0.5 text-sm text-stone-500">
              Um código de retirada é gerado automaticamente para o morador.
            </p>
            <div className="mt-4 space-y-3">
              <input
                placeholder="Descrição (ex.: caixa média dos Correios)"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                className="h-10 w-full rounded-md border border-[var(--cor-neutra-2)] px-3 text-sm outline-none focus:border-[var(--cor-tema-suave)] focus:ring-2 focus:ring-[var(--cor-tema-suave)]/30"
              />
              <input
                placeholder="Remetente (opcional)"
                value={form.remetente}
                onChange={(e) => setForm({ ...form, remetente: e.target.value })}
                className="h-10 w-full rounded-md border border-[var(--cor-neutra-2)] px-3 text-sm outline-none focus:border-[var(--cor-tema-suave)] focus:ring-2 focus:ring-[var(--cor-tema-suave)]/30"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  className="h-10 w-full rounded-md border border-[var(--cor-neutra-2)] bg-white px-3 text-sm outline-none focus:border-[var(--cor-tema-suave)]"
                >
                  {Object.entries(ROTULO_CATEGORIA_ENCOMENDA).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <select
                  value={form.destinatarioId}
                  onChange={(e) => setForm({ ...form, destinatarioId: e.target.value })}
                  className="h-10 w-full rounded-md border border-[var(--cor-neutra-2)] bg-white px-3 text-sm outline-none focus:border-[var(--cor-tema-suave)]"
                >
                  <option value="">Destinatário…</option>
                  {moradores.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                      {m.unidade ? ` (${m.unidade.bloco}-${m.unidade.numero})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              {erroForm && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erroForm}</p>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <BotaoSecundario onClick={() => setRegistrar(false)}>Cancelar</BotaoSecundario>
              <BotaoPrimario onClick={criar} disabled={enviando || !form.destinatarioId}>
                {enviando && <LoaderCircle className="h-4 w-4 animate-spin" />} Registrar
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
          <div className="relative w-full max-w-xs rounded-lg border border-[var(--cor-neutra)] bg-white p-6 text-center shadow-xl">
            <h3 className="text-base font-semibold text-stone-900">{qr.descricao}</h3>
            <p className="mt-0.5 text-xs text-stone-500">
              Mostre este QR na portaria para liberar a retirada.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr.imagem} alt={`QR Code de retirada da encomenda ${qr.descricao}`} className="mx-auto mt-3 h-56 w-56" />
            <p className="mt-3 text-2xl font-bold tracking-[0.3em] tabular-nums text-stone-900">
              {qr.codigo}
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-stone-400">
              Código de retirada
            </p>
            <div className="mt-4 flex justify-center">
              <BotaoSecundario onClick={() => setQr(null)}>Fechar</BotaoSecundario>
            </div>
          </div>
        </div>
      )}

      {liberar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            aria-label="Fechar"
            className="absolute inset-0 bg-black/40"
            onClick={() => setLiberar(null)}
          />
          <div className="relative w-full max-w-sm rounded-lg border border-[var(--cor-neutra)] bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-stone-900">Liberar retirada</h3>
            <p className="mt-0.5 text-sm text-stone-500">
              Confirme o código informado pelo morador de{" "}
              <span className="font-medium text-stone-900">{liberar.destinatario.nome}</span>.
            </p>
            <input
              inputMode="numeric"
              placeholder="Código de 6 dígitos"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mt-4 h-11 w-full rounded-md border border-[var(--cor-neutra-2)] px-3 text-center text-lg font-semibold tracking-[0.3em] outline-none focus:border-[var(--cor-tema-suave)] focus:ring-2 focus:ring-[var(--cor-tema-suave)]/30"
            />
            {erroCodigo && (
              <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erroCodigo}</p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <BotaoSecundario onClick={() => setLiberar(null)}>Cancelar</BotaoSecundario>
              <BotaoPrimario onClick={liberarRetirada} disabled={enviando || codigo.length !== 6}>
                Confirmar retirada
              </BotaoPrimario>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
