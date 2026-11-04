"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Badge,
  BotaoSecundario,
  Carregando,
  dataHoraCurta,
  EstadoVazio,
  formatarData,
  LinhaIndicadores,
  LinhaLista,
  Lista,
  ROTULO_CATEGORIA_COMUNICADO,
  ROTULO_ESPACO,
  rotuloStatusAutorizacao,
  rotuloStatusEncomenda,
  rotuloStatusReserva,
  Secao,
  tomStatusAutorizacao,
  tomStatusEncomenda,
  tomStatusReserva,
} from "@/components/portal/ui";
import type { ModuloId, Perfil } from "@/components/portal/app-shell";

type Encomenda = {
  id: string;
  descricao: string;
  categoria: string;
  codigo: string;
  status: string;
  recebidaEm: string;
  destinatario?: { nome: string; unidade?: { bloco: string; numero: string } | null };
};

type Reserva = {
  id: string;
  espaco: string;
  data: string;
  horario: string;
  status: string;
  solicitante?: { nome: string; unidade?: { bloco: string; numero: string } | null };
};

type Autorizacao = {
  id: string;
  visitanteNome: string;
  tipo: string;
  dataInicio: string;
  dataFim: string;
  status: string;
  morador?: { nome: string; unidade?: { bloco: string; numero: string } | null };
};

type Comunicado = {
  id: string;
  titulo: string;
  categoria: string;
  criadoEm: string;
};

type Assembleia = {
  id: string;
  titulo: string;
  data: string;
  horario: string;
  local: string;
  status: string;
};

type DashboardData = {
  perfil: Perfil;
  indicadores: { rotulo: string; valor: number }[];
  encomendasRecentes?: Encomenda[];
  reservasProximas?: Reserva[];
  reservasLista?: Reserva[];
  autorizacoesAtivas?: Autorizacao[];
  autorizacoesRecentes?: Autorizacao[];
  comunicadosRecentes?: Comunicado[];
  assembleiasProximas?: Assembleia[];
};

