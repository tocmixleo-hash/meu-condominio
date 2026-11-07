// ── Perguntas frequentes do morador ──────────────────────────────
// Conteúdo baseado em práticas comuns de regulamentos de condomínios
// brasileiros (horários de piscina, mudanças, descarte de lixo, obras,
// convivência, pets, portaria). O nome do condomínio é interpolado na
// resposta pelo marcador {condominio} — a administração pode revisar
// os valores no regulamento interno vigente.

export type PerguntaFaq = {
  pergunta: string;
  resposta: string;
};

export type CategoriaFaq = {
  id: string;
  rotulo: string;
  perguntas: PerguntaFaq[];
};

export type FaqMontado = {
  id: string;
  rotulo: string;
  perguntas: PerguntaFaq[];
};

const CATEGORIAS: CategoriaFaq[] = [
  {
    id: "piscina",
    rotulo: "Piscina",
    perguntas: [
      {
        pergunta: "Qual o horário de funcionamento da piscina?",
        resposta:
          "A piscina funciona de terça a domingo, das 9h às 19h. Às segundas-feiras ela permanece fechada para limpeza e tratamento da água. Fora do horário de funcionamento o uso é proibido — não há iluminação adequada nem monitoramento, e o banho noturno incomoda as unidades próximas.",
      },
      {
        pergunta: "Preciso tomar ducha antes de entrar na piscina?",
        resposta:
          "Sim, a ducha é obrigatória para todos, inclusive crianças. Ela remove protetor solar, suor e resíduos que sobrecarregam o filtro e alteram o tratamento da água. Quem entrar sem ducha será orientado pelo zelador ou pela portaria.",
      },
      {
        pergunta: "Posso levar comidas e bebidas para a área da piscina?",
        resposta:
          "Bebidas e alimentos só são permitidos nas mesas da área gourmet adjacente. É proibido consumir qualquer coisa dentro da piscina e nas bordas. Recipientes de vidro são totalmente proibidos na área da piscina — uma garrafa quebrada obriga o esvaziamento e a limpeza completa da piscina, e o custo é repassado ao responsável.",
      },
      {
        pergunta: "Crianças podem usar a piscina sem os pais?",
        resposta:
          "Crianças menores de 12 anos só entram na área da piscina acompanhadas de um adulto responsável. A piscina do condomínio não tem salva-vidas: o uso é por conta e risco dos usuários. Bebês devem usar fralda própria para piscina — fralda comum contamina a água e obriga o fechamento para tratamento.",
      },
      {
        pergunta: "Quantos convidados posso levar para a piscina?",
        resposta:
          "Cada unidade pode levar até 2 convidados por dia para a área da piscina, sempre acompanhados pelo morador. O morador responde pelo comportamento dos convidados e por eventuais danos. Em feriados prolongados a administração pode limitar o número de convidados por capacidade.",
      },
      {
        pergunta: "Por que não posso andar de traje de banho nas áreas comuns?",
        resposta:
          "Traje de banho é permitido apenas na área da piscina. No lobby, elevadores e demais áreas comuns é preciso usar roupa e calçado — além da convivência, isso protege estofados e pisos e evita acidentes de escorregão em áreas molhadas.",
      },
    ],
  },
  {
    id: "mudancas",
    rotulo: "Mudanças",
    perguntas: [
      {
        pergunta: "Em que dias e horários posso fazer mudança?",
        resposta:
          "Mudanças são permitidas de segunda a sexta-feira, das 8h às 18h, e aos sábados das 8h às 12h. É proibido fazer mudança aos domingos e feriados, ou à noite, por conta do transtorno aos vizinhos e do uso compartilhado dos elevadores.",
      },
      {
        pergunta: "Preciso agendar a mudança com antecedência?",
        resposta:
          "Sim. Comunique a administração ou a portaria com pelo menos 48 horas úteis de antecedência — pelo portal (menu Autorizações) ou pessoalmente. Informe data, horário previsto, apartamento e nome da empresa de mudança. A equipe de mudança deve se identificar na portaria ao chegar; sem agendamento, o acesso pode ser negado.",
      },
      {
        pergunta: "Qual elevador usar durante a mudança?",
        resposta:
          "O transporte de móveis e caixas deve ser feito pelo elevador de serviço. É obrigatório forrar as paredes e o piso do elevador e proteger corredores e halls com mantas ou papelão. Qualquer dano a elevadores, pisos ou paredes é ressarcido pelo morador responsável.",
      },
      {
        pergunta: "O que faço com as caixas depois da mudança?",
        resposta:
          "Amarre as caixas de papelão e deixe-as no abrigo de resíduos no dia da coleta de recicláveis — não deixe caixas nos corredores, halls ou junto aos elevadores. Isopor e plásticos bolha vão no lixo comum, bem fechados, para não espalharem pelo condomínio.",
      },
    ],
  },
  {
    id: "lixo",
    rotulo: "Lixo e reciclagem",
    perguntas: [
      {
        pergunta: "Quais os horários para descartar o lixo?",
        resposta:
          "O abrigo de resíduos (térreo) recebe lixo todos os dias, das 6h às 21h. Fora desse horário, guarde os sacos na sua unidade até o dia seguinte — sacos deixados à noite nos corredores ou junto ao abrigo atraem animais, insetos e mau cheiro. Use sempre sacos bem fechados.",
      },
      {
        pergunta: "É proibido deixar lixo no corredor ou no elevador?",
        resposta:
          "Sim, é proibido deixar lixo nos corredores, halls, junto aos elevadores ou na porta da unidade. Leve o lixo diretamente ao abrigo de resíduos — sacos abandonados fora de hora geram advertência e, em caso de reincidência, multa prevista em convenção.",
      },
      {
        pergunta: "Como separar o lixo reciclável?",
        resposta:
          "Enxágue embalagens de plástico, vidro e metal antes de descartar (sem resto de alimento ou líquido), deixe secar e coloque no saco de recicláveis. Papelão deve estar desmontado e amarrado. Não recicle papel higiênico, guardanapos usados ou fraldas — esses vão no lixo comum, sempre fechado.",
      },
      {
        pergunta: "Onde descarto óleo de cozinha, pilhas e eletrônicos?",
        resposta:
          "Óleo de cozinha nunca vai na pia ou no ralo: guarde em garrafa PET bem fechada e entregue no ponto de coleta da sala de recicláveis. Pilhas, baterias, lâmpadas e eletrônicos não vão no lixo comum — leve aos ecopontos da cidade ou aos pontos de entrega voluntária indicados pela administração.",
      },
      {
        pergunta: "Posso descartar entulho de reforma ou móveis velhos no abrigo de lixo?",
        resposta:
          "Não. Entulho de obra, móveis grandes, colchões e eletrodomésticos são proibidos no abrigo comum. Quem gera o resíduo é responsável pela destinação (Lei 12.305/2010): contrate caçamba ou o serviço da empresa que faz a reforma. Para móveis, use a coleta de grandes volumes da prefeitura ou os ecopontos.",
      },
    ],
  },
  {
    id: "obras",
    rotulo: "Obras e reformas",
    perguntas: [
      {
        pergunta: "Em que horários posso fazer reforma na unidade?",
        resposta:
          "Serviços com barulho (furadeira, serra, martelo) só podem acontecer de segunda a sexta, das 8h às 18h, e aos sábados até as 12h. Domingos e feriados são proibidos. Serviços silenciosos (pintura, montagem de móveis) podem seguir até as 20h.",
      },
      {
        pergunta: "Preciso avisar a administração antes de reformar?",
        resposta:
          "Sim. Reformas que geram barulho, movimentação de entulho ou alteração de instalações (hidráulica, elétrica, pisos) devem ser comunicadas à administração com pelo menos 3 dias úteis de antecedência. Retire entulho com caçamba própria — ele não pode ficar em áreas comuns nem ir para o abrigo de lixo.",
      },
    ],
  },
  {
    id: "convivencia",
    rotulo: "Convivência e ruído",
    perguntas: [
      {
        pergunta: "Qual o horário de silêncio?",
        resposta:
          "O horário de silêncio é das 22h às 8h. Nesse período reduza som, TVs, reuniões e obras. Em festas no salão, mantenha as janelas fechadas com som ligado. Reclamações de barulho podem ser registradas pelo portal (menu Ocorrências) e, em casos repetidos, sujeitam o responsável a multa conforme convenção e legislação municipal.",
      },
      {
        pergunta: "Posso fazer festa no salão de festas?",
        resposta:
          "Sim — reserve pelo portal (menu Reservas) e aguarde a confirmação da administração. As festas devem terminar até as 23h, com o salão devolvido limpo e as áreas comuns sem lixo. Mantenha o som dentro do salão, e o número de convidados segue a capacidade indicada na reserva.",
      },
    ],
  },
  {
    id: "pets",
    rotulo: "Pets",
    perguntas: [
      {
        pergunta: "Posso passear com meu pet nas áreas comuns?",
        resposta:
          "Sim, sempre com guia e coleira. Recolha as dejetos do seu pet imediatamente — há saquinhos disponíveis na área de lazer. Pets não podem subir em gramados de uso coletivo com crianças nem permanecer soltos no jardim; a multa por não recolher dejetos está prevista em convenção.",
      },
      {
        pergunta: "Pets podem entrar na piscina ou na academia?",
        resposta:
          "Não. Por normas de higiene, pets são proibidos na área da piscina, na academia, no salão de festas e no playground. Essas áreas são de uso exclusivo dos moradores — animais de apoio seguem orientação específica da administração.",
      },
    ],
  },
  {
    id: "portaria",
    rotulo: "Portaria e visitas",
    perguntas: [
      {
        pergunta: "Como autorizar um visitante ou prestador de serviço?",
        resposta:
          "Pelo portal: menu Autorizações → Nova autorização, informando nome e período de validade. A portaria recebe a autorização em tempo real e libera o acesso após identificação. Sem autorização prévia, a portaria liga para a sua unidade para confirmar.",
      },
      {
        pergunta: "Como funcionam as encomendas?",
        resposta:
          "A portaria recebe encomendas 24 horas. Quando algo chega, você recebe um aviso no portal (menu Encomendas) com a data do recebimento. Retire na portaria apresentando identificação. Encomendas perecíveis ou refrigeradas devem ser combinadas diretamente com a portaria.",
      },
      {
        pergunta: "Entregas (iFood, correios, mercado) têm horário?",
        resposta:
          "Entregadores e prestadores podem circular de 7h às 22h. Depois desse horário, a portaria pode pedir para você descer buscar o pedido, evitando circulação noturna nas áreas comuns. Mudanças e transportes de móveis seguem a regra própria de mudanças.",
      },
    ],
  },
  {
    id: "portal",
    rotulo: "Uso do portal",
    perguntas: [
      {
        pergunta: "Como reservar uma área comum?",
        resposta:
          "No menu Reservas, escolha o espaço (salão, churrasqueira, quadra…), a data e confirme. Algumas áreas precisam de aprovação da administração — você acompanha o status na mesma tela. Verifique as regras de cada espaço antes de reservar.",
      },
      {
        pergunta: "Como reporto um problema no condomínio?",
        resposta:
          "Menu Ocorrências → Reportar problema: descreva o caso, escolha a categoria e, se quiser, anexe fotos. Você acompanha o andamento pelo próprio portal. Para emergências (vazamento grande, incêndio, segurança), chame a portaria direto — o portal não substitui o contato urgente.",
      },
      {
        pergunta: "Esqueci minha senha. Como entro?",
        resposta:
          "Na tela de login, toque em “Esqueci minha senha” e informe seu e-mail. Você recebe um link para criar uma nova senha. O link expira em poucas horas — se não chegar, confira o spam ou fale com a administração.",
      },
      {
        pergunta: "Onde vejo os avisos do síndico?",
        resposta:
          "No menu Comunicados, com categoria e data de publicação, e em destaque na tela Início. Ative as notificações do navegador para receber avisos importantes em tempo real.",
      },
    ],
  },
];

