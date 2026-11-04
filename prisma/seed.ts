/**
 * Seed multi-tenant: Parque California + Parque Florida (mesmo bloco).
 * Senhas com bcrypt. Datas calculadas a partir de hoje para os dashboards
 * sempre exibirem dados "próximos".
 *
 * Cada condomínio tem o seu elenco fictício de pessoas — assim ao selecionar
 * o Parque Florida os nomes exibidos em todo o portal são os moradores,
 * equipe e visitantes daquele condomínio.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const hash = (senha: string) => bcrypt.hashSync(senha, 10);

const iso = (dias: number) =>
  new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10);

type MoradorSeed = { nome: string; email: string; telefone?: string };
type VisitanteSeed = {
  nome: string;
  tipo: "VISITANTE" | "PRESTADOR";
  documento?: string;
  veiculo?: string;
};

type Elenco = {
  sindico: string;
  administrativo: string;
  portaria: string;
  moradores: [MoradorSeed, MoradorSeed, MoradorSeed, MoradorSeed];
  visitantes: [VisitanteSeed, VisitanteSeed, VisitanteSeed];
};

const ELENCO: Record<string, Elenco> = {
  california: {
    sindico: "Carlos Mendes",
    administrativo: "Fernanda Costa",
    portaria: "Jorge Ferreira",
    moradores: [
      { nome: "Maria Silva", email: "maria@email.com", telefone: "(11) 97777-1111" },
      { nome: "Pedro Almeida", email: "pedro@email.com" },
      { nome: "Juliana Rocha", email: "juliana@email.com", telefone: "(11) 97777-2222" },
      { nome: "Rafael Souza", email: "rafael@email.com" },
    ],
    visitantes: [
      { nome: "Ana Martins", tipo: "VISITANTE", documento: "RG 34.567.890-1", veiculo: "Fiat Mobi · BRA2E19" },
      { nome: "Marcos Pintor", tipo: "PRESTADOR", documento: "CPF 123.456.789-00" },
      { nome: "Rita Cardoso", tipo: "VISITANTE" },
    ],
  },
  florida: {
    sindico: "Ricardo Teixeira",
    administrativo: "Patrícia Nunes",
    portaria: "Sérgio Lima",
    moradores: [
      { nome: "Helena Barbosa", email: "helena@email.com", telefone: "(21) 96666-1111" },
      { nome: "Tiago Moreira", email: "tiago@email.com" },
      { nome: "Camila Freitas", email: "camila@email.com", telefone: "(21) 96666-2222" },
      { nome: "André Cardoso", email: "andre@email.com" },
    ],
    visitantes: [
      { nome: "Bruno Alves", tipo: "VISITANTE", documento: "RG 22.111.333-5", veiculo: "Jeep Renegade · FLR1A23" },
      { nome: "Diego Eletricista", tipo: "PRESTADOR", documento: "CPF 987.654.321-00" },
      { nome: "Lurdes Figueiredo", tipo: "VISITANTE" },
    ],
  },
};

async function semearCondominio(opts: {
  nome: string;
  slug: string;
  dominio: string;
  corTema: string;
  logo: string;
  foto: string;
  festaJunina: string;
  // Identidade visual aprovada do condomínio (presets migrados para o banco)
  corSecundaria: string;
  corDestaque: string;
  corSidebar: string;
  corFundo: string;
  corTexto: string;
}) {
  const elenco = ELENCO[opts.slug];
  if (!elenco) throw new Error(`Elenco não definido para ${opts.slug}`);

  const condominio = await db.condominio.create({
    data: {
      nome: opts.nome,
      slug: opts.slug,
      corTema: opts.corTema,
      logo: opts.logo,
      foto: opts.foto,
      corPrimaria: opts.corTema,
      corSecundaria: opts.corSecundaria,
      corDestaque: opts.corDestaque,
      corSidebar: opts.corSidebar,
      corFundo: opts.corFundo,
      corTexto: opts.corTexto,
    },
  });
  const cid = condominio.id;

  const uA101 = await db.unidade.create({ data: { condominioId: cid, bloco: "A", numero: "101" } });
  const uA102 = await db.unidade.create({ data: { condominioId: cid, bloco: "A", numero: "102" } });
  const uB201 = await db.unidade.create({ data: { condominioId: cid, bloco: "B", numero: "201" } });
  const uB202 = await db.unidade.create({ data: { condominioId: cid, bloco: "B", numero: "202" } });

  const primeiroNome = (nome: string) => nome.split(" ")[0];

  const sindico = await db.usuario.create({
    data: {
      condominioId: cid,
      nome: elenco.sindico,
      email: `sindico@parque${opts.slug}.com.br`,
      senha: hash("admin123"),
      perfil: "SINDICO",
      telefone: "(11) 98888-1010",
    },
  });
  const administrativo = await db.usuario.create({
    data: {
      condominioId: cid,
      nome: elenco.administrativo,
      email: `administrativo@parque${opts.slug}.com.br`,
      senha: hash("admin123"),
      perfil: "ADMINISTRATIVO",
      telefone: "(11) 98888-2020",
    },
  });
  const portaria = await db.usuario.create({
    data: {
      condominioId: cid,
      nome: elenco.portaria,
      email: `portaria@parque${opts.slug}.com.br`,
      senha: hash("portaria123"),
      perfil: "PORTARIA",
      telefone: "(11) 98888-3030",
    },
  });

  // Vínculos usuário ↔ condomínio (perfil por vínculo)
  await db.usuarioCondominio.createMany({
    data: [
      { usuarioId: sindico.id, condominioId: cid, perfil: "SINDICO" },
      { usuarioId: administrativo.id, condominioId: cid, perfil: "ADMINISTRATIVO" },
      { usuarioId: portaria.id, condominioId: cid, perfil: "PORTARIA" },
    ],
  });

  const moradores = await Promise.all(
    elenco.moradores.map((m, i) =>
      db.usuario.create({
        data: {
          condominioId: cid,
          nome: m.nome,
          email: m.email,
          senha: hash("123456"),
          perfil: "MORADOR",
          ...(m.telefone ? { telefone: m.telefone } : {}),
          unidadeId: [uA101.id, uA102.id, uB201.id, uB202.id][i],
        },
      })),
  );

  await db.usuarioCondominio.createMany({
    data: moradores.map((m) => ({ usuarioId: m.id, condominioId: cid, perfil: "MORADOR" })),
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
        autorId: administrativo.id,
      },
      {
        condominioId: cid,
        titulo: opts.festaJunina,
        conteudo:
          "Teremos barracas de comidas típicas, quadrilha e brincadeiras para as crianças no estacionamento coberto, a partir das 17h. Traga um prato para dividir!",
        categoria: "EVENTO",
        autorId: sindico.id,
      },
      {
        condominioId: cid,
        titulo: "Reforma da área da piscina começa dia 10",
        conteudo:
          "A piscina e o deck ficarão interditados por cerca de duas semanas para troca do revestimento e filtração nova.",
        categoria: "OBRA",
        autorId: sindico.id,
      },
    ],
  });

  await db.reserva.createMany({
    data: [
      { condominioId: cid, espaco: "SALAO_FESTAS", data: iso(10), horario: "18:00 – 22:00", status: "CONFIRMADA", solicitanteId: m1.id },
      { condominioId: cid, espaco: "PISCINA", data: iso(12), horario: "09:00 – 12:00", status: "CONFIRMADA", solicitanteId: m1.id },
      { condominioId: cid, espaco: "QUADRA", data: iso(4), horario: "19:00 – 21:00", status: "PENDENTE", solicitanteId: m3.id },
      { condominioId: cid, espaco: "CHURRASQUEIRA", data: iso(6), horario: "12:00 – 15:00", status: "PENDENTE", observacoes: "Aniversário do meu filho", solicitanteId: m2.id },
    ],
  });

  await db.encomenda.createMany({
    data: [
      { condominioId: cid, descricao: "Caixa Shopee", remetente: "Shopee", categoria: "TRANSPORTADORA", codigo: "961408", destinatarioId: m3.id },
      { condominioId: cid, descricao: "Carta registrada", remetente: "Correios", categoria: "CORREIO", codigo: "204117", destinatarioId: m2.id },
      { condominioId: cid, descricao: "Medicamento refrigerado", remetente: "Farmácia São Paulo", categoria: "FARMACIA", codigo: "773902", destinatarioId: m1.id },
      { condominioId: cid, descricao: "Compra de mercado", remetente: "Supermercado Bom Preço", categoria: "MERCADO", codigo: "518273", destinatarioId: m4.id },
    ],
  });

  const [v1, v2, v3] = elenco.visitantes;
  await db.autorizacao.createMany({
    data: [
      { condominioId: cid, visitanteNome: v1.nome, tipo: v1.tipo, documento: v1.documento, veiculo: v1.veiculo, dataInicio: iso(1), dataFim: iso(4), moradorId: m1.id },
      { condominioId: cid, visitanteNome: v2.nome, tipo: v2.tipo, documento: v2.documento, dataInicio: iso(0), dataFim: iso(2), moradorId: m3.id },
      { condominioId: cid, visitanteNome: v3.nome, tipo: v3.tipo, dataInicio: iso(-3), dataFim: iso(-2), status: "UTILIZADA", moradorId: m2.id },
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
      { condominioId: cid, usuarioId: m1.id, tipo: "ENCOMENDA", titulo: "Encomenda recebida", mensagem: "Medicamento refrigerado (Farmácia São Paulo) está na portaria. Código de retirada 773902." },
      { condominioId: cid, usuarioId: m1.id, tipo: "RESERVA", titulo: "Reserva confirmada", mensagem: "Sua reserva do Salão de festas foi confirmada pela administração." },
      { condominioId: cid, usuarioId: m3.id, tipo: "ENCOMENDA", titulo: "Encomenda recebida", mensagem: "Caixa Shopee está na portaria. Código de retirada 961408." },
      { condominioId: cid, usuarioId: sindico.id, tipo: "RESERVA", titulo: "Nova reserva para aprovar", mensagem: `${primeiroNome(m3.nome)} solicitou a Quadra.` },
      { condominioId: cid, usuarioId: sindico.id, tipo: "RESERVA", titulo: "Nova reserva para aprovar", mensagem: `${primeiroNome(m2.nome)} solicitou a Churrasqueira.` },
    ],
  });

  await db.auditoria.createMany({
    data: [
      { condominioId: cid, usuarioId: administrativo.id, acao: "COMUNICADO_CRIADO", detalhe: "Manutenção preventiva dos elevadores" },
      { condominioId: cid, usuarioId: portaria.id, acao: "ENCOMENDA_REGISTRADA", detalhe: "Caixa Shopee · Un. B-201" },
      { condominioId: cid, usuarioId: sindico.id, acao: "RESERVA_CONFIRMADA", detalhe: `Salão de festas · ${m1.nome}` },
      { condominioId: cid, usuarioId: sindico.id, acao: "MORADOR_CADASTRADO", detalhe: `${m4.nome} · Un. B-202` },
    ],
  });

  console.log(`✓ ${opts.nome} — ${elenco.sindico} (síndico), ${elenco.administrativo} (administrativo), ${elenco.portaria} (portaria) e 4 moradores.`);
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
  await db.usuarioCondominio.deleteMany();
  await db.condominioFoto.deleteMany();
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
    corSecundaria: "#61514A",
    corDestaque: "#a3968d",
    corSidebar: "#4D403A",
    corFundo: "#f7f6f3",
    corTexto: "#292524",
  });

  await semearCondominio({
    nome: "Parque Florida",
    slug: "florida",
    dominio: "parqueflorida.com.br",
    corTema: "#404040",
    logo: "/fotos/logo-parque-florida.png",
    foto: "/fotos/parque-florida.jpg",
    festaJunina: "Festa Junina do Parque Florida",
    corSecundaria: "#525252",
    corDestaque: "#a3a3a3",
    corSidebar: "#404040",
    corFundo: "#f5f5f5",
    corTexto: "#262626",
  });

  // Administrador da plataforma (demonstração) — na produção real a conta
  // é criada pelo seed-producao com o e-mail do responsável, sem elenco fictício.
  const california = await db.condominio.findUnique({ where: { slug: "california" }, select: { id: true } });
  if (california) {
    await db.usuario.create({
      data: {
        condominioId: california.id,
        nome: "Administrador da Plataforma",
        email: "admin@meucondominio.com",
        senha: hash("admin123"),
        perfil: "PLATAFORMA",
      },
    });
    console.log("✓ Administrador da plataforma de demonstração (admin@meucondominio.com / admin123).");
  }

  console.log("Seed concluído: 2 condomínios com identidade e vínculos, senhas com bcrypt.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
