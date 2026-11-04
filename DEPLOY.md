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
git init && git add . && git commit -m "Meu Condomínio — Parque Califórnia"
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

5. Clique em **Deploy** e aguarde ~2 minutos.

O app copia o banco de demonstração (já semeado com Maria, Carlos, Fernanda e Jorge) para `/tmp` no primeiro acesso — login e todas as funções funcionam de imediato.

## 3. Limitações da demonstração no Vercel

- **SQLite em `/tmp`**: o filesystem do Vercel é efêmero. A cada *cold start* a instância volta ao banco de demonstração original — cadastros feitos podem desaparecer depois de alguns minutos de inatividade.
- **Uploads de documentos**: gravados em `/tmp`, sujeitos ao mesmo reset.
- Para **persistência real** (produção), migre o banco para um Postgres gerenciado (Neon, Supabase ou Vercel Postgres — todos com plano gratuito). É uma conversão pequena: mudar o `provider` do Prisma, rodar `db push` + seed no banco novo e apontar o `DATABASE_URL`.
