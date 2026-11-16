"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import {
  Badge,
  BotaoPrimario,
  BotaoSecundario,
  BotaoTexto,
  Carregando,
  EstadoVazio,
  Lista,
  LinhaLista,
  Secao,
} from "@/components/portal/ui";
import { corpoJson, mensagemDeErro, mensagemRede } from "@/lib/api-cliente";
import { buscarJSON } from "@/lib/buscar-json";

type Morador = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  ativo: boolean;
  unidade?: { bloco: string; numero: string } | null;
  // Perfil da família na unidade (seção Cadastros)
  possuiPets?: boolean;
  petsDetalhe?: string | null;
  pessoasNoImovel?: number | null;
  vinculoImovel?: "PROPRIETARIO" | "INQUILINO" | null;
};

type MembroEquipe = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  ativo: boolean;
  funcao?: { nome: string } | null;
  vinculos?: { funcao?: { nome: string } | null }[];
};

type FuncaoResumo = { id: string; nome: string; ativo: boolean };

type Aba = "moradores" | "funcionarios";

type Form = {
  nome: string;
  email: string;
  senha: string;
  telefone: string;
  bloco: string;
  numero: string;
  funcaoId: string;
  possuiPets: boolean;
  petsDetalhe: string;
  pessoasNoImovel: string;
  vinculoImovel: "" | "PROPRIETARIO" | "INQUILINO";
};

// Perfil da família: campos pedidos no cadastro do morador — pets,
// quantas pessoas vivem no apartamento e se é proprietário ou inquilino.
const FAMILIA_VAZIA = { possuiPets: false, petsDetalhe: "", pessoasNoImovel: "", vinculoImovel: "" as Form["vinculoImovel"] };

const VAZIO: Form = {
  nome: "",
  email: "",
  senha: "",
  telefone: "",
  bloco: "A",
  numero: "",
  funcaoId: "",
  ...FAMILIA_VAZIA,
};

type Edicao = {
  id: string;
  nome: string;
  possuiPets: boolean;
  petsDetalhe: string;
  pessoasNoImovel: string;
  vinculoImovel: "" | "PROPRIETARIO" | "INQUILINO";
};

const ROTULO_VINCULO: Record<string, string> = {
  PROPRIETARIO: "Proprietário",
  INQUILINO: "Inquilino",
};

