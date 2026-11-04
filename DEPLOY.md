# Publicar no GitHub + Vercel

## 1. Subir o código para o GitHub

**Opção A — pela interface web (mais simples):**

1. Acesse [github.com/new](https://github.com/new) e crie um repositório vazio (ex.: `meu-condominio`), **sem** README.
2. Extraia o `meu-condominio.zip` no seu computador.
3. Na página do repositório, clique em **uploading an existing file** e arraste **o conteúdo da pasta extraída** (o `.zip` inteiro não funciona).
4. Clique em **Commit changes**.

**Opção B — pela linha de comando:**

```bash
unzip meu-condominio.zip -d meu-condominio && cd meu-condominio
git init && git add . && git commit -m "Meu Condomínio — portal multi-condomínio"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/meu-condominio.git
git push -u origin main
```

## 2. Criar o projeto na Vercel

1. Acesse [vercel.com/new](https://vercel.com/new) e conecte sua conta do GitHub.
2. Selecione o repositório `meu-condominio` e clique em **Import**.
3. O framework **Next.js** é detectado automaticamente — não mude o build.
4. Em **Environment Variables**, adicione:

   | Nome | Valor |
   | --- | --- |
   | `DATABASE_URL` | `file:/tmp/custom.db` |
   | `SEGREDO_SESSAO` | resultado de `openssl rand -hex 32` |

5. Clique em **Deploy** e aguarde ~2 minutos.

O app copia o banco de demonstração (2 condomínios — Parque California e Parque Florida) para `/tmp` no primeiro acesso — o seletor de condomínio na tela de login e todas as funções funcionam de imediato.

## 3. Variáveis de ambiente

| Variável | Obrigatória? | Para que serve |
| --- | --- | --- |
| `DATABASE_URL` | Sim | Banco de dados (SQLite no modo demo, Postgres em produção) |
| `SEGREDO_SESSAO` | Em produção | Segredo HMAC dos cookies de sessão (`openssl rand -hex 32`) |
| `BLOB_READ_WRITE_TOKEN` | Opcional | Armazena documentos no Vercel Blob (persistente). Sem ele, arquivos vão para `/tmp` |
| `RESEND_API_KEY` + `EMAIL_REMETENTE` | Opcional | Envia as notificações também por e-mail (Resend). Sem elas, ficam só no sino do portal |

## 4. Banco de dados persistente (Postgres) — passo a passo

O SQLite em `/tmp` serve bem para **demonstração**, mas reseta a cada *cold start*. Para um condomínio usar de verdade:

1. Crie um banco gratuito no [neon.tech](https://neon.tech) (ou Supabase/Vercel Postgres) e copie a *connection string* (`postgresql://...`).
2. Aponte o Prisma para Postgres — em `prisma/schema.prisma`, troque:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Crie o schema e semeie o banco a partir da sua máquina:
   ```bash
   DATABASE_URL="postgresql://..." bunx prisma db push
   DATABASE_URL="postgresql://..." bun prisma/seed.ts
   ```
4. Na Vercel, troque a variável `DATABASE_URL` pelo endereço do Postgres e faça **Redeploy**.

Pronto: cadastros, encomendas, reservas e documentos passam a persistir para sempre. Configure também o **BLOB_READ_WRITE_TOKEN** (Vercel → Storage → Blob) para os documentos sobreviverem junto.

## 5. Limitações do modo demonstração (SQLite em `/tmp`)

- A cada *cold start* a instância volta ao banco de demonstração — cadastros podem desaparecer após inatividade.
- Uploads sem `BLOB_READ_WRITE_TOKEN` ficam em `/tmp`, sujeitos ao mesmo reset.
- O rate limit de login é em memória (por instância); para bloqueio global use um store compartilhado (ex. Upstash Redis).
