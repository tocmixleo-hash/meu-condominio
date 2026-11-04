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

type Form = {
  nome: string;
  email: string;
  senha: string;
  telefone: string;
  bloco: string;
  numero: string;
};

const VAZIO: Form = { nome: "", email: "", senha: "", telefone: "", bloco: "A", numero: "" };

export default function Moradores() {
  const [lista, setLista] = useState<Morador[] | null>(null);
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState<Form>(VAZIO);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(() => {
    fetch("/api/moradores")
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d) => d && setLista(d.lista))
      .catch(() => null);
  }, []);

  useEffect(carregar, [carregar]);

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

  return (
    <div className="space-y-6">
      <Secao
        titulo={`Moradores${lista ? ` · ${lista.length}` : ""}`}
        acao={<BotaoPrimario onClick={() => setAberto(true)}>Cadastrar morador</BotaoPrimario>}
      >
        {!lista ? (
          <Carregando />
        ) : lista.length === 0 ? (
          <EstadoVazio mensagem="Nenhum morador cadastrado." />
        ) : (
          <Lista className="border-t border-[var(--cor-neutra)]">
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

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            aria-label="Fechar"
            className="absolute inset-0 bg-black/40"
            onClick={() => setAberto(false)}
          />
          <div className="relative w-full max-w-md rounded-lg border border-[var(--cor-neutra)] bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-stone-900">Cadastrar morador</h3>
            <p className="mt-0.5 text-sm text-stone-500">
              O morador já pode entrar com o e-mail e a senha definidos aqui.
            </p>
            <div className="mt-4 space-y-3">
              <input
                placeholder="Nome completo"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="h-10 w-full rounded-md border border-[var(--cor-neutra-2)] px-3 text-sm outline-none focus:border-[var(--cor-tema-suave)] focus:ring-2 focus:ring-[var(--cor-tema-suave)]/30"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="E-mail"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="h-10 w-full rounded-md border border-[var(--cor-neutra-2)] px-3 text-sm outline-none focus:border-[var(--cor-tema-suave)] focus:ring-2 focus:ring-[var(--cor-tema-suave)]/30"
                />
                <input
                  placeholder="Senha provisória"
                  value={form.senha}
                  onChange={(e) => setForm({ ...form, senha: e.target.value })}
                  className="h-10 w-full rounded-md border border-[var(--cor-neutra-2)] px-3 text-sm outline-none focus:border-[var(--cor-tema-suave)] focus:ring-2 focus:ring-[var(--cor-tema-suave)]/30"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <select
                  value={form.bloco}
                  onChange={(e) => setForm({ ...form, bloco: e.target.value })}
                  className="h-10 w-full rounded-md border border-[var(--cor-neutra-2)] bg-white px-3 text-sm outline-none focus:border-[var(--cor-tema-suave)]"
                >
                  <option value="A">Bloco A</option>
                  <option value="B">Bloco B</option>
                </select>
                <input
                  placeholder="Nº"
                  value={form.numero}
                  onChange={(e) => setForm({ ...form, numero: e.target.value })}
                  className="h-10 w-full rounded-md border border-[var(--cor-neutra-2)] px-3 text-sm outline-none focus:border-[var(--cor-tema-suave)] focus:ring-2 focus:ring-[var(--cor-tema-suave)]/30"
                />
                <input
                  placeholder="Telefone"
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  className="h-10 w-full rounded-md border border-[var(--cor-neutra-2)] px-3 text-sm outline-none focus:border-[var(--cor-tema-suave)] focus:ring-2 focus:ring-[var(--cor-tema-suave)]/30"
                />
              </div>
              {erro && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <BotaoSecundario onClick={() => setAberto(false)}>Cancelar</BotaoSecundario>
              <BotaoPrimario
                onClick={criar}
                disabled={enviando || !form.nome || !form.email || !form.senha || !form.numero}
              >
                {enviando && <LoaderCircle className="h-4 w-4 animate-spin" />} Cadastrar
              </BotaoPrimario>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
