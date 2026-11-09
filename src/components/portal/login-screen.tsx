"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  ClipboardList,
  Eye,
  EyeOff,
  LoaderCircle,
  Lock,
  Mail,
  ShieldCheck,
  Smartphone,
  User,
  X,
} from "lucide-react";
import { cssVarsDoTema, resolverTema } from "@/lib/tema";
import { corpoJson, mensagemDeErro, mensagemRede } from "@/lib/api-cliente";

type Usuario = {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  tutorialVisto?: boolean;
  unidade?: { bloco: string; numero: string } | null;
  condominio?: CondominioUI;
};

export type CondominioUI = {
  id: string;
  nome: string;
  slug: string;
  corTema: string;
  logo: string;
  foto: string;
  // Identidade visual administrável (opcional na UI)
  nomeExibicao?: string | null;
  nomeCurto?: string | null;
  descricao?: string | null;
  telefoneContato?: string | null;
  emailContato?: string | null;
  endereco?: string | null;
  cnpj?: string | null;
  corPrimaria?: string | null;
  corSecundaria?: string | null;
  corDestaque?: string | null;
  corSidebar?: string | null;
  corFundo?: string | null;
  corTexto?: string | null;
  logoMenu?: string | null;
  logoCabecalho?: string | null;
};

// ── Tipos de usuário perguntados na tela de login ────────────────
// O backend confere o tipo escolhido contra a conta informada e, se
// diferir, responde com o tipo correto (perfilCorreto) — a seleção é
// ajustada na tela e ninguém fica bloqueado.
export type TipoUsuario = "MORADOR" | "GESTAO" | "PORTARIA" | "PLATAFORMA";

const TIPOS: { id: TipoUsuario; rotulo: string; descricao: string; icone: typeof User }[] = [
  {
    id: "MORADOR",
    rotulo: "Morador",
    descricao: "Reservas, encomendas, comunicados e autorizações da sua unidade.",
    icone: User,
  },
  {
    id: "GESTAO",
    rotulo: "Síndico ou administração",
    descricao: "Gestão do condomínio: aprovações, ocorrências, manutenção e documentos.",
    icone: ClipboardList,
  },
  {
    id: "PORTARIA",
    rotulo: "Portaria",
    descricao: "Guarita: encomendas recebidas, autorizações de acesso e ocorrências do dia.",
    icone: ShieldCheck,
  },
  {
    id: "PLATAFORMA",
    rotulo: "Administrador da plataforma",
    descricao: "Gestão de todos os condomínios, identidades visuais e simulação de perfis.",
    icone: Building2,
  },
];

const ROTULO_TIPO: Record<TipoUsuario, string> = {
  MORADOR: "Morador",
  GESTAO: "Síndico ou administração",
  PORTARIA: "Portaria",
  PLATAFORMA: "Administrador da plataforma",
};

// Erro de login que carrega o tipo correto da conta (mismatch de tipo)
export class ErroLogin extends Error {
  perfilCorreto?: TipoUsuario;
  constructor(mensagem: string, perfilCorreto?: string) {
    super(mensagem);
    this.perfilCorreto = perfilCorreto as TipoUsuario | undefined;
  }
}

export async function entrarNoApp(dados: {
  email: string;
  senha: string;
  tipo?: TipoUsuario;
  condominioId?: string; // informado apenas no modo demonstração
}): Promise<Usuario> {
  let r: Response;
  try {
    r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
  } catch {
    throw new Error(
      "Não foi possível conectar ao portal. Verifique a conexão e tente novamente.",
    );
  }
  const corpo = await corpoJson<{ usuario?: Usuario; erro?: string; perfilCorreto?: string }>(r);
  if (!r.ok) {
    throw new ErroLogin(
      corpo?.erro || mensagemRede(r.status),
      r.status === 403 ? corpo?.perfilCorreto : undefined,
    );
  }
  if (!corpo?.usuario) {
    throw new Error(
      "Resposta inesperada do servidor. Recarregue a página e tente novamente.",
    );
  }
  return corpo.usuario;
}

