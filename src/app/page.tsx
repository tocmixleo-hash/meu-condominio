"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell, { type ModuloId, type Perfil } from "@/components/portal/app-shell";
import LoginScreen, { type CondominioUI } from "@/components/portal/login-screen";
import Dashboard from "@/components/portal/dashboard";
import Comunicados from "@/components/portal/comunicados";
import Reservas from "@/components/portal/reservas";
import Encomendas from "@/components/portal/encomendas";
import Autorizacoes from "@/components/portal/autorizacoes";
import Documentos from "@/components/portal/documentos";
import Assembleias from "@/components/portal/assembleias";
import Moradores from "@/components/portal/moradores";
import Auditoria from "@/components/portal/auditoria";

type Usuario = {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  unidade?: { bloco: string; numero: string } | null;
  condominio?: CondominioUI;
};

const CONDOMINIO_PADRAO: CondominioUI = {
  id: "",
  nome: "Parque California",
  slug: "california",
  corTema: "#4D403A",
  logo: "/fotos/logo-parque-california.png",
  foto: "/fotos/parque-california.jpg",
};

export default function Inicio() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [modulo, setModulo] = useState<ModuloId>("inicio");

  const verificar = useCallback(() => {
    fetch("/api/auth/verificar")
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.usuario) setUsuario(d.usuario as Usuario);
      })
      .catch(() => null)
      .finally(() => setCarregando(false));
  }, []);

  useEffect(verificar, [verificar]);

  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    setUsuario(null);
    setModulo("inicio");
  }

  if (carregando) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[var(--cor-fundo,#f7f6f3)]">
        <div className="flex items-center gap-3 text-sm text-stone-500">
          <span className="h-4 w-4 animate-spin rounded-full border border-stone-300 border-t-[#4D403A]" />
          Carregando…
        </div>
      </div>
    );
  }

  if (!usuario) {
    return (
      <LoginScreen
        aoEntrar={(u) => setUsuario({ ...u, perfil: u.perfil as Perfil })}
      />
    );
  }

  const condominio = usuario.condominio ?? CONDOMINIO_PADRAO;

  return (
    <AppShell
      perfil={usuario.perfil}
      nome={usuario.nome}
      unidade={usuario.unidade}
      condominio={condominio}
      modulo={modulo}
      aoTrocar={setModulo}
      aoSair={sair}
    >
      {modulo === "inicio" && (
        <Dashboard
          nome={usuario.nome}
          perfil={usuario.perfil}
          unidade={usuario.unidade}
          condominio={condominio}
          aoTrocar={setModulo}
        />
      )}
      {modulo === "comunicados" && <Comunicados perfil={usuario.perfil} />}
      {modulo === "reservas" && <Reservas perfil={usuario.perfil} />}
      {modulo === "encomendas" && <Encomendas perfil={usuario.perfil} />}
      {modulo === "autorizacoes" && <Autorizacoes perfil={usuario.perfil} />}
      {modulo === "documentos" && <Documentos perfil={usuario.perfil} />}
      {modulo === "assembleias" && <Assembleias perfil={usuario.perfil} />}
      {modulo === "moradores" && <Moradores />}
      {modulo === "auditoria" && <Auditoria />}
    </AppShell>
  );
}
