"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  CalendarCheck,
  ChevronDown,
  ClipboardList,
  Eye,
  EyeOff,
  FileText,
  LoaderCircle,
  Lock,
  Mail,
  Megaphone,
  Package,
  ShieldCheck,
  Smartphone,
  Sparkles,
  User,
  Vote,
  Wrench,
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

// Benefícios da plataforma — conteúdo principal do painel esquerdo do
// login. Área com rolagem própria para caber mais conteúdo sem apertar
// a mensagem principal nem o QR do portal.
const BENEFICIOS = [
  {
    icone: CalendarCheck,
    titulo: "Reservas sem conflito",
    texto: "Salão de festas, churrasqueira e quadra em poucos toques — com as regras de uso sempre visíveis antes de confirmar.",
  },
  {
    icone: Package,
    titulo: "Encomendas sob controle",
    texto: "A portaria registra, você recebe o aviso na hora e retira com código de segurança — nada fica perdido na guarita.",
  },
  {
    icone: Megaphone,
    titulo: "Comunicados que chegam de verdade",
    texto: "Avisos e campanhas da administração direto no seu painel — sem depender de correntes no grupo do prédio.",
  },
  {
    icone: Vote,
    titulo: "Assembleias participativas",
    texto: "Pauta, votações e decisões registradas em um só lugar: participe informado, de onde estiver.",
  },
  {
    icone: FileText,
    titulo: "Documentos sempre à mão",
    texto: "Convenção, regimento interno, boletos e circulares organizados, com histórico completo do condomínio.",
  },
  {
    icone: Wrench,
    titulo: "Ocorrências resolvidas",
    texto: "Reporte um problema e acompanhe a solução até o fim, com transparência para você e para a administração.",
  },
  {
    icone: ShieldCheck,
    titulo: "Segurança para a família",
    texto: "Autorizações de acesso validadas na guarita e histórico de visitantes da sua unidade — tudo registrado.",
  },
  {
    icone: Sparkles,
    titulo: "Convivência que melhora",
    texto: "Campanhas de boas práticas e economia de recursos que tornam o dia a dia do condomínio mais leve para todos.",
  },
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
  // O que o cartão de acesso mostra: os tipos de usuário (demonstração),
  // o formulário de login (botão "Entrar" do topo) ou o cadastro.
  const [tela, setTela] = useState<"tipos" | "entrar" | "cadastrar">("tipos");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [avisoTipo, setAvisoTipo] = useState("");
  const [enviando, setEnviando] = useState(false);
  // Tipo cujo acesso rápido está logando agora (feedback no botão)
  const [entrandoTipo, setEntrandoTipo] = useState<TipoUsuario | null>(null);
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

  // Fase de demonstração: clicar no tipo de acesso entra direto com uma
  // conta real daquele perfil no condomínio selecionado — sem fricção.
  async function entrarDemonstracao(t: TipoUsuario) {
    const acesso = acessosRapidos(condo.slug).find((r) => r.tipo === t);
    if (!acesso) {
      // Perfis sem atalho (administrador da plataforma): orienta o caminho
      setAvisoTipo(
        "O acesso da plataforma é exclusivo por e-mail e senha do administrador — use o botão Entrar no topo.",
      );
      setErro("");
      return;
    }
    setErro("");
    setAvisoTipo("");
    setEntrandoTipo(t);
    await submeter({ email: acesso.email, senha: acesso.senha, tipo: acesso.tipo });
    setEntrandoTipo(null);
  }

  return (
    <div style={temaVars} className="flex min-h-dvh flex-col bg-[var(--cor-fundo)]">
      {/* ── Barra superior: marca à esquerda, Entrar / Fazer cadastro à
          direita (padrão dos grandes sites) ─────────────────────────── */}
      <header className="z-20 flex items-center justify-between gap-3 border-b border-[var(--cor-neutra)] bg-white px-4 py-3 sm:px-8 sm:py-3.5">
        <img
          src="/fotos/logo-meu-condominio-horizontal.png"
          alt="Meu Condomínio"
          className="h-7 w-auto object-contain sm:h-9"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTela("entrar")}
            aria-current={tela === "entrar" || undefined}
            className={`flex h-9 items-center rounded-full px-4 text-sm font-semibold transition-all duration-200 sm:px-5 ${
              tela === "entrar"
                ? "bg-[var(--cor-tema)] text-white shadow-sm ring-2 ring-[var(--cor-tema)]/25"
                : "bg-[var(--cor-tema)] text-white shadow-sm hover:bg-[var(--cor-tema-botao-hover)]"
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setTela("cadastrar")}
            aria-current={tela === "cadastrar" || undefined}
            className={`flex h-9 items-center rounded-full border px-4 text-sm font-semibold transition-all duration-200 sm:px-5 ${
              tela === "cadastrar"
                ? "border-[var(--cor-tema)] bg-[var(--cor-tema)] text-white shadow-sm ring-2 ring-[var(--cor-tema)]/25"
                : "border-stone-300 bg-white text-stone-700 hover:border-stone-400 hover:bg-stone-50"
            }`}
          >
            Fazer cadastro
          </button>
        </div>
      </header>

      <div className="flex flex-1 items-stretch">
        {/* ── Painel esquerdo: foto do condomínio + benefícios ────────── */}
        <div className="relative hidden w-1/2 md:block">
          <img
            src={condo.foto}
            alt={condo.nome}
            className="absolute inset-0 h-full w-full origin-bottom-right scale-[1.3] object-cover"
          />
          <div className="absolute inset-0 bg-[var(--cor-tema-a55)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--cor-tema-escura-a70)] via-[var(--cor-tema-a20)] to-[var(--cor-tema-escura2-a50)]" />

          <div className="rolagem-fina relative z-10 flex h-full flex-col overflow-y-auto p-10 text-white lg:px-14 lg:py-10">
            {/* Mensagem */}
            <div className="animar-entrada mt-4 lg:mt-6">
              <h1 className="text-[34px] font-bold leading-[1.16] tracking-tight xl:text-[42px]">
                Tudo do seu condomínio,
                <br />
                <em className="font-light italic">na palma da mão.</em>
              </h1>
              <p className="animar-entrada animar-atraso-1 mt-5 max-w-[27rem] text-[15px] leading-relaxed text-white/80">
                Reservas de espaços comuns, encomendas, documentos, assembleias e comunicados — em um
                só lugar, com a segurança que a sua família merece.
              </p>
            </div>

            {/* Benefícios da plataforma — área com rolagem maior e mais
                conteúdo, conforme solicitado */}
            <div className="animar-entrada animar-atraso-2 mt-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                Benefícios da plataforma
              </p>
              <div className="rolagem-fina mt-3 max-h-[290px] space-y-2.5 overflow-y-auto pr-2 lg:max-h-[330px]">
                {BENEFICIOS.map((b) => {
                  const Icone = b.icone;
                  return (
                    <div
                      key={b.titulo}
                      className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.07] p-3 backdrop-blur-sm"
                    >
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-emerald-200">
                        <Icone className="h-[18px] w-[18px]" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[14px] font-semibold text-white">{b.titulo}</span>
                        <span className="mt-0.5 block text-[12.5px] leading-relaxed text-white/70">
                          {b.texto}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-white/55">
                <ChevronDown className="h-3.5 w-3.5 animate-bounce" />
                Role para ver todos os benefícios
              </p>
            </div>

            {/* QR do portal no celular */}
            <div className="animar-entrada animar-atraso-3 mt-8 flex max-w-[400px] items-start gap-4 rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
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

            <p className="animar-aparecer mt-auto pt-6 text-xs text-white/55">
              {MODO_DEMO ? `Ambiente de demonstração com dados fictícios — ${condo.nome}.` : condo.descricao || ""}
            </p>
          </div>
        </div>

      {/* ── Painel direito: acesso — compacto, sem rolagem (a rolagem
          fica apenas na área de benefícios, à esquerda) ─────────────── */}
      <div className="flex w-full flex-col overflow-y-auto px-5 py-6 md:w-1/2 md:px-8">
        <div className="mx-auto my-auto w-full max-w-[490px]">
          {/* Logo do condomínio selecionado */}
          <img
            src={condo.logo}
            alt={condo.nome}
            className="mx-auto h-14 w-auto mix-blend-multiply"
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

          {/* Cartão de acesso — três telas: tipos (clique = entra na hora,
                  demonstração), entrar (e-mail e senha, pelo botão do topo)
                  e cadastrar */}
          <div className="animar-entrada mt-3 rounded-xl border border-[var(--cor-neutra)] bg-white p-5 shadow-[var(--sombra-cartao)] sm:p-6">
            {tela === "tipos" && (
              /* ── Tipos de usuário: na demonstração, o clique já entra
                  logado com uma conta daquele perfil — sem campos de login
                  (que ficam no botão «Entrar» do topo) ── */
              <>
                <h2 className="text-[21px] font-semibold tracking-tight text-stone-900">
                  Que tipo de usuário é você?
                </h2>
                <p className="mt-1 text-[14px] text-stone-500">
                  Toque no seu perfil para entrar agora — estamos em demonstração.
                </p>
                <div className="mt-4 grid gap-2">
                  {TIPOS.map((t) => {
                    const Icone = t.icone;
                    const logando = entrandoTipo === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        disabled={enviando}
                        onClick={() => entrarDemonstracao(t.id)}
                        className="flex items-start gap-3 rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--cor-tema)] hover:bg-stone-50 hover:shadow-md disabled:opacity-60"
                      >
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--cor-tema-a10)] text-[var(--cor-tema)]">
                          {logando ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : (
                            <Icone className="h-4 w-4" />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[14px] font-semibold text-stone-900">
                            {t.rotulo}
                          </span>
                          <span className="mt-0.5 block text-[12.5px] leading-snug text-stone-500">
                            {logando ? "Entrando…" : t.descricao}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {avisoTipo && (
                  <p role="status" className="mt-4 rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm leading-relaxed text-amber-800">
                    {avisoTipo}
                  </p>
                )}
                {erro && (
                  <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                    {erro}
                  </p>
                )}
              </>
            )}

            {tela === "entrar" && (
              /* ── Entrar: e-mail e senha (aberto pelo botão do topo) ── */
              <>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-[21px] font-semibold tracking-tight text-stone-900">
                    Entrar na plataforma
                  </h2>
                  {tipo && (
                    <button
                      type="button"
                      onClick={() => {
                        setTipo(null);
                        setErro("");
                        setAvisoTipo("");
                        setTela("tipos");
                      }}
                      title="Voltar para os tipos de usuário"
                      className="flex shrink-0 items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-200"
                    >
                      {ROTULO_TIPO[tipo]}
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
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

                <button
                  type="button"
                  onClick={() => {
                    setErro("");
                    setAvisoTipo("");
                    setTela("tipos");
                  }}
                  className="mt-5 w-full text-center text-sm font-medium text-stone-500 underline-offset-4 transition hover:text-stone-700 hover:underline"
                >
                  Ver os tipos de usuário
                </button>
              </>
            )}

            {tela === "cadastrar" && (
              /* ── Cadastrar: contas são criadas pela administração; o
                  cadastro aberto pela internet está em demonstração ── */
              <>
                <h2 className="text-[21px] font-semibold tracking-tight text-stone-900">
                  Fazer cadastro
                </h2>
                <p className="mt-1.5 text-[15px] leading-relaxed text-stone-500">
                  As contas do Meu Condomínio são criadas pela administração do seu condomínio:
                  o síndico ou a administradora cadastra a sua unidade e você recebe o acesso por
                  e-mail.
                </p>
                <div className="mt-5 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3.5">
                  <p className="text-[14px] font-semibold text-stone-800">Cadastro aberto em breve</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-stone-500">
                    O cadastro pela internet (autocadastro de moradores) está em demonstração — por
                    enquanto, fale com a administração do {condo.nome} para criar o seu acesso.
                  </p>
                </div>
                <div className="mt-5 grid gap-2.5">
                  <button
                    type="button"
                    onClick={() => setTela("entrar")}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--cor-tema)] text-[15px] font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[var(--cor-tema-botao-hover)] hover:shadow-md active:scale-[0.98]"
                  >
                    Já tenho acesso — Entrar
                  </button>
                  <button
                    type="button"
                    onClick={() => setTela("tipos")}
                    className="flex h-11 w-full items-center justify-center rounded-full border border-stone-300 bg-white text-sm font-semibold text-stone-700 transition hover:border-stone-400 hover:bg-stone-50"
                  >
                    Explorar os tipos de acesso
                  </button>
                </div>
              </>
            )}
          </div>

        </div>
      </div>
      </div>
    </div>
  );
}