const DESTAQUES = [
  "Reserve o salão de festas em poucos toques",
  "Receba comunicados e avisos da administração",
  "Participe das assembleias e vote informado",
];

// Acesso rápido por condomínio (elenco fictício de cada um, igual ao seed).
// Cada acesso já carrega o próprio tipo — o teste fica certo sem atrito.
const ACESSOS: Record<
  string,
  { email: string; senha: string; etiqueta: string; tipo: TipoUsuario }[]
> = {
  california: [
    { email: "maria@email.com", senha: "123456", etiqueta: "Maria — Morador (A-101)", tipo: "MORADOR" },
    { email: "sindico@parquecalifornia.com.br", senha: "admin123", etiqueta: "Carlos — Síndico (Gestão)", tipo: "GESTAO" },
    { email: "administrativo@parquecalifornia.com.br", senha: "admin123", etiqueta: "Fernanda — Administrativo", tipo: "GESTAO" },
    { email: "portaria@parquecalifornia.com.br", senha: "portaria123", etiqueta: "Jorge — Portaria", tipo: "PORTARIA" },
  ],
  florida: [
    { email: "helena@email.com", senha: "123456", etiqueta: "Helena — Morador (A-101)", tipo: "MORADOR" },
    { email: "sindico@parqueflorida.com.br", senha: "admin123", etiqueta: "Ricardo — Síndico (Gestão)", tipo: "GESTAO" },
    { email: "administrativo@parqueflorida.com.br", senha: "admin123", etiqueta: "Patrícia — Administrativo", tipo: "GESTAO" },
    { email: "portaria@parqueflorida.com.br", senha: "portaria123", etiqueta: "Sérgio — Portaria", tipo: "PORTARIA" },
  ],
};

function acessosRapidos(slug: string) {
  return ACESSOS[slug] ?? ACESSOS.california;
}

const FALLBACK: CondominioUI = {
  id: "",
  nome: "Parque California",
  slug: "california",
  corTema: "#4D403A",
  logo: "/fotos/logo-parque-california.png",
  foto: "/fotos/parque-california.jpg",
};

