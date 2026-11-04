/**
 * Conteúdo do Suplemento v1.1 — Ata de Decisões e Plano de Execução
 * Plataforma Multi-Condomínio Meu Condomínio. Textos em português (pt-BR).
 */

const CAPA = {
  title: "Ata de Decisões e Plano de Execução",
  subtitle: "Suplemento v1.1 ao Diagnóstico de Evolução — Plataforma Multi-Condomínio",
  englishLabel: "DECISOES REGISTRADAS",
  metaLines: [
    "Projeto: Meu Condomínio — Portal de Gestão Condominial",
    "Repositório: github.com/tocmixleo-hash/meu-condominio",
    "Produção: parque-california.vercel.app",
    "Data: 05 de novembro de 2026 · Versão 1.1",
  ],
  footerLeft: "Documento técnico interno do projeto",
  footerRight: "Confidencial",
};

const TABELAS = {
  decisoes: {
    caption: "Tabela 1 — Decisões registradas pelo cliente e consequência direta na implementação",
    headers: ["Nº", "Ponto decidido", "Decisão registrada", "Consequência na implementação"],
    widths: [7, 20, 27, 46],
    rows: [
      ["1", "Banco de dados durável", "Turso (libSQL)", "Runtime Prisma com driver adapter libSQL; o provider SQLite do schema permanece intocado, o que elimina a troca de provider e mantém o modo local em arquivo para desenvolvimento — o cenário de migração de menor risco entre as opções avaliadas"],
      ["3", "Informações financeiras", "Exclusão confirmada — fora do escopo", "Nenhuma entidade, rota ou tela financeira será criada nesta evolução; a arquitetura multi-condomínio continua preparada para integração futura com a empresa externa, caso desejada"],
      ["5", "Administrador da plataforma", "leonardo_lira@outlook.com", "Conta de perfil PLATAFORMA criada no seed de produção com senha provisória definida por variável de ambiente (SENHA_ADMIN), com alteração de senha disponível no painel desde o primeiro acesso"],
      ["4", "Dados fictícios em produção", "Produção sem dados fictícios", "O seed de produção cria somente os dois condomínios com suas identidades visuais aprovadas e a conta do administrador; o elenco fictício permanece exclusivo do ambiente de demonstração"],
      ["6", "Sessão multi-condomínio", "Recomendação técnica adotada", "Um condomínio ativo por sessão, assinado no cookie; troca por endpoint dedicado que valida o vínculo e registra auditoria"],
      ["2", "Módulo de ocorrências", "Sem decisão nesta rodada", "Mantido fora do escopo desta evolução; pode ser planejado em rodada futura sem impacto na arquitetura"],
    ],
  },
  fases: {
    caption: "Tabela 2 — Plano de execução definitivo (ajustado à decisão Turso)",
    headers: ["Fase", "Entregáveis principais", "Risco"],
    widths: [22, 62, 16],
    rows: [
      ["P0 — Núcleo de vínculos", "Modelo UsuarioCondominio com perfil por vínculo; perfil PLATAFORMA; cookie de sessão com condomínio ativo; endpoint de troca com auditoria; verificação de vínculo em todas as APIs; backfill idempotente dos vínculos existentes", "Baixo (aditivo)"],
      ["P1 — Identidade visual", "Campos de identidade no banco (paleta completa, textos institucionais, contatos, endereço e CNPJ); logotipos de menu e cabeçalho; galeria de fotografias; painel de configuração com upload validado, pré-visualização imediata e auditoria", "Médio"],
      ["P2 — Seletor e entrada", "Entrada direta para vínculo único; seletor para múltiplos vínculos; troca segura dentro do aplicativo; identificação clara do condomínio ativo em todos os tamanhos de tela", "Médio"],
      ["P3 — Turso e arquivos", "Driver libSQL no runtime com modo duplo (Turso em produção, arquivo local em desenvolvimento); chaves do Blob organizadas por condomínio; documentos privados servidos por streaming autenticado; runbook completo em DEPLOY.md", "Médio"],
      ["P4 — Qualidade e produção", "Suíte de testes de isolamento entre condomínios; seed de produção (dois condomínios reais + administrador, sem dados fictícios); build validado; publicação e verificação pós-deploy", "Baixo"],
    ],
  },
  variaveis: {
    caption: "Tabela 3 — Variáveis de ambiente da Vercel para a operação real em Turso",
    headers: ["Variável", "Obrigatoriedade", "Finalidade"],
    widths: [30, 18, 52],
    rows: [
      ["TURSO_DATABASE_URL", "Sim (produção)", "Endereço libsql:// do banco Turso criado para a plataforma — ativa o modo persistente no runtime"],
      ["TURSO_AUTH_TOKEN", "Sim (produção)", "Token de acesso do banco Turso, usado somente no backend (nunca exposto ao navegador)"],
      ["SEGREDO_SESSAO", "Sim", "Segredo HMAC dos cookies de sessão (openssl rand -hex 32)"],
      ["BLOB_READ_WRITE_TOKEN", "Recomendada", "Armazenamento persistente de documentos, logotipos e fotografias no Vercel Blob"],
      ["SENHA_ADMIN", "Uso único", "Senha provisória do administrador da plataforma no momento do seed — alterar no primeiro acesso"],
      ["DATABASE_URL", "Desenvolvimento", "Arquivo SQLite local (file:./db/custom.db) — ignorada na Vercel quando as variáveis Turso existem"],
    ],
  },
};

