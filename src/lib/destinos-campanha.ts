// Módulos do portal para onde o banner de uma campanha pode levar ao clicar.
// Compartilhado pela API (validação) e pela interface (formulário de gestão
// e dica no banner). Os ids espelham os módulos do app-shell.
export const DESTINOS_CAMPANHA: { id: string; rotulo: string }[] = [
  { id: "comunicados", rotulo: "Comunicados" },
  { id: "campanhas", rotulo: "Campanhas" },
  { id: "reservas", rotulo: "Reservas" },
  { id: "encomendas", rotulo: "Encomendas" },
  { id: "autorizacoes", rotulo: "Autorizações" },
  { id: "ocorrencias", rotulo: "Ocorrências" },
  { id: "manutencao", rotulo: "Manutenção" },
  { id: "documentos", rotulo: "Documentos" },
  { id: "assembleias", rotulo: "Assembleias" },
  { id: "moradores", rotulo: "Moradores" },
  { id: "duvidas", rotulo: "Perguntas frequentes" },
];

export const DESTINOS_VALIDOS = new Set(DESTINOS_CAMPANHA.map((d) => d.id));

/** Rótulo amigável do módulo de destino (vazio quando não há destino). */
export function rotuloDestino(id: string | null | undefined): string {
  if (!id) return "";
  return DESTINOS_CAMPANHA.find((d) => d.id === id)?.rotulo ?? id;
}
