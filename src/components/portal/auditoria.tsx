"use client";

import { useCallback, useEffect, useState } from "react";
import { Download } from "lucide-react";
import {
  BotaoSecundario,
  Carregando,
  EstadoVazio,
  Lista,
  LinhaLista,
  Secao,
} from "@/components/portal/ui";
import { buscarJSON } from "@/lib/buscar-json";
import { ROTULO_ACAO, dataHoraCurta } from "@/lib/rotulos";

type Registro = {
  id: string;
  acao: string;
  detalhe: string | null;
  criadoEm: string;
  usuario?: { nome: string; perfil: string } | null;
};

const ROTULO_PERFIL: Record<string, string> = {
  SINDICO: "Síndico",
  ADMINISTRATIVO: "Administrativo",
  PORTARIA: "Portaria",
  MORADOR: "Morador",
};

const EXPORTACOES = [
  { tipo: "moradores", rotulo: "Moradores" },
  { tipo: "encomendas", rotulo: "Encomendas" },
  { tipo: "reservas", rotulo: "Reservas" },
  { tipo: "comunicados", rotulo: "Comunicados" },
  { tipo: "auditoria", rotulo: "Auditoria" },
];

export default function Auditoria() {
  const [lista, setLista] = useState<Registro[] | null>(null);
  const [filtro, setFiltro] = useState("");

  const carregar = useCallback(() => {
    const qs = filtro ? `?acao=${encodeURIComponent(filtro)}` : "";
    buscarJSON(`/api/auditoria${qs}`).then((d) => setLista(d?.lista ?? []));
  }, [filtro]);

  useEffect(carregar, [carregar]);

  const acoesDisponiveis = Array.from(new Set((lista ?? []).map((r) => r.acao)));

  return (
    <div className="space-y-7">
      <header className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
          Gestão
        </p>
        <h1 className="text-2xl font-semibold leading-tight text-stone-900">Auditoria</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-stone-500">
          Histórico das ações realizadas no portal por síndico, administração e portaria. Use as
          exportações abaixo para arquivar relatórios ou levar os dados a uma assembleia.
        </p>
      </header>

      <Secao titulo="Exportar dados (CSV)">
        <div className="flex flex-wrap gap-2 pt-1">
          {EXPORTACOES.map((e) => (
            <BotaoSecundario key={e.tipo} href={`/api/exportar/${e.tipo}`}>
              <Download className="h-4 w-4" />
              {e.rotulo}
            </BotaoSecundario>
          ))}
        </div>
      </Secao>

      <Secao
        titulo="Histórico de ações"
        acao={
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="h-8 rounded-md border border-[var(--cor-neutra-2)] bg-white px-2 text-xs text-stone-700 outline-none focus:border-[var(--cor-tema-suave)]"
          >
            <option value="">Todas as ações</option>
            {acoesDisponiveis.map((a) => (
              <option key={a} value={a}>
                {ROTULO_ACAO[a] ?? a}
              </option>
            ))}
          </select>
        }
      >
        {!lista ? (
          <Carregando />
        ) : (
          <Lista>
            {lista.length === 0 ? (
              <EstadoVazio mensagem="Nenhum registro encontrado." />
            ) : (
              lista.map((r) => (
                <LinhaLista
                  key={r.id}
                  principal={ROTULO_ACAO[r.acao] ?? r.acao}
                  secundaria={r.detalhe ?? undefined}
                  detalhe={
                    r.usuario
                      ? `${r.usuario.nome} · ${ROTULO_PERFIL[r.usuario.perfil] ?? r.usuario.perfil}`
                      : "Sistema"
                  }
                  direita={<span className="text-xs text-stone-400">{dataHoraCurta(r.criadoEm)}</span>}
                />
              ))
            )}
          </Lista>
        )}
      </Secao>
    </div>
  );
}
