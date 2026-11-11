// GERADO POR scripts/gerar-ddl-garantia.mjs — não editar à mão.
// Espelha o DDL do schema.prisma conforme emitido pelo `prisma db push`
// (referência: db/custom.db). O guardião (garantia-schema.ts) cria no banco
// de produção qualquer tabela/índice que esteja faltando.

export const DDL_POR_TABELA: Record<string, string[]> = {
  "Assembleia": [
    `
CREATE TABLE "Assembleia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "condominioId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "horario" TEXT NOT NULL,
    "local" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AGENDADA',
    "pauta" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Assembleia_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "Condominio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
)`,
    `
CREATE INDEX "Assembleia_condominioId_data_idx" ON "Assembleia"("condominioId", "data")`,
  ],
  "Auditoria": [
    `
CREATE TABLE "Auditoria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "condominioId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "acao" TEXT NOT NULL,
    "detalhe" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Auditoria_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "Condominio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
)`,
    `
CREATE INDEX "Auditoria_condominioId_criadoEm_idx" ON "Auditoria"("condominioId", "criadoEm")`,
  ],
  "Autorizacao": [
    `
CREATE TABLE "Autorizacao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "condominioId" TEXT NOT NULL,
    "visitanteNome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "documento" TEXT,
    "veiculo" TEXT,
    "dataInicio" TEXT NOT NULL,
    "dataFim" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ATIVA',
    "moradorId" TEXT NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "codigo" TEXT,
    CONSTRAINT "Autorizacao_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "Condominio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Autorizacao_moradorId_fkey" FOREIGN KEY ("moradorId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
)`,
    `
CREATE UNIQUE INDEX "Autorizacao_condominioId_codigo_key" ON "Autorizacao"("condominioId", "codigo")`,
    `
CREATE INDEX "Autorizacao_condominioId_status_idx" ON "Autorizacao"("condominioId", "status")`,
  ],
  "Campanha": [
    `
CREATE TABLE "Campanha" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "condominioId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "descricao" TEXT,
    "categoria" TEXT NOT NULL DEFAULT 'CONVIVENCIA',
    "emoji" TEXT NOT NULL DEFAULT '📣',
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "inicioEm" DATETIME,
    "fimEm" DATETIME,
    "autorId" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Campanha_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "Condominio" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Campanha_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
)`,
    `
CREATE INDEX "Campanha_condominioId_ativa_ordem_idx" ON "Campanha"("condominioId", "ativa", "ordem")`,
  ],
  "Comunicado": [
    `
CREATE TABLE "Comunicado" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "condominioId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "prioridade" TEXT NOT NULL DEFAULT 'NORMAL',
    "autorId" TEXT NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Comunicado_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "Condominio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Comunicado_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
)`,
    `
CREATE INDEX "Comunicado_condominioId_criadoEm_idx" ON "Comunicado"("condominioId", "criadoEm")`,
  ],
  "Condominio": [
    `
CREATE TABLE "Condominio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "corTema" TEXT NOT NULL DEFAULT '#4D403A',
    "logo" TEXT NOT NULL,
    "foto" TEXT NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nomeExibicao" TEXT,
    "nomeCurto" TEXT,
    "descricao" TEXT,
    "telefoneContato" TEXT,
    "emailContato" TEXT,
    "endereco" TEXT,
    "cnpj" TEXT,
    "corPrimaria" TEXT,
    "corSecundaria" TEXT,
    "corDestaque" TEXT,
    "corSidebar" TEXT,
    "corFundo" TEXT,
    "corTexto" TEXT,
    "logoMenu" TEXT,
    "logoCabecalho" TEXT
)`,
    `
CREATE UNIQUE INDEX "Condominio_slug_key" ON "Condominio"("slug")`,
  ],
  "CondominioFoto": [
    `
CREATE TABLE "CondominioFoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "condominioId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "legenda" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CondominioFoto_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "Condominio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
)`,
    `
CREATE INDEX "CondominioFoto_condominioId_tipo_ordem_idx" ON "CondominioFoto"("condominioId", "tipo", "ordem")`,
  ],
  "Documento": [
    `
CREATE TABLE "Documento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "condominioId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "url" TEXT,
    "tamanhoBytes" INTEGER NOT NULL DEFAULT 0,
    "enviadoPorId" TEXT NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Documento_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "Condominio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Documento_enviadoPorId_fkey" FOREIGN KEY ("enviadoPorId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
)`,
    `
CREATE INDEX "Documento_condominioId_criadoEm_idx" ON "Documento"("condominioId", "criadoEm")`,
  ],
  "Encomenda": [
    `
CREATE TABLE "Encomenda" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "condominioId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "remetente" TEXT,
    "categoria" TEXT NOT NULL DEFAULT 'CORREIO',
    "codigo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AGUARDANDO',
    "destinatarioId" TEXT NOT NULL,
    "recebidaEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retiradaEm" DATETIME,
    CONSTRAINT "Encomenda_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "Condominio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Encomenda_destinatarioId_fkey" FOREIGN KEY ("destinatarioId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
)`,
    `
CREATE UNIQUE INDEX "Encomenda_condominioId_codigo_key" ON "Encomenda"("condominioId", "codigo")`,
    `
CREATE INDEX "Encomenda_condominioId_status_idx" ON "Encomenda"("condominioId", "status")`,
  ],
  "EspacoFoto": [
    `
CREATE TABLE "EspacoFoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "condominioId" TEXT NOT NULL,
    "espaco" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EspacoFoto_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "Condominio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
)`,
    `
CREATE UNIQUE INDEX "EspacoFoto_condominioId_espaco_key" ON "EspacoFoto"("condominioId", "espaco")`,
  ],
  "Funcao": [
    `
CREATE TABLE "Funcao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "condominioId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "permissoes" TEXT NOT NULL DEFAULT '[]',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Funcao_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "Condominio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
)`,
    `
CREATE INDEX "Funcao_condominioId_idx" ON "Funcao"("condominioId")`,
    `
CREATE UNIQUE INDEX "Funcao_condominioId_nome_key" ON "Funcao"("condominioId", "nome")`,
  ],
  "Manutencao": [
    `
CREATE TABLE "Manutencao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "condominioId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "periodicidade" TEXT NOT NULL DEFAULT 'SEMESTRAL',
    "proximaData" TEXT NOT NULL,
    "ultimaData" TEXT,
    "responsavel" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Manutencao_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "Condominio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
)`,
    `
CREATE INDEX "Manutencao_condominioId_proximaData_idx" ON "Manutencao"("condominioId", "proximaData")`,
  ],
  "Notificacao": [
    `
CREATE TABLE "Notificacao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "condominioId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notificacao_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "Condominio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Notificacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
)`,
    `
CREATE INDEX "Notificacao_usuarioId_lida_criadoEm_idx" ON "Notificacao"("usuarioId", "lida", "criadoEm")`,
  ],
  "Ocorrencia": [
    `
CREATE TABLE "Ocorrencia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "condominioId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'OUTROS',
    "prioridade" TEXT NOT NULL DEFAULT 'NORMAL',
    "local" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    "abertaPorId" TEXT NOT NULL,
    "resolucao" TEXT,
    "resolvidaEm" DATETIME,
    "atualizadaEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Ocorrencia_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "Condominio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Ocorrencia_abertaPorId_fkey" FOREIGN KEY ("abertaPorId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
)`,
    `
CREATE INDEX "Ocorrencia_condominioId_status_criadoEm_idx" ON "Ocorrencia"("condominioId", "status", "criadoEm")`,
  ],
  "RedefinicaoSenha": [
    `
CREATE TABLE "RedefinicaoSenha" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuarioId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEm" DATETIME NOT NULL,
    "usadaEm" DATETIME,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RedefinicaoSenha_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
)`,
    `
CREATE UNIQUE INDEX "RedefinicaoSenha_tokenHash_key" ON "RedefinicaoSenha"("tokenHash")`,
    `
CREATE INDEX "RedefinicaoSenha_usuarioId_idx" ON "RedefinicaoSenha"("usuarioId")`,
  ],
  "RegraReserva": [
    `
CREATE TABLE "RegraReserva" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "condominioId" TEXT NOT NULL,
    "espaco" TEXT NOT NULL,
    "antecedenciaMaxDias" INTEGER NOT NULL DEFAULT 60,
    "limiteMensalUnidade" INTEGER NOT NULL DEFAULT 2,
    "regrasTexto" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RegraReserva_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "Condominio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
)`,
    `
CREATE UNIQUE INDEX "RegraReserva_condominioId_espaco_key" ON "RegraReserva"("condominioId", "espaco")`,
  ],
  "Reserva": [
    `
CREATE TABLE "Reserva" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "condominioId" TEXT NOT NULL,
    "espaco" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "horario" TEXT NOT NULL,
    "observacoes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "solicitanteId" TEXT NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reserva_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "Condominio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Reserva_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
)`,
    `
CREATE INDEX "Reserva_condominioId_data_idx" ON "Reserva"("condominioId", "data")`,
  ],
  "TentativaLogin": [
    `
CREATE TABLE "TentativaLogin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chave" TEXT NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
    `
CREATE INDEX "TentativaLogin_chave_criadoEm_idx" ON "TentativaLogin"("chave", "criadoEm")`,
  ],
  "Unidade": [
    `
CREATE TABLE "Unidade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "condominioId" TEXT NOT NULL,
    "bloco" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    CONSTRAINT "Unidade_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "Condominio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
)`,
    `
CREATE UNIQUE INDEX "Unidade_condominioId_bloco_numero_key" ON "Unidade"("condominioId", "bloco", "numero")`,
  ],
  "Usuario": [
    `
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "condominioId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "perfil" TEXT NOT NULL,
    "telefone" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "tutorialVisto" BOOLEAN NOT NULL DEFAULT false,
    "unidadeId" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Usuario_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "Condominio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Usuario_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade" ("id") ON DELETE SET NULL ON UPDATE CASCADE
)`,
    `
CREATE UNIQUE INDEX "Usuario_condominioId_email_key" ON "Usuario"("condominioId", "email")`,
    `
CREATE INDEX "Usuario_condominioId_idx" ON "Usuario"("condominioId")`,
  ],
  "UsuarioCondominio": [
    `
CREATE TABLE "UsuarioCondominio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuarioId" TEXT NOT NULL,
    "condominioId" TEXT NOT NULL,
    "perfil" TEXT NOT NULL,
    "funcaoId" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UsuarioCondominio_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UsuarioCondominio_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "Condominio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UsuarioCondominio_funcaoId_fkey" FOREIGN KEY ("funcaoId") REFERENCES "Funcao" ("id") ON DELETE SET NULL ON UPDATE CASCADE
)`,
    `
CREATE INDEX "UsuarioCondominio_condominioId_idx" ON "UsuarioCondominio"("condominioId")`,
    `
CREATE INDEX "UsuarioCondominio_funcaoId_idx" ON "UsuarioCondominio"("funcaoId")`,
    `
CREATE UNIQUE INDEX "UsuarioCondominio_usuarioId_condominioId_key" ON "UsuarioCondominio"("usuarioId", "condominioId")`,
  ],
};
