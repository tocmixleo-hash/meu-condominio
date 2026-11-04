// Perfis do sistema e suas regras de autorização (server e client).
// A autorização REAL vive nas rotas de API — estas funções são a fonte
// única de verdade compartilhada por backend e frontend.

// ADMIN           → Síndico: gestão geral e tomada de decisões
// ADMINISTRATIVO  → Rotinas administrativas (cadastros, reservas, documentos)
// PORTARIA        → Atendimento: encomendas, ocorrências, consulta operacional
// MORADOR         → Uso individual dos serviços

export type PerfilSistema = 'MORADOR' | 'ADMIN' | 'ADMINISTRATIVO' | 'PORTARIA'

/** Equipe do condomínio (síndico, administrativo e portaria). */
export function ehEquipe(perfil: string): boolean {
  return perfil === 'ADMIN' || perfil === 'ADMINISTRATIVO' || perfil === 'PORTARIA'
}

/** Gestão: síndico e administrativo (decisões e cadastros). Portaria NÃO é gestão. */
export function ehAdministracao(perfil: string): boolean {
  return perfil === 'ADMIN' || perfil === 'ADMINISTRATIVO'
}

/** Rótulo legível do perfil, usado em menus e painéis. */
export function rotuloPerfil(perfil: string): string {
  switch (perfil) {
    case 'ADMIN':
      return 'Síndico'
    case 'ADMINISTRATIVO':
      return 'Administrativo'
    case 'PORTARIA':
      return 'Portaria'
    default:
      return 'Morador'
  }
}
