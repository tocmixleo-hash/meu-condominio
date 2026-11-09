/**
 * Semeia CAMPANHAS de conscientização (conteúdo institucional REAL do
 * condomínio — não é dado de teste): recolhimento de fezes de pet e
 * boas práticas de convivência, para os dois condomínios.
 *
 * IDEMPOTENTE por chave natural (condomínio + título). Nunca altera nem
 * apaga registros existentes.
 *
 * Uso: bun scripts/semear-campanhas.mjs            (banco demo local)
 *      TURSO_... bun scripts/semear-campanhas.mjs --producao
 */
import { createClient } from "@libsql/client";

const producao = process.argv.includes("--producao");
const url = producao ? process.env.TURSO_DATABASE_URL : "file:db/custom.db";
if (producao && !url) {
  console.error("Com --producao, defina TURSO_DATABASE_URL e TURSO_AUTH_TOKEN.");
  process.exit(1);
}
const db = createClient({
  url,
  ...(producao && process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
});
const sql = async (q, a = []) => (await db.execute({ sql: q, args: a })).rows;

function cuid() {
  return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// Síndico de cada condomínio assina as campanhas (demo e produção usam os mesmos e-mails)
const SINDICOS = {
  california: "sindico@parquecalifornia.com.br",
  florida: "sindico@parqueflorida.com.br",
};

// Conteúdo institucional aprovado para divulgação com destaque
const CAMPANHAS = [
  {
    slugSindico: "california",
    condominioSlug: "california",
    titulo: "Recolha as fezes do seu pet",
    mensagem:
      "Passear com seu melhor amigo é um prazer — recolher as fezes dele é respeito a todos. Leve sempre o saquinho e descarte na lixeira adequada.",
    descricao:
      "Boas práticas com o seu pet no condomínio:\n• Leve saquinhos sempre que sair para passear — a portaria também disponibiliza;\n• Recolha as fezes do seu pet nas calçadas, gramados e áreas comuns, sem exceção;\n• Descarte o saquinho fechado na lixeira correta, nunca nas lixeiras orgânicas abertas;\n• Mantenha o pet com coleira e guia nas áreas comuns;\n• Evite que o pet frequente a área da piscina e o playground — são espaços das crianças;\n• Limpe eventuais marcas antes que outros moradores passem.\n\nUm gesto simples deixa o condomínio mais limpo, saudável e agradável para todos.",
    categoria: "PET",
    emoji: "🐾",
    ordem: 0,
  },
  {
    slugSindico: "california",
    condominioSlug: "california",
    titulo: "Boas práticas fazem a diferença",
    mensagem:
      "Pequenos gestos constroem a convivência: respeite o horário de silêncio, separe o lixo corretamente e deixe as áreas comuns como gostaria de encontrá-las.",
    descricao:
      "Boas práticas de convivência no nosso condomínio:\n• Silêncio das 22h às 8h — festas e encontros com volume moderado;\n• Lixo: ensacado e dentro do lixeiro, respeitando a coleta seletiva;\n• Elevador: priorize idosos, gestantes e pessoas com mobilidade reduzida;\n• Áreas comuns: retire a sujeira gerada pelo seu uso e reserve o espaço para o próximo;\n• Mudanças e reformas: combata o entulho irregular e avise a administração;\n• Vagas de visita: uso apenas para convidados, nunca permanentes.\n\nConviver bem é um trabalho de todos — e começa por cada um de nós.",
    categoria: "CONVIVENCIA",
    emoji: "🏡",
    ordem: 1,
  },
  {
    slugSindico: "florida",
    condominioSlug: "florida",
    titulo: "Recolha as fezes do seu pet",
    mensagem:
      "Seu pet adora passear, e os espaços comuns agradecem: recolha sempre as fezes e descarte na lixeira adequada. O saquinho cabe no bolso — a boa educação também.",
    descricao:
      "Boas práticas com o seu pet no condomínio:\n• Tenha sempre saquinhos à mão nos passeios;\n• Recolha as fezes em todas as áreas comuns — gramado, calçada e entradas;\n• Descarte na lixeira adequada, com o saquinho bem fechado;\n• Coleira e guia em todos os deslocamentos pelas áreas comuns;\n• Playground e piscina são espaços das crianças — pets ficam de fora;\n• A antecipação é cuidado: higiene rápida evita constrangimentos.\n\nCompanhia boa é a que deixa o caminho limpo para os próximos.",
    categoria: "PET",
    emoji: "🐾",
    ordem: 0,
  },
  {
    slugSindico: "florida",
    condominioSlug: "florida",
    titulo: "Boas práticas fazem a diferença",
    mensagem:
      "O condomínio é a nossa casa estendida: horário de silêncio respeitado, lixo separado e áreas comuns cuidadas garantem harmonia para todos.",
    descricao:
      "Boas práticas de convivência no nosso condomínio:\n• Silêncio das 22h às 8h — respeite o descanso dos vizinhos;\n• Lixo ensacado, amarrado e no horário certo da coleta;\n• Recicláveis separados — cada material no seu lugar;\n• Elevador compartilhável: poucos andares, caminhada faz bem;\n• Churrasqueira e salão: limpe após o uso e reserve com antecedência;\n• Visitantes e obras: siga as orientações da portaria.\n\nRespeito mútuo é o que transforma prédio em lar coletivo.",
    categoria: "CONVIVENCIA",
    emoji: "🏡",
    ordem: 1,
  },
];

async function main() {
  let criadas = 0;
  let puladas = 0;
  for (const c of CAMPANHAS) {
    const condominio = (
      await sql("SELECT id, nome FROM Condominio WHERE slug = ?", [c.condominioSlug])
    )[0];
    if (!condominio) {
      console.warn(`⚠ Condomínio ${c.condominioSlug} não encontrado — campanha pulada.`);
      continue;
    }
    const sindico = (
      await sql("SELECT id FROM Usuario WHERE condominioId = ? AND email = ?", [
        condominio.id,
        SINDICOS[c.slugSindico],
      ])
    )[0];

    const existente = (
      await sql("SELECT id FROM Campanha WHERE condominioId = ? AND titulo = ?", [
        condominio.id,
        c.titulo,
      ])
    )[0];
    if (existente) {
      puladas += 1;
      continue;
    }

    await db.execute({
      sql: `INSERT INTO Campanha (id, condominioId, titulo, mensagem, descricao, categoria, emoji, ativa, ordem, inicioEm, fimEm, autorId, criadoEm)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, NULL, NULL, ?, ?)`,
      args: [
        cuid(),
        condominio.id,
        c.titulo,
        c.mensagem,
        c.descricao,
        c.categoria,
        c.emoji,
        c.ordem ?? 0,
        sindico?.id ?? null,
        new Date().toISOString(),
      ],
    });
    criadas += 1;
    console.log(`✓ ${condominio.nome}: ${c.emoji} ${c.titulo}`);
  }
  console.log(`Campanhas prontas — criadas: ${criadas}, já existentes: ${puladas}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