// Monta o FAQ interpolando o nome do condomínio nos textos.
export function montarFaq(nomeCondominio: string): FaqMontado[] {
  const nome = nomeCondominio || "do condomínio";
  return CATEGORIAS.map((c) => ({
    id: c.id,
    rotulo: c.rotulo,
    perguntas: c.perguntas.map((p) => ({
      pergunta: p.pergunta,
      resposta: p.resposta.replaceAll("{condominio}", nome),
    })),
  }));
}

// Regras em destaque — avisos rápidos exibidos acima do acordeão.
export const DESTAQUES_FAQ: { id: string; titulo: string; texto: string }[] = [
  {
    id: "piscina-proibido-vidro",
    titulo: "Piscina: proibido vidro",
    texto: "Terça a domingo, 9h–19h · segunda fechada para limpeza",
  },
  {
    id: "mudanca-agendar",
    titulo: "Mudança: só com agendamento",
    texto: "Seg–sex 8h–18h · sáb 8h–12h · dom/feriados proibido",
  },
  {
    id: "lixo-corredor-proibido",
    titulo: "Proibido lixo no corredor",
    texto: "Descarte no abrigo do térreo, das 6h às 21h",
  },
  {
    id: "silencio",
    titulo: "Horário de silêncio",
    texto: "Das 22h às 8h — reduza som e obras",
  },
];
