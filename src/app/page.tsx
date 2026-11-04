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
import Identidade from "@/components/portal/identidade";
import Condominios from "@/components/portal/condominios";
import Funcoes from "@/components/portal/funcoes";
import { mensagemDeErro } from "@/lib/api-cliente";

type Usuario = {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  funcaoNome?: string | null;
  permissoes?: string[];
  unidade?: { bloco: string; numero: string } | null;
  condominio?: CondominioUI;
  condominios?: CondominioUI[];
  ehPlataforma?: boolean;
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
  const [aviso, setAviso] = useState("");

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
    setAviso("");
  }

  async function trocarCondominio(id: string) {
    setAviso("");
    try {
      const r = await fetch("/api/auth/trocar-condominio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ condominioId: id }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.erro || "Não foi possível trocar de condomínio.");
      setUsuario(d.usuario as Usuario);
      setModulo("inicio");
    } catch (e) {
      setAviso(mensagemDeErro(e, "Falha ao trocar de condomínio."));
    }
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
  const condominios = usuario.condominios?.length ? usuario.condominios : [condominio];
  // Membro de equipe com função personalizada: nos módulos concedidos a
  // interface de gestão aparece (o servidor continua aplicando as permissões).
  const perfilModulos: Perfil = usuario.perfil === "FUNCAO" ? "ADMINISTRATIVO" : usuario.perfil;
  const podeEditarIdentidade =
    perfilModulos === "PLATAFORMA" ||
    perfilModulos === "SINDICO" ||
    perfilModulos === "ADMINISTRATIVO";

  return (
    <AppShell
      perfil={usuario.perfil}
      nome={usuario.nome}
      unidade={usuario.unidade}
      condominio={condominio}
      condominios={condominios}
      modulo={modulo}
      permissoes={usuario.permissoes}
      funcaoNome={usuario.funcaoNome}
      aoTrocar={setModulo}
      aoTrocarCondominio={trocarCondominio}
      aoSair={sair}
    >
      {aviso && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {aviso}
        </p>
      )}
      {modulo === "inicio" && (
        <Dashboard
          nome={usuario.nome}
          perfil={perfilModulos}
          unidade={usuario.unidade}
          condominio={condominio}
          aoTrocar={setModulo}
        />
      )}
      {modulo === "comunicados" && <Comunicados perfil={perfilModulos} />}
      {modulo === "reservas" && <Reservas perfil={perfilModulos} />}
      {modulo === "encomendas" && <Encomendas perfil={perfilModulos} />}
      {modulo === "autorizacoes" && <Autorizacoes perfil={perfilModulos} />}
      {modulo === "documentos" && <Documentos perfil={perfilModulos} />}
      {modulo === "assembleias" && <Assembleias perfil={perfilModulos} />}
      {modulo === "moradores" && <Moradores />}
      {modulo === "auditoria" && <Auditoria />}
      {modulo === "funcoes" && <Funcoes />}
      {modulo === "identidade" && (
        <Identidade
          condominio={condominio}
          podeEditar={podeEditarIdentidade}
          aoAtualizar={verificar}
        />
      )}
      {modulo === "condominios" && (
        <Condominios ativoId={condominio.id} aoOperar={trocarCondominio} />
      )}
    </AppShell>
  );
}
