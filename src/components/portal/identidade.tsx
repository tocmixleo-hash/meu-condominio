"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, RotateCcw, Trash2, Upload } from "lucide-react";
import { cssVarsDoTema, resolverTema } from "@/lib/tema";
import { Carregando, Secao } from "@/components/portal/ui";
import { mensagemDeErro } from "@/lib/api-cliente";
import type { CondominioUI } from "@/components/portal/login-screen";
import { buscarJSON } from "@/lib/buscar-json";

type FotoGaleria = {
  id: string;
  tipo: string; // AREA_COMUM | INSTITUCIONAL
  url: string;
  legenda: string | null;
  ordem: number;
};

type IdentidadeCompleta = CondominioUI & {
  fotos?: FotoGaleria[];
  espacoFotos?: { espaco: string; url: string }[];
};

const CORES: { campo: string; rotulo: string; ajuda: string }[] = [
  { campo: "corPrimaria", rotulo: "Cor principal", ajuda: "Menu lateral, botões e sobreposições" },
  { campo: "corSecundaria", rotulo: "Cor secundária", ajuda: "Item ativo e sobrepinto do menu" },
  { campo: "corDestaque", rotulo: "Cor de destaque", ajuda: "Foco de formulários e realces" },
  { campo: "corSidebar", rotulo: "Barra lateral", ajuda: "Fundo do menu lateral (padrão: cor principal)" },
  { campo: "corFundo", rotulo: "Fundo geral", ajuda: "Cor de fundo das telas" },
  { campo: "corTexto", rotulo: "Texto principal", ajuda: "Cor dos títulos e textos" },
];

const CAMPOS_TEXTO = [
  { campo: "nomeExibicao", rotulo: "Nome de exibição", placeholder: "Nome completo do condomínio" },
  { campo: "nomeCurto", rotulo: "Nome curto", placeholder: "Ex.: California" },
  { campo: "telefoneContato", rotulo: "Telefone de contato", placeholder: "(00) 00000-0000" },
  { campo: "emailContato", rotulo: "E-mail de contato", placeholder: "contato@condominio.com.br" },
  { campo: "endereco", rotulo: "Endereço", placeholder: "Rua, número, bairro, cidade" },
  { campo: "cnpj", rotulo: "CNPJ (opcional)", placeholder: "00.000.000/0000-00" },
];

// Espaços comuns que recebem fotografia própria (Reservas)
const ESPACOS_EDITAVEIS = [
  { id: "SALAO_FESTAS", rotulo: "Salão de festas", padrao: "/fotos/espaco-salao-festas.jpg" },
  { id: "CHURRASQUEIRA", rotulo: "Churrasqueira", padrao: "/fotos/espaco-churrasqueira.jpg" },
  { id: "QUADRA", rotulo: "Quadra", padrao: "/fotos/espaco-quadra.jpg" },
  { id: "PISCINA", rotulo: "Piscina", padrao: "/fotos/espaco-piscina.jpg" },
];

