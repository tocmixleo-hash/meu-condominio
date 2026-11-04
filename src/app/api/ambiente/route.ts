/**
 * Indica o modo de operação para a interface:
 * - demo: sem banco Turso configurado (desenvolvimento/demonstração, dados
 *   fictícios e acessos rápidos no login);
 * - producao: TURSO_DATABASE_URL presente — entrada por e-mail e senha,
 *   vínculos resolvidos no backend, sem nada fictício na tela.
 */
export async function GET() {
  return Response.json({ demo: !process.env.TURSO_DATABASE_URL });
}