export default function Moradores() {
  const [aba, setAba] = useState<Aba>("moradores");
  const [lista, setLista] = useState<Morador[] | null>(null);
  const [equipe, setEquipe] = useState<MembroEquipe[] | null>(null);
  const [funcoes, setFuncoes] = useState<FuncaoResumo[]>([]);
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Edicao | null>(null);
  const [form, setForm] = useState<Form>(VAZIO);
  const [erro, setErro] = useState("");
  const [erroEdicao, setErroEdicao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  const carregar = useCallback(() => {
    buscarJSON("/api/moradores")
      .then((d) => {
        if (d) {
          setLista(d.lista);
          setEquipe(d.equipe ?? []);
        }
      })
  }, []);

  const carregarFuncoes = useCallback(() => {
    buscarJSON("/api/funcoes")
      .then((d) => d && setFuncoes((d.lista ?? []).filter((f: FuncaoResumo & { ativo: boolean }) => f.ativo)))
  }, []);

  useEffect(() => {
    carregar();
    carregarFuncoes();
  }, [carregar, carregarFuncoes]);

  async function criar() {
    setErro("");
    setEnviando(true);
    try {
      const r = await fetch("/api/moradores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const corpo = await corpoJson(r);
      if (!corpo) throw new Error(mensagemRede(r.status));
      if (!r.ok) throw new Error(corpo.erro || "Falha ao cadastrar.");
      setAberto(false);
      setForm(VAZIO);
      carregar();
    } catch (e) {
      setErro(mensagemDeErro(e, "Falha ao cadastrar."));
    } finally {
      setEnviando(false);
    }
  }

  async function salvarEdicao() {
    if (!editando) return;
    setErroEdicao("");
    setSalvandoEdicao(true);
    try {
      const r = await fetch("/api/moradores", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editando.id,
          possuiPets: editando.possuiPets,
          petsDetalhe: editando.petsDetalhe,
          pessoasNoImovel: editando.pessoasNoImovel === "" ? null : Number(editando.pessoasNoImovel),
          vinculoImovel: editando.vinculoImovel || null,
        }),
      });
      const corpo = await corpoJson(r);
      if (!corpo) throw new Error(mensagemRede(r.status));
      if (!r.ok) throw new Error(corpo.erro || "Falha ao salvar.");
      setEditando(null);
      carregar();
    } catch (e) {
      setErroEdicao(mensagemDeErro(e, "Falha ao salvar."));
    } finally {
      setSalvandoEdicao(false);
    }
  }

  async function alternarAtivo(id: string, ativo: boolean) {
    await fetch("/api/moradores", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ativo }),
    });
    carregar();
  }

  function abrirCadastroNovaAba(a: Aba) {
    setAba(a);
    const base: Form = { ...VAZIO, funcaoId: a === "funcionarios" ? funcoes[0]?.id ?? "" : "" };
    setForm(base);
    setErro("");
    setAberto(true);
  }

  function editarMorador(m: Morador) {
    setErroEdicao("");
    setEditando({
      id: m.id,
      nome: m.nome,
      possuiPets: !!m.possuiPets,
      petsDetalhe: m.petsDetalhe ?? "",
      pessoasNoImovel: m.pessoasNoImovel ? String(m.pessoasNoImovel) : "",
      vinculoImovel: m.vinculoImovel ?? "",
    });
  }

  const emModoEquipe = form.funcaoId !== "";
  const podeSalvar = form.nome && form.email && form.senha && (emModoEquipe || form.numero);
  const podeSalvarEdicao =
    editando && (!editando.possuiPets || true) && (editando.pessoasNoImovel === "" || Number(editando.pessoasNoImovel) >= 0);
  const campo =
    "h-10 w-full rounded-md border border-[var(--cor-neutra-2)] px-3 text-sm outline-none focus:border-[var(--cor-tema-suave)] focus:ring-2 focus:ring-[var(--cor-tema-suave)]/30";

  // Campos do perfil da família — usados no cadastro e na edição
  function camposFamilia(
    valor: { possuiPets: boolean; petsDetalhe: string; pessoasNoImovel: string; vinculoImovel: "" | "PROPRIETARIO" | "INQUILINO" },
    aoMudar: (v: Partial<typeof valor>) => void,
  ) {
    return (
      <>
        <label className="flex items-center gap-2.5 text-sm font-medium text-stone-700 dark:text-stone-200">
          <input
            type="checkbox"
            checked={valor.possuiPets}
            onChange={(e) => aoMudar({ possuiPets: e.target.checked })}
            className="h-4 w-4 rounded border-[var(--cor-neutra-2)] accent-[var(--cor-tema)]"
          />
          Possui pets
        </label>
        {valor.possuiPets && (
          <input
            placeholder="Quais pets? (ex.: 1 cachorro, 2 gatos)"
            value={valor.petsDetalhe}
            onChange={(e) => aoMudar({ petsDetalhe: e.target.value })}
            className={campo}
          />
        )}
        <div className="grid grid-cols-2 gap-3">
          <input
            placeholder="Pessoas no apartamento"
            type="number"
            min={1}
            value={valor.pessoasNoImovel}
            onChange={(e) => aoMudar({ pessoasNoImovel: e.target.value })}
            className={campo}
            aria-label="Quantas pessoas vivem no apartamento"
          />
          <select
            value={valor.vinculoImovel}
            onChange={(e) => aoMudar({ vinculoImovel: e.target.value as Edicao["vinculoImovel"] })}
            className={`${campo} bg-white dark:bg-stone-900`}
            aria-label="Proprietário ou inquilino"
          >
            <option value="">Vínculo com a unidade…</option>
            <option value="PROPRIETARIO">Proprietário</option>
            <option value="INQUILINO">Inquilino</option>
          </select>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-5">
      {/* Abas: moradores (com o perfil da família) e funcionários */}
      <div className="flex gap-2" role="tablist" aria-label="Seções de cadastro">
        {(
          [
            ["moradores", `Moradores${lista ? ` · ${lista.length}` : ""}`],
            ["funcionarios", `Funcionários${equipe ? ` · ${equipe.length}` : ""}`],
          ] as [Aba, string][]
        ).map(([id, rotulo]) => (
          <button
            key={id}
            role="tab"
            aria-selected={aba === id}
            onClick={() => setAba(id)}
            className={`flex h-9 items-center rounded-full px-4 text-sm font-semibold transition-all ${
              aba === id
                ? "bg-[var(--cor-tema)] text-white shadow-sm ring-2 ring-[var(--cor-tema)]/25"
                : "border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:border-stone-300"
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {aba === "moradores" && (
        <Secao
          titulo={`Moradores${lista ? ` · ${lista.length}` : ""}`}
          acao={
            <BotaoPrimario onClick={() => abrirCadastroNovaAba("moradores")}>
              Cadastrar morador
            </BotaoPrimario>
          }
        >
          <p className="mb-4 text-sm text-[var(--cor-fg-suave)]">
            Cada morador registra pets, quantas pessoas vivem no apartamento e se é
            proprietário ou inquilino — a informação fica à mão para a gestão e a portaria.
          </p>
          {!lista ? (
            <Carregando />
          ) : lista.length === 0 ? (
            <EstadoVazio mensagem="Nenhum morador cadastrado." />
          ) : (
            <Lista>
              {lista.map((m) => (
                <LinhaLista
                  key={m.id}
                  principal={m.nome}
                  secundaria={`${m.email}${m.telefone ? ` · ${m.telefone}` : ""}`}
                  detalhe={m.unidade ? `Unidade ${m.unidade.bloco}-${m.unidade.numero}` : undefined}
                  direita={
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {m.vinculoImovel && (
                        <Badge tom="neutro">{ROTULO_VINCULO[m.vinculoImovel]}</Badge>
                      )}
                      {m.possuiPets && (
                        <Badge tom="verde">Pets{m.petsDetalhe ? `: ${m.petsDetalhe}` : ""}</Badge>
                      )}
                      {m.pessoasNoImovel ? (
                        <Badge tom="neutro">{m.pessoasNoImovel} {m.pessoasNoImovel === 1 ? "pessoa" : "pessoas"}</Badge>
                      ) : null}
                      <Badge tom={m.ativo ? "verde" : "vermelho"}>{m.ativo ? "Ativo" : "Inativo"}</Badge>
                      <BotaoTexto onClick={() => editarMorador(m)}>Editar</BotaoTexto>
                      {m.ativo ? (
                        <BotaoTexto tom="vermelho" onClick={() => alternarAtivo(m.id, false)}>
                          Desativar
                        </BotaoTexto>
                      ) : (
                        <BotaoTexto tom="verde" onClick={() => alternarAtivo(m.id, true)}>
                          Reativar
                        </BotaoTexto>
                      )}
                    </div>
                  }
                />
              ))}
            </Lista>
          )}
        </Secao>
      )}

      {aba === "funcionarios" && (
        <Secao
          titulo={`Funcionários${equipe ? ` · ${equipe.length}` : ""}`}
          acao={
            <BotaoPrimario onClick={() => abrirCadastroNovaAba("funcionarios")}>
              Cadastrar funcionário
            </BotaoPrimario>
          }
        >
          <p className="mb-4 text-sm text-[var(--cor-fg-suave)]">
            Funcionários do condomínio com acesso ao portal: cada um entra com uma
            {" "}
            <strong>função</strong> criada no menu Funções e vê apenas os módulos concedidos a ela.
          </p>
          {!equipe ? (
            <Carregando />
          ) : equipe.length === 0 ? (
            <EstadoVazio mensagem="Nenhum funcionário cadastrado." />
          ) : (
            <Lista>
              {equipe.map((m) => {
                const nomeFuncao = m.vinculos?.[0]?.funcao?.nome ?? m.funcao?.nome ?? "—";
                return (
                  <LinhaLista
                    key={m.id}
                    principal={m.nome}
                    secundaria={`${m.email}${m.telefone ? ` · ${m.telefone}` : ""}`}
                    detalhe={`Função: ${nomeFuncao}`}
                    direita={
                      <div className="flex items-center gap-3">
                        <Badge tom={m.ativo ? "verde" : "vermelho"}>{m.ativo ? "Ativo" : "Inativo"}</Badge>
                        {m.ativo ? (
                          <BotaoTexto tom="vermelho" onClick={() => alternarAtivo(m.id, false)}>
                            Desativar
                          </BotaoTexto>
                        ) : (
                          <BotaoTexto tom="verde" onClick={() => alternarAtivo(m.id, true)}>
                            Reativar
                          </BotaoTexto>
                        )}
                      </div>
                    }
                  />
                );
              })}
            </Lista>
          )}
        </Secao>
      )}

      {/* Cadastro: morador (com unidade e perfil da família) ou funcionário
          (com função personalizada) — o modo inicial segue a aba aberta */}
      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            aria-label="Fechar"
            className="absolute inset-0 bg-black/40"
            onClick={() => setAberto(false)}
          />
          <div className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-lg border border-[var(--cor-neutra)] bg-white dark:bg-stone-900 p-6 shadow-xl">
            <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">Cadastrar pessoa</h3>
            <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
              Morador (com unidade) ou funcionário (com função). A pessoa já pode entrar com o
              e-mail e a senha definidos aqui.
            </p>
            <div className="mt-4 space-y-3">
              <input
                placeholder="Nome completo"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className={campo}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="E-mail"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={campo}
                />
                <input
                  placeholder="Senha provisória"
                  value={form.senha}
                  onChange={(e) => setForm({ ...form, senha: e.target.value })}
                  className={campo}
                />
              </div>
              <select
                value={form.funcaoId}
                onChange={(e) => setForm({ ...form, funcaoId: e.target.value })}
                className={`${campo} bg-white dark:bg-stone-900`}
                aria-label="Tipo de cadastro"
              >
                <option value="">Morador — com unidade</option>
                {funcoes.map((f) => (
                  <option key={f.id} value={f.id}>
                    Funcionário — função: {f.nome}
                  </option>
                ))}
              </select>
              {funcoes.length === 0 && !emModoEquipe && (
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Dica: crie funções no menu <strong>Funções</strong> para cadastrar funcionários sob medida.
                </p>
              )}
              {!emModoEquipe ? (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <select
                      value={form.bloco}
                      onChange={(e) => setForm({ ...form, bloco: e.target.value })}
                      className={`${campo} bg-white dark:bg-stone-900`}
                    >
                      <option value="A">Bloco A</option>
                      <option value="B">Bloco B</option>
                    </select>
                    <input
                      placeholder="Nº"
                      value={form.numero}
                      onChange={(e) => setForm({ ...form, numero: e.target.value })}
                      className={campo}
                    />
                    <input
                      placeholder="Telefone"
                      value={form.telefone}
                      onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                      className={campo}
                    />
                  </div>
                  {camposFamilia(form, (v) => setForm({ ...form, ...v }))}
                </>
              ) : (
                <input
                  placeholder="Telefone (opcional)"
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  className={campo}
                />
              )}
              {erro && <p className="rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">{erro}</p>}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <BotaoSecundario onClick={() => setAberto(false)}>Cancelar</BotaoSecundario>
              <BotaoPrimario onClick={criar} disabled={enviando || !podeSalvar}>
                {enviando && <LoaderCircle className="h-4 w-4 animate-spin" />} Cadastrar
              </BotaoPrimario>
            </div>
          </div>
        </div>
      )}

      {/* Edição do perfil da família do morador */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            aria-label="Fechar"
            className="absolute inset-0 bg-black/40"
            onClick={() => setEditando(null)}
          />
          <div className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-lg border border-[var(--cor-neutra)] bg-white dark:bg-stone-900 p-6 shadow-xl">
            <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">
              Editar morador — {editando.nome}
            </h3>
            <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
              Pets, pessoas que vivem no apartamento e vínculo com a unidade.
            </p>
            <div className="mt-4 space-y-3">
              {camposFamilia(editando, (v) => setEditando({ ...editando, ...v }))}
              {erroEdicao && <p className="rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">{erroEdicao}</p>}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <BotaoSecundario onClick={() => setEditando(null)}>Cancelar</BotaoSecundario>
              <BotaoPrimario onClick={salvarEdicao} disabled={salvandoEdicao || !podeSalvarEdicao}>
                {salvandoEdicao && <LoaderCircle className="h-4 w-4 animate-spin" />} Salvar
              </BotaoPrimario>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
