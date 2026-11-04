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
| `BLOB_READ_WRITE_TOKEN` | Recomendada | Documentos, logotipos e fotografias no Vercel Blob (por condomínio) |
| `DATABASE_URL` | Desenvolvimento | Arquivo SQLite local (`file:...`) — ignorada quando Turso está ativo |
| `SENHA_ADMIN` | Uso único | Senha provisória do administrador no seed de produção |
| `RESEND_API_KEY` + `EMAIL_REMETENTE` | Opcional | Notificações também por e-mail (Resend) |

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
2. **Aplicar o schema** (da sua máquina, uma vez):
   ```bash
   TURSO_DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." bun scripts/aplicar-schema-turso.mjs
   ```
3. **Semear a base real** (2 condomínios + administrador, sem dados fictícios):
   ```bash
   TURSO_DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." SENHA_ADMIN="senha-forte" bun prisma/seed-producao.ts
   ```
4. **Na Vercel**, cadastre `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `SEGREDO_SESSAO` e
   `BLOB_READ_WRITE_TOKEN` e faça **Redeploy**. Com o Turso configurado, o portal entra
   automaticamente em modo de produção (sem seletor de login nem acessos de demonstração).
5. Acesse o portal com o e-mail do administrador da plataforma
   (leonardo_lira@outlook.com) e **altere a senha no primeiro acesso**.
   Depois, cadastre os vínculos da equipe de cada condomínio (Síndico,
   Administrativo, Portaria e Moradores) pelo próprio portal.

O modo demonstração (SQLite + elenco fictício + acessos rápidos) continua disponível para
desenvolvimento local e previews, sem interferir na produção.

## 5. Limitações do modo demonstração (SQLite em `/tmp`)

- A cada *cold start* a instância volta ao banco de demonstração — cadastros podem desaparecer após inatividade.
- Uploads sem `BLOB_READ_WRITE_TOKEN` ficam em `/tmp`, sujeitos ao mesmo reset.
- O rate limit de login é em memória (por instância); para bloqueio global use um store compartilhado (ex. Upstash Redis).

## 6. Escopo desta versão

- Multi-condomínio completo: vínculos usuário ↔ condomínio (muitos-para-muitos) com permissão
  por vínculo, perfil **PLATAFORMA** (administrador geral) e troca de ambiente auditada.
- Identidade visual administrável por condomínio (paleta, logotipos de menu/cabeçalho,
  fotografias, textos institucionais e contatos) — painel "Identidade visual".
- Armazenamento organizado por condomínio no Blob e documentos entregues por streaming
  autenticado (a URL do armazenamento não é exposta ao navegador).
- Suíte de isolamento entre condomínios: `bun scripts/testes-isolamento.mjs`.
- Módulo financeiro: **fora do escopo** por decisão do cliente (empresa externa cuida do
  financeiro; a arquitetura de vínculos por condomínio fica pronta para integração futura).
