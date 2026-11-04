/**
 * Seed multi-tenant: Parque California + Parque Florida (mesmo bloco).
 * Senhas com bcrypt. Datas calculadas a partir de hoje para os dashboards
 * sempre exibirem dados "próximos".
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const hash = (senha: string) => bcrypt.hashSync(senha, 10);

const iso = (dias: number) =>
  new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10);

async function semearCondominio(opts: {
  nome: string;
  slug: string;
  dominio: string;
  corTema: string;
  logo: string;
  foto: string;
  festaJunina: string;
}) {
  const condominio = await db.condominio.create({
    data: {
      nome: opts.nome,
      slug: opts.slug,
      corTema: opts.corTema,
      logo: opts.logo,
      foto: opts.foto,
    },
  });
  const cid = condominio.id;

  const uA101 = await db.unidade.create({ data: { condominioId: cid, bloco: "A", numero: "101" } });
  const uA102 = await db.unidade.create({ data: { condominioId: cid, bloco: "A", numero: "102" } });
  const uB201 = await db.unidade.create({ data: { condominioId: cid, bloco: "B", numero: "201" } });
  const uB202 = await db.unidade.create({ data: { condominioId: cid, bloco: "B", numero: "202" } });

  const carlos = await db.usuario.create({
    data: {
      condominioId: cid,
      nome: "Carlos Mendes",
      email: `sindico@parque${opts.slug}.com.br`,
      senha: hash("admin123"),
      perfil: "SINDICO",
      telefone: "(11) 98888-1010",
    },
  });
  const fernanda = await db.usuario.create({
    data: {
      condominioId: cid,
      nome: "Fernanda Costa",
      email: `administrativo@parque${opts.slug}.com.br`,
      senha: hash("admin123"),
      perfil: "ADMINISTRATIVO",
      telefone: "(11) 98888-2020",
    },
  });
  const jorge = await db.usuario.create({
    data: {
      condominioId: cid,
      nome: "Jorge Ferreira",
      email: `portaria@parque${opts.slug}.com.br`,
      senha: hash("portaria123"),
      perfil: "PORTARIA",
      telefone: "(11) 98888-3030",
    },
  });
  const maria = await db.usuario.create({
    data: {
      condominioId: cid,
      nome: "Maria Silva",
      email: "maria@email.com",
      senha: hash("123456"),
      perfil: "MORADOR",
      telefone: "(11) 97777-1111",
      unidadeId: uA101.id,
    },
  });
  const pedro = await db.usuario.create({
    data: {
      condominioId: cid,
      nome: "Pedro Almeida",
      email: "pedro@email.com",
      senha: hash("123456"),
      perfil: "MORADOR",
      unidadeId: uA102.id,
    },
  });
  const juliana = await db.usuario.create({
    data: {
      condominioId: cid,
      nome: "Juliana Rocha",
      email: "juliana@email.com",
      senha: hash("123456"),
      perfil: "MORADOR",
      telefone: "(11) 97777-2222",
      unidadeId: uB201.id,
    },
  });
  const rafael = await db.usuario.create({
    data: {
      condominioId: cid,
      nome: "Rafael Souza",
      email: "rafael@email.com",
      senha: hash("123456"),
      perfil: "MORADOR",
      unidadeId: uB202.id,
    },
  });

  await db.comunicado.createMany({
    data: [
      {
        condominioId: cid,
        titulo: "Manutenção preventiva dos elevadores",
        conteudo:
          "Na próxima terça-feira, das 08h às 12h, o elevador social do Bloco A ficará indisponível para ajustes no sistema de freio. Agradeçemos a compreensão.",
        categoria: "MANUTENCAO",
        prioridade: "ALTA",
        autorId: fernanda.id,
      },
      {
        condominioId: cid,
        titulo: opts.festaJunina,
        conteudo:
          "Teremos barracas de comidas típicas, quadrilha e brincadeiras para as crianças no estacionamento coberto, a partir das 17h. Traga um prato para dividir!",
        categoria: "EVENTO",
        autorId: carlos.id,
      },
      {
        condominioId: cid,
        titulo: "Reforma da área da piscina começa dia 10",
        conteudo:
          "A piscina e o deck ficarão interditados por cerca de duas semanas para troca do revestimento e filtração nova.",
        categoria: "OBRA",
        autorId: carlos.id,
      },
    ],
  });

  await db.reserva.createMany({
    data: [
      { condominioId: cid, espaco: "SALAO_FESTAS", data: iso(10), horario: "18:00 – 22:00", status: "CONFIRMADA", solicitanteId: maria.id },
      { condominioId: cid, espaco: "PISCINA", data: iso(12), horario: "09:00 – 12:00", status: "CONFIRMADA", solicitanteId: maria.id },
      { condominioId: cid, espaco: "QUADRA", data: iso(4), horario: "19:00 – 21:00", status: "PENDENTE", solicitanteId: juliana.id },
      { condominioId: cid, espaco: "CHURRASQUEIRA", data: iso(6), horario: "12:00 – 15:00", status: "PENDENTE", observacoes: "Aniversário do meu filho", solicitanteId: pedro.id },
    ],
  });

  await db.encomenda.createMany({
    data: [
      { condominioId: cid, descricao: "Caixa Shopee", remetente: "Shopee", categoria: "TRANSPORTADORA", codigo: "961408", destinatarioId: juliana.id },
      { condominioId: cid, descricao: "Carta registrada", remetente: "Correios", categoria: "CORREIO", codigo: "204117", destinatarioId: pedro.id },
      { condominioId: cid, descricao: "Medicamento refrigerado", remetente: "Farmácia São Paulo", categoria: "FARMACIA", codigo: "773902", destinatarioId: maria.id },
      { condominioId: cid, descricao: "Compra de mercado", remetente: "Supermercado Bom Preço", categoria: "MERCADO", codigo: "518273", destinatarioId: rafael.id },
    ],
  });

  await db.autorizacao.createMany({
    data: [
      { condominioId: cid, visitanteNome: "Ana Martins", tipo: "VISITANTE", documento: "RG 34.567.890-1", veiculo: "Fiat Mobi · BRA2E19", dataInicio: iso(1), dataFim: iso(4), moradorId: maria.id },
      { condominioId: cid, visitanteNome: "Marcos Pintor", tipo: "PRESTADOR", documento: "CPF 123.456.789-00", dataInicio: iso(0), dataFim: iso(2), moradorId: juliana.id },
      { condominioId: cid, visitanteNome: "Rita Cardoso", tipo: "VISITANTE", dataInicio: iso(-3), dataFim: iso(-2), status: "UTILIZADA", moradorId: pedro.id },
    ],
  });

  await db.assembleia.create({
    data: {
      condominioId: cid,
      titulo: "Assembleia Ordinária — aprovação de contas e obras",
      descricao: "Prestação de contas do exercício, proposta de pintura das fachadas e rateio da área de lazer.",
      tipo: "ORDINARIA",
      data: iso(12),
      horario: "19:30",
      local: "SALAO_FESTAS",
      pauta:
        "1. Apresentação dos orçamentos\n2. Discussão com os moradores\n3. Votação da proposta",
    },
  });

  await db.notificacao.createMany({
    data: [
      { condominioId: cid, usuarioId: maria.id, tipo: "ENCOMENDA", titulo: "Encomenda recebida", mensagem: "Medicamento refrigerado (Farmácia São Paulo) está na portaria. Código de retirada 773902." },
      { condominioId: cid, usuarioId: maria.id, tipo: "RESERVA", titulo: "Reserva confirmada", mensagem: "Sua reserva do Salão de festas foi confirmada pela administração." },
      { condominioId: cid, usuarioId: juliana.id, tipo: "ENCOMENDA", titulo: "Encomenda recebida", mensagem: "Caixa Shopee está na portaria. Código de retirada 961408." },
      { condominioId: cid, usuarioId: carlos.id, tipo: "RESERVA", titulo: "Nova reserva para aprovar", mensagem: "Juliana Rocha solicitou a Quadra." },
      { condominioId: cid, usuarioId: carlos.id, tipo: "RESERVA", titulo: "Nova reserva para aprovar", mensagem: "Pedro Almeida solicitou a Churrasqueira." },
    ],
  });

  await db.auditoria.createMany({
    data: [
      { condominioId: cid, usuarioId: fernanda.id, acao: "COMUNICADO_CRIADO", detalhe: "Manutenção preventiva dos elevadores" },
      { condominioId: cid, usuarioId: jorge.id, acao: "ENCOMENDA_REGISTRADA", detalhe: "Caixa Shopee · Un. B-201" },
      { condominioId: cid, usuarioId: carlos.id, acao: "RESERVA_CONFIRMADA", detalhe: "Salão de festas · Maria Silva" },
      { condominioId: cid, usuarioId: carlos.id, acao: "MORADOR_CADASTRADO", detalhe: "Rafael Souza · Un. B-202" },
    ],
  });

  console.log(`✓ ${opts.nome} — 7 usuários, 4 unidades e dados de demonstração.`);
}

async function main() {
  // Limpeza (ordem segura para o SQLite sem cascade completo)
  await db.notificacao.deleteMany();
  await db.auditoria.deleteMany();
  await db.comunicado.deleteMany();
  await db.reserva.deleteMany();
  await db.encomenda.deleteMany();
  await db.autorizacao.deleteMany();
  await db.documento.deleteMany();
  await db.assembleia.deleteMany();
  await db.usuario.deleteMany();
  await db.unidade.deleteMany();
  await db.condominio.deleteMany();

  await semearCondominio({
    nome: "Parque California",
    slug: "california",
    dominio: "parquecalifornia.com.br",
    corTema: "#4D403A",
    logo: "/fotos/logo-parque-california.png",
    foto: "/fotos/parque-california.jpg",
    festaJunina: "Festa Junina do Parque California",
  });

  await semearCondominio({
    nome: "Parque Florida",
    slug: "florida",
    dominio: "parqueflorida.com.br",
    corTema: "#404040",
    logo: "/fotos/logo-parque-florida.png",
    foto: "/fotos/parque-florida.jpg",
    festaJunina: "Festa Junina do Parque Florida",
  });

  console.log("Seed concluído: 2 condomínios, senhas com bcrypt.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
