import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";

const db = new PrismaClient();

const hash = (senha: string) =>
  createHash("sha256").update(`parque-california::${senha}`).digest("hex");

async function main() {
  await db.comunicado.deleteMany();
  await db.reserva.deleteMany();
  await db.encomenda.deleteMany();
  await db.autorizacao.deleteMany();
  await db.documento.deleteMany();
  await db.assembleia.deleteMany();
  await db.usuario.deleteMany();
  await db.unidade.deleteMany();

  const uA101 = await db.unidade.create({ data: { bloco: "A", numero: "101" } });
  const uA102 = await db.unidade.create({ data: { bloco: "A", numero: "102" } });
  const uB201 = await db.unidade.create({ data: { bloco: "B", numero: "201" } });
  const uB202 = await db.unidade.create({ data: { bloco: "B", numero: "202" } });

  const carlos = await db.usuario.create({
    data: {
      nome: "Carlos Mendes",
      email: "sindico@parquecalifornia.com.br",
      senha: hash("admin123"),
      perfil: "SINDICO",
      telefone: "(11) 98888-1010",
    },
  });
  await db.usuario.create({
    data: {
      nome: "Ana Beatriz Costa",
      email: "administrativo@parquecalifornia.com.br",
      senha: hash("admin123"),
      perfil: "ADMINISTRATIVO",
      telefone: "(11) 3355-2040",
    },
  });
  const joao = await db.usuario.create({
    data: {
      nome: "João Ferreira",
      email: "portaria@parquecalifornia.com.br",
      senha: hash("portaria123"),
      perfil: "PORTARIA",
      telefone: "(11) 3355-2000",
    },
  });
  const maria = await db.usuario.create({
    data: {
      nome: "Maria Silva",
      email: "maria@email.com",
      senha: hash("123456"),
      perfil: "MORADOR",
      telefone: "(11) 97777-2020",
      unidadeId: uA101.id,
    },
  });
  const pedro = await db.usuario.create({
    data: {
      nome: "Pedro Almeida",
      email: "pedro@email.com",
      senha: hash("123456"),
      perfil: "MORADOR",
      telefone: "(11) 96666-3030",
      unidadeId: uA102.id,
    },
  });
  const juliana = await db.usuario.create({
    data: {
      nome: "Juliana Rocha",
      email: "juliana@email.com",
      senha: hash("123456"),
      perfil: "MORADOR",
      telefone: "(11) 95555-4040",
      unidadeId: uB201.id,
    },
  });
  await db.usuario.create({
    data: {
      nome: "Rafael Nunes",
      email: "rafael@email.com",
      senha: hash("123456"),
      perfil: "MORADOR",
      telefone: "(11) 94444-5050",
      unidadeId: uB202.id,
    },
  });

  await db.comunicado.createMany({
    data: [
      {
        titulo: "Manutenção preventiva dos elevadores",
        conteudo:
          "Na próxima terça-feira, das 08h às 12h, o elevador social do Bloco A ficará indisponível para manutenção preventiva das cabines e das portas de andar. O elevador de serviço atenderá normalmente. Recomendamos antecipar deslocamentos que exijam acessibilidade neste período.",
        categoria: "MANUTENCAO",
        prioridade: "ALTA",
        autorId: carlos.id,
      },
      {
        titulo: "Festa Junina do Parque Califórnia",
        conteudo:
          "Dia 22 de junho, a partir das 16h, teremos nossa Festa Junina no jardim central, com barracas de comidas típicas organizadas pelas famílias, quadrilha dos moradores e apresentação infantil às 17h30. Traje caipira é bem-vindo! Confirme a presença com sua família até dia 15.",
        categoria: "EVENTO",
        prioridade: "NORMAL",
        autorId: carlos.id,
      },
      {
        titulo: "Reforma da área da piscina começa dia 10",
        conteudo:
          "A reforma do deck da piscina adulta inicia no dia 10 e segue por aproximadamente 20 dias úteis. Durante a obra, a piscina permanecerá fechada e as areas de solário interditadas com tapumes. O cronograma detalhado está disponível na aba Documentos.",
        categoria: "OBRA",
        prioridade: "ALTA",
        autorId: carlos.id,
      },
      {
        titulo: "Orientações de segurança na portaria",
        conteudo:
          "Reforçamos: entregadores e visitantes só têm acesso mediante autorização registrada pelo morador na ferramenta. Não autorize entrada de pessoas desconhecidas e sempre confirme pelo interfone. A portaria está à disposição 24 horas no ramal 2000.",
        categoria: "SEGURANCA",
        prioridade: "NORMAL",
        autorId: joao.id,
      },
    ],
  });

  await db.reserva.createMany({
    data: [
      {
        espaco: "SALAO_FESTAS",
        data: "2026-11-14",
        horario: "18:00 – 22:00",
        observacoes: "Aniversário da minha filha, 8 anos.",
        status: "CONFIRMADA",
        solicitanteId: maria.id,
      },
      {
        espaco: "CHURRASQUEIRA",
        data: "2026-11-08",
        horario: "12:00 – 16:00",
        status: "PENDENTE",
        solicitanteId: pedro.id,
      },
      {
        espaco: "QUADRA",
        data: "2026-11-06",
        horario: "19:00 – 21:00",
        status: "PENDENTE",
        solicitanteId: juliana.id,
      },
      {
        espaco: "PISCINA",
        data: "2026-11-16",
        horario: "09:00 – 12:00",
        status: "CONFIRMADA",
        solicitanteId: maria.id,
      },
    ],
  });

  await db.encomenda.createMany({
    data: [
      {
        descricao: "Caixa média dos Correios (SEDEX)",
        remetente: "Amazon Brasil",
        categoria: "TRANSPORTADORA",
        codigo: "482915",
        destinatarioId: maria.id,
      },
      {
        descricao: "Envelope branco grande",
        remetente: "Correios",
        categoria: "CORREIO",
        codigo: "713604",
        destinatarioId: pedro.id,
      },
      {
        descricao: "Sacola de farmácia",
        remetente: "Drogaria São Paulo",
        categoria: "FARMACIA",
        codigo: "905817",
        destinatarioId: juliana.id,
      },
    ],
  });

  await db.autorizacao.createMany({
    data: [
      {
        visitanteNome: "Fernanda Silva (irmã)",
        tipo: "VISITANTE",
        documento: "RG 34.567.890-1",
        veiculo: "Ford Ka, prata, FDK-2A18",
        dataInicio: "2026-11-05",
        dataFim: "2026-11-05",
        moradorId: maria.id,
      },
      {
        visitanteNome: "Marcos Oliveira (eletricista)",
        tipo: "PRESTADOR",
        documento: "CPF 123.456.789-00",
        dataInicio: "2026-11-04",
        dataFim: "2026-11-07",
        moradorId: pedro.id,
      },
    ],
  });

  await db.documento.createMany({
    data: [
      {
        titulo: "Ata da Assembleia Geral Ordinária 2026",
        categoria: "ATA",
        nomeArquivo: "ata-ago-2026.pdf",
        tamanhoBytes: 184320,
        enviadoPorId: carlos.id,
      },
      {
        titulo: "Convenção do Condomínio (atualizada)",
        categoria: "CONVENCAO",
        nomeArquivo: "convencao-parque-california.pdf",
        tamanhoBytes: 524288,
        enviadoPorId: carlos.id,
      },
      {
        titulo: "Regimento Interno das áreas comuns",
        categoria: "REGIMENTO",
        nomeArquivo: "regimento-interno.pdf",
        tamanhoBytes: 245760,
        enviadoPorId: carlos.id,
      },
      {
        titulo: "Cronograma da reforma da piscina",
        categoria: "OUTRO",
        nomeArquivo: "cronograma-reforma-piscina.pdf",
        tamanhoBytes: 98304,
        enviadoPorId: carlos.id,
      },
    ],
  });

  await db.assembleia.createMany({
    data: [
      {
        titulo: "Assembleia Geral Ordinária",
        descricao:
          "Prestação de contas do exercício, aprovação do orçamento anual e eleição do novo conselho consultivo.",
        tipo: "ORDINARIA",
        data: "2026-11-25",
        horario: "19:30",
        local: "SALAO_FESTAS",
        pauta:
          "1. Abertura e verificação de quórum\n2. Leitura e aprovação da ata anterior\n3. Prestação de contas do exercício\n4. Aprovação do orçamento 2027\n5. Eleição do conselho consultivo",
      },
      {
        titulo: "Assembleia Extraordinária — Votação do portão automatizado",
        descricao:
          "Deliberação sobre a instalação de portão automatizado na guarita de veículos, com orçamento apresentado pela administradora.",
        tipo: "EXTRAORDINARIA",
        data: "2026-12-09",
        horario: "20:00",
        local: "VIRTUAL",
        pauta:
          "1. Apresentação dos orçamentos\n2. Discussão com os moradores\n3. Votação da proposta",
      },
    ],
  });

  console.log("Seed concluído: usuários, unidades e dados de exemplo criados.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
