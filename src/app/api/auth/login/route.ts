import { db } from "@/lib/db";
import {
  COOKIE_SESSAO,
  COOKIE_SIMULACAO,
  conferirSenha,
  criarToken,
  sessaoComCondominio,
} from "@/lib/auth";
import { cookies } from "next/headers";
import {
  ipDaRequisicao,
  permitirTentativa,
  registrarFalha,
  limparTentativas,
} from "@/lib/rate-limit";

const TIPOS_VALIDOS = ["MORADOR", "GESTAO", "PORTARIA", "PLATAFORMA"];

/** Grupo de tipo de usuário a partir do perfil do vínculo (tela de login). */
function grupoDoPerfilVinculo(perfil: string): string {
  if (perfil === "PORTARIA") return "PORTARIA";
  if (perfil === "MORADOR") return "MORADOR";
  return "GESTAO"; // SINDICO | ADMINISTRATIVO | FUNCAO — equipe de gestão
}

export async function POST(req: Request) {
  const chave = ipDaRequisicao(req);
  if (!(await permitirTentativa(chave))) {
    return Response.json(
      { erro: "Muitas tentativas incorretas. Aguarde alguns minutos antes de tentar novamente." },
      { status: 429 },
    );
  }

  const { email, senha, condominioId, tipo } = await req.json().catch(() => ({}) as never);
  if (!email?.trim() || !senha) {
    return Response.json({ erro: "Informe e-mail e senha." }, { status: 400 });
  }

  const emailNorm = String(email).trim().toLowerCase();
  // E-mail pode existir em mais de um condomínio (cadastros legados por
  // condomínio): aceita o condomínio explícito (seletor da tela de login);
  // se o vínculo principal não coincidir, recorre à conta correta — a
  // escolha visual nunca bloqueia o acesso de quem tem senha válida.
  const candidatos = await db.usuario.findMany({
    where: { email: emailNorm, ativo: true },
    include: { vinculos: { where: { ativo: true }, orderBy: { criadoEm: "asc" } } },
  });
  const alvo = condominioId
    ? candidatos.find((u) => u.condominioId === String(condominioId)) ?? candidatos[0] ?? null
    : candidatos[0] ?? null;
  if (!alvo || !conferirSenha(String(senha), alvo.senha)) {
    await registrarFalha(chave);
    return Response.json({ erro: "E-mail ou senha incorretos." }, { status: 401 });
  }

  // Administrador da plataforma: ativo = primeiro condomínio (pode trocar depois).
  let condominioAtivoId: string | null;
  if (alvo.perfil === "PLATAFORMA") {
    const primeiro = await db.condominio.findFirst({ orderBy: { criadoEm: "asc" }, select: { id: true } });
    if (!primeiro) {
      return Response.json(
        { erro: "Nenhum condomínio cadastrado na plataforma ainda." },
        { status: 409 },
      );
    }
    condominioAtivoId = primeiro.id;
  } else {
    const vinculos = alvo.vinculos.filter((v) => v.ativo);
    if (vinculos.length === 0) {
      return Response.json(
        { erro: "Conta sem vínculo ativo com um condomínio. Fale com a administração." },
        { status: 403 },
      );
    }
    condominioAtivoId =
      vinculos.find((v) => v.condominioId === alvo.condominioId)?.condominioId ??
      vinculos[0].condominioId;
  }

  // ── Conferência do tipo de usuário escolhido na tela de login ──
  // A tela pergunta "Que tipo de usuário é você?". Quando o tipo não
  // coincide com a conta (senha correta), devolvemos o tipo correto —
  // a interface ajusta a seleção e o usuário entra na sequência
  // (a senha já validada continua valendo; ninguém é bloqueado).
  if (tipo && TIPOS_VALIDOS.includes(String(tipo))) {
    const grupoConta =
      alvo.perfil === "PLATAFORMA"
        ? "PLATAFORMA"
        : grupoDoPerfilVinculo(
            alvo.vinculos.find((v) => v.condominioId === condominioAtivoId)?.perfil ??
              alvo.vinculos[0]?.perfil ??
              alvo.perfil,
          );
    if (grupoConta !== String(tipo)) {
      return Response.json(
        { erro: "Tipo de usuário diferente do selecionado.", perfilCorreto: grupoConta },
        { status: 403 },
      );
    }
  }

  const loja = await cookies();
  // Login novo começa limpo: encerra qualquer simulação anterior (o delete
  // só emite header quando o cookie existe — evita poluir o Set-Cookie).
  if (loja.get(COOKIE_SIMULACAO)?.value) loja.delete(COOKIE_SIMULACAO);
  loja.set(COOKIE_SESSAO, criarToken(alvo.id, condominioAtivoId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.VERCEL === "1" || !!process.env.VERCEL_URL,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  const usuario = await sessaoComCondominio(alvo.id, condominioAtivoId);
  return Response.json({ usuario });
}