const CORPO = [
  { h1: "1. Sumário Executivo" },
  { p: "Este suplemento registra as decisões comunicadas pelo cliente sobre o Diagnóstico de Evolução v1.0 e fixa o plano de execução que passa a vigorar. Três decisões estruturais foram tomadas: o banco de dados durável em produção será o Turso (libSQL), o módulo financeiro permanece definitivamente fora do escopo e a conta do administrador geral da plataforma será o e-mail leonardo_lira@outlook.com. Com isso, todas as pendências necessárias ao início da implementação foram resolvidas — a execução das fases pode começar imediatamente, seguindo as garantias de preservação definidas no diagnóstico." },
  { p: "A escolha do Turso, na avaliação técnica, é bem-vinda e reduz riscos em comparação com a alternativa Postgres recomendada no diagnóstico: como o Turso preserva a semântica do SQLite, o provider do schema Prisma permanece exatamente o atual, nenhuma coluna ou tipo de dado é convertido e o ambiente de desenvolvimento continua rodando sobre arquivo local. A migração passa a ser, essencialmente, a criação do banco remoto e a aplicação do mesmo schema nele — um movimento aditivo, compatível com a estratégia não destrutiva do projeto." },

  { h1: "2. Decisões Registradas e seus Efeitos" },
  { p: "A Tabela 1 consolida cada decisão, o que foi definido pelo cliente e a consequência direta na implementação. As decisões 4 e 6 não receberam resposta específica nesta rodada e foram tratadas conforme o PRD e a recomendação técnica do diagnóstico: produção sem dados fictícios e sessão com um condomínio ativo por vez, com troca auditada. A decisão sobre o módulo de ocorrências também permanece em aberto e não faz parte desta evolução." },
  { tabela: "decisoes" },

  { h1: "3. Plano de Execução Definitivo" },
  { p: "O plano de cinco fases do diagnóstico v1.0 permanece válido e é ajustado em um ponto: a fase de infraestrutura de dados passa a tratar o Turso em vez do Postgres. A ordem de execução é mantida — núcleo de vínculos primeiro, identidade visual em seguida como prioridade declarada, seletor de ambiente, infraestrutura de dados e arquivos, e por fim qualidade e produção. Cada fase entrega valor completo, é validada por build de produção e verificação por perfil de acesso, e conclui com os testes de isolamento entre condomínios. A Tabela 2 apresenta o plano definitivo." },
  { tabela: "fases" },

  { h1: "4. Impactos da Decisão pelo Turso" },
  { p: "A integração com o Turso será feita pelo caminho oficial do Prisma: driver adapter libSQL no runtime da aplicação, com client criado sobre a URL libsql do banco e o token de acesso. No ambiente de produção da Vercel, a presença das variáveis do Turso ativa automaticamente o modo persistente; na ausência delas — desenvolvimento local e demonstração — o comportamento atual em arquivo SQLite é mantido sem qualquer alteração. Esse modo duplo garante que o Parque Califórnia e o Parque Flórida continuem funcionando durante toda a evolução, inclusive antes do banco remoto existir." },
  { p: "A aplicação do schema no banco remoto será executada com o Prisma a partir da estação de operação, seguida do seed de produção idempotente (dois condomínios, identidades aprovadas e conta do administrador). O token do Turso e a URL do banco são variáveis de ambiente da Vercel e jamais entram no repositório. A Tabela 3 consolida as variáveis necessárias e sua finalidade." },
  { tabela: "variaveis" },

  { h1: "5. Garantias Reiteradas" },
  { p: "Todas as garantias do diagnóstico v1.0 permanecem em vigor e passam a valer para a execução: nenhuma rota ou endpoint existente é removido ou renomeado; os módulos atuais permanecem intactos; as paletas aprovadas do Parque Califórnia e do Parque Flórida migram para o banco como presets, com aparência final idêntica à atual; o backfill dos vínculos é aditivo, idempotente e verificado por contagens de registros; nenhuma senha de usuário é alterada; e o Parque Califórnia permanece em funcionamento contínuo durante todas as fases, com rollback possível a cada passo pela restauração do backup e reversão do commit correspondente." },
  { p: "A conta do administrador da plataforma merece nota de segurança: a senha provisória chega ao ambiente por variável de uso único no momento do seed e deve ser trocada no primeiro acesso, pela própria interface, com a alteração registrada na auditoria do condomínio correspondente. O perfil PLATAFORMA enxerga todos os condomínios e alterna entre eles com auditoria, mas não substitui os perfis por condomínio — os vínculos de Síndico, Administrativo, Portaria e Morador continuam governando as permissões dentro de cada ambiente." },

  { h1: "6. Conclusão" },
  { p: "Com as decisões registradas neste suplemento, o conjunto diagnóstico v1.0 mais ata de decisões v1.1 forma a base autorizada para a implementação da evolução multi-condomínio. A execução inicia pela fase P0 — núcleo de vínculos e perfil da plataforma — e avança fase a fase com as garantias de não-quebra acordadas, encerrando com o banco Turso em produção, o administrador da plataforma operando o seletor de condomínios e o Parque Flórida cadastrado como ambiente independente, sem qualquer dado fictício em produção." },
];

module.exports = { CAPA, TABELAS, CORPO };
