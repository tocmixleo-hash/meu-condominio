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

type Funcao = {
  id: string;
  nome: string;
  descricao: string | null;
  permissoes: string; // JSON array
  ativo: boolean;
  _count?: { vinculos: number };
};

// Módulos concedíveis a funções — o mesmo conjunto validado no backend.
const MODULOS: { id: string; rotulo: string; descricao: string }[] = [
  { id: "comunicados", rotulo: "Comunicados", descricao: "Publicar e excluir comunicados" },
  { id: "reservas", rotulo: "Reservas", descricao: "Confirmar e rejeitar reservas" },
  { id: "encomendas", rotulo: "Encomendas", descricao: "Registrar encomendas e dar baixa" },
  { id: "autorizacoes", rotulo: "Autorizações", descricao: "Ver autorizações de acesso" },
  { id: "ocorrencias", rotulo: "Ocorrências", descricao: "Ver todas e atender chamados" },
  { id: "manutencao", rotulo: "Manutenção", descricao: "Agenda de manutenção preventiva" },
  { id: "documentos", rotulo: "Documentos", descricao: "Enviar e excluir documentos" },
  { id: "assembleias", rotulo: "Assembleias", descricao: "Agendar e atualizar assembleias" },
  { id: "moradores", rotulo: "Moradores", descricao: "Cadastrar moradores e equipe" },
  { id: "auditoria", rotulo: "Auditoria", descricao: "Ver o histórico de ações" },
  { id: "identidade", rotulo: "Identidade visual", descricao: "Editar marca, cores e fotos" },
];

const VAZIO = { id: "", nome: "", descricao: "", permissoes: [] as string[] };

export default function Funcoes() {
  const [lista, setLista] = useState<Funcao[] | null>(null);
  const [form, setForm] = useState(VAZIO);
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(() => {
    fetch("/api/funcoes")
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d) => d && setLista(d.lista))
      .catch(() => null);
  }, []);

  useEffect(carregar, [carregar]);

  function abrirNova() {
    setForm(VAZIO);
    setErro("");
    setAberto(true);
  }

  function abrirEdicao(f: Funcao) {
    let permissoes: string[] = [];
    try {
      const bruto = JSON.parse(f.permissoes);
      if (Array.isArray(bruto)) permissoes = bruto;
    } catch {
      permissoes = [];
    }
    setForm({ id: f.id, nome: f.nome, descricao: f.descricao ?? "", permissoes });
    setErro("");
    setAberto(true);
  }

  function alternarModulo(id: string) {
    setForm((f) => ({
      ...f,
      permissoes: f.permissoes.includes(id)
        ? f.permissoes.filter((m) => m !== id)
        : [...f.permissoes, id],
    }));
  }

  async function salvar() {
    setErro("");
    setEnviando(true);
    try {
      const r = await fetch("/api/funcoes", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(form.id ? { id: form.id } : {}),
          nome: form.nome,
          descricao: form.descricao,
          permissoes: form.permissoes,
        }),
      });
      const corpo = await corpoJson(r);
      if (!corpo) throw new Error(mensagemRede(r.status));
      if (!r.ok) throw new Error(corpo.erro || "Falha ao salvar a função.");
      setAberto(false);
      carregar();
    } catch (e) {
      setErro(mensagemDeErro(e, "Falha ao salvar a função."));
    } finally {
      setEnviando(false);
    }
  }

  async function alternarAtivo(f: Funcao) {
    await fetch("/api/funcoes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: f.id, ativo: !f.ativo }),
    });
    carregar();
  }

  async function excluir(f: Funcao) {
    await fetch("/api/funcoes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: f.id }),
    });
    carregar();
  }

  const campo =
    "h-10 w-full rounded-md border border-[var(--cor-neutra-2)] px-3 text-sm outline-none focus:border-[var(--cor-tema-suave)] focus:ring-2 focus:ring-[var(--cor-tema-suave)]/30";

  return (
    <div className="space-y-6">
      <Secao
        titulo={`Funções personalizadas${lista ? ` · ${lista.filter((f) => f.ativo).length} ativas` : ""}`}
        acao={<BotaoPrimario onClick={abrirNova}>Nova função</BotaoPrimario>}
      >
        <p className="mb-4 text-sm text-[var(--cor-fg-suave)]">
          Crie cargos sob medida para a equipe de cada condomínio e marque exatamente
          o que cada função pode usar. O acesso é aplicado no servidor — quem não tem
          o módulo não consegue operá-lo, nem chamando a API diretamente.
        </p>
        {!lista ? (
          <Carregando />
        ) : lista.length === 0 ? (
          <EstadoVazio mensagem="Nenhuma função personalizada ainda. Crie a primeira para a equipe." />
        ) : (
          <Lista className="border-t border-[var(--cor-neutra)]">
            {lista.map((f) => {
              let mods: string[] = [];
              try {
                const bruto = JSON.parse(f.permissoes);
                if (Array.isArray(bruto)) mods = bruto;
              } catch {
                mods = [];
              }
              return (
                <LinhaLista
                  key={f.id}
                  principal={f.nome}
                  secundaria={f.descricao || "Sem descrição"}
                  detalhe={`${mods.length} módulo(s) · ${f._count?.vinculos ?? 0} pessoa(s)`}
                  direita={
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Badge tom={f.ativo ? "verde" : "vermelho"}>{f.ativo ? "Ativa" : "Inativa"}</Badge>
                      <BotaoTexto onClick={() => abrirEdicao(f)}>Editar</BotaoTexto>
                      <BotaoTexto tom={f.ativo ? "vermelho" : "verde"} onClick={() => alternarAtivo(f)}>
                        {f.ativo ? "Desativar" : "Reativar"}
                      </BotaoTexto>
                      {!f.ativo && (f._count?.vinculos ?? 0) === 0 && (
                        <BotaoTexto tom="vermelho" onClick={() => excluir(f)}>
                          Excluir
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
          <button aria-label="Fechar" className="absolute inset-0 bg-black/40" onClick={() => setAberto(false)} />
          <div className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-lg border border-[var(--cor-neutra)] bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-stone-900">
              {form.id ? "Editar função" : "Nova função personalizada"}
            </h3>
            <p className="mt-0.5 text-sm text-stone-500">
              Defina o nome e marque os módulos que esta função pode usar neste condomínio.
            </p>
            <div className="mt-4 space-y-3">
              <input
                placeholder="Nome da função (ex.: Zelador, Conselheiro)"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className={campo}
              />
              <input
                placeholder="Descrição (opcional)"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                className={campo}
              />
              <fieldset className="rounded-lg border border-[var(--cor-neutra)] p-3">
                <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Módulos concedidos
                </legend>
                <div className="mt-1 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {MODULOS.map((m) => (
                    <label
                      key={m.id}
                      className="flex cursor-pointer items-start gap-2 rounded-md p-2 text-sm transition hover:bg-stone-50"
                    >
                      <input
                        type="checkbox"
                        checked={form.permissoes.includes(m.id)}
                        onChange={() => alternarModulo(m.id)}
                        className="mt-0.5 h-4 w-4 accent-[var(--cor-tema)]"
                      />
                      <span className="min-w-0">
                        <span className="block font-medium text-stone-800">{m.rotulo}</span>
                        <span className="block text-xs text-stone-500">{m.descricao}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {erro && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <BotaoSecundario onClick={() => setAberto(false)}>Cancelar</BotaoSecundario>
              <BotaoPrimario onClick={salvar} disabled={enviando || !form.nome.trim()}>
                {enviando && <LoaderCircle className="h-4 w-4 animate-spin" />} Salvar
              </BotaoPrimario>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
