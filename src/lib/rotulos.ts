/** Rótulos e helpers compartilhados entre servidor e cliente. */

export const ROTULO_ESPACO: Record<string, string> = {
  SALAO_FESTAS: "Salão de festas",
  CHURRASQUEIRA: "Churrasqueira",
  QUADRA: "Quadra",
  PISCINA: "Piscina",
  VIRTUAL: "Virtual",
};

export const ROTULO_CATEGORIA_COMUNICADO: Record<string, string> = {
  GERAL: "Geral",
  MANUTENCAO: "Manutenção",
  EVENTO: "Evento",
  SEGURANCA: "Segurança",
  OBRA: "Obra",
};

export const ROTULO_CATEGORIA_ENCOMENDA: Record<string, string> = {
  CORREIO: "Correio",
  TRANSPORTADORA: "Transportadora",
  FARMACIA: "Farmácia",
  MERCADO: "Mercado",
  OUTRO: "Outro",
};

export const ROTULO_CATEGORIA_DOCUMENTO: Record<string, string> = {
  ATA: "Ata",
  CONVENCAO: "Convenção",
  REGIMENTO: "Regimento",
  PRESTACAO_CONTAS: "Prestação de contas",
  OUTRO: "Outro",
};

export const ROTULO_AUTORIZACAO: Record<string, string> = {
  VISITANTE: "Visitante",
  PRESTADOR: "Prestador",
};

export const ROTULO_ACAO: Record<string, string> = {
  LOGIN: "Entrou no portal",
  COMUNICADO_CRIADO: "Publicou comunicado",
  RESERVA_CRIADA: "Solicitou reserva",
  RESERVA_CONFIRMADA: "Confirmou reserva",
  RESERVA_REJEITADA: "Rejeitou reserva",
  RESERVA_CANCELADA: "Cancelou reserva",
  ENCOMENDA_REGISTRADA: "Registrou encomenda",
  ENCOMENDA_RETIRADA: "Deu baixa em encomenda",
  AUTORIZACAO_CRIADA: "Autorizou visitante",
  AUTORIZACAO_CANCELADA: "Cancelou autorização",
  MORADOR_CADASTRADO: "Cadastrou morador",
  MORADOR_ALTERADO: "Alterou morador",
  EQUIPE_CADASTRADA: "Cadastrou membro da equipe",
  EQUIPE_ALTERADA: "Alterou membro da equipe",
  FUNCAO_CRIADA: "Criou função personalizada",
  FUNCAO_ALTERADA: "Alterou função personalizada",
  FUNCAO_EXCLUIDA: "Excluiu função personalizada",
  DOCUMENTO_ENVIADO: "Enviou documento",
  DOCUMENTO_EXCLUIDO: "Excluiu documento",
  ASSEMBLEIA_CRIADA: "Agendou assembleia",
  ASSEMBLEIA_ALTERADA: "Atualizou assembleia",
  TROCA_CONDOMINIO: "Trocou de condomínio",
  IDENTIDADE_ATUALIZADA: "Atualizou identidade visual",
  IDENTIDADE_ARQUIVO: "Atualizou arquivo da identidade",
  CONDOMINIO_CRIADO: "Cadastrou condomínio",
  SENHA_ALTERADA: "Alterou a própria senha",
};

export function formatarData(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

export function dataHoraCurta(dataISO: string) {
  const dt = new Date(dataISO);
  const dia = dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  const hora = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${dia} · ${hora}`;
}
