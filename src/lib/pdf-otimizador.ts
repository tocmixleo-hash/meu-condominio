/**
 * OTIMIZAÇÃO ESTRUTURAL DE PDF — primeira etapa da compressão de anexos.
 *
 * Reescreve o arquivo com object streams (referências compactadas), descarta
 * metadados (autor, software, datas de edição) e deixa de guardar objetos não
 * referenciados. NÃO re-encoda imagens: qualidade idêntica, redução típica de
 * 10-30% em PDFs salvos por escâneres e impressoras antigas.
 *
 * Regras de segurança:
 *  - Só toca em arquivos que começam com a marca "%PDF".
 *  - PDFs criptografados falham no load e passam intocados (catch).
 *  - Se o resultado não for menor que o original, o original é mantido.
 */
import { PDFDocument } from "pdf-lib";

export type ResultadoOtimizacao = {
  bytes: Buffer;
  /** true quando a versão otimizada foi usada no lugar do original */
  otimizado: boolean;
  original: number;
  final: number;
};

const LIMIAR_MINIMO = 1024; // abaixo de 1 KB não vale o esforço

export async function otimizarPdf(entrada: Buffer): Promise<ResultadoOtimizacao> {
  const original = entrada.length;
  const passthrough: ResultadoOtimizacao = {
    bytes: entrada,
    otimizado: false,
    original,
    final: original,
  };

  // Só PDF: a marca "%PDF" precisa estar nos primeiros bytes (alguns
  // escâneres prefixam lixo binário, então olhamos os primeiros 1 KB).
  const cabecalho = entrada.subarray(0, Math.min(entrada.length, 1024)).toString("latin1");
  if (!cabecalho.includes("%PDF") || original < LIMIAR_MINIMO) return passthrough;

  try {
    // Sem ignoreEncryption de propósito: PDF protegido por senha re-salvo
    // com streams ainda cifrados sairia corrompido. Melhor não tocar.
    const doc = await PDFDocument.load(entrada, {
      updateMetadata: false,
      throwOnInvalidObject: false,
    });

    // Metadados não são conteúdo do documento e podem vazar autor/software.
    doc.setTitle("");
    doc.setAuthor("");
    doc.setSubject("");
    doc.setKeywords([]);
    doc.setProducer("");
    doc.setCreator("");

    const saida = Buffer.from(await doc.save({ useObjectStreams: true }));
    if (saida.length >= original) return passthrough;
    return { bytes: saida, otimizado: true, original, final: saida.length };
  } catch {
    // PDF estruturalmente exótico ou criptografado: entrega como veio.
    return passthrough;
  }
}
