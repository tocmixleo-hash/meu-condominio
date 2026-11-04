"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { corpoJson, mensagemRede } from "@/lib/api-cliente";

type Resultado = {
  situacao: "verificando" | "ok" | "erro" | "sem_permissao" | "sem_sessao";
  titulo?: string;
  texto?: string;
};

/** Página aberta pelo QR Code do visitante — registra a entrada na portaria. */
export default function ValidarQR() {
  const { codigo } = useParams<{ codigo: string }>();
  const [resultado, setResultado] = useState<Resultado>({ situacao: "verificando" });
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!codigo) return;
    fetch("/api/auth/verificar")
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d) => {
        const usuario = d?.usuario;
        if (!usuario) {
          setResultado({ situacao: "sem_sessao" });
          return;
        }
        if (usuario.perfil === "MORADOR") {
          setResultado({
            situacao: "sem_permissao",
            titulo: "Somente a portaria registra entradas",
            texto: "Mostre o QR Code na guarita — a equipe do condomínio fará o registro.",
          });
          return;
        }
        registrar();
      })
      .catch(() => setResultado({ situacao: "sem_sessao" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo]);

  async function registrar() {
    setEnviando(true);
    try {
      const r = await fetch("/api/autorizacoes/validar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo }),
      });
      const corpo = await corpoJson<{ autorizacao?: { visitanteNome: string }; erro?: string }>(r);
      if (!corpo) throw new Error(mensagemRede(r.status));
      if (!r.ok || !corpo.autorizacao) {
        setResultado({ situacao: "erro", texto: corpo?.erro ?? "Não foi possível registrar a entrada." });
        return;
      }
      setResultado({
        situacao: "ok",
        titulo: `Entrada registrada: ${corpo.autorizacao.visitanteNome}`,
        texto: "O morador recebeu o aviso no portal.",
      });
    } catch {
      setResultado({ situacao: "erro", texto: "Falha de conexão ao registrar a entrada." });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-stone-50 p-4">
      <div className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        {resultado.situacao === "verificando" && (
          <p className="flex items-center justify-center gap-2 text-sm text-stone-500">
            <LoaderCircle className="h-4 w-4 animate-spin" /> Verificando código…
          </p>
        )}

        {resultado.situacao === "ok" && (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700">
              ✓
            </div>
            <h1 className="mt-4 text-lg font-semibold text-stone-900">{resultado.titulo}</h1>
            <p className="mt-1 text-sm text-stone-500">{resultado.texto}</p>
          </>
        )}

        {resultado.situacao === "erro" && (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-2xl text-red-700">
              !
            </div>
            <h1 className="mt-4 text-lg font-semibold text-stone-900">Não foi possível registrar</h1>
            <p className="mt-1 text-sm text-red-700">{resultado.texto}</p>
          </>
        )}

        {resultado.situacao === "sem_sessao" && (
          <>
            <h1 className="text-lg font-semibold text-stone-900">Entre como portaria</h1>
            <p className="mt-1 text-sm text-stone-500">
              Este QR registra a entrada do visitante. Faça login com uma conta de equipe
              (portaria, síndico ou administrativo) para concluir.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex h-11 items-center rounded-xl bg-stone-900 px-5 text-sm font-semibold text-white transition hover:bg-stone-800"
            >
              Ir para o login
            </Link>
          </>
        )}

        {resultado.situacao === "sem_permissao" && (
          <>
            <h1 className="text-lg font-semibold text-stone-900">{resultado.titulo}</h1>
            <p className="mt-1 text-sm text-stone-500">{resultado.texto}</p>
          </>
        )}

        {enviando && (
          <p className="mt-4 flex items-center justify-center gap-2 text-sm text-stone-500">
            <LoaderCircle className="h-4 w-4 animate-spin" /> Registrando…
          </p>
        )}
      </div>
    </div>
  );
}