export default function Identidade({
  condominio,
  podeEditar,
  aoAtualizar,
}: {
  condominio: CondominioUI;
  podeEditar: boolean;
  aoAtualizar: () => void;
}) {
  const [dados, setDados] = useState<IdentidadeCompleta | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const inputLogo = useRef<HTMLInputElement | null>(null);
  // Alvo do próximo upload: "logo_principal" ou "foto_espaco:PISCINA" etc.
  const tipoUpload = useRef<string>("");
  // Fotografias configuradas por espaço comum (Reservas)
  const [espacoFotos, setEspacoFotos] = useState<Record<string, string>>({});

  useEffect(() => {
    let vivo = true;
    setDados(null);
    buscarJSON(`/api/condominios/${condominio.id}`)
      .then((d) => {
        if (!vivo || !d?.condominio) return;
        const c = d.condominio as IdentidadeCompleta;
        setDados(c);
        setForm(formularioInicial(c));
        setEspacoFotos(Object.fromEntries((c.espacoFotos ?? []).map((f) => [f.espaco, f.url])));
      })
    return () => {
      vivo = false;
    };
  }, [condominio.id]);

  function formularioInicial(c: IdentidadeCompleta): Record<string, string> {
    const tema = resolverTema(c.slug, c.corTema, c);
    return {
      nomeExibicao: c.nomeExibicao ?? "",
      nomeCurto: c.nomeCurto ?? "",
      descricao: c.descricao ?? "",
      telefoneContato: c.telefoneContato ?? "",
      emailContato: c.emailContato ?? "",
      endereco: c.endereco ?? "",
      cnpj: c.cnpj ?? "",
      corPrimaria: c.corPrimaria ?? c.corTema,
      corSecundaria: c.corSecundaria ?? tema.hover,
      corDestaque: c.corDestaque ?? tema.suave,
      corSidebar: c.corSidebar ?? tema.tema,
      corFundo: c.corFundo ?? tema.fundo,
      corTexto: c.corTexto ?? tema.fg,
    };
  }

  async function salvar() {
    if (!dados) return;
    setSalvando(true);
    setMensagem(null);
    try {
      const corpo: Record<string, string | null> = {};
      for (const { campo } of CAMPOS_TEXTO) corpo[campo] = form[campo]?.trim() || null;
      for (const { campo } of CORES) corpo[campo] = form[campo] || null;
      const r = await fetch(`/api/condominios/${dados.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const d = await corpoSeguro(r);
      if (!r.ok) throw new Error(d?.erro || "Não foi possível salvar a identidade visual.");
      setMensagem({ tipo: "ok", texto: "Identidade visual atualizada — as telas deste condomínio já refletem as mudanças." });
      aoAtualizar();
    } catch (e) {
      setMensagem({ tipo: "erro", texto: mensagemDeErro(e, "Falha ao salvar.") });
    } finally {
      setSalvando(false);
    }
  }

  async function restaurarPadroes() {
    if (!dados) return;
    setSalvando(true);
    setMensagem(null);
    try {
      const corpo: Record<string, null> = {};
      for (const { campo } of CORES) corpo[campo] = null;
      for (const { campo } of CAMPOS_TEXTO) corpo[campo] = null;
      const r = await fetch(`/api/condominios/${dados.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const d = await corpoSeguro(r);
      if (!r.ok) throw new Error(d?.erro || "Não foi possível restaurar o padrão.");
      setForm(formularioInicial({ ...dados, ...(d.condominio ?? {}) }));
      setMensagem({ tipo: "ok", texto: "Padrão restaurado — o condomínio voltou à identidade original." });
      aoAtualizar();
    } catch (e) {
      setMensagem({ tipo: "erro", texto: mensagemDeErro(e, "Falha ao restaurar.") });
    } finally {
      setSalvando(false);
    }
  }

  async function enviarArquivo(tipo: string, arquivo: File) {
    if (!dados) return;
    setEnviando(tipo);
    setMensagem(null);
    try {
      const formDados = new FormData();
      // tipo pode carregar o espaço junto ("foto_espaco:PISCINA")
      const [tipoPuro, espacoAlvo] = tipo.split(":");
      formDados.set("tipo", tipoPuro);
      if (espacoAlvo) formDados.set("espaco", espacoAlvo);
      formDados.set("arquivo", arquivo);
      const r = await fetch(`/api/condominios/${dados.id}/arquivo`, {
        method: "POST",
        body: formDados,
      });
      const d = await corpoSeguro(r);
      if (!r.ok) throw new Error(d?.erro || "Não foi possível enviar o arquivo.");
      // atualiza estado local
      if (d.campo === "espacoFoto" && d.espaco) {
        setEspacoFotos((atual) => ({ ...atual, [d.espaco!]: d.url! }));
      } else if (d.foto) {
        setDados((atual) =>
          atual ? { ...atual, fotos: [...(atual.fotos ?? []), d.foto] } : atual,
        );
      } else {
        setDados((atual) =>
          atual ? { ...atual, ...(d.url && d.campo ? { [d.campo]: d.url } : {}) } : atual,
        );
      }
      setMensagem({ tipo: "ok", texto: "Arquivo atualizado." });
      aoAtualizar();
    } catch (e) {
      setMensagem({ tipo: "erro", texto: mensagemDeErro(e, "Falha no envio.") });
    } finally {
      setEnviando(null);
    }
  }

  async function removerArquivo(tipo: string, fotoId?: string) {
    if (!dados) return;
    setEnviando(tipo);
    setMensagem(null);
    try {
      const [tipoPuro, espacoAlvo] = tipo.split(":");
      const r = await fetch(`/api/condominios/${dados.id}/arquivo`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: tipoPuro, id: fotoId, espaco: espacoAlvo }),
      });
      const d = await corpoSeguro(r);
      if (!r.ok) throw new Error(d?.erro || "Não foi possível remover o arquivo.");
      if (tipoPuro === "foto_espaco" && espacoAlvo) {
        setEspacoFotos((atual) => {
          const copia = { ...atual };
          delete copia[espacoAlvo];
          return copia;
        });
      } else if (tipoPuro === "foto_area" || tipoPuro === "foto_institucional") {
        setDados((atual) =>
          atual ? { ...atual, fotos: (atual.fotos ?? []).filter((f) => f.id !== fotoId) } : atual,
        );
      } else if (dados) {
        setForm(formularioInicial({ ...dados }));
        setDados({ ...dados });
      }
      setMensagem({ tipo: "ok", texto: "Arquivo removido." });
      aoAtualizar();
    } catch (e) {
      setMensagem({ tipo: "erro", texto: mensagemDeErro(e, "Falha ao remover.") });
    } finally {
      setEnviando(null);
    }
  }

  function abrirSeletor(tipo: string) {
    tipoUpload.current = tipo;
    inputLogo.current?.click();
  }

  function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (arquivo && tipoUpload.current) enviarArquivo(tipoUpload.current, arquivo);
  }

  if (!dados) return <Carregando />;

  const temaPreview = resolverTema(dados.slug, dados.corTema, {
    corPrimaria: form.corPrimaria,
    corSecundaria: form.corSecundaria,
    corDestaque: form.corDestaque,
    corSidebar: form.corSidebar,
    corFundo: form.corFundo,
    corTexto: form.corTexto,
  });
  const varsPreview = cssVarsDoTema(temaPreview) as React.CSSProperties;
  const areasComuns = (dados.fotos ?? []).filter((f) => f.tipo === "AREA_COMUM");
  const institucionais = (dados.fotos ?? []).filter((f) => f.tipo === "INSTITUCIONAL");

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Identidade visual</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-stone-500">
          Cores, logotipos, fotografias e informações de {dados.nome} — as mudanças aparecem em
          todas as telas deste condomínio e não afetam os demais.
        </p>
      </header>

      {!podeEditar && (
        <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
          Apenas Síndico, Administrativo ou o Administrador da Plataforma podem editar a identidade visual.
        </p>
      )}

      {mensagem && (
        <p
          role="status"
          className={`rounded-xl px-3.5 py-2.5 text-sm ${
            mensagem.tipo === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
          }`}
        >
          {mensagem.texto}
        </p>
      )}

      <input ref={inputLogo} type="file" accept=".png,.jpg,.jpeg,.webp,.svg" hidden onChange={aoEscolherArquivo} />

      {/* ── Pré-visualização imediata ─────────────────────────────── */}
      <Secao titulo="Pré-visualização">
        <div style={varsPreview} className="mt-1 flex overflow-hidden rounded-xl border border-[var(--cor-neutra)]">
          <div className="w-28 shrink-0 bg-[var(--cor-sidebar)] p-3">
            <div className="rounded-md bg-white/90 px-2 py-1.5">
              <img
                src={dados.logoMenu || dados.logo}
                alt=""
                className="h-6 w-auto object-contain"
              />
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="rounded bg-[var(--cor-tema-hover)] px-2 py-1 text-[10px] font-medium text-[var(--cor-fundo)]">Início</div>
              <div className="rounded px-2 py-1 text-[10px] text-[var(--cor-clara-a85)]">Comunicados</div>
              <div className="rounded px-2 py-1 text-[10px] text-[var(--cor-clara-a85)]">Reservas</div>
            </div>
          </div>
          <div className="flex-1 bg-[var(--cor-fundo)] p-4">
            <p className="text-sm font-semibold text-[var(--cor-fg)]">Tela inicial</p>
            <p className="mt-1 text-xs text-[var(--cor-fg-suave)]">
              Botões, menu e focos usam a paleta abaixo.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button className="rounded-lg bg-[var(--cor-tema)] px-3 py-1.5 text-xs font-semibold text-white">
                Botão principal
              </button>
              <div className="h-9 w-40 rounded-lg border border-[var(--cor-tema-suave)] focus:outline-none focus:ring-2 focus:ring-[var(--cor-tema-suave)]" />
            </div>
          </div>
        </div>
      </Secao>

      {/* ── Paleta de cores ───────────────────────────────────────── */}
      <Secao titulo="Paleta de cores">
        <div className="mt-1 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CORES.map(({ campo, rotulo, ajuda }) => (
            <label key={campo} className="flex items-center gap-3 rounded-xl border border-[var(--cor-neutra)] bg-white p-3">
              <input
                type="color"
                value={form[campo] ?? "#000000"}
                onChange={(e) => setForm((f) => ({ ...f, [campo]: e.target.value }))}
                className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-[var(--cor-neutra)] bg-white p-0.5"
                aria-label={rotulo}
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-stone-800">{rotulo}</span>
                <span className="block truncate text-xs text-stone-500">{ajuda}</span>
              </span>
            </label>
          ))}
        </div>
      </Secao>

      {/* ── Logotipos ─────────────────────────────────────────────── */}
      <Secao titulo="Logotipos">
        <div className="mt-1 grid gap-3 sm:grid-cols-3">
          {[
            { tipo: "logo_principal", rotulo: "Logotipo principal", campo: "logo" as const, padrao: "/fotos/logo-meu-condominio.png", podeRemover: false },
            { tipo: "logo_menu", rotulo: "Versão do menu lateral", campo: "logoMenu" as const, padrao: dados.logo, podeRemover: true },
            { tipo: "logo_cabecalho", rotulo: "Versão do cabeçalho", campo: "logoCabecalho" as const, padrao: dados.logo, podeRemover: true },
          ].map(({ tipo, rotulo, campo, padrao, podeRemover }) => {
            const url = (dados[campo] as string | null) || padrao;
            return (
              <div key={tipo} className="rounded-xl border border-[var(--cor-neutra)] bg-white p-3">
                <div className="flex h-20 items-center justify-center rounded-lg bg-stone-50 p-2">
                  <img src={url} alt={rotulo} className="max-h-16 w-auto object-contain" />
                </div>
                <p className="mt-2 text-sm font-medium text-stone-800">{rotulo}</p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => abrirSeletor(tipo)}
                    disabled={!!enviando}
                    className="flex items-center gap-1.5 rounded-lg bg-[var(--cor-tema)] px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--cor-tema-botao-hover)] disabled:opacity-60"
                  >
                    {enviando === tipo ? (
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    Enviar
                  </button>
                  {podeRemover && (
                    <button
                      onClick={() => removerArquivo(tipo)}
                      disabled={!!enviando}
                      className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-50 disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remover
                    </button>
                  )}
                </div>
                <p className="mt-2 text-[11px] text-stone-400">PNG, JPG, WEBP ou SVG até 3 MB</p>
              </div>
            );
          })}
        </div>
      </Secao>

      {/* ── Fotografias ───────────────────────────────────────────── */}
      <Secao titulo="Fotografias">
        <div className="mt-1 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[var(--cor-neutra)] bg-white p-3">
            <div className="h-32 overflow-hidden rounded-lg bg-stone-100">
              <img src={dados.foto} alt="Fotografia principal" className="h-full w-full object-cover" />
            </div>
            <p className="mt-2 text-sm font-medium text-stone-800">Fotografia principal</p>
            <p className="text-xs text-stone-500">Aparece no painel de entrada do condomínio.</p>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => abrirSeletor("foto_principal")}
                disabled={!!enviando}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--cor-tema)] px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--cor-tema-botao-hover)] disabled:opacity-60"
              >
                {enviando === "foto_principal" ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                Substituir
              </button>
            </div>
            <p className="mt-2 text-[11px] text-stone-400">PNG, JPG ou WEBP até 8 MB</p>
          </div>

          <Galeria
            titulo="Áreas comuns"
            itens={areasComuns}
            tipo="foto_area"
            enviando={enviando}
            aoEnviar={abrirSeletor}
            aoRemover={removerArquivo}
          />
        </div>

        <div className="mt-3">
          <Galeria
            titulo="Fotografias institucionais"
            itens={institucionais}
            tipo="foto_institucional"
            enviando={enviando}
            aoEnviar={abrirSeletor}
            aoRemover={removerArquivo}
          />
        </div>
      </Secao>

      {/* ── Fotos dos espaços comuns (Reservas) ───────────────────── */}
      <Secao titulo="Fotos dos espaços comuns" acao={<span className="text-xs text-stone-400">Aparecem nos cartões de reserva</span>}>
        <div className="mt-1 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ESPACOS_EDITAVEIS.map(({ id, rotulo, padrao }) => {
            const configurada = espacoFotos[id];
            const url = configurada ?? padrao;
            const alvo = `foto_espaco:${id}`;
            return (
              <div key={id} className="rounded-xl border border-[var(--cor-neutra)] bg-white p-2.5">
                <div className="relative h-24 overflow-hidden rounded-lg bg-stone-100">
                  <img src={url} alt={rotulo} className="h-full w-full object-cover" />
                </div>
                <p className="mt-2 text-sm font-medium text-stone-800">{rotulo}</p>
                <p className="text-[11px] text-stone-500">
                  {configurada ? "Fotografia personalizada" : "Imagem padrão da plataforma"}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => abrirSeletor(alvo)}
                    disabled={!!enviando}
                    className="flex items-center gap-1.5 rounded-lg bg-[var(--cor-tema)] px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--cor-tema-botao-hover)] disabled:opacity-60"
                  >
                    {enviando === alvo ? (
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    Substituir
                  </button>
                  {configurada && (
                    <button
                      onClick={() => removerArquivo(alvo)}
                      disabled={!!enviando}
                      className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-50 disabled:opacity-60"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Padrão
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-stone-400">PNG, JPG ou WEBP até 8 MB</p>
      </Secao>

      {/* ── Informações do condomínio ─────────────────────────────── */}
      <Secao titulo="Informações do condomínio">
        <div className="mt-1 grid gap-3 sm:grid-cols-2">
          {CAMPOS_TEXTO.map(({ campo, rotulo, placeholder }) => (
            <label key={campo} className={campo === "descricao" ? "sm:col-span-2" : ""}>
              <span className="mb-1.5 block text-sm font-medium text-stone-700">{rotulo}</span>
              {campo === "descricao" ? (
                <textarea
                  value={form[campo] ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, [campo]: e.target.value }))}
                  placeholder="Texto institucional exibido na entrada do portal"
                  rows={3}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-400 focus:ring-4 focus:ring-stone-400/10"
                />
              ) : (
                <input
                  value={form[campo] ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, [campo]: e.target.value }))}
                  placeholder={placeholder}
                  className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-400 focus:ring-4 focus:ring-stone-400/10"
                />
              )}
            </label>
          ))}
        </div>
      </Secao>

      {/* ── Ações ─────────────────────────────────────────────────── */}
      {podeEditar && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={salvar}
            disabled={salvando || !!enviando}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--cor-tema)] px-6 text-sm font-semibold text-white transition hover:bg-[var(--cor-tema-botao-hover)] disabled:opacity-60"
          >
            {salvando && <LoaderCircle className="h-4 w-4 animate-spin" />}
            Salvar identidade visual
          </button>
          <button
            onClick={restaurarPadroes}
            disabled={salvando || !!enviando}
            className="h-11 rounded-xl border border-stone-200 bg-white px-5 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-60"
          >
            Restaurar padrão
          </button>
        </div>
      )}
    </div>
  );
}

