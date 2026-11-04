import { usuarioAtual } from "@/lib/auth";

export async function GET() {
  const usuario = await usuarioAtual();
  if (!usuario) return Response.json({ usuario: null }, { status: 401 });
  return Response.json({ usuario });
}
