"use client";

import { useState } from "react";
import { Eye, EyeOff, LoaderCircle, Lock, Mail, Smartphone } from "lucide-react";

type Usuario = {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  unidade?: { bloco: string; numero: string } | null;
};

export function entrarNoApp(dados: { email: string; senha: string }): Promise<Usuario> {
  return fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  }).then(async (r) => {
    const corpo = await r.json();
    if (!r.ok) throw new Error(corpo.erro || "Não foi possível entrar.");
    return corpo.usuario as Usuario;
  });
}

const RAPIDOS: { email: string; senha: string; etiqueta: string }[] = [
  { email: "maria@email.com", senha: "123456", etiqueta: "Maria — Morador (A-101)" },
  { email: "sindico@parquecalifornia.com.br", senha: "admin123", etiqueta: "Carlos — Síndico (Gestão)" },
  { email: "administrativo@parquecalifornia.com.br", senha: "admin123", etiqueta: "Fernanda — Administrativo" },
  { email: "portaria@parquecalifornia.com.br", senha: "portaria123", etiqueta: "Jorge — Portaria" },
];

const DESTAQUES = [
  "Reserve o salão de festas em poucos toques",
  "Receba comunicados e avisos da administração",
  "Participe das assembleias e vote informado",
];

export default function LoginScreen({ aoEntrar }: { aoEntrar: (u: Usuario) => void }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function submeter(dados?: { email: string; senha: string }) {
    setErro("");
    setEnviando(true);
    try {
      const usuario = await entrarNoApp(dados ?? { email, senha });
      aoEntrar(usuario);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao entrar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-dvh bg-[#f7f6f3]">
      {/* ── Painel esquerdo: foto do condomínio ─────────────────────── */}
      <div className="relative hidden w-1/2 overflow-hidden md:block">
        <img
          src="/fotos/parque-california.jpg"
          alt="Parque Califórnia"
          className="absolute inset-0 h-full w-full origin-bottom-right scale-[1.3] object-cover"
        />
        <div className="absolute inset-0 bg-[#4D403A]/75" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2e2620]/70 via-[#4D403A]/20 to-[#3a2f28]/50" />

        <div className="relative z-10 flex h-full flex-col p-10 text-white lg:px-14 lg:py-12">
          {/* Marca */}
          <div className="flex items-center gap-3.5">
            <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm">
                <img src="/fotos/logo-flor.png" alt="" className="h-8 w-8 object-contain" />
            </span>
            <div>
              <p className="text-lg font-bold leading-tight">Meu Condomínio</p>
              <p className="text-sm text-white/65">Gestão e comunicação condominial</p>
            </div>
          </div>

          {/* Mensagem */}
          <div className="mt-12 lg:mt-14">
            <h1 className="text-[34px] font-bold leading-[1.18] tracking-tight xl:text-[40px]">
              Tudo do seu condomínio,
              <br />
              na palma da mão.
            </h1>
            <p className="mt-5 max-w-[27rem] text-[15px] leading-relaxed text-white/80">
              Reservas de espaços comuns, encomendas, documentos, assembleias e comunicados — em um
              só lugar, com a segurança que a sua família merece.
            </p>
            <ul className="mt-7 space-y-3.5">
              {DESTAQUES.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                  <span className="text-[15px] text-white/90">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* QR do portal no celular */}
          <div className="mt-10 flex max-w-[400px] items-start gap-4 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
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

          <p className="mt-auto pt-8 text-xs text-white/55">
            Ambiente de demonstração com dados fictícios — Parque Califórnia.
          </p>
        </div>
      </div>

      {/* ── Painel direito: acesso ───────────────────────────────────── */}
      <div className="flex min-h-dvh w-full flex-col items-center justify-center overflow-y-auto px-5 py-10 md:w-1/2 md:px-8">
        <div className="w-full max-w-[490px]">
          {/* Logo Parque Califórnia */}
          <img
            src="/fotos/logo-parque-california.png"
            alt="Parque Califórnia"
            className="mx-auto h-20 w-auto mix-blend-multiply"
          />

          {/* Cartão de acesso */}
          <div className="mt-5 rounded-2xl bg-white p-6 shadow-[0_24px_60px_-24px_rgba(61,48,39,0.30)] sm:p-7">
            <h2 className="text-[22px] font-bold tracking-tight text-stone-900">
              Entrar na plataforma
            </h2>
            <p className="mt-1.5 text-[15px] text-stone-500">
              Acesse com o seu e-mail cadastrado pela administração.
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

              <button
                type="submit"
                disabled={enviando}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#4D403A] text-[15px] font-semibold text-white transition hover:bg-[#3f352e] disabled:opacity-60"
              >
                {enviando ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" /> Entrando…
                  </>
                ) : (
                  "Entrar"
                )}
              </button>
            </form>
          </div>

          {/* Acesso rápido para demonstração */}
          <div className="mt-6">
            <p className="text-[13px] font-medium uppercase tracking-[0.06em] text-stone-400">
              Acesso rápido para demonstração
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2.5 lg:grid-cols-2">
              {RAPIDOS.map((r) => (
                <button
                  key={r.email}
                  type="button"
                  disabled={enviando}
                  onClick={() => submeter({ email: r.email, senha: r.senha })}
                  className="whitespace-nowrap rounded-full bg-white px-4 py-3 text-left text-sm text-stone-800 transition hover:bg-[#fbfaf8] disabled:opacity-50"
                >
                  {r.etiqueta}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
