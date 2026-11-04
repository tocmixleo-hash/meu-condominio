/**
 * Datas do condomínio: o dia correto é o do fuso de São Paulo (Brasil),
 * não o do servidor (UTC). Às 23h de São Paulo o UTC já está no dia
 * seguinte — sem esse ajuste, reservas, autorizações e manutenções
 * "pulam" um dia no fim da noite.
 *
 * No futuro, por condomínio: adicione um campo `fusoHorario` no
 * Condominio e passe-o para os helpers.
 */
export const FUSO_PADRAO = "America/Sao_Paulo";

/** Data de hoje (yyyy-MM-dd) no fuso do condomínio. */
export function hojeISO(fuso = FUSO_PADRAO): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Data deslocada em N dias a partir de hoje (yyyy-MM-dd). */
export function diaRelativo(dias: number, fuso = FUSO_PADRAO): string {
  const base = new Date(Date.now() + dias * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(base);
}
