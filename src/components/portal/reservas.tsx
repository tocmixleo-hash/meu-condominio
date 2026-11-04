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
  ROTULO_ESPACO,
  rotuloStatusReserva,
  Secao,
  tomStatusReserva,
} from "@/components/portal/ui";
import type { Perfil } from "@/components/portal/app-shell";

type Reserva = {
  id: string;
  espaco: string;
  data: string;
  horario: string;
  observacoes: string | null;
  status: string;
  solicitante: { nome: string; unidade?: { bloco: string; numero: string } | null };
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

export default function Reservas({ perfil }: { perfil: Perfil }) {
  const [lista, setLista] = useState<Reserva[] | null>(null);
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState<Form>(VAZIO);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const ehGestao = perfil === "SINDICO" || perfil === "ADMINISTRATIVO";

  const carregar = useCallback(() => {
    fetch("/api/reservas")
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d) => d && setLista(d.lista))
      .catch(() => null);
  }, []);

  useEffect(carregar, [carregar]);

  async function criar() {
    setErro("");
    setEnviando(true);
    try {
      const r = await fetch("/api/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const corpo = await r.json();
      if (!r.ok) throw new Error(corpo.erro || "Falha ao reservar.");
      setAberto(false);
      setForm(VAZIO);
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao reservar.");
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

  return (
    <div className="space-y-6">
      <Secao
        titulo={ehGestao ? "Todas as reservas" : "Minhas reservas"}
        acao={
          perfil === "MORADOR" && (
            <BotaoPrimario onClick={() => setAberto(true)}>Nova reserva</BotaoPrimario>
          )
        }
      >
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
          <Lista className="border-t border-[var(--cor-neutra)]">
            {lista.map((r) => (
              <LinhaLista
                key={r.id}
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

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            aria-label="Fechar"
            className="absolute inset-0 bg-black/40"
            onClick={() => setAberto(false)}
          />
          <div className="relative w-full max-w-md rounded-lg border border-[var(--cor-neutra)] bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-stone-900">Nova reserva</h3>
            <p className="mt-0.5 text-sm text-stone-500">
              A reserva fica pendente até a aprovação da administração.
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
      )}
    </div>
  );
}
