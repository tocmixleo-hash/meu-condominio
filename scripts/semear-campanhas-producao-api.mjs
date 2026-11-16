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
    conta: 0,
    titulo: "Separe o lixo: reciclar é cuidar de todos",
    mensagem:
      "Papel, plástico, vidro e metal no coleto correto: o lixo separado vira economia para o condomínio e ganho para o planeta.",
    descricao:
      "Boas práticas de reciclagem no nosso condomínio:\n• Enxágue as embalagens antes de descartar — restos de comida contaminam o reciclável;\n• Papelão desmontado e dobrado ocupa menos espaço no coleto;\n• Vidros quebrados vão embalados em papel grosso, identificados como risco;\n• Pilhas, baterias e eletrônicos têm ponto de coleta próprio — nunca no lixo comum;\n• Sacos de lixo comum bem fechados no lixeiro, sempre no horário da coleta.\n\nReciclar bem é um hábito simples que beneficia a todos.",
    categoria: "SUSTENTABILIDADE",
    emoji: "♻️",
  },
  {
    conta: 0,
    titulo: "Visita esperada é visita autorizada",
    mensagem:
      "Cadastre seus visitantes com antecedência na área de Autorizações: a portaria libera na hora e o condomínio fica mais seguro para todos.",
    descricao:
      "Como agilizar a entrada dos seus visitantes:\n• Cadastre a autorização com antecedência pelo menu Autorizações;\n• Informe nome completo, documento e placa (quando houver veículo);\n• Defina o período de validade — autorização vencida não é aceita na portaria;\n• Prestadores recorrentes (diarista, encarregado) podem ter autorização de longo prazo;\n• Gere o QR Code para o visitante apresentar na guarita, sem fila e sem ligação.\n\nPortaria informada é portaria rápida — e todo mundo chega bem.",
    categoria: "SEGURANCA",
    emoji: "🦺",
    destino: "autorizacoes",
  },
  {
    conta: 0,
    titulo: "Vazamento avisado é dinheiro economizado",
    mensagem:
      "Viu goteira, torneira pingando ou água escorrendo na garagem? Registre uma ocorrência no portal — conserto rápido evita obra grande na conta do condomínio.",
    descricao:
      "Ajude a economizar água e evitar danos:\n• Goteiras, infiltrações e poças sem origem aparente: registre pelo menu Ocorrências;\n• FOTOS ajudam muito — a equipe localiza e prioriza mais rápido;\n• Torneira do tanque de uso coletivo mal fechada também é ocorrência;\n• Irrigação do gramado ligada fora de hora merece aviso;\n• Cada gota conta: a conta de água do condomínio é dividida por todos.\n\nUm aviso de 1 minuto evita um rateio surpresa no boleto.",
    categoria: "SAUDE",
    emoji: "💧",
    destino: "ocorrencias",
  },
  {
    conta: 0,
    titulo: "Deixe o espaço como gostaria de encontrar",
    mensagem:
      "Reservou churrasqueira ou salão de festas? Limpe após o uso e confira as regras de horário — espaço cuidado é espaço disponível para todos.",
    descricao:
      "Boas práticas nos espaços de uso comum:\n• Reserve com antecedência pelo menu Reservas e aguarde a confirmação;\n• Respeite o horário de encerramento — o silêncio das 22h vale para as áreas comuns;\n• Churrasqueira limpa e cinzas descartadas após o uso;\n• Móveis de volta ao lugar e lixo recolhido para o lixeiro;\n• Danificações identificadas podem gerar rateio ao responsável pela unidade.\n\nConvivência boa é a que trata o espaço do vizinho como o seu.",
    categoria: "CONVIVENCIA",
    emoji: "🏡",
    destino: "reservas",
  },
  {
    conta: 1,
    titulo: "Separe o lixo: reciclar é cuidar de todos",
    mensagem:
      "Reciclável de um lado, orgânico do outro: a separação certa reduz o lixo do condomínio e ainda gera crédito na conta de energia.",
    descricao:
      "Boas práticas de reciclagem no nosso condomínio:\n• Embalagens enxaguadas antes do descarte evitam contaminação do material;\n• Papel e papelão dobrados, soltos no coleto (nunca embolados dentro do saco);\n• Vidro inteiro e quebrado: embale e sinalize para a equipe da limpeza;\n• Óleo de cozinha usado vai para a garrafa PET tampada — ponto de coleta na portaria;\n• Eletrônicos, pilhas e lâmpadas têm coleta especial — pergunte na administração.\n\nO lixo bem separado é o primeiro passo da sustentabilidade de verdade.",
    categoria: "SUSTENTABILIDADE",
    emoji: "♻️",
  },
  {
    conta: 1,
    titulo: "Visita esperada é visita autorizada",
    mensagem:
      "Autorize seus visitantes pelo portal antes da chegada: a guarita confirma o cadastro e libera na hora, sem telefonema e sem espera no portão.",
    descricao:
      "Como agilizar a entrada dos seus visitantes:\n• Cadastre pelo menu Autorizações: nome, documento e veículo;\n• Escolha o período de validade da autorização;\n• Prestadores fixos podem ter cadastro de longa duração;\n• O QR Code gerado agiliza o check-in na guarita;\n• Autorização vencida exige novo cadastro — evita mal-entendido na entrada.\n\nSegurança e agilidade andam juntas quando a informação chega antes do visitante.",
    categoria: "SEGURANCA",
    emoji: "🦺",
    destino: "autorizacoes",
  },
  {
    conta: 1,
    titulo: "Vazamento avisado é dinheiro economizado",
    mensagem:
      "Torneira pingando, infiltração na laje ou poça na garagem? Abra uma ocorrência no portal: conserto rápido é economia para todas as unidades.",
    descricao:
      "Ajude a economizar água e evitar danos:\n• Registre qualquer perda de água pelo menu Ocorrências, com foto se possível;\n• Infiltrações em paredes e tetos apontam para vazamento oculto — não deixe para depois;\n• Rega do gramado fora do horário também é aviso válido;\n• A conta de água do condomínio é rateada — cada gota perdida sai do bolso de todos.\n\nReportar é rápido, acompanhar a solução também é pelo portal.",
    categoria: "SAUDE",
    emoji: "💧",
    destino: "ocorrencias",
  },
  {
    conta: 1,
    titulo: "Deixe o espaço como gostaria de encontrar",
    mensagem:
      "Churrasqueira, salão e quadra pertencem a todos: reserve pelo portal, respeite os horários e devolva o espaço limpo para o próximo vizinho.",
    descricao:
      "Boas práticas nos espaços de uso comum:\n• Reserve pelo menu Reservas e aguarde a confirmação da administração;\n• Encerramento às 22h — o descanso dos vizinhos é regra, não sugestão;\n• Limpeza imediata após o uso: churrasqueira, mesas e chão;\n• Lixo para o lixeiro e móveis no lugar de origem;\n• Danificações podem ser rateadas à unidade responsável.\n\nEspaço comum bem cuidado é o que torna o condomínio um lugar bom de morar.",
    categoria: "CONVIVENCIA",
    emoji: "🏡",
    destino: "reservas",
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