export default function LoginScreen({ aoEntrar }: { aoEntrar: (u: Usuario) => void }) {
  const [condominios, setCondominios] = useState<CondominioUI[]>([FALLBACK]);
  const [condo, setCondo] = useState<CondominioUI>(FALLBACK);
  const [tipo, setTipo] = useState<TipoUsuario | null>(null);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [avisoTipo, setAvisoTipo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [MODO_DEMO, setModoDemo] = useState(false);
  // Recuperação de senha
  const [recuperando, setRecuperando] = useState(false);
  const [emailRecuperacao, setEmailRecuperacao] = useState("");
  const [avisoRecuperacao, setAvisoRecuperacao] = useState("");
  const [enviandoRecuperacao, setEnviandoRecuperacao] = useState(false);

  useEffect(() => {
    fetch("/api/ambiente")
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d) => setModoDemo(!!d?.demo))
      .catch(() => null);
    fetch("/api/condominios")
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d) => {
        const lista = (d?.lista ?? []) as CondominioUI[];
        if (lista.length > 0) {
          setCondominios(lista);
          setCondo((atual) => lista.find((c) => c.id === atual.id) ?? lista[0]);
        }
      })
      .catch(() => null);
  }, []);

  async function submeter(dados?: { email: string; senha: string; tipo?: TipoUsuario }) {
    setErro("");
    setAvisoTipo("");
    setEnviando(true);
    try {
      const usuario = await entrarNoApp({
        ...(dados ?? { email, senha, tipo: tipo ?? undefined }),
        // Contexto do condomínio selecionado: orienta o login quando o mesmo
        // e-mail existir em mais de um parque; nunca bloqueia (o backend
        // recorre à conta correta quando o vínculo não coincide).
        condominioId: condo.id,
      });
      aoEntrar(usuario);
    } catch (e) {
      if (e instanceof ErroLogin && e.perfilCorreto) {
        // Tipo diferente da conta: ajustamos a seleção e avisamos com
        // clareza — o usuário apenas confere e entra novamente.
        setTipo(e.perfilCorreto);
        setAvisoTipo(
          `Esta conta é do tipo «${ROTULO_TIPO[e.perfilCorreto]}». Ajustamos a seleção acima — confira e entre novamente.`,
        );
      } else {
        setErro(mensagemDeErro(e, "Falha ao entrar."));
      }
    } finally {
      setEnviando(false);
    }
  }

  async function solicitarRecuperacao() {
    setAvisoRecuperacao("");
    setEnviandoRecuperacao(true);
    try {
      const r = await fetch("/api/auth/recuperar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailRecuperacao }),
      });
      const corpo = await corpoJson<{ mensagem?: string; erro?: string }>(r);
      setAvisoRecuperacao(
        corpo?.mensagem || corpo?.erro || "Se o e-mail estiver cadastrado, você receberá as instruções.",
      );
    } catch {
      setAvisoRecuperacao("Não foi possível enviar agora. Tente novamente em instantes.");
    } finally {
      setEnviandoRecuperacao(false);
    }
  }

  const temaVars = cssVarsDoTema(resolverTema(condo.slug, condo.corTema)) as React.CSSProperties;
  const rapidos = tipo ? acessosRapidos(condo.slug).filter((r) => r.tipo === tipo) : [];

  return (
    <div style={temaVars} className="flex min-h-dvh bg-[var(--cor-fundo)]">
      {/* ── Painel esquerdo: foto do condomínio ─────────────────────── */}
      <div className="relative hidden w-1/2 overflow-hidden md:block">
        <img
          src={condo.foto}
          alt={condo.nome}
          className="absolute inset-0 h-full w-full origin-bottom-right scale-[1.3] object-cover"
        />
        <div className="absolute inset-0 bg-[var(--cor-tema-a55)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--cor-tema-escura-a70)] via-[var(--cor-tema-a20)] to-[var(--cor-tema-escura2-a50)]" />

        <div className="relative z-10 flex h-full flex-col p-10 text-white lg:px-14 lg:py-12">
          {/* Marca — logo criada pelo usuário (versão horizontal legível) */}
          <span className="animar-aparecer inline-flex items-center self-start rounded-xl bg-white px-4 py-3 shadow-sm">
            <img
              src="/fotos/logo-meu-condominio-horizontal.png"
              alt="Meu Condomínio"
              className="h-12 w-auto object-contain"
            />
          </span>

          {/* Mensagem */}
          <div className="animar-entrada mt-12 lg:mt-14">
            <h1 className="text-[34px] font-bold leading-[1.16] tracking-tight xl:text-[42px]">
              Tudo do seu condomínio,
              <br />
              <em className="font-light italic">na palma da mão.</em>
            </h1>
            <p className="animar-entrada animar-atraso-1 mt-5 max-w-[27rem] text-[15px] leading-relaxed text-white/80">
              Reservas de espaços comuns, encomendas, documentos, assembleias e comunicados — em um
              só lugar, com a segurança que a sua família merece.
            </p>
            <ul className="animar-entrada animar-atraso-2 mt-7 space-y-3.5">
              {DESTAQUES.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-300" />
                  <span className="text-[15px] text-white/90">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* QR do portal no celular */}
          <div className="animar-entrada animar-atraso-3 mt-10 flex max-w-[400px] items-start gap-4 rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
            <img
              src="/fotos/qr-portal.png"
              alt="QR Code do portal"
              className="h-[88px] w-[88px] shrink-0 rounded-lg bg-white p-1.5"
            />
            <div>
              <p className="flex items-center gap-2 text-[15px] font-semibold">
                <Smartphone className="h-4 w-4" />
                Use o portal no celular
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-white/70">
                Aponte a câmera para o QR e abra o portal no telefone — útil também para mostrar o
                QR de retirada na portaria.
              </p>
            </div>
          </div>

          <p className="animar-aparecer mt-auto pt-8 text-xs text-white/55">
            {MODO_DEMO ? `Ambiente de demonstração com dados fictícios — ${condo.nome}.` : condo.descricao || ""}
          </p>
        </div>
      </div>

      {/* ── Painel direito: acesso ───────────────────────────────────── */}
      <div className="flex min-h-dvh w-full flex-col items-center justify-center overflow-y-auto px-5 py-10 md:w-1/2 md:px-8">
        <div className="w-full max-w-[490px]">
          {/* Logo do condomínio selecionado */}
          <img
            src={condo.logo}
            alt={condo.nome}
            className="mx-auto h-20 w-auto mix-blend-multiply"
          />

          {/* Seletor de condomínio — sempre visível: escolhe a identidade
              visual (logo, foto, tema) e os acessos rápidos de cada parque.
              Em produção o vínculo real do usuário continua sendo resolvido
              no backend após o login — a escolha nunca bloqueia ninguém. */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {condominios.map((c) => {
              const ativo = c.id === condo.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCondo(c)}
                  className={`flex items-center gap-3 rounded-xl border bg-white px-4 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                    ativo
                      ? "border-[var(--cor-tema)] ring-2 ring-[var(--cor-tema)]/25"
                      : "border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <img
                    src={c.logo}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-lg bg-white object-contain p-0.5"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-stone-900">{c.nome}</span>
                    <span className="flex items-center gap-1.5 text-xs text-stone-500">
                      <span
                        aria-hidden
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: c.corTema }}
                      />
                      {ativo ? "Selecionado" : "Selecionar"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Cartão de acesso */}
          <div className="animar-entrada mt-4 rounded-xl border border-[var(--cor-neutra)] bg-white p-6 shadow-[var(--sombra-cartao)] sm:p-7">
            {!tipo ? (
              /* ── Etapa 1: pergunta o tipo de usuário ─────────────── */
              <>
                <h2 className="text-[24px] font-semibold tracking-tight text-stone-900">
                  Que tipo de usuário é você?
                </h2>
                <p className="mt-1.5 text-[15px] text-stone-500">
                  Escolha o seu perfil para personalizarmos o seu acesso.
                </p>
                <div className="mt-5 grid gap-2.5">
                  {TIPOS.map((t) => {
                    const Icone = t.icone;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setTipo(t.id);
                          setErro("");
                          setAvisoTipo("");
                        }}
                        className="flex items-start gap-3.5 rounded-xl border border-stone-200 bg-white px-4 py-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--cor-tema)] hover:bg-stone-50 hover:shadow-md"
                      >
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--cor-tema-a10)] text-[var(--cor-tema)]">
                          <Icone className="h-[18px] w-[18px]" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[15px] font-semibold text-stone-900">
                            {t.rotulo}
                          </span>
                          <span className="mt-0.5 block text-[13px] leading-relaxed text-stone-500">
                            {t.descricao}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              /* ── Etapa 2: e-mail e senha (com o tipo escolhido) ──── */
              <>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-[24px] font-semibold tracking-tight text-stone-900">
                    Entrar na plataforma
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setTipo(null);
                      setErro("");
                      setAvisoTipo("");
                    }}
                    title="Trocar tipo de usuário"
                    className="flex shrink-0 items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-200"
                  >
                    {ROTULO_TIPO[tipo]}
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mt-1.5 text-[15px] text-stone-500">
                  Acesse com o seu e-mail cadastrado pela administração do {condo.nome}.
                </p>

                <form
                  className="mt-6 space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    submeter();
                  }}
                >
                  <div>
                    <label htmlFor="email" className="mb-1.5 block text-[15px] font-semibold text-stone-800">
                      E-mail
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-stone-400" />
                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="h-12 w-full rounded-xl border border-stone-200 bg-white pl-11 pr-4 text-[15px] text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-400 focus:ring-4 focus:ring-stone-400/10"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="senha" className="mb-1.5 block text-[15px] font-semibold text-stone-800">
                      Senha
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-stone-400" />
                      <input
                        id="senha"
                        type={mostrarSenha ? "text" : "password"}
                        autoComplete="current-password"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        placeholder="Sua senha"
                        className="h-12 w-full rounded-xl border border-stone-200 bg-white pl-11 pr-11 text-[15px] text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-400 focus:ring-4 focus:ring-stone-400/10"
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarSenha((v) => !v)}
                        aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-stone-400 transition hover:text-stone-600"
                      >
                        {mostrarSenha ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                      </button>
                    </div>
                  </div>

                  {erro && (
                    <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                      {erro}
                    </p>
                  )}

                  {avisoTipo && (
                    <p role="status" className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
                      {avisoTipo}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={enviando}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--cor-tema)] text-[15px] font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[var(--cor-tema-botao-hover)] hover:shadow-md active:scale-[0.98] disabled:opacity-60"
                  >
                    {enviando ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin" /> Entrando…
                      </>
                    ) : (
                      "Entrar"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRecuperando((v) => !v);
                      setAvisoRecuperacao("");
                    }}
                    className="w-full text-center text-sm font-medium text-stone-500 underline-offset-4 transition hover:text-stone-700 hover:underline"
                  >
                    Esqueci minha senha
                  </button>

                  {recuperando && (
                    <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5">
                      <p className="text-sm text-stone-600">
                        Informe o e-mail da conta — enviaremos um link para escolher uma nova senha
                        (vale 1 hora).
                      </p>
                      <div className="mt-2.5 flex gap-2">
                        <input
                          type="email"
                          placeholder="seu@email.com"
                          value={emailRecuperacao}
                          onChange={(e) => setEmailRecuperacao(e.target.value)}
                          className="h-10 flex-1 rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-400 focus:ring-4 focus:ring-stone-400/10"
                        />
                        <button
                          type="button"
                          onClick={solicitarRecuperacao}
                          disabled={enviandoRecuperacao || !emailRecuperacao.trim()}
                          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-stone-800 px-3.5 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:opacity-50"
                        >
                          {enviandoRecuperacao && <LoaderCircle className="h-4 w-4 animate-spin" />} Enviar
                        </button>
                      </div>
                      {avisoRecuperacao && (
                        <p className="mt-2 rounded-lg bg-white px-3 py-2 text-sm text-stone-700">{avisoRecuperacao}</p>
                      )}
                    </div>
                  )}
                </form>
              </>
            )}
          </div>

          {/* Acesso rápido para demonstração — visível também em produção,
              para que novas pessoas possam experimentar o portal livremente.
              Aparece na etapa 2, filtrado pelo tipo escolhido. O
              administrador da plataforma NUNCA aparece aqui: o acesso de
              gestão é exclusivo do login pessoal dele. */}
          {tipo && tipo !== "PLATAFORMA" && (
            <div className="mt-6">
              <p className="text-[13px] font-medium uppercase tracking-[0.06em] text-stone-400">
                Acesso rápido para demonstração
              </p>
              {rapidos.length > 0 ? (
                <div className="mt-3 grid grid-cols-1 gap-2.5 lg:grid-cols-2">
                  {rapidos.map((r) => (
                    <button
                      key={r.email}
                      type="button"
                      disabled={enviando}
                      onClick={() => submeter({ email: r.email, senha: r.senha, tipo: r.tipo })}
                      className="whitespace-nowrap rounded-full border border-stone-200 bg-white px-4 py-3 text-left text-sm text-stone-800 transition hover:bg-stone-50 disabled:opacity-50"
                    >
                      {r.etiqueta}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-stone-500">
                  Nenhum acesso de demonstração deste tipo no {condo.nome}.
                </p>
              )}
            </div>
          )}
          {tipo === "PLATAFORMA" && (
            <p className="mt-6 rounded-xl border border-stone-200 bg-white px-4 py-3 text-[13px] leading-relaxed text-stone-500">
              O acesso da plataforma é exclusivo por e-mail e senha do administrador — não existe
              atalho de demonstração para este perfil.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
