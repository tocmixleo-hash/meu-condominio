"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Crown,
  DoorOpen,
  Eye,
  FileText,
  GraduationCap,
  HelpCircle,
  History,
  Home,
  KeyRound,
  LoaderCircle,
  LogOut,
  Megaphone,
  Menu,
  Package,
  Palette,
  ShieldCheck,
  User,
  UserCog,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { cssVarsDoTema, resolverTema } from "@/lib/tema";
import type { CondominioUI } from "@/components/portal/login-screen";

export type ModuloId =
  | "inicio"
  | "comunicados"
  | "reservas"
  | "encomendas"
  | "autorizacoes"
  | "ocorrencias"
  | "duvidas"
  | "manutencao"
  | "documentos"
  | "assembleias"
  | "moradores"
  | "auditoria"
  | "identidade"
  | "condominios"
  | "funcoes";

export type Perfil = "SINDICO" | "ADMINISTRATIVO" | "PORTARIA" | "MORADOR" | "PLATAFORMA" | "FUNCAO";

type ItemMenu = { id: ModuloId; rotulo: string; icone: typeof Home };

const MENUS: Record<Perfil, ItemMenu[]> = {
  SINDICO: [
    { id: "inicio", rotulo: "Início", icone: Home },
    { id: "comunicados", rotulo: "Comunicados", icone: Megaphone },
    { id: "reservas", rotulo: "Reservas", icone: CalendarDays },
    { id: "encomendas", rotulo: "Encomendas", icone: Package },
    { id: "autorizacoes", rotulo: "Autorizações", icone: DoorOpen },
    { id: "ocorrencias", rotulo: "Ocorrências", icone: AlertTriangle },
    { id: "manutencao", rotulo: "Manutenção", icone: Wrench },
    { id: "documentos", rotulo: "Documentos", icone: FileText },
    { id: "assembleias", rotulo: "Assembleias", icone: Users },
    { id: "moradores", rotulo: "Moradores", icone: Users },
    { id: "identidade", rotulo: "Identidade visual", icone: Palette },
    { id: "auditoria", rotulo: "Auditoria", icone: History },
  ],
  ADMINISTRATIVO: [
    { id: "inicio", rotulo: "Início", icone: Home },
    { id: "comunicados", rotulo: "Comunicados", icone: Megaphone },
    { id: "reservas", rotulo: "Reservas", icone: CalendarDays },
    { id: "encomendas", rotulo: "Encomendas", icone: Package },
    { id: "autorizacoes", rotulo: "Autorizações", icone: DoorOpen },
    { id: "ocorrencias", rotulo: "Ocorrências", icone: AlertTriangle },
    { id: "manutencao", rotulo: "Manutenção", icone: Wrench },
    { id: "documentos", rotulo: "Documentos", icone: FileText },
    { id: "assembleias", rotulo: "Assembleias", icone: Users },
    { id: "moradores", rotulo: "Moradores", icone: Users },
    { id: "identidade", rotulo: "Identidade visual", icone: Palette },
    { id: "auditoria", rotulo: "Auditoria", icone: History },
  ],
  PORTARIA: [
    { id: "inicio", rotulo: "Início", icone: Home },
    { id: "encomendas", rotulo: "Encomendas", icone: Package },
    { id: "autorizacoes", rotulo: "Autorizações", icone: DoorOpen },
    { id: "ocorrencias", rotulo: "Ocorrências", icone: AlertTriangle },
  ],
  MORADOR: [
    { id: "inicio", rotulo: "Início", icone: Home },
    { id: "comunicados", rotulo: "Comunicados", icone: Megaphone },
    { id: "reservas", rotulo: "Reservas", icone: CalendarDays },
    { id: "encomendas", rotulo: "Encomendas", icone: Package },
    { id: "autorizacoes", rotulo: "Autorizações", icone: DoorOpen },
    { id: "ocorrencias", rotulo: "Ocorrências", icone: AlertTriangle },
    { id: "documentos", rotulo: "Documentos", icone: FileText },
    { id: "duvidas", rotulo: "Perguntas frequentes", icone: HelpCircle },
  ],
  PLATAFORMA: [
    { id: "inicio", rotulo: "Início", icone: Home },
    { id: "condominios", rotulo: "Condomínios", icone: Building2 },
    { id: "funcoes", rotulo: "Funções", icone: UserCog },
    { id: "moradores", rotulo: "Moradores", icone: Users },
    { id: "identidade", rotulo: "Identidade visual", icone: Palette },
    { id: "auditoria", rotulo: "Auditoria", icone: History },
  ],
  FUNCAO: [], // menu montado dinamicamente a partir das permissões da função
};

