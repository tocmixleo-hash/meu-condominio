"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { corpoJson, mensagemDeErro, mensagemRede } from "@/lib/api-cliente";

function Conteudo() {
  const parametros = useSearchParams();
  const roteador = useRouter();
  const token = parametros.get("token") ?? "";
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function redefinir() {
    setErro("");
    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmacao) {
      setErro("As senhas não coincidem.");
      return;
    }
    setEnviando(true);
    try {
      const r = await fetch("/api/auth/redefinir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, senha }),
      });
      const corpo = await corpoJson<{ ok?: boolean; erro?: string }>(r);
      if (!corpo) throw new Error(mensagemRede(r.status));
      if (!r.ok) throw new Error(corpo.erro || "Não foi possível redefinir a senha.");
      setOk(true);
      setTimeout(() => roteador.push("/"), 2500);
    } catch (e) {
      setErro(mensagemDeErro(e, "Não foi possível redefinir a senha."));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-stone-50 p-4">
      <div className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-stone-900">Escolher nova senha</h1>
        {ok ? (
          <div className="mt-4 space-y-3">
            <p className="rounded-xl bg-green-50 px-3.5 py-2.5 text-sm text-green-700">
              Senha redefinida! Você será levado à tela de entrada…
            </p>
            <a href="/" className="text-sm font-medium text-stone-600 underline-offset-4 hover:underline">
              Ir para o login agora
            </a>
          </div>
        ) : !token ? (
          <p className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            Link inválido. Solicite uma nova redefinição na tela de entrada.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-stone-500">
              Crie uma nova senha para a sua conta. O link vale por 1 hora e só pode ser usado uma vez.
            </p>
            <div className="mt-6 space-y-3">
              <input
                type="password"
                placeholder="Nova senha (mínimo 6 caracteres)"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="new-password"
                className="h-12 w-full rounded-xl border border-stone-200 bg-white px-4 text-[15px] text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-400 focus:ring-4 focus:ring-stone-400/10"
              />
              <input
                type="password"
                placeholder="Confirmar nova senha"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                autoComplete="new-password"
                className="h-12 w-full rounded-xl border border-stone-200 bg-white px-4 text-[15px] text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-400 focus:ring-4 focus:ring-stone-400/10"
              />
              {erro && <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{erro}</p>}
              <button
                onClick={redefinir}
                disabled={enviando || !senha || !confirmacao}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-stone-900 text-[15px] font-semibold text-white transition hover:bg-stone-800 disabled:opacity-60"
              >
                {enviando && <LoaderCircle className="h-4 w-4 animate-spin" />} Redefinir senha
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function RedefinirSenha() {
  return (
    <Suspense>
      <Conteudo />
    </Suspense>
  );
}