function saudacao() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function dataLonga() {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const ACOES: Record<Perfil, { rotulo: string; destino: ModuloId }[]> = {
  MORADOR: [
    { rotulo: "Nova reserva", destino: "reservas" },
    { rotulo: "Autorizar visitante", destino: "autorizacoes" },
    { rotulo: "Ver comunicados", destino: "comunicados" },
  ],
  SINDICO: [
    { rotulo: "Publicar comunicado", destino: "comunicados" },
    { rotulo: "Aprovar reservas", destino: "reservas" },
    { rotulo: "Nova assembleia", destino: "assembleias" },
  ],
  ADMINISTRATIVO: [
    { rotulo: "Publicar comunicado", destino: "comunicados" },
    { rotulo: "Aprovar reservas", destino: "reservas" },
    { rotulo: "Cadastrar morador", destino: "moradores" },
  ],
  PORTARIA: [
    { rotulo: "Registrar encomenda", destino: "encomendas" },
    { rotulo: "Ver autorizações", destino: "autorizacoes" },
  ],
};

export default function Dashboard({
  nome,
  perfil,
  unidade,
  aoTrocar,
}: {
  nome: string;
  perfil: Perfil;
  unidade?: { bloco: string; numero: string } | null;
  aoTrocar: (m: ModuloId) => void;
}) {
  const [dados, setDados] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d) => d && setDados(d))
      .catch(() => null);
  }, []);

  return (
    <div className="space-y-7">
      {/* Faixa fotográfica */}
      <div className="relative h-44 overflow-hidden rounded-md border border-[#EFE9E1] sm:h-52">
        <Image
          src="/fotos/faixa.jpg"
          alt="Área verde e piscina do Parque Califórnia"
          fill
          priority
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 1024px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#4D403A]/70 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
            Parque Califórnia
          </p>
          <h1 className="mt-0.5 text-xl font-semibold text-white sm:text-2xl">
            {saudacao()}, {nome.split(" ")[0]}
          </h1>
          <p className="mt-0.5 text-xs text-white/85 sm:text-sm">
            {dataLonga()}
            {perfil === "MORADOR" && unidade ? ` · Unidade ${unidade.bloco}-${unidade.numero}` : ""}
          </p>
        </div>
      </div>

      {/* Indicadores */}
      {!dados ? (
        <Carregando />
      ) : (
        <>
          <LinhaIndicadores itens={dados.indicadores} />

          {/* Ações rápidas */}
          <Secao titulo="Ações rápidas">
            <div className="flex flex-wrap gap-2 pt-1">
              {ACOES[perfil].map((acao) => (
                <BotaoSecundario key={acao.destino + acao.rotulo} onClick={() => aoTrocar(acao.destino)}>
                  {acao.rotulo}
                </BotaoSecundario>
              ))}
            </div>
          </Secao>

          {/* Morador */}
          {dados.perfil === "MORADOR" && (
            <>
              <Secao titulo="Comunicados recentes">
                <Lista className="border-t border-[#EFE9E1]">
                  {dados.comunicadosRecentes?.length ? (
                    dados.comunicadosRecentes.map((c) => (
                      <LinhaLista
                        key={c.id}
                        principal={c.titulo}
                        secundaria={ROTULO_CATEGORIA_COMUNICADO[c.categoria] ?? c.categoria}
                        direita={<span className="text-xs text-stone-400">{dataHoraCurta(c.criadoEm)}</span>}
                      />
                    ))
                  ) : (
                    <EstadoVazio mensagem="Nenhum comunicado publicado." />
                  )}
                </Lista>
              </Secao>

              <Secao titulo="Minhas reservas próximas">
                <Lista className="border-t border-[#EFE9E1]">
                  {dados.reservasProximas?.length ? (
                    dados.reservasProximas.map((r) => (
                      <LinhaLista
                        key={r.id}
                        principal={ROTULO_ESPACO[r.espaco] ?? r.espaco}
                        secundaria={`${formatarData(r.data)} · ${r.horario}`}
                        direita={
                          <Badge tom={tomStatusReserva(r.status)}>{rotuloStatusReserva(r.status)}</Badge>
                        }
                      />
                    ))
                  ) : (
                    <EstadoVazio mensagem="Você ainda não tem reservas no calendário." />
                  )}
                </Lista>
              </Secao>

              <Secao titulo="Encomendas aguardando retirada">
                <Lista className="border-t border-[#EFE9E1]">
                  {dados.encomendasRecentes?.length ? (
                    dados.encomendasRecentes.map((e) => (
                      <LinhaLista
                        key={e.id}
                        principal={e.descricao}
                        secundaria={`Código de retirada ${e.codigo}`}
                        direita={
                          <Badge tom={tomStatusEncomenda(e.status)}>{rotuloStatusEncomenda(e.status)}</Badge>
                        }
                      />
                    ))
                  ) : (
                    <EstadoVazio mensagem="Nenhuma encomenda na portaria." />
                  )}
                </Lista>
              </Secao>

              <Secao titulo="Autorizações ativas">
                <Lista className="border-t border-[#EFE9E1]">
                  {dados.autorizacoesAtivas?.length ? (
                    dados.autorizacoesAtivas.map((a) => (
                      <LinhaLista
                        key={a.id}
                        principal={a.visitanteNome}
                        secundaria={`${formatarData(a.dataInicio)} até ${formatarData(a.dataFim)}`}
                        direita={
                          <Badge tom={tomStatusAutorizacao(a.status)}>
                            {rotuloStatusAutorizacao(a.status)}
                          </Badge>
                        }
                      />
                    ))
                  ) : (
                    <EstadoVazio mensagem="Nenhuma autorização ativa." />
                  )}
                </Lista>
              </Secao>
            </>
          )}

          {/* Gestão (síndico/administrativo) */}
          {(dados.perfil === "SINDICO" || dados.perfil === "ADMINISTRATIVO") && (
            <>
              <Secao titulo="Reservas aguardando aprovação">
                <Lista className="border-t border-[#EFE9E1]">
                  {dados.reservasLista?.length ? (
                    dados.reservasLista.map((r) => (
                      <LinhaLista
                        key={r.id}
                        principal={`${ROTULO_ESPACO[r.espaco] ?? r.espaco} · ${formatarData(r.data)}`}
                        secundaria={`${r.solicitante?.nome ?? ""} · ${r.horario}`}
                        direita={
                          <div className="flex items-center gap-2">
                            <Badge tom={tomStatusReserva(r.status)}>{rotuloStatusReserva(r.status)}</Badge>
                            <button
                              className="text-sm font-medium text-[#4D403A] underline-offset-4 hover:underline"
                              onClick={() => aoTrocar("reservas")}
                            >
                              Analisar
                            </button>
                          </div>
                        }
                      />
                    ))
                  ) : (
                    <EstadoVazio mensagem="Nenhuma reserva pendente. Tudo em dia!" />
                  )}
                </Lista>
              </Secao>

              <Secao titulo="Próximas assembleias">
                <Lista className="border-t border-[#EFE9E1]">
                  {dados.assembleiasProximas?.length ? (
                    dados.assembleiasProximas.map((a) => (
                      <LinhaLista
                        key={a.id}
                        principal={a.titulo}
                        secundaria={`${formatarData(a.data)} às ${a.horario} · ${
                          a.local === "VIRTUAL" ? "Virtual" : "Salão de festas"
                        }`}
                        direita={
                          <Badge tom={a.status === "AGENDADA" ? "verde" : "neutro"}>{a.status === "AGENDADA" ? "Agendada" : a.status}</Badge>
                        }
                      />
                    ))
                  ) : (
                    <EstadoVazio mensagem="Nenhuma assembleia agendada." />
                  )}
                </Lista>
              </Secao>

              <Secao titulo="Comunicados recentes">
                <Lista className="border-t border-[#EFE9E1]">
                  {dados.comunicadosRecentes?.length ? (
                    dados.comunicadosRecentes.map((c) => (
                      <LinhaLista
                        key={c.id}
                        principal={c.titulo}
                        secundaria={ROTULO_CATEGORIA_COMUNICADO[c.categoria] ?? c.categoria}
                        direita={<span className="text-xs text-stone-400">{dataHoraCurta(c.criadoEm)}</span>}
                      />
                    ))
                  ) : (
                    <EstadoVazio mensagem="Nenhum comunicado publicado." />
                  )}
                </Lista>
              </Secao>
            </>
          )}

          {/* Portaria */}
          {dados.perfil === "PORTARIA" && (
            <>
              <Secao titulo="Encomendas na portaria">
                <Lista className="border-t border-[#EFE9E1]">
                  {dados.encomendasRecentes?.length ? (
                    dados.encomendasRecentes.map((e) => (
                      <LinhaLista
                        key={e.id}
                        principal={e.descricao}
                        secundaria={`${
                          e.destinatario?.unidade
                            ? `Un. ${e.destinatario.unidade.bloco}-${e.destinatario.unidade.numero} · `
                            : ""
                        }${e.destinatario?.nome ?? ""}`}
                        detalhe={`Recebida ${dataHoraCurta(e.recebidaEm)}`}
                        direita={<Badge tom="neutro">Aguardando</Badge>}
                      />
                    ))
                  ) : (
                    <EstadoVazio mensagem="Nenhuma encomenda aguardando." />
                  )}
                </Lista>
              </Secao>

              <Secao titulo="Autorizações de acesso válidas">
                <Lista className="border-t border-[#EFE9E1]">
                  {dados.autorizacoesRecentes?.length ? (
                    dados.autorizacoesRecentes.map((a) => (
                      <LinhaLista
                        key={a.id}
                        principal={a.visitanteNome}
                        secundaria={`${
                          a.morador?.unidade ? `Un. ${a.morador.unidade.bloco}-${a.morador.unidade.numero} · ` : ""
                        }${a.morador?.nome ?? ""}`}
                        detalhe={`${formatarData(a.dataInicio)} até ${formatarData(a.dataFim)}`}
                        direita={<Badge tom="verde">Ativa</Badge>}
                      />
                    ))
                  ) : (
                    <EstadoVazio mensagem="Nenhuma autorização válida hoje." />
                  )}
                </Lista>
              </Secao>
            </>
          )}
        </>
      )}
    </div>
  );
}
