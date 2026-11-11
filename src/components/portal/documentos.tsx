"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import {
  Badge,
  BotaoPrimario,
  BotaoSecundario,
  BotaoTexto,
  Carregando,
  dataHoraCurta,
  EstadoVazio,
  Lista,
  LinhaLista,
  ROTULO_CATEGORIA_DOCUMENTO,
  Secao,
} from "@/components/portal/ui";
import type { Perfil } from "@/components/portal/app-shell";
import { corpoJson, mensagemDeErro, mensagemRede } from "@/lib/api-cliente";
import { buscarJSON } from "@/lib/buscar-json";

type Documento = {
  id: string;
  titulo: string;
  categoria: string;
  nomeArquivo: string;
  tamanhoBytes: number;
  criadoEm: string;
  enviadoPor: { nome: string };
};

function tamanhoLegivel(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Documentos({ perfil }: { perfil: Perfil }) {
  const [lista, setLista] = useState<Documento[] | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState("OUTRO");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState("");
  const inputArquivo = useRef<HTMLInputElement>(null);
  const podeGerenciar = perfil === "SINDICO" || perfil === "ADMINISTRATIVO";

  const carregar = useCallback(() => {
    buscarJSON("/api/documentos")
      .then((d) => d && setLista(d.lista))
  }, []);

  useEffect(carregar, [carregar]);

  async function enviar() {
    setErro("");
    if (!titulo.trim() || !arquivo) {
      setErro("Informe o título e selecione o arquivo.");
      return;
    }
    setEnviando(true);
    try {
      const form = new FormData();
      form.append("titulo", titulo.trim());
      form.append("categoria", categoria);
      form.append("arquivo", arquivo);
      const r = await fetch("/api/documentos", { method: "POST", body: form });
      const corpo = await corpoJson(r);
      if (!corpo) throw new Error(mensagemRede(r.status));
      if (!r.ok) throw new Error(corpo.erro || "Falha ao enviar.");
      setAberto(false);
      setTitulo("");
      setCategoria("OUTRO");
      setArquivo(null);
      if (inputArquivo.current) inputArquivo.current.value = "";
      carregar();
    } catch (e) {
      setErro(mensagemDeErro(e, "Falha ao enviar."));
    } finally {
      setEnviando(false);
    }
  }

  async function excluir(id: string) {
    await fetch("/api/documentos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    carregar();
  }

  return (
    <div className="space-y-6">
      <Secao
        titulo={`Documentos${lista ? ` · ${lista.length}` : ""}`}
        acao={
          podeGerenciar && <BotaoPrimario onClick={() => setAberto(true)}>Enviar documento</BotaoPrimario>
        }
      >
        {!lista ? (
          <Carregando />
        ) : lista.length === 0 ? (
          <EstadoVazio mensagem="Nenhum documento disponível." />
        ) : (
          <Lista>
            {lista.map((d) => (
              <LinhaLista
                key={d.id}
                principal={d.titulo}
                secundaria={`${
                  ROTULO_CATEGORIA_DOCUMENTO[d.categoria] ?? d.categoria
                } · enviado por ${d.enviadoPor.nome} · ${dataHoraCurta(d.criadoEm)}`}
                detalhe={tamanhoLegivel(d.tamanhoBytes)}
                direita={
                  <div className="flex items-center gap-3">
                    <Badge>{ROTULO_CATEGORIA_DOCUMENTO[d.categoria] ?? d.categoria}</Badge>
                    <a
                      href={`/api/documentos/arquivo/${d.nomeArquivo}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-[var(--cor-tema)] underline-offset-4 hover:underline"
                    >
                      Abrir
                    </a>
                    {podeGerenciar && (
                      <BotaoTexto tom="vermelho" onClick={() => excluir(d.id)}>
                        Excluir
                      </BotaoTexto>
                    )}
                  </div>
                }
              />
            ))}
          </Lista>
        )}
      </Secao>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            aria-label="Fechar"
            className="absolute inset-0 bg-black/40"
            onClick={() => setAberto(false)}
          />
          <div className="relative max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-lg border border-[var(--cor-neutra)] bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-stone-900">Enviar documento</h3>
            <p className="mt-0.5 text-sm text-stone-500">PDF ou imagem, até 8 MB.</p>
            <div className="mt-4 space-y-3">
              <input
                placeholder="Título do documento"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="h-10 w-full rounded-md border border-[var(--cor-neutra-2)] px-3 text-sm outline-none focus:border-[var(--cor-tema-suave)] focus:ring-2 focus:ring-[var(--cor-tema-suave)]/30"
              />
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="h-10 w-full rounded-md border border-[var(--cor-neutra-2)] bg-white px-3 text-sm outline-none focus:border-[var(--cor-tema-suave)]"
              >
                {Object.entries(ROTULO_CATEGORIA_DOCUMENTO).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <input
                ref={inputArquivo}
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-stone-600 file:mr-3 file:rounded-md file:border-0 file:bg-[var(--cor-neutra)] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[var(--cor-tema)] hover:file:bg-[var(--cor-neutra-2)]"
              />
              {erro && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <BotaoSecundario onClick={() => setAberto(false)}>Cancelar</BotaoSecundario>
              <BotaoPrimario onClick={enviar} disabled={enviando}>
                {enviando && <LoaderCircle className="h-4 w-4 animate-spin" />} Enviar
              </BotaoPrimario>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
