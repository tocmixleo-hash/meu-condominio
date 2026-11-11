"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, Plus } from "lucide-react";
import { Carregando, Secao } from "@/components/portal/ui";
import { mensagemDeErro } from "@/lib/api-cliente";
import type { CondominioUI } from "@/components/portal/login-screen";
import { buscarJSON } from "@/lib/buscar-json";

/**
 * Console de condomínios do Administrador da Plataforma: lista todos os
 * ambientes, permite cadastrar um condomínio novo (sem nenhum dado fictício)
 * e alternar a operação para qualquer um deles.
 */
export default function Condominios({
  ativoId,
  aoOperar,
}: {
  ativoId: string;
  aoOperar: (id: string) => void;
}) {
  const [lista, setLista] = useState<CondominioUI[] | null>(null);
  const [nome, setNome] = useState("");
  const [corTema, setCorTema] = useState("#4D403A");
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    carregar();
  }, []);

  function carregar() {
    buscarJSON("/api/condominios")
      .then((d) => d?.lista && setLista(d.lista))
  }

  async function criar() {
    setErro("");
    setAviso("");
    if (nome.trim().length < 3) {
      setErro("Informe o nome do condomínio (mínimo de 3 caracteres).");
      return;
    }
    setCriando(true);
    try {
      const r = await fetch("/api/condominios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nome.trim(), corTema }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.erro || "Não foi possível cadastrar o condomínio.");
      setAviso(`${d.condominio.nome} cadastrado. Configure a identidade visual dele pelo menu.`);
      setNome("");
      carregar();
    } catch (e) {
      setErro(mensagemDeErro(e, "Falha ao cadastrar."));
    } finally {
      setCriando(false);
    }
  }

  if (!lista) return <Carregando />;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Condomínios</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-stone-500">
          Ambientes independentes da plataforma — cada condomínio tem usuários, dados e
          identidade visual próprios. Selecione um condomínio para operar nele.
        </p>
      </header>

      {erro && <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{erro}</p>}
      {aviso && <p role="status" className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">{aviso}</p>}

      <Secao titulo="Ambientes cadastrados">
        <div className="mt-1 grid gap-3 sm:grid-cols-2">
          {lista.map((c) => {
            const ativo = c.id === ativoId;
            return (
              <div
                key={c.id}
                className={`flex items-center gap-3 rounded-xl border bg-white p-4 ${
                  ativo ? "border-[var(--cor-tema)] ring-2 ring-[var(--cor-tema)]/20" : "border-[var(--cor-neutra)]"
                }`}
              >
                <img
                  src={c.logo}
                  alt={`Logo do ${c.nome}`}
                  className="h-12 w-12 shrink-0 rounded-lg border border-stone-100 bg-white object-contain p-1"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-stone-900">{c.nome}</p>
                  <p className="flex items-center gap-1.5 text-xs text-stone-500">
                    <span
                      aria-hidden
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: c.corTema }}
                    />
                    {ativo ? "Ambiente atual" : `/${c.slug}`}
                  </p>
                </div>
                {!ativo && (
                  <button
                    onClick={() => aoOperar(c.id)}
                    className="shrink-0 rounded-lg bg-[var(--cor-tema)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--cor-tema-botao-hover)]"
                  >
                    Operar aqui
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </Secao>

      <Secao titulo="Cadastrar novo condomínio">
        <div className="mt-1 rounded-xl border border-[var(--cor-neutra)] bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <label>
              <span className="mb-1.5 block text-sm font-medium text-stone-700">Nome do condomínio</span>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Residencial Parque Aurora"
                className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-400 focus:ring-4 focus:ring-stone-400/10"
              />
            </label>
            <label className="flex items-center gap-2">
              <span className="text-sm font-medium text-stone-700">Cor inicial</span>
              <input
                type="color"
                value={corTema}
                onChange={(e) => setCorTema(e.target.value)}
                className="h-11 w-14 cursor-pointer rounded-lg border border-stone-200 bg-white p-1"
                aria-label="Cor inicial"
              />
            </label>
          </div>
          <button
            onClick={criar}
            disabled={criando}
            className="mt-4 flex h-11 items-center gap-2 rounded-xl bg-[var(--cor-tema)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--cor-tema-botao-hover)] disabled:opacity-60"
          >
            {criando ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Cadastrar condomínio
          </button>
          <p className="mt-3 text-xs leading-relaxed text-stone-500">
            O condomínio nasce vazio e com identidade padrão — nada é copiado de outros ambientes.
            Depois de cadastrar, cadastre a equipe (Síndico, Administrativo, Portaria) e os moradores
            no ambiente dele.
          </p>
        </div>
      </Secao>
    </div>
  );
}
