import path from "path";
import { readFile } from "fs/promises";

// Serve os arquivos enviados pela Identidade visual (logotipos e fotografias)
// gravados no filesystem local como reserva do Vercel Blob. Rota de API é
// necessária porque, em produção, arquivos adicionados a `public/` depois do
// start não são servidos pelo Next — e na Vercel o filesystem de `public/` é
// somente leitura. Em produção com Blob configurado as URLs são remotas e
// nunca passam por aqui.
//
// GET /api/uploads/condominios/{slug}/{arquivo}
//   → {base}/condominios/{slug}/{arquivo}
//
// O `base` segue o mesmo cálculo de salvarArquivo (route.ts de arquivo):
// PASTA_UPLOADS > /tmp/uploads (Vercel) > public/uploads (local/dev/standalone).

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
};

function baseUploads(): string {
  if (process.env.PASTA_UPLOADS) return path.resolve(process.env.PASTA_UPLOADS);
  if (process.env.VERCEL) return path.join("/tmp", "uploads");
  return path.join(process.cwd(), "public", "uploads");
}

export async function GET(_req: Request, { params }: { params: Promise<{ caminho: string[] }> }) {
  const { caminho } = await params;
  const segmentos = (caminho ?? []).map(String);

  // Bloqueia travessia de diretório: só nomes de arquivo simples são aceitos.
  if (
    segmentos.length === 0 ||
    segmentos.some((s) => !s || s.includes("/") || s.includes("\\") || s.includes(".."))
  ) {
    return new Response("Não encontrado.", { status: 404 });
  }

  const ext = (segmentos[segmentos.length - 1].split(".").pop() ?? "").toLowerCase();
  const tipo = MIME[ext];
  if (!tipo) return new Response("Tipo não suportado.", { status: 404 });

  const arquivo = path.join(baseUploads(), ...segmentos);
  const conteudo = await readFile(arquivo).catch(() => null);
  if (!conteudo) return new Response("Não encontrado.", { status: 404 });

  // URLs são únicas (carimbadas com Date.now), então cache longo é seguro.
  return new Response(conteudo, {
    headers: {
      "Content-Type": tipo,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
