import { json401, usuarioAtual } from "@/lib/auth";
import { readFile } from "fs/promises";
import path from "path";

// Serve arquivos enviados (local: public/uploads; Vercel: /tmp/uploads).
const PASTA = process.env.PASTA_UPLOADS
  ? path.resolve(process.env.PASTA_UPLOADS)
  : process.env.VERCEL
    ? "/tmp/uploads"
    : path.join(process.cwd(), "public", "uploads");

const TIPOS: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".txt": "text/plain",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export async function GET(_req: Request, { params }: { params: Promise<{ nome: string }> }) {
  const eu = await usuarioAtual();
  if (!eu) return json401();

  const { nome } = await params;
  const limpo = path.basename(nome); // impede traversia de diretório
  try {
    const conteudo = await readFile(path.join(PASTA, limpo));
    const extensao = path.extname(limpo).toLowerCase();
    return new Response(new Uint8Array(conteudo), {
      headers: {
        "Content-Type": TIPOS[extensao] ?? "application/octet-stream",
        "Content-Disposition": `inline; filename="${limpo}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return Response.json({ erro: "Arquivo não encontrado." }, { status: 404 });
  }
}
