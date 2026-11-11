# Publicar no GitHub + Vercel

## 1. Subir o código para o GitHub

```bash
git init && git add . && git commit -m "Meu Condomínio — plataforma multi-condomínio"
git branch -M main
git remote add origin https://github.com/tocmixleo-hash/meu-condominio.git
git push -u origin main
```

## 2. Criar o projeto na Vercel

1. Acesse [vercel.com/new](https://vercel.com/new), conecte o GitHub e selecione o repositório `meu-condominio` (integração Git já conectada: cada envio à `main` publica automaticamente).
2. O framework **Next.js** é detectado automaticamente — não mude o build.
3. Adicione as variáveis de ambiente conforme a tabela abaixo (seção 3) e clique em **Deploy**.

## 3. Variáveis de ambiente

| Variável | Obrigatória? | Para que serve |
| --- | --- | --- |
| `TURSO_DATABASE_URL` | Sim (produção) | Endereço `libsql://` do banco Turso — ativa o modo persistente |
| `TURSO_AUTH_TOKEN` | Sim (produção) | Token de acesso do Turso (usado só no backend) |
| `SEGREDO_SESSAO` | Sim | Segredo HMAC dos cookies de sessão (`openssl rand -hex 32`) |
| `RESEND_API_KEY` + `EMAIL_REMETENTE` | Opcional | Ativa o envio real de e-mails (avisos + redefinição de senha via Resend); sem elas, os avisos continuam no sino do portal e o link de senha chega como notificação do próprio usuário |
| `ORIGEM_PUBLICA` | Opcional | Origem usada nos links de redefinição de senha (padrão: https://parque-california.vercel.app) |
| `BLOB_READ_WRITE_TOKEN` | Recomendada | Documentos, logotipos e fotografias no Vercel Blob (por condomínio) |
| `DATABASE_URL` | Desenvolvimento | Arquivo SQLite local (`file:...`) — ignorada quando Turso está ativo |
| `SENHA_ADMIN` | Uso único | Senha provisória do administrador no seed de produção |

## 4. Banco de produção em Turso (libSQL) — passo a passo

O runtime usa o driver adapter libSQL do Prisma: com `TURSO_DATABASE_URL` presente, a
aplicação grava no Turso; sem ela, roda em SQLite local (desenvolvimento/demo), igual ao
comportamento anterior. O provider do schema permanece `sqlite` — nenhuma migração
destrutiva é necessária.

1. **Criar o banco** (app.turso.tech → *New database*, ou CLI):
   ```bash
   turso db create meu-condominio
   turso db show meu-condominio   # copia a URL libsql://
   turso db tokens create meu-condominio
   ```
2. **Aplicar o schema** (da sua máquina, uma vez — banco novo):
   ```bash
   TURSO_DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." bun scripts/aplicar-schema-turso.mjs
   ```
   Em banco que JÁ existe e precisa das tabelas da fase 2 (ocorrências,
   manutenção, regras de reserva, redefinição de senha, tentativas de login
   e QR das autorizações), use a migração incremental e idempotente:
   ```bash
   TURSO_DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." bun scripts/migrar-turso-fase2.mjs
   ```
3. **Semear a base real** (2 condomínios + administrador, sem dados fictícios):
   ```bash
   TURSO_DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." SENHA_ADMIN="senha-forte" bun prisma/seed-producao.ts
   ```
4. **Na Vercel**, cadastre `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `SEGREDO_SESSAO` e
   `BLOB_READ_WRITE_TOKEN` e faça **Redeploy**. Com o Turso configurado, o portal entra
   automaticamente em modo de produção persistente (os acessos rápidos continuam na tela
   de login, alimentados pelo seed da etapa 6).
5. Acesse o portal com o e-mail do administrador da plataforma
   (leonardo_lira@outlook.com) e **altere a senha no primeiro acesso**.
   Depois, cadastre os vínculos da equipe de cada condomínio (Síndico,
   Administrativo, Portaria e Moradores) pelo próprio portal.
6. **Material de demonstração para testes de perfis** (opcional, a qualquer momento):
   para que a simulação de perfis do administrador e os acessos rápidos tenham
   conteúdo de verdade, semeie o elenco e o material demo nos dois condomínios.
   Ambos os scripts são idempotentes (rodar de novo não duplica) e **nunca tocam
   no administrador da plataforma nem em quaisquer dados reais**:
   ```bash
   TURSO_DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." bun scripts/semear-usuarios-demo-producao.mjs
   TURSO_DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." bun scripts/semear-dados-demo-producao.mjs
   ```
   O material semeado: comunicados, reservas, encomendas, autorizações de visita e
   assembleia em cada condomínio, com datas relativas ao dia da execução (visitas
   valendo hoje, assembleia na próxima semana) para nunca "envelhecer".
   Para o material da fase 2 (ocorrências em diferentes estágios e agenda de
   manutenção preventiva — vencida, a vencer e em dia):
   ```bash
   bun scripts/semear-ocorrencias-demo.mjs                       # demo local
   TURSO_DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." bun scripts/semear-ocorrencias-demo.mjs --producao
   ```
   O script também dá código QR às autorizações ativas antigas que ainda não
   possuem código.

O modo demonstração (SQLite + elenco fictício + acessos rápidos) continua disponível para
desenvolvimento local e previews, sem interferir na produção. Na produção real, a tela de
login mantém o seletor de condomínios e os acessos rápidos de demonstração — quem recebe
o link testa livremente; o administrador da plataforma nunca aparece nos atalhos e entra
apenas pelo e-mail e senha próprios.

> **Nota (módulos novos):** o portal tem um **guardião de schema** em runtime — a primeira
> consulta compara as tabelas do banco com o DDL gerado do `schema.prisma`
> (`scripts/gerar-ddl-garantia.mjs` regenera o mapa após mudanças de schema) e cria o que
> faltar (`CREATE TABLE/INDEX IF NOT EXISTS`). Módulos novos entram no ar sem passo manual
> de migração; tabelas antigas com colunas faltantes seguem os `migrar-turso-*`. O
> conteúdo institucional se semeia quando quiser (`semear-campanhas.mjs`, com `--producao`
> ou pela própria gestão do portal em *Comunicados → Nova campanha*).

### Backup automático (GitHub Actions)

O workflow `.github/workflows/backup-turso.yml` exporta o banco todo em JSON, todo dia
(03:17, horário de Brasília) e guarda a cópia como artifact privado por 30 dias. Para
ativar, cadastre `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN` nos secrets do repositório
(Settings → Secrets and variables → Actions) — sem eles o job apenas avisa que está
inativo. Rodar à mão: aba *Actions* → *Backup diário do banco* → *Run workflow*.

## 5. Limitações do modo demonstração (SQLite em `/tmp`)

- A cada *cold start* a instância volta ao banco de demonstração — cadastros podem desaparecer após inatividade.
- Uploads sem `BLOB_READ_WRITE_TOKEN` ficam em `/tmp`, sujeitos ao mesmo reset.
- O rate limit do login fica no banco (`TentativaLogin`) e vale entre instâncias; a janela é de 10 minutos com no máximo 8 falhas por IP.

## 6. Escopo desta versão

- Multi-condomínio completo: vínculos usuário ↔ condomínio (muitos-para-muitos) com permissão
  por vínculo, perfil **PLATAFORMA** (administrador geral) e troca de ambiente auditada.
- Identidade visual administrável por condomínio (paleta, logotipos de menu/cabeçalho,
  fotografias, textos institucionais e contatos) — painel "Identidade visual".
- **Fase 2**: módulos **Ocorrências** (morador abre; equipe atende/resolve com registro) e
  **Manutenção preventiva** (agenda recorrente com situação calculada e próxima data automática);
  **QR Code** na autorização de visita (portaria registra a entrada pelo código em
  `/validar/<código>`) e na retirada de encomendas; **regras de reserva por espaço**
  (antecedência máxima e limite mensal por unidade, configuráveis pela gestão) com
  **calendário mensal** das reservas; **redefinição de senha** por token de uso único
  (e-mail via Resend ou notificação in-app na demonstração); rate limit do login
  persistido no banco (vale entre todas as instâncias); simulação de perfis do
  administrador estendida aos módulos novos.
- PWA instalável (manifest + service worker) com cache leve.
- Armazenamento organizado por condomínio no Blob e documentos entregues por streaming
  autenticado (a URL do armazenamento não é exposta ao navegador).
- Suítes de teste: `bun scripts/testes-isolamento.mjs` (20), `testes-simulacao.mjs` (19),
  `testes-funcoes.mjs` (17) e `testes-fase2.mjs` (36 — ocorrências, manutenção, regras,
  QR e redefinição de senha).
- Backup completo do banco: `bun scripts/backup-turso.mjs` (JSON em `backups/`, agende
  diariamente no seu CI/cron; execução é somente leitura e segura a qualquer momento).
- Módulo financeiro: **fora do escopo** por decisão do cliente (empresa externa cuida do
  financeiro; a arquitetura de vínculos por condomínio fica pronta para integração futura).

## 7. Fase 3 — Tipo de usuário no login e tutorial do primeiro acesso

- **Pergunta de tipo na tela de login**: antes do e-mail/senha, o portal pergunta
  "Que tipo de usuário é você?" (Morador · Síndico ou administração · Portaria ·
  Administrador da plataforma). O backend confere a escolha contra a conta
  informada; se diferir, responde `403 { perfilCorreto }` e a tela ajusta a
  seleção com um aviso claro — **ninguém é bloqueado** (a senha já validada
  continua valendo para a nova tentativa). O acesso rápido de demonstração
  passou a ser filtrado pelo tipo escolhido e o administrador da plataforma
  segue sem atalho (apenas e-mail e senha).
- **Mini tutorial do primeiro acesso**: passeio guiado (holofote) de 4–6 passos
  com roteiro próprio por perfil, destacando ações rápidas, seções do painel,
  menu lateral e conta. Marcado por usuário em `Usuario.tutorialVisto`
  (`POST /api/usuario/tutorial`); "Pular" também marca como visto e o rodapé do
  menu ganhou **"Rever tutorial"**. Na simulação de perfis o passeio usa apenas
  a sessão do navegador (`mc-tour-sim:<perfil>`) — nada é gravado no banco.
- Migração incremental (idempotente, preserva dados):
  `bun scripts/migrar-turso-tutorial.mjs` — já aplicada no Turso de produção
  (todos os usuários existentes começam com `tutorialVisto = false` e verão o
  passeio uma única vez no próximo acesso).
- Suíte nova: `bun scripts/testes-tutorial.mjs` (13 — compatibilidade sem tipo,
  tipos corretos/errados por perfil, sessão, marcação idempotente e 401).
