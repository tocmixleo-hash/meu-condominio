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
  ROTULO_CATEGORIA_OCORRENCIA,
  ROTULO_ESPACO,
  rotuloStatusAutorizacao,
  rotuloStatusEncomenda,
  rotuloStatusOcorrencia,
  rotuloStatusReserva,
  Secao,
  tomStatusAutorizacao,
  tomStatusEncomenda,
  tomStatusOcorrencia,
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

type Ocorrencia = {
  id: string;
  titulo: string;
  categoria: string;
  prioridade: string;
  status: string;
  criadoEm: string;
  abertaPor?: { nome: string; unidade?: { bloco: string; numero: string } | null };
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
  ocorrenciasRecentes?: Ocorrencia[];
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

const DESCRICAO_PERFIL: Record<Perfil, string> = {
  MORADOR:
    "Acompanhe os comunicados, reserve espaços comuns e gerencie encomendas e autorizações da sua unidade.",
  SINDICO:
    "Visão geral do condomínio: reservas para aprovar, próximas assembleias e comunicados publicados.",
  ADMINISTRATIVO:
    "Rotina da administração: reservas pendentes, encomendas na portaria e cadastro de moradores.",
  PORTARIA:
    "Movimentação do dia: encomendas recebidas e autorizações de acesso válidas na guarita.",
  PLATAFORMA:
    "Console da plataforma: você está operando no condomínio ativo do seletor — gerencie ambientes, identidades visuais e auditoria.",
  FUNCAO:
    "Painel da sua função no condomínio — os módulos concedidos pela administração aparecem no menu.",
};

const ACOES: Record<Perfil, { rotulo: string; destino: ModuloId }[]> = {
  MORADOR: [
    { rotulo: "Nova reserva", destino: "reservas" },
    { rotulo: "Autorizar visitante", destino: "autorizacoes" },
    { rotulo: "Reportar problema", destino: "ocorrencias" },
  ],
  SINDICO: [
    { rotulo: "Publicar comunicado", destino: "comunicados" },
    { rotulo: "Aprovar reservas", destino: "reservas" },
    { rotulo: "Ocorrências", destino: "ocorrencias" },
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
  PLATAFORMA: [
    { rotulo: "Gerenciar condomínios", destino: "condominios" },
    { rotulo: "Identidade visual", destino: "identidade" },
  ],
  FUNCAO: [
    { rotulo: "Ocorrências", destino: "ocorrencias" },
  ],
};

export default function Dashboard({
  nome,
  perfil,
  unidade,
  condominio,
  aoTrocar,
}: {
  nome: string;
  perfil: Perfil;
  unidade?: { bloco: string; numero: string } | null;
  condominio: { nome: string; slug: string; corTema: string; logo: string; foto: string };
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
    <div className="space-y-5">
      {/* Faixa panorâmica — largura total, cantos retos, degradê para o fundo */}
      <div className="relative -mx-4 h-[72px] overflow-hidden sm:-mx-6 sm:h-[76px] lg:-mx-8 lg:h-[92px]">
        <Image
          src={condominio.foto}
          alt={`Área comum do ${condominio.nome}`}
          fill
          priority
          className="object-cover object-[50%_42%]"
          sizes="100vw"
        />
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-transparent to-[var(--cor-fundo)]" />
      </div>

      {/* Cabeçalho — texto direto no fundo + ações rápidas à direita */}
      <header className="-mt-3 flex items-end justify-between gap-6">
        <div className="min-w-0 space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
            {condominio.nome.toUpperCase()} · {dataLonga()}
          </p>
          <div className="flex items-center gap-3">
            <Image
              src={condominio.logo}
              alt={`Logo do ${condominio.nome}`}
              width={44}
              height={44}
              className="h-11 w-11 shrink-0 rounded-md border border-[var(--cor-neutra)] bg-white object-contain p-0.5"
            />
            <div>
              <h1 className="text-2xl font-semibold leading-tight text-stone-900">
                {saudacao()}, {nome.split(" ")[0]}
              </h1>
              {perfil === "MORADOR" && unidade && (
                <p className="text-sm text-stone-500">
                  Unidade {unidade.bloco}-{unidade.numero}
                </p>
              )}
            </div>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-stone-500">
            {DESCRICAO_PERFIL[perfil]}
          </p>
        </div>
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          {ACOES[perfil].map((acao) => (
            <BotaoSecundario key={acao.destino + acao.rotulo} onClick={() => aoTrocar(acao.destino)}>
              {acao.rotulo}
            </BotaoSecundario>
          ))}
        </div>
      </header>

      {/* Ações rápidas no celular */}
      <div className="flex flex-wrap gap-2 sm:hidden">
        {ACOES[perfil].map((acao) => (
          <BotaoSecundario key={"m-" + acao.destino + acao.rotulo} onClick={() => aoTrocar(acao.destino)}>
            {acao.rotulo}
          </BotaoSecundario>
        ))}
      </div>

      {/* Indicadores */}
      {!dados ? (
        <Carregando />
      ) : (
        <>
          <LinhaIndicadores itens={dados.indicadores} className="-mt-2" />

          {/* Seções em duas colunas — a tela inicial cabe sem rolagem no desktop */}
          <div className="grid gap-x-10 gap-y-4 lg:grid-cols-2">
          {/* Morador */}
          {dados.perfil === "MORADOR" && (
            <>
              <Secao titulo="Comunicados recentes">
                <Lista className="border-t border-[var(--cor-neutra)]">
                  {dados.comunicadosRecentes?.length ? (
                    dados.comunicadosRecentes.slice(0, 3).map((c) => (
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
                <Lista className="border-t border-[var(--cor-neutra)]">
                  {dados.reservasProximas?.length ? (
                    dados.reservasProximas.slice(0, 3).map((r) => (
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
                <Lista className="border-t border-[var(--cor-neutra)]">
                  {dados.encomendasRecentes?.length ? (
                    dados.encomendasRecentes.slice(0, 3).map((e) => (
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
                <Lista className="border-t border-[var(--cor-neutra)]">
                  {dados.autorizacoesAtivas?.length ? (
                    dados.autorizacoesAtivas.slice(0, 3).map((a) => (
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

              <Secao titulo="Minhas ocorrências">
                <Lista className="border-t border-[var(--cor-neutra)]">
                  {dados.ocorrenciasRecentes?.length ? (
                    dados.ocorrenciasRecentes.slice(0, 3).map((o) => (
                      <LinhaLista
                        key={o.id}
                        principal={o.titulo}
                        secundaria={ROTULO_CATEGORIA_OCORRENCIA[o.categoria] ?? o.categoria}
                        direita={
                          <Badge tom={tomStatusOcorrencia(o.status)}>{rotuloStatusOcorrencia(o.status)}</Badge>
                        }
                      />
                    ))
                  ) : (
                    <EstadoVazio mensagem="Nenhuma ocorrência registrada." />
                  )}
                </Lista>
              </Secao>
            </>
          )}

          {/* Gestão (síndico/administrativo) */}
          {(dados.perfil === "SINDICO" || dados.perfil === "ADMINISTRATIVO") && (
            <>
              <Secao titulo="Reservas aguardando aprovação">
                <Lista className="border-t border-[var(--cor-neutra)]">
                  {dados.reservasLista?.length ? (
                    dados.reservasLista.slice(0, 3).map((r) => (
                      <LinhaLista
                        key={r.id}
                        principal={`${ROTULO_ESPACO[r.espaco] ?? r.espaco} · ${formatarData(r.data)}`}
                        secundaria={`${r.solicitante?.nome ?? ""} · ${r.horario}`}
                        direita={
                          <div className="flex items-center gap-2">
                            <Badge tom={tomStatusReserva(r.status)}>{rotuloStatusReserva(r.status)}</Badge>
                            <button
                              className="text-sm font-medium text-[var(--cor-tema)] underline-offset-4 hover:underline"
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
                <Lista className="border-t border-[var(--cor-neutra)]">
                  {dados.assembleiasProximas?.length ? (
                    dados.assembleiasProximas.slice(0, 3).map((a) => (
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
                <Lista className="border-t border-[var(--cor-neutra)]">
                  {dados.comunicadosRecentes?.length ? (
                    dados.comunicadosRecentes.slice(0, 3).map((c) => (
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

              <Secao titulo="Ocorrências em andamento">
                <Lista className="border-t border-[var(--cor-neutra)]">
                  {dados.ocorrenciasRecentes?.length ? (
                    dados.ocorrenciasRecentes.slice(0, 4).map((o) => (
                      <LinhaLista
                        key={o.id}
                        principal={o.titulo}
                        secundaria={`${
                          o.abertaPor?.unidade
                            ? `Un. ${o.abertaPor.unidade.bloco}-${o.abertaPor.unidade.numero} · `
                            : ""
                        }${ROTULO_CATEGORIA_OCORRENCIA[o.categoria] ?? o.categoria}`}
                        detalhe={`Aberta ${dataHoraCurta(o.criadoEm)}`}
                        direita={
                          <div className="flex items-center gap-2">
                            <Badge tom={tomStatusOcorrencia(o.status)}>{rotuloStatusOcorrencia(o.status)}</Badge>
                            <button
                              className="text-sm font-medium text-[var(--cor-tema)] underline-offset-4 hover:underline"
                              onClick={() => aoTrocar("ocorrencias")}
                            >
                              Atender
                            </button>
                          </div>
                        }
                      />
                    ))
                  ) : (
                    <EstadoVazio mensagem="Nenhuma ocorrência aberta. Tudo em dia!" />
                  )}
                </Lista>
              </Secao>
            </>
          )}

          {/* Portaria */}
          {dados.perfil === "PORTARIA" && (
            <>
              <Secao titulo="Encomendas na portaria">
                <Lista className="border-t border-[var(--cor-neutra)]">
                  {dados.encomendasRecentes?.length ? (
                    dados.encomendasRecentes.slice(0, 3).map((e) => (
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
                <Lista className="border-t border-[var(--cor-neutra)]">
                  {dados.autorizacoesRecentes?.length ? (
                    dados.autorizacoesRecentes.slice(0, 3).map((a) => (
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

              <Secao titulo="Ocorrências abertas">
                <Lista className="border-t border-[var(--cor-neutra)]">
                  {dados.ocorrenciasRecentes?.length ? (
                    dados.ocorrenciasRecentes.slice(0, 3).map((o) => (
                      <LinhaLista
                        key={o.id}
                        principal={o.titulo}
                        secundaria={`${
                          o.abertaPor?.unidade ? `Un. ${o.abertaPor.unidade.bloco}-${o.abertaPor.unidade.numero} · ` : ""
                        }${ROTULO_CATEGORIA_OCORRENCIA[o.categoria] ?? o.categoria}`}
                        direita={<Badge tom={tomStatusOcorrencia(o.status)}>{rotuloStatusOcorrencia(o.status)}</Badge>}
                      />
                    ))
                  ) : (
                    <EstadoVazio mensagem="Nenhuma ocorrência aberta." />
                  )}
                </Lista>
              </Secao>
            </>
          )}
          </div>
        </>
      )}
    </div>
  );
}
