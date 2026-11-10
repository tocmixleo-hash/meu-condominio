/**
 * Semeia as CAMPANHAS institucionais na PRODUÇÃO pela própria API do portal
 * (sem credenciais diretas do banco): entra como síndico de cada condomínio,
 * confere o que já existe (?todas=1) e publica apenas as que faltam.
 * Idempotente — rodar de novo não duplica.
 *
 * Uso: bun scripts/semear-campanhas-producao-api.mjs [https://...vercel.app]
 */
const BASE = process.argv[2] ?? "https://parque-california.vercel.app";

const CONTAS = [
  { email: "sindico@parquecalifornia.com.br", senha: "admin123" },
  { email: "sindico@parqueflorida.com.br", senha: "admin123" },
];

const CAMPANHAS = [
  {
    conta: 0,
    titulo: "Recolha as fezes do seu pet",
    mensagem:
      "Passear com seu melhor amigo é um prazer — recolher as fezes dele é respeito a todos. Leve sempre o saquinho e descarte na lixeira adequada.",
    descricao:
      "Boas práticas com o seu pet no condomínio:\n• Leve saquinhos sempre que sair para passear — a portaria também disponibiliza;\n• Recolha as fezes do seu pet nas calçadas, gramados e áreas comuns, sem exceção;\n• Descarte o saquinho fechado na lixeira correta, nunca nas lixeiras orgânicas abertas;\n• Mantenha o pet com coleira e guia nas áreas comuns;\n• Evite que o pet frequente a área da piscina e o playground — são espaços das crianças;\n• Limpe eventuais marcas antes que outros moradores passem.\n\nUm gesto simples deixa o condomínio mais limpo, saudável e agradável para todos.",
    categoria: "PET",
    emoji: "🐾",
  },
  {
    conta: 0,
    titulo: "Boas práticas fazem a diferença",
    mensagem:
      "Pequenos gestos constroem a convivência: respeite o horário de silêncio, separe o lixo corretamente e deixe as áreas comuns como gostaria de encontrá-las.",
    descricao:
      "Boas práticas de convivência no nosso condomínio:\n• Silêncio das 22h às 8h — festas e encontros com volume moderado;\n• Lixo: ensacado e dentro do lixeiro, respeitando a coleta seletiva;\n• Elevador: priorize idosos, gestantes e pessoas com mobilidade reduzida;\n• Áreas comuns: retire a sujeira gerada pelo seu uso e reserve o espaço para o próximo;\n• Mudanças e reformas: combata o entulho irregular e avise a administração;\n• Vagas de visita: uso apenas para convidados, nunca permanentes.\n\nConviver bem é um trabalho de todos — e começa por cada um de nós.",
    categoria: "CONVIVENCIA",
    emoji: "🏡",
  },
  {
    conta: 1,
    titulo: "Recolha as fezes do seu pet",
    mensagem:
      "Seu pet adora passear, e os espaços comuns agradecem: recolha sempre as fezes e descarte na lixeira adequada. O saquinho cabe no bolso — a boa educação também.",
    descricao:
      "Boas práticas com o seu pet no condomínio:\n• Tenha sempre saquinhos à mão nos passeios;\n• Recolha as fezes em todas as áreas comuns — gramado, calçada e entradas;\n• Descarte na lixeira adequada, com o saquinho bem fechado;\n• Coleira e guia em todos os deslocamentos pelas áreas comuns;\n• Playground e piscina são espaços das crianças — pets ficam de fora;\n• A antecipação é cuidado: higiene rápida evita constrangimentos.\n\nCompanhia boa é a que deixa o caminho limpo para os próximos.",
    categoria: "PET",
    emoji: "🐾",
  },
  {
    conta: 1,
    titulo: "Boas práticas fazem a diferença",
    mensagem:
      "O condomínio é a nossa casa estendida: horário de silêncio respeitado, lixo separado e áreas comuns cuidadas garantem harmonia para todos.",
    descricao:
      "Boas práticas de convivência no nosso condomínio:\n• Silêncio das 22h às 8h — respeite o descanso dos vizinhos;\n• Lixo ensacado, amarrado e no horário certo da coleta;\n• Recicláveis separados — cada material no seu lugar;\n• Elevador compartilhável: poucos andares, caminhada faz bem;\n• Churrasqueira e salão: limpe após o uso e reserve com antecedência;\n• Visitantes e obras: siga as orientações da portaria.\n\nRespeito mútuo é o que transforma prédio em lar coletivo.",
    categoria: "CONVIVENCIA",
    emoji: "🏡",
  },
];

let sessoes = [];
for (const c of CONTAS) {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: c.email, senha: c.senha }),
  });
  const cookies = r.headers.getSetCookie?.() ?? [];
  const cookie = cookies.find((x) => x.startsWith("mc_sessao="))?.split(";")[0];
  if (!r.ok || !cookie) {
    console.error(`✗ login ${c.email}: ${r.status}`);
    process.exit(1);
  }
  sessoes.push(cookie);
  console.log(`✓ login ${c.email}`);
}

let criadas = 0;
for (const c of CAMPANHAS) {
  const cookie = sessoes[c.conta];
  const r = await fetch(`${BASE}/api/campanhas?todas=1`, { headers: { Cookie: cookie } });
  if (!r.ok) {
    console.error(`✗ listagem (${r.status}) — a tabela existe na produção? Publique primeiro o fix.`);
    process.exit(1);
  }
  const { lista } = await r.json();
  if (lista.some((x) => x.titulo === c.titulo)) {
    console.log(`= já existe: ${c.emoji} ${c.titulo}`);
    continue;
  }
  const p = await fetch(`${BASE}/api/campanhas`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(c),
  });
  const d = await p.json().catch(() => null);
  if (!p.ok) {
    console.error(`✗ criar "${c.titulo}": ${p.status} ${JSON.stringify(d ?? "")}`);
    process.exit(1);
  }
  criadas += 1;
  console.log(`✓ criada: ${c.emoji} ${c.titulo}`);
}

console.log(`Concluído — campanhas criadas: ${criadas}.`);
