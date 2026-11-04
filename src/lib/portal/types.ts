// Tipos compartilhados entre API e frontend (datas serializadas como ISO string)

export type Perfil = 'MORADOR' | 'ADMIN' | 'ADMINISTRATIVO' | 'PORTARIA'

export interface SessaoUsuario {
  id: string
  nome: string
  email: string
  perfil: Perfil
  telefone: string | null
  tipoVinculo: string | null
  condominioId: string
  condominioNome: string
  unidade: { id: string; bloco: string; numero: string } | null
}

export interface AreaComum {
  id: string
  nome: string
  descricao: string | null
  capacidade: number
  taxaReserva: number
  aprovacaoAutomatica: boolean
  horarioFuncionamento: string | null
}

export type StatusReserva = 'PENDENTE' | 'APROVADA' | 'REJEITADA' | 'CANCELADA'

export interface ReservaItem {
  id: string
  areaId: string
  areaNome: string
  taxaReserva: number
  aprovacaoAutomatica: boolean
  usuarioId: string
  usuarioNome: string
  unidadeLabel: string | null
  data: string
  horario: string
  status: StatusReserva
  observacoes: string | null
  minha: boolean
}

export type StatusBoleto = 'PAGO' | 'PENDENTE' | 'VENCIDO'

export interface BoletoItem {
  id: string
  descricao: string
  valor: number
  vencimento: string
  status: StatusBoleto
  pagoEm: string | null
  linhaDigitavel: string | null
  unidadeLabel: string
}

export type CategoriaComunicado = 'AVISO' | 'MANUTENCAO' | 'EVENTO' | 'SEGURANCA' | 'OCORRENCIA'

export interface ComunicadoItem {
  id: string
  titulo: string
  conteudo: string
  categoria: CategoriaComunicado
  prioridade: 'NORMAL' | 'ALTA'
  status: 'ATIVO' | 'RESOLVIDO'
  autorNome: string
  fixado: boolean
  criadoEm: string
}

export interface DocumentoItem {
  id: string
  titulo: string
  categoria: string
  descricao: string | null
  nomeArquivo: string
  tamanho: string | null
  versao: string | null
  criadoEm: string
}

export interface AssembleiaItem {
  id: string
  titulo: string
  tipo: 'ORDINARIA' | 'EXTRAORDINARIA'
  data: string
  local: string
  status: 'AGENDADA' | 'REALIZADA'
  pauta: string
  ata: string | null
  presencas: number
  confirmados: string
}

export interface MoradorItem {
  id: string
  nome: string
  email: string
  telefone: string | null
  perfil: Perfil
  tipoVinculo: string | null
  ativo: boolean
  unidadeLabel: string | null
}

export type StatusEncomenda = 'RECEBIDA' | 'RETIRADA'

export interface EncomendaItem {
  id: string
  descricao: string
  origem: string | null
  codigoRastreio: string | null
  observacao: string | null
  status: StatusEncomenda
  recebidaPor: string
  recebidaEm: string
  retiradaPor: string | null
  retiradaEm: string | null
  codigoRetirada: string | null
  moradorId: string | null
  moradorNome: string
  unidadeLabel: string
  minha: boolean
}

export type StatusAutorizacao = 'ATIVA' | 'UTILIZADA' | 'CANCELADA'
// statusEfetivo: ATIVA com validoAte no passado é exibida como EXPIRADA
export type StatusEfetivoAutorizacao = StatusAutorizacao | 'EXPIRADA'

export interface AutorizacaoItem {
  id: string
  nomeAutorizado: string
  documento: string | null
  empresa: string | null
  observacao: string | null
  validoAte: string
  status: StatusAutorizacao
  statusEfetivo: StatusEfetivoAutorizacao
  utilizadaEm: string | null
  criadoEm: string
  moradorId: string
  moradorNome: string
  unidadeLabel: string | null
  minha: boolean
}

export interface DashboardData {
  perfil: Perfil
  totalMoradores: number
  reservasPendentes: number
  minhasReservasProximas: ReservaItem[]
  boletosAbertos: { quantidade: number; total: number }
  comunicadosRecentes: ComunicadoItem[]
  administracao: {
    unidadesOcupadas: number
    totalUnidades: number
    inadimplenciaTotal: number
    reservasPendentesAprovacao: number
    ocorrenciasAbertas: number
    taxaInadimplencia: number
  } | null
  // ---- dados operacionais por perfil ----
  encomendas: {
    aguardando: number
    retiradasHoje: number
    itens: EncomendaItem[] // aguardando retirada (mais recentes primeiro)
  }
  autorizacoesAtivas: number // portaria: autorizações vigentes no condomínio; morador: as dele
  reservasHoje: ReservaItem[] // uso das áreas comuns no dia (equipe)
  pendencias: PendenciaItem[] // lista priorizada do que exige atenção
  atividades: AtividadeItem[] // linha do tempo do que aconteceu no condomínio
}

// Uma pendência exibida no painel — sempre vinculada ao módulo correspondente
export interface PendenciaItem {
  id: string
  tipo: 'RESERVA_APROVACAO' | 'OCORRENCIA' | 'ENCOMENDA_RETIRADA' | 'BOLETO_VENCIDO' | 'BOLETO_PENDENTE' | 'MINHA_RESERVA_PENDENTE'
  titulo: string
  detalhe: string
  prioridade: 'ALTA' | 'NORMAL'
  quando: string // ISO
  modulo: 'reservas' | 'comunicados' | 'encomendas' | 'financeiro'
}

// Um evento da linha do tempo de atividades
export interface AtividadeItem {
  id: string
  tipo: 'ENCOMENDA' | 'RESERVA' | 'COMUNICADO' | 'PAGAMENTO'
  titulo: string
  detalhe: string
  quando: string // ISO (ordenado desc)
  situacao: string // ex.: "Aguardando retirada", "Aprovada", "Prioridade alta"
  tom: 'ambar' | 'verde' | 'vermelho' | 'neutro'
}
