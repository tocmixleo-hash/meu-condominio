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
  ROTULO_PERIODICIDADE,
  rotuloSituacaoManutencao,
  Secao,
  tomSituacaoManutencao,
} from "@/components/portal/ui";
import { corpoJson, mensagemDeErro, mensagemRede } from "@/lib/api-cliente";

type Manutencao = {
  id: string;
  titulo: string;
  descricao: string | null;
  periodicidade: string;
  proximaData: string;
  ultimaData: string | null;
  responsavel: string | null;
  situacao: string; // VENCIDA | A_VENCER | EM_DIA (calculado no servidor)
};

type Form = { titulo: string; descricao: string; periodicidade: string; proximaData: string; responsavel: string };

const VAZIO: Form = { titulo: "", descricao: "", periodicidade: "SEMESTRAL", proximaData: "", responsavel: "" };

export default function Manutencao() {
  const [lista, setLista] = useState<Manutencao[] | null>(null);
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState<Form>(VAZIO);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(() => {
    fetch("/api/manutencao")
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d) => d && setLista(d.lista))
      .catch(() => null);
  }, []);

  useEffect(carregar, [carregar]);

  async function criar() {
    setErro("");
    setEnviando(true);
    try {
      const r = await fetch("/api/manutencao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const corpo = await corpoJson(r);
      if (!corpo) throw new Error(mensagemRede(r.status));
      if (!r.ok) throw new Error(corpo.erro || "Falha ao agendar a manutenção.");
      setAberto(false);
      setForm(VAZIO);
      carregar();
    } catch (e) {
      setErro(mensagemDeErro(e, "Falha ao agendar a manutenção."));
    } finally {
      setEnviando(false);
    }
  }

  async function realizar(id: string) {
    await fetch("/api/manutencao", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, acao: "REALIZAR" }),
    });
    carregar();
  }

  const campo =
    "h-10 w-full rounded-md border border-[var(--cor-neutra-2)] px-3 text-sm outline-none focus:border-[var(--cor-tema-suave)] focus:ring-2 focus:ring-[var(--cor-tema-suave)]/30";

  return (
    <div className="space-y-6">
      <Secao
        titulo="Manutenção preventiva"
        acao={<BotaoPrimario onClick={() => setAberto(true)}>Agendar manutenção</BotaoPrimario>}
      >
        <p className="mb-4 text-sm text-[var(--cor-fg-suave)]">
          Agenda recorrente do condomínio — elevadores, bombas, combate a incêndio e demais
          obrigações. Ao registrar a realização, a próxima data é recalculada sozinha.
        </p>
        {!lista ? (
          <Carregando />
        ) : lista.length === 0 ? (
          <EstadoVazio mensagem="Nenhuma manutenção preventiva agendada." />
        ) : (
          <Lista>
            {lista.map((m) => (
              <LinhaLista
                key={m.id}
                principal={m.titulo}
                secundaria={`${ROTULO_PERIODICIDADE[m.periodicidade] ?? m.periodicidade}${
                  m.responsavel ? ` · ${m.responsavel}` : ""
                }`}
                detalhe={
                  <>
                    Próxima: {formatarData(m.proximaData)}
                    {m.ultimaData ? ` · última: ${formatarData(m.ultimaData)}` : ""}
                    {m.descricao ? ` · ${m.descricao}` : ""}
                  </>
                }
                direita={
                  <div className="flex items-center gap-3">
                    <Badge tom={tomSituacaoManutencao(m.situacao)}>
                      {rotuloSituacaoManutencao(m.situacao)}
                    </Badge>
                    <BotaoTexto onClick={() => realizar(m.id)}>Registrei realização</BotaoTexto>
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
            <h3 className="text-base font-semibold text-stone-900">Agendar manutenção preventiva</h3>
            <div className="mt-4 space-y-3">
              <input
                placeholder="Título (ex.: Vistoria dos elevadores)"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                className={campo}
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.periodicidade}
                  onChange={(e) => setForm({ ...form, periodicidade: e.target.value })}
                  className={`${campo} bg-white`}
                >
                  {Object.entries(ROTULO_PERIODICIDADE).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  title="Próxima data"
                  value={form.proximaData}
                  onChange={(e) => setForm({ ...form, proximaData: e.target.value })}
                  className={`${campo} bg-white`}
                />
              </div>
              <input
                placeholder="Responsável (empresa/técnico — opcional)"
                value={form.responsavel}
                onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
                className={campo}
              />
              <textarea
                placeholder="Descrição (opcional)"
                rows={3}
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                className="w-full rounded-md border border-[var(--cor-neutra-2)] px-3 py-2 text-sm outline-none focus:border-[var(--cor-tema-suave)] focus:ring-2 focus:ring-[var(--cor-tema-suave)]/30"
              />
              {erro && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <BotaoSecundario onClick={() => setAberto(false)}>Cancelar</BotaoSecundario>
              <BotaoPrimario onClick={criar} disabled={enviando || !form.titulo.trim() || !form.proximaData}>
                {enviando && <LoaderCircle className="h-4 w-4 animate-spin" />} Agendar
              </BotaoPrimario>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
