/**
 * Gerador do DOCX v1.1 — Ata de Decisões e Plano de Execução
 * Reutiliza a arquitetura validada do generate.js (capa R1, 3 seções, TOC).
 * Paleta: marrom institucional da plataforma (Parque Califórnia #4D403A).
 */
const {
  Document, Packer, Paragraph, TextRun, Header, Footer,
  AlignmentType, SectionType, NumberFormat, TableOfContents, SimpleField,
} = require("docx");
const fs = require("fs");
const fsx = require("fs");
const path = require("path");

const { CAPA, TABELAS, CORPO } = require("./conteudo-decisoes.js");

// Importa a infraestrutura do gerador principal e troca apenas a paleta
const base = require("./generate-infra.js");

// ── Paleta institucional (marrom quente da plataforma) ───────────
const PAL = {
  bg: "33291F",
  accent: "C89B6D",
  cover: { titleColor: "FFFFFF", subtitleColor: "D8CFC7", metaColor: "C4B7A9", footerColor: "9C8F82" },
  table: { headerBg: "4D403A", headerText: "FFFFFF", accentLine: "4D403A", innerLine: "D8CFC4", surface: "F5F1EA" },
  headingColor: "3A2F28",
  secondary: "6E6560",
};

const doc = base.buildDocument({
  CAPA,
  TABELAS,
  CORPO,
  PAL,
  headerText: "Ata de Decisões v1.1 — Plataforma Multi-Condomínio",
  output: "/home/z/my-project/download/Ata_Decisoes_Plano_Execucao_v1_1.docx",
});
Packer.toBuffer(doc).then((buf) => {
  fsx.writeFileSync(base.OUT, buf);
  console.log("OK:", base.OUT, buf.length, "bytes");
});
