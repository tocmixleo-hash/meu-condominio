"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import {
  Badge,
  BotaoPrimario,
  BotaoSecundario,
  Carregando,
  dataHoraCurta,
  EstadoVazio,
  Lista,
  LinhaLista,
  ROTULO_CATEGORIA_COMUNICADO,
  Secao,
} from "@/components/portal/ui";
import type { Perfil } from "@/components/portal/app-shell";

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
  const podePublicar = perfil === "SINDICO" || perfil === "ADMINISTRATIVO";

  const carregar = useCallback(() => {
    fetch("/api/comunicados")
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d) => d && setLista(d.lista))
      .catch(() => null);
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
      const corpo = await r.json();
      if (!r.ok) throw new Error(corpo.erro || "Falha ao publicar.");
      setAberto(false);
      setForm(VAZIO);
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao publicar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-6">
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
          <Lista className="border-t border-[#EFE9E1]">
            {lista.map((c) => (
              <div key={c.id} className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-900">{c.titulo}</p>
                    <p className="mt-0.5 text-xs text-stone-400">
                      {ROTULO_CATEGORIA_COMUNICADO[c.categoria] ?? c.categoria} · {c.autor.nome} ·{" "}
                      {dataHoraCurta(c.criadoEm)}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {c.prioridade === "ALTA" ? (
                      <Badge tom="vermelho">Prioridade alta</Badge>
                    ) : (
                      <Badge>{ROTULO_CATEGORIA_COMUNICADO[c.categoria] ?? c.categoria}</Badge>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{c.conteudo}</p>
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
          <div className="relative w-full max-w-lg rounded-lg border border-[#EFE9E1] bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-stone-900">Publicar comunicado</h3>
            <p className="mt-0.5 text-sm text-stone-500">
              Visível para todos os moradores e funcionários.
            </p>
            <div className="mt-4 space-y-3">
              <input
                placeholder="Título"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                className="h-10 w-full rounded-md border border-[#dfdacf] px-3 text-sm outline-none focus:border-[#a3968d] focus:ring-2 focus:ring-[#a3968d]/30"
              />
              <textarea
                placeholder="Conteúdo do comunicado"
                rows={5}
                value={form.conteudo}
                onChange={(e) => setForm({ ...form, conteudo: e.target.value })}
                className="w-full rounded-md border border-[#dfdacf] px-3 py-2 text-sm outline-none focus:border-[#a3968d] focus:ring-2 focus:ring-[#a3968d]/30"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  className="h-10 w-full rounded-md border border-[#dfdacf] bg-white px-3 text-sm outline-none focus:border-[#a3968d]"
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
                  className="h-10 w-full rounded-md border border-[#dfdacf] bg-white px-3 text-sm outline-none focus:border-[#a3968d]"
                >
                  <option value="NORMAL">Prioridade normal</option>
                  <option value="ALTA">Prioridade alta</option>
                </select>
              </div>
              {erro && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
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
