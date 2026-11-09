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

type Morador = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  ativo: boolean;
  unidade?: { bloco: string; numero: string } | null;
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

type Form = {
  nome: string;
  email: string;
  senha: string;
  telefone: string;
  bloco: string;
  numero: string;
  funcaoId: string;
};

const VAZIO: Form = { nome: "", email: "", senha: "", telefone: "", bloco: "A", numero: "", funcaoId: "" };

export default function Moradores() {
  const [lista, setLista] = useState<Morador[] | null>(null);
  const [equipe, setEquipe] = useState<MembroEquipe[] | null>(null);
  const [funcoes, setFuncoes] = useState<FuncaoResumo[]>([]);
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState<Form>(VAZIO);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(() => {
    fetch("/api/moradores")
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setLista(d.lista);
          setEquipe(d.equipe ?? []);
        }
      })
      .catch(() => null);
  }, []);

  const carregarFuncoes = useCallback(() => {
    fetch("/api/funcoes")
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d) => d && setFuncoes((d.lista ?? []).filter((f: FuncaoResumo & { ativo: boolean }) => f.ativo)))
      .catch(() => null);
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

  async function alternarAtivo(id: string, ativo: boolean) {
    await fetch("/api/moradores", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ativo }),
    });
    carregar();
  }

  const emModoEquipe = form.funcaoId !== "";
  const podeSalvar = form.nome && form.email && form.senha && (emModoEquipe || form.numero);
  const campo =
    "h-10 w-full rounded-md border border-[var(--cor-neutra-2)] px-3 text-sm outline-none focus:border-[var(--cor-tema-suave)] focus:ring-2 focus:ring-[var(--cor-tema-suave)]/30";

  return (
    <div className="space-y-6">
      <Secao
        titulo={`Moradores${lista ? ` · ${lista.length}` : ""}`}
        acao={
          <BotaoPrimario
            onClick={() => {
              setForm(VAZIO);
              setErro("");
              setAberto(true);
            }}
          >
            Cadastrar pessoa
          </BotaoPrimario>
        }
      >
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
            ))}
          </Lista>
        )}
      </Secao>

      <Secao titulo={`Equipe com função personalizada${equipe ? ` · ${equipe.length}` : ""}`}>
        <p className="mb-4 text-sm text-[var(--cor-fg-suave)]">
          Membros da equipe cadastrados com uma função criada no menu
          {" "}
          <strong>Funções</strong> — cada um acessa apenas os módulos concedidos à sua função.
        </p>
        {!equipe ? (
          <Carregando />
        ) : equipe.length === 0 ? (
          <EstadoVazio mensagem="Nenhum membro de equipe com função personalizada." />
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

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            aria-label="Fechar"
            className="absolute inset-0 bg-black/40"
            onClick={() => setAberto(false)}
          />
          <div className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-lg border border-[var(--cor-neutra)] bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-stone-900">Cadastrar pessoa</h3>
            <p className="mt-0.5 text-sm text-stone-500">
              Morador (com unidade) ou membro da equipe (com função personalizada).
              A pessoa já pode entrar com o e-mail e a senha definidos aqui.
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
                className={`${campo} bg-white`}
                aria-label="Tipo de cadastro"
              >
                <option value="">Morador — com unidade</option>
                {funcoes.map((f) => (
                  <option key={f.id} value={f.id}>
                    Equipe — função: {f.nome}
                  </option>
                ))}
              </select>
              {funcoes.length === 0 && !emModoEquipe && (
                <p className="text-xs text-stone-500">
                  Dica: crie funções no menu <strong>Funções</strong> para cadastrar equipe sob medida.
                </p>
              )}
              {!emModoEquipe ? (
                <div className="grid grid-cols-3 gap-3">
                  <select
                    value={form.bloco}
                    onChange={(e) => setForm({ ...form, bloco: e.target.value })}
                    className={`${campo} bg-white`}
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
              ) : (
                <input
                  placeholder="Telefone (opcional)"
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  className={campo}
                />
              )}
              {erro && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
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
    </div>
  );
}
