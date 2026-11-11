"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
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
  ROTULO_ESPACO,
  rotuloStatusReserva,
  Secao,
  tomStatusReserva,
} from "@/components/portal/ui";
import type { Perfil } from "@/components/portal/app-shell";
import { corpoJson, mensagemDeErro, mensagemRede } from "@/lib/api-cliente";
import { buscarJSON } from "@/lib/buscar-json";

type Reserva = {
  id: string;
  espaco: string;
  data: string;
  horario: string;
  observacoes: string | null;
  status: string;
  solicitante: { nome: string; unidade?: { bloco: string; numero: string } | null };
};

type Regra = {
  espaco: string;
  rotulo: string;
  antecedenciaMaxDias: number;
  limiteMensalUnidade: number;
  regrasTexto: string;
  foto: string | null; // fotografia configurada pela identidade visual
  padrao: boolean;
};

type Form = { espaco: string; data: string; horario: string; observacoes: string };

const hojeISO = () => new Date().toISOString().slice(0, 10);
const VAZIO: Form = { espaco: "SALAO_FESTAS", data: "", horario: "14:00 – 18:00", observacoes: "" };

const HORARIOS = [
  "08:00 – 12:00",
  "12:00 – 16:00",
  "14:00 – 18:00",
  "16:00 – 20:00",
  "18:00 – 22:00",
  "19:00 – 21:00",
  "09:00 – 12:00",
];

const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

// Fotos padrão dos espaços comuns (usadas quando o condomínio não configurou
// fotografia própria na Identidade visual).
const FOTO_ESPACO: Record<string, string> = {
  SALAO_FESTAS: "/fotos/espaco-salao-festas.jpg",
  CHURRASQUEIRA: "/fotos/espaco-churrasqueira.jpg",
  QUADRA: "/fotos/espaco-quadra.jpg",
  PISCINA: "/fotos/espaco-piscina.jpg",
};