function Galeria({
  titulo,
  itens,
  tipo,
  enviando,
  aoEnviar,
  aoRemover,
}: {
  titulo: string;
  itens: FotoGaleria[];
  tipo: string;
  enviando: string | null;
  aoEnviar: (tipo: string) => void;
  aoRemover: (tipo: string, fotoId: string) => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--cor-neutra)] bg-white p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-stone-800">{titulo}</p>
        <button
          onClick={() => aoEnviar(tipo)}
          disabled={!!enviando}
          className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-60"
        >
          {enviando === tipo ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          Adicionar
        </button>
      </div>
      {itens.length === 0 ? (
        <p className="mt-3 text-xs text-stone-400">Nenhuma fotografia nesta galeria ainda.</p>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {itens.map((f) => (
            <div key={f.id} className="group relative overflow-hidden rounded-lg bg-stone-100">
              <img src={f.url} alt={f.legenda ?? "Fotografia"} className="h-20 w-full object-cover" />
              <button
                aria-label="Remover fotografia"
                onClick={() => aoRemover(tipo, f.id)}
                className="absolute right-1.5 top-1.5 rounded-md bg-white/90 p-1 text-stone-600 opacity-0 shadow transition group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

async function corpoSeguro(r: Response): Promise<{ erro?: string; condominio?: unknown; url?: string; campo?: string; espaco?: string; foto?: FotoGaleria } | null> {
  try {
    return await r.json();
  } catch {
    return null;
  }
}