const ROTULO_PERFIL: Record<Perfil, string> = {
  SINDICO: "Síndico",
  ADMINISTRATIVO: "Administrativo",
  PORTARIA: "Portaria",
  MORADOR: "Morador",
  PLATAFORMA: "Administrador da Plataforma",
  FUNCAO: "Função personalizada",
};

// Ícone por perfil no rodapé — evita repetir a logo do condomínio
const ICONE_PERFIL: Record<Perfil, typeof Home> = {
  SINDICO: Crown,
  ADMINISTRATIVO: ClipboardList,
  PORTARIA: ShieldCheck,
  MORADOR: User,
  PLATAFORMA: Building2,
  FUNCAO: UserCog,
};

// Catálogo para montar o menu de funções personalizadas (mesma ordem/ícones)
const ITEM_POR_MODULO: Record<string, ItemMenu> = {
  comunicados: { id: "comunicados", rotulo: "Comunicados", icone: Megaphone },
  reservas: { id: "reservas", rotulo: "Reservas", icone: CalendarDays },
  encomendas: { id: "encomendas", rotulo: "Encomendas", icone: Package },
  autorizacoes: { id: "autorizacoes", rotulo: "Autorizações", icone: DoorOpen },
  ocorrencias: { id: "ocorrencias", rotulo: "Ocorrências", icone: AlertTriangle },
  manutencao: { id: "manutencao", rotulo: "Manutenção", icone: Wrench },
  documentos: { id: "documentos", rotulo: "Documentos", icone: FileText },
  assembleias: { id: "assembleias", rotulo: "Assembleias", icone: Users },
  moradores: { id: "moradores", rotulo: "Moradores", icone: Users },
  identidade: { id: "identidade", rotulo: "Identidade visual", icone: Palette },
  auditoria: { id: "auditoria", rotulo: "Auditoria", icone: History },
};

// ── Seletor de condomínio (vínculos múltiplos / plataforma) ──────
function SeletorCondominio({
  condominio,
  condominios,
  aoTrocarCondominio,
}: {
  condominio: CondominioUI;
  condominios: CondominioUI[];
  aoTrocarCondominio: (id: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  if (condominios.length <= 1) {
    // Vínculo único — identificação simples do condomínio conectado
    return (
      <div data-tour="seletor-condominio" className="mt-3 flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white p-1">
          <Image
            src={condominio.logo}
            alt={`Logo do ${condominio.nome}`}
            width={32}
            height={32}
            className="h-full w-auto object-contain"
          />
        </span>
        <p className="min-w-0 truncate text-xs font-medium text-[var(--cor-clara-a70)]">
          {condominio.nome}
        </p>
      </div>
    );
  }

  return (
    <div data-tour="seletor-condominio" className="relative mt-3">
      <button
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-haspopup="listbox"
        className="flex w-full items-center gap-2.5 rounded-lg border border-[var(--cor-tema-hover)] bg-[var(--cor-tema-hover-a60)] px-2.5 py-2 text-left transition hover:border-[var(--cor-clara-a70)]"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white p-1">
          <Image
            src={condominio.logo}
            alt={`Logo do ${condominio.nome}`}
            width={32}
            height={32}
            className="h-full w-auto object-contain"
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold text-[var(--cor-fundo)]">
            {condominio.nomeCurto || condominio.nome}
          </span>
          <span className="block text-[11px] text-[var(--cor-clara-a70)]">
            Condomínio ativo
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--cor-clara-a70)] transition ${aberto ? "rotate-180" : ""}`} />
      </button>

      {aberto && (
        <>
          <button
            aria-label="Fechar seletor"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setAberto(false)}
          />
          <ul
            role="listbox"
            aria-label="Condomínios disponíveis"
            className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-[var(--cor-neutra)] bg-white py-1 shadow-xl"
          >
            {condominios.map((c) => {
              const ativo = c.id === condominio.id;
              return (
                <li key={c.id}>
                  <button
                    role="option"
                    aria-selected={ativo}
                    onClick={() => {
                      setAberto(false);
                      if (!ativo) aoTrocarCondominio(c.id);
                    }}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition ${
                      ativo ? "bg-[var(--cor-tema-suave)]" : "hover:bg-stone-50"
                    }`}
                  >
                    <img
                      src={c.logo}
                      alt=""
                      className="h-7 w-7 shrink-0 rounded bg-white object-contain p-0.5"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-stone-800">
                        {c.nomeCurto || c.nome}
                      </span>
                      {ativo && (
                        <span className="text-[11px] font-medium text-[var(--cor-tema)]">
                          Ambiente atual
                        </span>
                      )}
                    </span>
                    <span
                      aria-hidden
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: c.corTema }}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