// Miniatura usada nas linhas de reserva e de regras.
function MiniaturaEspaco({ espaco, foto, tamanho = "h-11 w-11" }: { espaco: string; foto?: string | null; tamanho?: string }) {
  const url = foto ?? FOTO_ESPACO[espaco];
  if (!url) return null;
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-lg border border-[var(--cor-neutra)] ${tamanho}`}>
      <Image src={url} alt="" fill sizes="44px" className="object-cover" />
    </div>
  );
}

// Cartão com foto para a galeria de espaços.
function CartaoEspaco({
  rotulo,
  foto,
  meta,
  acaoRotulo,
  aoClicar,
}: {
  rotulo: string;
  foto: string;
  meta: string;
  acaoRotulo: string;
  aoClicar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      className="group overflow-hidden rounded-xl border border-[var(--cor-neutra)] bg-white text-left shadow-[var(--sombra-suave)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--sombra-cartao)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cor-tema-suave)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image
          src={foto}
          alt={rotulo}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, calc(100vw - 3rem)"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 via-black/25 to-transparent" />
        <p className="absolute bottom-2 left-3.5 text-[17px] font-semibold leading-tight text-white drop-shadow">
          {rotulo}
        </p>
      </div>
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
        <p className="min-w-0 truncate text-xs text-stone-500">{meta}</p>
        <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--cor-tema)]">
          {acaoRotulo}
          <ChevronRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
        </span>
      </div>
    </button>
  );
}

function mesISO(offset = 0) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return d;
}

export default function Reservas({ perfil }: { perfil: Perfil }) {
  const [lista, setLista] = useState<Reserva[] | null>(null);
  const [regras, setRegras] = useState<Regra[]>([]);
  const [visao, setVisao] = useState<"lista" | "calendario">("lista");
  const [mesRef, setMesRef] = useState(0); // 0 = mês atual
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState<Form>(VAZIO);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  // Regras (gestão)
  const [editandoRegra, setEditandoRegra] = useState<Regra | null>(null);
  const [regraForm, setRegraForm] = useState({ antecedenciaMaxDias: 60, limiteMensalUnidade: 2, regrasTexto: "" });
  const ehGestao = perfil === "SINDICO" || perfil === "ADMINISTRATIVO";

  const carregar = useCallback(() => {
    buscarJSON("/api/reservas")
      .then((d) => d && setLista(d.lista))
    buscarJSON("/api/reservas/regras")
      .then((d) => d && setRegras(d.lista ?? []))
  }, []);

  useEffect(carregar, [carregar]);

  const regraDoEspaco = (espaco: string) => regras.find((r) => r.espaco === espaco);
  const fotoDoEspaco = (espaco: string) => regraDoEspaco(espaco)?.foto ?? FOTO_ESPACO[espaco];

  async function criar() {
    setErro("");
    setEnviando(true);
    try {
      const r = await fetch("/api/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const corpo = await corpoJson(r);
      if (!corpo) throw new Error(mensagemRede(r.status));
      if (!r.ok) throw new Error(corpo.erro || "Falha ao reservar.");
      setAberto(false);
      setForm(VAZIO);
      carregar();
    } catch (e) {
      setErro(mensagemDeErro(e, "Falha ao reservar."));
    } finally {
      setEnviando(false);
    }
  }

  async function alterarStatus(id: string, status: string) {
    await fetch("/api/reservas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    carregar();
  }

  async function salvarRegra() {
    if (!editandoRegra) return;
    setErro("");
    setEnviando(true);
    try {
      const r = await fetch("/api/reservas/regras", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ espaco: editandoRegra.espaco, ...regraForm }),
      });
      const corpo = await corpoJson(r);
      if (!corpo) throw new Error(mensagemRede(r.status));
      if (!r.ok) throw new Error(corpo.erro || "Falha ao salvar as regras.");
      setEditandoRegra(null);
      carregar();
    } catch (e) {
      setErro(mensagemDeErro(e, "Falha ao salvar as regras."));
    } finally {
      setEnviando(false);
    }
  }

  // ── Grade do mês (calendário) ──
  const grade = useMemo(() => {
    const base = mesISO(mesRef);
    const ano = base.getFullYear();
    const mes = base.getMonth();
    const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();
    const celulas: (string | null)[] = Array(primeiroDiaSemana).fill(null);
    for (let d = 1; d <= diasNoMes; d++) {
      celulas.push(`${ano}-${String(mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    }
    const rotulo = base.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return { celulas, rotulo };
  }, [mesRef]);

  const reservasPorDia = useMemo(() => {
    const mapa = new Map<string, Reserva[]>();
    (lista ?? []).forEach((r) => {
      if (r.status === "REJEITADA" || r.status === "CANCELADA") return;
      const arr = mapa.get(r.data) ?? [];
      arr.push(r);
      mapa.set(r.data, arr);
    });
    return mapa;
  }, [lista]);

  return (
    <div className="space-y-6">
      {/* Galeria dos espaços comuns — fotos + atalho direto para a ação */}
      <Secao
        titulo="Espaços do condomínio"
        acao={
          <span className="text-xs text-stone-400">
            {perfil === "MORADOR" ? "Toque para reservar" : "Toque para ajustar as regras"}
          </span>
        }
      >
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(ROTULO_ESPACO)
            .filter(([k]) => k !== "VIRTUAL" && FOTO_ESPACO[k])
            .map(([k, v]) => {
              const rg = regraDoEspaco(k);
              return (
                <CartaoEspaco
                  key={k}
                  rotulo={v}
                  foto={fotoDoEspaco(k)!}
                  meta={
                    rg
                      ? `Até ${rg.antecedenciaMaxDias} dias · ${rg.limiteMensalUnidade}x/mês`
                      : "Veja as regras abaixo"
                  }
                  acaoRotulo={perfil === "MORADOR" ? "Reservar" : "Regras"}
                  aoClicar={() => {
                    if (perfil === "MORADOR") {
                      setForm({ ...VAZIO, espaco: k });
                      setErro("");
                      setAberto(true);
                    } else if (rg) {
                      setEditandoRegra(rg);
                      setRegraForm({
                        antecedenciaMaxDias: rg.antecedenciaMaxDias,
                        limiteMensalUnidade: rg.limiteMensalUnidade,
                        regrasTexto: rg.regrasTexto,
                      });
                      setErro("");
                    }
                  }}
                />
              );
            })}
        </div>
      </Secao>

      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-[var(--cor-neutra-2)] bg-white p-1 shadow-sm">
          {(["lista", "calendario"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setVisao(v)}
              className={`h-8 rounded-full px-4 text-sm font-medium transition-all duration-200 ${
                visao === v
                  ? "bg-[var(--cor-tema)] text-[var(--cor-fundo)] shadow-sm"
                  : "text-stone-600 hover:bg-[var(--cor-neutra)]"
              }`}
            >
              {v === "lista" ? "Lista" : "Calendário"}
            </button>
          ))}
        </div>
        {perfil === "MORADOR" && visao === "lista" && (
          <BotaoPrimario onClick={() => setAberto(true)}>Nova reserva</BotaoPrimario>
        )}
      </div>

      {visao === "calendario" ? (
        <Secao titulo={`Calendário — ${grade.rotulo}`}>
          <div className="mb-2 flex items-center gap-2">
            <button
              aria-label="Mês anterior"
              onClick={() => setMesRef((m) => m - 1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--cor-neutra-2)] bg-white text-stone-600 transition hover:bg-[var(--cor-neutra)]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              aria-label="Mês seguinte"
              onClick={() => setMesRef((m) => m + 1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--cor-neutra-2)] bg-white text-stone-600 transition hover:bg-[var(--cor-neutra)]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="ml-1 text-xs text-stone-400">
              {ehGestao ? "Todas as reservas ativas do condomínio" : "Suas reservas ativas"}
            </span>
          </div>
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border border-[var(--cor-neutra)] bg-[var(--cor-neutra)] text-center">
            {DIAS_SEMANA.map((d, i) => (
              <div key={`d${i}`} className="bg-white py-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                {d}
              </div>
            ))}
            {grade.celulas.map((iso, i) => {
              if (!iso) return <div key={`v${i}`} className="bg-[var(--cor-neutra)]/40" />;
              const doDia = reservasPorDia.get(iso) ?? [];
              const passou = iso < hojeISO();
              return (
                <div
                  key={iso}
                  className={`min-h-[64px] bg-white p-1 text-left sm:min-h-[76px] ${
                    passou ? "opacity-45" : ""
                  }`}
                >
                  <p className={`text-[11px] tabular-nums ${iso === hojeISO() ? "font-bold text-[var(--cor-tema)]" : "text-stone-400"}`}>
                    {Number(iso.slice(8))}
                  </p>
                  <div className="mt-0.5 space-y-0.5">
                    {doDia.slice(0, 3).map((r) => (
                      <p
                        key={r.id}
                        title={`${ROTULO_ESPACO[r.espaco] ?? r.espaco} · ${r.horario} · ${r.solicitante?.nome ?? ""}`}
                        className={`truncate rounded px-1 py-0.5 text-[10px] leading-tight ${
                          r.status === "CONFIRMADA"
                            ? "bg-green-50 text-green-800"
                            : "bg-[var(--cor-neutra)] text-stone-600"
                        }`}
                      >
                        {(ROTULO_ESPACO[r.espaco] ?? r.espaco).split(" ")[0]}
                      </p>
                    ))}
                    {doDia.length > 3 && (
                      <p className="px-1 text-[10px] text-stone-400">+{doDia.length - 3}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-stone-400">
            Verde: confirmada · Cinza: aguardando aprovação
          </p>
        </Secao>
      ) : (
        <Secao titulo={ehGestao ? "Todas as reservas" : "Minhas reservas"}>
          {!lista ? (
            <Carregando />
          ) : lista.length === 0 ? (
            <EstadoVazio
              mensagem={
                perfil === "MORADOR"
                  ? "Você ainda não fez reservas. Toque em “Nova reserva”."
                  : "Nenhuma reserva registrada."
              }
            />
          ) : (
            <Lista>
              {lista.map((r) => (
                <LinhaLista
                  key={r.id}
                  midia={<MiniaturaEspaco espaco={r.espaco} foto={regraDoEspaco(r.espaco)?.foto} />}
                  principal={`${ROTULO_ESPACO[r.espaco] ?? r.espaco} · ${formatarData(r.data)}`}
                  secundaria={
                    ehGestao
                      ? `${r.solicitante.nome}${
                          r.solicitante.unidade
                            ? ` · Un. ${r.solicitante.unidade.bloco}-${r.solicitante.unidade.numero}`
                            : ""
                        } · ${r.horario}`
                      : r.horario
                  }
                  detalhe={r.observacoes ?? undefined}
                  direita={
                    <div className="flex items-center gap-3">
                      <Badge tom={tomStatusReserva(r.status)}>{rotuloStatusReserva(r.status)}</Badge>
                      {ehGestao && r.status === "PENDENTE" && (
                        <>
                          <BotaoTexto tom="verde" onClick={() => alterarStatus(r.id, "CONFIRMADA")}>
                            Aprovar
                          </BotaoTexto>
                          <BotaoTexto tom="vermelho" onClick={() => alterarStatus(r.id, "REJEITADA")}>
                            Rejeitar
                          </BotaoTexto>
                        </>
                      )}
                      {!ehGestao && r.status === "PENDENTE" && (
                        <BotaoTexto tom="vermelho" onClick={() => alterarStatus(r.id, "CANCELADA")}>
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
      )}

      {/* Regras dos espaços — exibidas a todos; editáveis pela gestão */}
      {regras.length > 0 && (
        <Secao titulo="Regras dos espaços" acao={ehGestao ? <span className="text-xs text-stone-400">Toque em “Editar” para ajustar</span> : undefined}>
          <Lista>
            {regras.map((r) => (
              <LinhaLista
                key={r.espaco}
                midia={<MiniaturaEspaco espaco={r.espaco} foto={r.foto} />}
                principal={r.rotulo}
                secundaria={`Até ${r.antecedenciaMaxDias} dia(s) de antecedência · ${r.limiteMensalUnidade} reserva(s)/mês por unidade`}
                detalhe={r.regrasTexto || undefined}
                direita={
                  ehGestao && (
                    <BotaoTexto
                      onClick={() => {
                        setEditandoRegra(r);
                        setRegraForm({
                          antecedenciaMaxDias: r.antecedenciaMaxDias,
                          limiteMensalUnidade: r.limiteMensalUnidade,
                          regrasTexto: r.regrasTexto,
                        });
                        setErro("");
                      }}
                    >
                      Editar
                    </BotaoTexto>
                  )
                }
              />
            ))}
          </Lista>
        </Secao>
      )}

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            aria-label="Fechar"
            className="absolute inset-0 bg-black/40"
            onClick={() => setAberto(false)}
          />
          <div className="relative flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-[var(--cor-neutra)] bg-white shadow-[var(--sombra-cartao)]">
            {/* Foto do espaço escolhido — confirmação visual imediata */}
            <div className="relative h-28 w-full shrink-0 overflow-hidden">
              <Image
                src={fotoDoEspaco(form.espaco) ?? "/fotos/espaco-salao-festas.jpg"}
                alt={ROTULO_ESPACO[form.espaco] ?? form.espaco}
                fill
                sizes="480px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
              <p className="absolute bottom-2.5 left-4 text-lg font-semibold text-white drop-shadow">
                {ROTULO_ESPACO[form.espaco] ?? form.espaco}
              </p>
            </div>
            <div className="overflow-y-auto p-5 pt-4">
              <p className="text-sm text-stone-500">
                A reserva fica pendente até a aprovação da administração.
                {(() => {
                  const rg = regraDoEspaco(form.espaco);
                  return rg
                    ? ` ${ROTULO_ESPACO[form.espaco] ?? form.espaco}: até ${rg.antecedenciaMaxDias} dia(s) de antecedência e ${rg.limiteMensalUnidade} reserva(s) por mês.${rg.regrasTexto ? ` ${rg.regrasTexto}` : ""}`
                    : "";
                })()}
              </p>
              <div className="mt-4 space-y-3">
              <select
                value={form.espaco}
                onChange={(e) => setForm({ ...form, espaco: e.target.value })}
                className="h-10 w-full rounded-md border border-[var(--cor-neutra-2)] bg-white px-3 text-sm outline-none focus:border-[var(--cor-tema-suave)]"
              >
                {Object.entries(ROTULO_ESPACO)
                  .filter(([k]) => k !== "VIRTUAL")
                  .map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
              </select>
              <input
                type="date"
                min={hojeISO()}
                max={
                  (() => {
                    const rg = regraDoEspaco(form.espaco);
                    return new Date(Date.now() + (rg?.antecedenciaMaxDias ?? 60) * 86400000)
                      .toISOString()
                      .slice(0, 10);
                  })()
                }
                value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
                className="h-10 w-full rounded-md border border-[var(--cor-neutra-2)] bg-white px-3 text-sm outline-none focus:border-[var(--cor-tema-suave)]"
              />
              <select
                value={form.horario}
                onChange={(e) => setForm({ ...form, horario: e.target.value })}
                className="h-10 w-full rounded-md border border-[var(--cor-neutra-2)] bg-white px-3 text-sm outline-none focus:border-[var(--cor-tema-suave)]"
              >
                {HORARIOS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <textarea
                placeholder="Observações (opcional)"
                rows={2}
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                className="w-full rounded-md border border-[var(--cor-neutra-2)] px-3 py-2 text-sm outline-none focus:border-[var(--cor-tema-suave)] focus:ring-2 focus:ring-[var(--cor-tema-suave)]/30"
              />
              {erro && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <BotaoSecundario onClick={() => setAberto(false)}>Cancelar</BotaoSecundario>
              <BotaoPrimario onClick={criar} disabled={enviando || !form.data}>
                {enviando && <LoaderCircle className="h-4 w-4 animate-spin" />} Solicitar
              </BotaoPrimario>
            </div>
            </div>
          </div>
        </div>
      )}

      {editandoRegra && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            aria-label="Fechar"
            className="absolute inset-0 bg-black/40"
            onClick={() => setEditandoRegra(null)}
          />
          <div className="relative max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-xl border border-[var(--cor-neutra)] bg-white p-6 shadow-[var(--sombra-cartao)]">
            <h3 className="text-base font-semibold text-stone-900">
              Regras — {editandoRegra.rotulo}
            </h3>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                  Antecedência máxima (dias)
                </span>
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={regraForm.antecedenciaMaxDias}
                  onChange={(e) => setRegraForm({ ...regraForm, antecedenciaMaxDias: Number(e.target.value) })}
                  className="h-10 w-full rounded-md border border-[var(--cor-neutra-2)] bg-white px-3 text-sm outline-none focus:border-[var(--cor-tema-suave)]"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                  Reservas por mês por unidade
                </span>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={regraForm.limiteMensalUnidade}
                  onChange={(e) => setRegraForm({ ...regraForm, limiteMensalUnidade: Number(e.target.value) })}
                  className="h-10 w-full rounded-md border border-[var(--cor-neutra-2)] bg-white px-3 text-sm outline-none focus:border-[var(--cor-tema-suave)]"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                  Regras exibidas ao morador (taxa de limpeza, horários…)
                </span>
                <textarea
                  rows={3}
                  value={regraForm.regrasTexto}
                  onChange={(e) => setRegraForm({ ...regraForm, regrasTexto: e.target.value })}
                  className="w-full rounded-md border border-[var(--cor-neutra-2)] px-3 py-2 text-sm outline-none focus:border-[var(--cor-tema-suave)] focus:ring-2 focus:ring-[var(--cor-tema-suave)]/30"
                />
              </label>
              {erro && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <BotaoSecundario onClick={() => setEditandoRegra(null)}>Cancelar</BotaoSecundario>
              <BotaoPrimario onClick={salvarRegra} disabled={enviando}>
                {enviando && <LoaderCircle className="h-4 w-4 animate-spin" />} Salvar regras
              </BotaoPrimario>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
