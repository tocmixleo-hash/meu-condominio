"use client";

import { useState } from "react";
import { Building2, LoaderCircle } from "lucide-react";
import { BotaoPrimario } from "@/components/portal/ui";

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
  { email: "maria@email.com", senha: "123456", etiqueta: "Morador — Maria (A-101)" },
  { email: "sindico@parquecalifornia.com.br", senha: "admin123", etiqueta: "Síndico — Carlos (Gestão)" },
];

export default function LoginScreen({ aoEntrar }: { aoEntrar: (u: Usuario) => void }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
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
    <div className="flex h-dvh min-h-[540px] items-center justify-center overflow-hidden bg-[#f7f6f3] p-4">
      <div className="grid w-full max-w-3xl overflow-hidden rounded-lg border border-[#EFE9E1] bg-white md:grid-cols-[1.05fr_1fr]">
        {/* Marca */}
        <div className="hidden flex-col justify-between bg-[#4D403A] p-8 md:flex">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#61514A]">
              <Building2 className="h-5 w-5 text-[#f7f6f3]" />
            </span>
            <div>
              <p className="text-base font-semibold leading-tight text-[#f7f6f3]">Meu Condomínio</p>
              <p className="text-xs text-[#EFE9E1]/80">Parque Califórnia</p>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#EFE9E1]/70">
              Acesso exclusivo
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[#EFE9E1]/90">
              Comunicados, reservas, encomendas, autorizações de acesso, documentos e assembleias —
              tudo entre moradores e administração em um só lugar.
            </p>
          </div>
          <p className="text-[11px] text-[#EFE9E1]/60">Guarita 24 h · ramal 2000</p>
        </div>

        {/* Formulário */}
        <div className="flex flex-col justify-center gap-5 p-6 sm:p-8">
          <div className="md:hidden">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#4D403A]">
                <Building2 className="h-5 w-5 text-[#f7f6f3]" />
              </span>
              <div>
                <p className="text-base font-semibold leading-tight text-stone-900">Meu Condomínio</p>
                <p className="text-xs text-stone-500">Parque Califórnia</p>
              </div>
            </div>
          </div>

          <div>
            <h1 className="text-lg font-semibold text-stone-900">Entrar na plataforma</h1>
            <p className="mt-0.5 text-sm text-stone-500">Use o e-mail e a senha do seu cadastro.</p>
          </div>

          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              submeter();
            }}
          >
            <div>
              <label htmlFor="email" className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                className="h-10 w-full rounded-md border border-[#dfdacf] bg-white px-3 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#a3968d] focus:ring-2 focus:ring-[#a3968d]/30"
              />
            </div>
            <div>
              <label htmlFor="senha" className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                Senha
              </label>
              <input
                id="senha"
                type="password"
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••"
                className="h-10 w-full rounded-md border border-[#dfdacf] bg-white px-3 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#a3968d] focus:ring-2 focus:ring-[#a3968d]/30"
              />
            </div>

            {erro && (
              <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {erro}
              </p>
            )}

            <BotaoPrimario type="submit" disabled={enviando} className="w-full">
              {enviando ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" /> Entrando…
                </>
              ) : (
                "Entrar"
              )}
            </BotaoPrimario>
          </form>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400">
              Acesso rápido para demonstração
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {RAPIDOS.map((r) => (
                <button
                  key={r.email}
                  type="button"
                  disabled={enviando}
                  onClick={() => submeter({ email: r.email, senha: r.senha })}
                  className="rounded-md border border-[#dfdacf] bg-[#f7f6f3] px-3 py-2 text-left text-sm text-stone-700 transition-colors hover:bg-[#EFE9E1] disabled:opacity-50"
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