// ── Alteração da própria senha ─────────────────────────────────
function DialogoSenha({ aoFechar }: { aoFechar: () => void }) {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function salvar() {
    setErro("");
    setOk("");
    if (nova.length < 8) {
      setErro("A nova senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (nova !== confirma) {
      setErro("A confirmação não coincide com a nova senha.");
      return;
    }
    setEnviando(true);
    try {
      const r = await fetch("/api/auth/senha", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senhaAtual: atual, novaSenha: nova }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.erro || "Não foi possível alterar a senha.");
      setOk("Senha alterada com sucesso.");
      setAtual("");
      setNova("");
      setConfirma("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao alterar a senha.");
    } finally {
      setEnviando(false);
    }
  }

  const campo =
    "h-10 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-900 outline-none transition focus:border-stone-400 focus:ring-4 focus:ring-stone-400/10";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button aria-label="Fechar" className="absolute inset-0 bg-black/40" onClick={aoFechar} />
      <div className="relative max-h-[88dvh] w-full max-w-sm overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-stone-900">Alterar senha</h2>
        <div className="mt-4 space-y-3">
          <input type="password" autoComplete="current-password" placeholder="Senha atual" value={atual} onChange={(e) => setAtual(e.target.value)} className={campo} />
          <input type="password" autoComplete="new-password" placeholder="Nova senha (mín. 8 caracteres)" value={nova} onChange={(e) => setNova(e.target.value)} className={campo} />
          <input type="password" autoComplete="new-password" placeholder="Confirmar nova senha" value={confirma} onChange={(e) => setConfirma(e.target.value)} className={campo} />
          {erro && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
          {ok && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{ok}</p>}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button onClick={aoFechar} className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50">
              Fechar
            </button>
            <button onClick={salvar} disabled={enviando} className="flex items-center gap-2 rounded-lg bg-[var(--cor-tema)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--cor-tema-botao-hover)] disabled:opacity-60">
              {enviando && <LoaderCircle className="h-4 w-4 animate-spin" />}
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export type SimulacaoUI = {
  perfil: string;
  funcaoId?: string | null;
  funcaoNome?: string | null;
};

// ── Simulador de perfis (exclusivo do administrador da plataforma) ──
type PerfilSimulavel = { perfil: string; rotulo: string; descricao: string; modulos: string[] };
type FuncaoSimulavel = { id: string; nome: string; modulos: string[]; rotuloModulos: string };

function DialogoSimulacao({
  aoFechar,
  aoSimular,
}: {
  aoFechar: () => void;
  aoSimular: (perfil: string, funcaoId?: string) => void;
}) {
  const [perfis, setPerfis] = useState<PerfilSimulavel[]>([]);
  const [funcoes, setFuncoes] = useState<FuncaoSimulavel[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    fetch("/api/auth/simular")
      .then(async (r) => {
        const d = await r.json().catch(() => null);
        if (!r.ok) throw new Error(d?.erro || "Não foi possível carregar os perfis.");
        setPerfis(d.perfis ?? []);
        setFuncoes(d.funcoes ?? []);
      })
      .catch((e) => setErro(e instanceof Error ? e.message : "Falha ao carregar perfis."))
      .finally(() => setCarregando(false));
  }, []);

  const ICONE: Record<string, typeof Home> = {
    SINDICO: Crown,
    ADMINISTRATIVO: ClipboardList,
    PORTARIA: ShieldCheck,
    MORADOR: User,
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button aria-label="Fechar" className="absolute inset-0 bg-black/40" onClick={aoFechar} />
      <div className="relative flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="border-b border-stone-100 px-6 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900">
            <Eye className="h-5 w-5 text-stone-500" /> Simular perfis
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Entre no lugar de cada perfil para testar exatamente o que ele vê e pode fazer neste
            condomínio. Seus poderes de administrador ficam suspensos até encerrar a simulação.
          </p>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {carregando && (
            <p className="flex items-center gap-2 py-6 text-sm text-stone-500">
              <LoaderCircle className="h-4 w-4 animate-spin" /> Carregando perfis…
            </p>
          )}
          {erro && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
          {!carregando && !erro && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Perfis clássicos</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {perfis.map((p) => {
                  const Icone = ICONE[p.perfil] ?? User;
                  return (
                    <button
                      key={p.perfil}
                      onClick={() => aoSimular(p.perfil)}
                      className="rounded-xl border border-stone-200 px-4 py-3 text-left transition hover:border-[var(--cor-tema)] hover:bg-[var(--cor-tema-suave,#faf9f7)]"
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                        <Icone className="h-4 w-4 text-stone-500" /> {p.rotulo}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-stone-500">{p.descricao}</span>
                    </button>
                  );
                })}
              </div>

              <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-stone-400">
                Funções personalizadas deste condomínio
              </p>
              {funcoes.length === 0 ? (
                <p className="mt-2 text-sm text-stone-500">
                  Nenhuma função personalizada criada ainda — cadastre no menu Funções.
                </p>
              ) : (
                <div className="mt-2 grid gap-2">
                  {funcoes.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => aoSimular("FUNCAO", f.id)}
                      className="rounded-xl border border-stone-200 px-4 py-3 text-left transition hover:border-[var(--cor-tema)] hover:bg-[var(--cor-tema-suave,#faf9f7)]"
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                        <UserCog className="h-4 w-4 text-stone-500" /> {f.nome}
                      </span>
                      <span className="mt-1 block truncate text-xs text-stone-500">
                        {f.rotuloModulos || "Somente o Início"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <div className="flex justify-end border-t border-stone-100 px-6 py-3">
          <button onClick={aoFechar} className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppShell({
  perfil,
  nome,
  unidade,
  condominio,
  condominios,
  modulo,
  permissoes,
  funcaoNome,
  simulando,
  aoTrocar,
  aoTrocarCondominio,
  aoSimular,
  aoEncerrarSimulacao,
  aoReverTutorial,
  aoSair,
  children,
}: {
  perfil: Perfil;
  nome: string;
  unidade?: { bloco: string; numero: string } | null;
  condominio: CondominioUI;
  condominios: CondominioUI[];
  modulo: ModuloId;
  permissoes?: string[];
  funcaoNome?: string | null;
  simulando?: SimulacaoUI | null;
  aoTrocar: (m: ModuloId) => void;
  aoTrocarCondominio: (id: string) => void;
  aoSimular?: (perfil: string, funcaoId?: string) => void;
  aoEncerrarSimulacao?: () => void;
  aoReverTutorial?: () => void;
  aoSair: () => void;
  children: React.ReactNode;
}) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [dialogoSenha, setDialogoSenha] = useState(false);
  const [dialogoSimulacao, setDialogoSimulacao] = useState(false);
  // Menu da função personalizada: módulos concedidos, sempre na ordem do catálogo
  const itens: ItemMenu[] =
    perfil === "FUNCAO"
      ? [
          { id: "inicio", rotulo: "Início", icone: Home },
          ...(permissoes ?? [])
            .filter((m) => ITEM_POR_MODULO[m])
            .map((m) => ITEM_POR_MODULO[m]),
        ]
      : MENUS[perfil] ?? MENUS.MORADOR;
  const IconePerfil = ICONE_PERFIL[perfil] ?? User;
  const temaVars = cssVarsDoTema(
    resolverTema(condominio.slug, condominio.corTema, condominio),
  ) as React.CSSProperties;

  function trocar(m: ModuloId) {
    aoTrocar(m);
    setMenuAberto(false);
  }

  const nav = (
    <nav data-tour="menu" className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
      {itens.map((item) => {
        const ativo = item.id === modulo;
        const Icone = item.icone;
        return (
          <button
            key={item.id}
            onClick={() => trocar(item.id)}
            aria-current={ativo ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
              ativo
                ? "bg-[var(--cor-tema-hover)] font-medium text-[var(--cor-fundo)] shadow-sm"
                : "text-[var(--cor-clara-a85)] hover:bg-[var(--cor-tema-hover-a60)] hover:text-[var(--cor-fundo)]"
            }`}
          >
            <Icone className={`h-4 w-4 shrink-0 transition-transform duration-200 ${ativo ? "scale-110" : ""}`} />
            {item.rotulo}
          </button>
        );
      })}
    </nav>
  );

  const marca = (
    <div className="border-b border-[var(--cor-tema-hover)] px-4 py-4">
      {/* Marca da plataforma Meu Condomínio — a identidade do condomínio
          selecionado fica no seletor logo abaixo (logo + nome), sem repetir
          a mesma logo duas vezes no painel esquerdo */}
      <div className="flex h-16 items-center justify-center rounded-xl bg-white px-3 shadow-sm">
        <Image
          src="/fotos/logo-meu-condominio-horizontal.png"
          alt="Meu Condomínio"
          width={605}
          height={158}
          className="h-10 w-auto object-contain"
          priority
        />
      </div>
      {/* Condomínio ativo + seletor para múltiplos vínculos */}
      <SeletorCondominio
        condominio={condominio}
        condominios={condominios}
        aoTrocarCondominio={aoTrocarCondominio}
      />
    </div>
  );

  const rodape = (
    <div data-tour="usuario" className="border-t border-[var(--cor-tema-hover)] px-5 py-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[var(--cor-fundo)] ${
            simulando ? "bg-amber-400" : "bg-[var(--cor-tema-hover)]"
          }`}
        >
          <IconePerfil className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[var(--cor-fundo)]">{nome}</p>
          <p className="truncate text-xs text-[var(--cor-clara-a70)]">
            {perfil === "FUNCAO" && funcaoNome ? funcaoNome : ROTULO_PERFIL[perfil] ?? perfil}
            {simulando ? " · simulado" : ""}
            {unidade ? ` · Unidade ${unidade.bloco}-${unidade.numero}` : ""}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1">
        <button
          onClick={() => setDialogoSenha(true)}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--cor-clara-a85)] transition-colors hover:bg-[var(--cor-tema-hover-a60)] hover:text-[var(--cor-fundo)]"
        >
          <KeyRound className="h-4 w-4" /> Alterar senha
        </button>
        <button
          onClick={aoReverTutorial}
          title="Rever o tutorial do portal"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--cor-clara-a85)] transition-colors hover:bg-[var(--cor-tema-hover-a60)] hover:text-[var(--cor-fundo)]"
        >
          <GraduationCap className="h-4 w-4" /> Rever tutorial
        </button>
        {perfil === "PLATAFORMA" && !simulando && aoSimular && (
          <button
            onClick={() => setDialogoSimulacao(true)}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--cor-clara-a85)] transition-colors hover:bg-[var(--cor-tema-hover-a60)] hover:text-[var(--cor-fundo)]"
          >
            <Eye className="h-4 w-4" /> Simular perfis
          </button>
        )}
      </div>
      <button
        onClick={aoSair}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--cor-clara-a85)] transition-colors hover:bg-[var(--cor-tema-hover-a60)] hover:text-[var(--cor-fundo)]"
      >
        <LogOut className="h-4 w-4" /> Sair da conta
      </button>
    </div>
  );

  const corpo = (
    <>
      {/* Sidebar desktop */}
      <aside className="hidden w-60 shrink-0 flex-col bg-[var(--cor-sidebar)] md:flex">
        {marca}
        {nav}
        {rodape}
      </aside>

      {/* Sidebar mobile */}
      {menuAberto && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuAberto(false)}
          />
          <aside className="animar-deslizar-direita absolute inset-y-0 left-0 flex w-64 flex-col bg-[var(--cor-sidebar)] shadow-xl">
            <button
              aria-label="Fechar"
              className="absolute right-3 top-3 text-[var(--cor-clara-a80)] hover:text-[var(--cor-fundo)]"
              onClick={() => setMenuAberto(false)}
            >
              <X className="h-5 w-5" />
            </button>
            {marca}
            {nav}
            {rodape}
          </aside>
        </div>
      )}

      {/* Barra inferior de navegação (celular) — os quatro primeiros
          destinos do menu + botão Menu que abre a lista completa no
          drawer. Usa os MESMOS ícones/rótulos da barra lateral, para
          que os dois lugares sempre digam a mesma coisa. */}
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--cor-neutra)] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <div className="mx-auto flex max-w-lg items-stretch">
          {itens.slice(0, 4).map((item) => {
            const ativo = item.id === modulo;
            const Icone = item.icone;
            return (
              <button
                key={item.id}
                onClick={() => trocar(item.id)}
                aria-current={ativo ? "page" : undefined}
                className="flex flex-1 flex-col items-center gap-0.5 px-1 pb-1.5 pt-2"
              >
                <Icone
                  className={`h-5 w-5 ${ativo ? "text-[var(--cor-tema)]" : "text-stone-400"}`}
                />
                <span
                  className={`max-w-full truncate text-[10px] font-medium leading-none ${
                    ativo ? "text-[var(--cor-tema)]" : "text-stone-500"
                  }`}
                >
                  {item.rotulo}
                </span>
                <span
                  aria-hidden
                  className={`mt-0.5 h-0.5 w-6 rounded-full transition-colors ${
                    ativo ? "bg-[var(--cor-tema)]" : "bg-transparent"
                  }`}
                />
              </button>
            );
          })}
          <button
            onClick={() => setMenuAberto(true)}
            aria-label="Abrir menu completo"
            data-tour="botao-menu"
            className="flex flex-1 flex-col items-center gap-0.5 px-1 pb-1.5 pt-2"
          >
            <Menu className="h-5 w-5 text-stone-400" />
            <span className="max-w-full truncate text-[10px] font-medium leading-none text-stone-500">
              Menu
            </span>
            <span aria-hidden className="mt-0.5 h-0.5 w-6 rounded-full bg-transparent" />
          </button>
        </div>
      </nav>
    </>
  );

  return (
    <div style={temaVars} className="flex h-dvh overflow-hidden bg-[var(--cor-fundo)]">
      {corpo}
      {dialogoSenha && <DialogoSenha aoFechar={() => setDialogoSenha(false)} />}
      {dialogoSimulacao && (
        <DialogoSimulacao
          aoFechar={() => setDialogoSimulacao(false)}
          aoSimular={(p, f) => {
            setDialogoSimulacao(false);
            aoSimular?.(p, f);
          }}
        />
      )}

      {/* Conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-[var(--cor-neutra)] bg-white px-4 py-2.5 md:hidden">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <Image
              src={condominio.logoCabecalho || condominio.logoMenu || condominio.logo}
              alt={condominio.nome}
              width={605}
              height={158}
              className="h-8 w-auto object-contain"
              unoptimized={!!(condominio.logoCabecalho || condominio.logoMenu)}
            />
            <span className="truncate text-xs text-stone-500">{condominio.nome}</span>
          </div>
        </header>
        {/* Banner da simulação — sempre visível enquanto durar */}
        {simulando && (
          <div className="flex items-center gap-2.5 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
            <Eye className="h-4 w-4 shrink-0" />
            <p className="min-w-0 flex-1 truncate">
              Simulando <strong>{simulando.funcaoNome ?? ROTULO_PERFIL[simulando.perfil as Perfil] ?? simulando.perfil}</strong>
              {" "}— o que você vê é o que este perfil vê.
            </p>
            {aoEncerrarSimulacao && (
              <button
                onClick={aoEncerrarSimulacao}
                className="shrink-0 rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
              >
                Encerrar simulação
              </button>
            )}
          </div>
        )}
        <main className="flex-1 overflow-y-auto">
          {/* pb-24 no celular: espaço para a barra inferior de navegação */}
          <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 sm:px-6 md:pb-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
