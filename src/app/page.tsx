"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AppShell, { type ModuloId, type Perfil } from "@/components/portal/app-shell";
import type { SimulacaoUI } from "@/components/portal/app-shell";
import LoginScreen, { type CondominioUI } from "@/components/portal/login-screen";
import Dashboard from "@/components/portal/dashboard";
import Comunicados from "@/components/portal/comunicados";
import Reservas from "@/components/portal/reservas";
import Encomendas from "@/components/portal/encomendas";
import Autorizacoes from "@/components/portal/autorizacoes";
import Ocorrencias from "@/components/portal/ocorrencias";
import Manutencao from "@/components/portal/manutencao";
import Documentos from "@/components/portal/documentos";
import Assembleias from "@/components/portal/assembleias";
import Moradores from "@/components/portal/moradores";
import Auditoria from "@/components/portal/auditoria";
import Identidade from "@/components/portal/identidade";
import Condominios from "@/components/portal/condominios";
import Funcoes from "@/components/portal/funcoes";
import TourGuiado from "@/components/portal/tour-guiado";
import { passosDoTutorial } from "@/components/portal/tour-passos";
import { mensagemDeErro } from "@/lib/api-cliente";

type Usuario = {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  funcaoNome?: string | null;
  permissoes?: string[];
  tutorialVisto?: boolean;
  unidade?: { bloco: string; numero: string } | null;
  condominio?: CondominioUI;
  condominios?: CondominioUI[];
  ehPlataforma?: boolean;
  simulando?: SimulacaoUI | null;
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
  // Mini tutorial do primeiro acesso (passeio guiado)
  const [tour, setTour] = useState(false);
  const tourJaExibido = useRef(false);

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

  // Abre o tutorial automaticamente: no primeiro acesso de cada usuário
  // (flag tutorialVisto) e, durante a simulação de perfis, uma vez por
  // navegador/sessão para cada perfil "vestido" — sem gravar nada no banco.
  useEffect(() => {
    if (!usuario || carregando || tour || tourJaExibido.current) return;
    if (usuario.simulando) {
      const chave = `mc-tour-sim:${usuario.simulando.funcaoId ?? usuario.simulando.perfil}`;
      if (typeof window !== "undefined" && !window.sessionStorage.getItem(chave)) {
        tourJaExibido.current = true;
        setTour(true);
      }
    } else if (usuario.tutorialVisto === false) {
      tourJaExibido.current = true;
      setTour(true);
    }
  }, [usuario, carregando, tour]);

  // Conclusão (ou pulo) do tutorial: persiste o flag do usuário real;
  // na simulação fica apenas na sessão do navegador.
  async function concluirTour() {
    setTour(false);
    if (!usuario) return;
    if (usuario.simulando) {
      const chave = `mc-tour-sim:${usuario.simulando.funcaoId ?? usuario.simulando.perfil}`;
      window.sessionStorage.setItem(chave, "1");
      return;
    }
    setUsuario({ ...usuario, tutorialVisto: true });
    try {
      await fetch("/api/usuario/tutorial", { method: "POST" });
    } catch {
      // sem conexão neste instante — o passeio apenas não fica marcado
    }
  }

  // "Rever tutorial" no rodapé do menu: volta ao Início e reabre o passeio
  function reverTutorial() {
    setModulo("inicio");
    setTour(true);
  }

  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    setUsuario(null);
    setModulo("inicio");
    setAviso("");
    setTour(false); // encerra o tutorial aberto, se houver
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

  // Simulação de perfis: o administrador da plataforma "veste" um perfil
  // (ou função personalizada) para testar o que ele vê e pode fazer.
  async function simular(perfil: string, funcaoId?: string) {
    setAviso("");
    try {
      const r = await fetch("/api/auth/simular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perfil, ...(funcaoId ? { funcaoId } : {}) }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.erro || "Não foi possível iniciar a simulação.");
      setUsuario(d.usuario as Usuario);
      setModulo("inicio");
    } catch (e) {
      setAviso(mensagemDeErro(e, "Falha ao simular perfil."));
    }
  }

  async function encerrarSimulacao() {
    setAviso("");
    try {
      const r = await fetch("/api/auth/simular", { method: "DELETE" });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.erro || "Não foi possível encerrar a simulação.");
      setUsuario(d.usuario as Usuario);
      setModulo("inicio");
    } catch (e) {
      setAviso(mensagemDeErro(e, "Falha ao encerrar a simulação."));
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
      simulando={usuario.simulando}
      aoTrocar={setModulo}
      aoTrocarCondominio={trocarCondominio}
      aoSimular={simular}
      aoEncerrarSimulacao={encerrarSimulacao}
      aoReverTutorial={reverTutorial}
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
      {modulo === "ocorrencias" && <Ocorrencias perfil={perfilModulos} />}
      {modulo === "manutencao" && <Manutencao />}
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

      {/* Mini tutorial do primeiro acesso (e "Rever tutorial") */}
      {tour && usuario && (
        <TourGuiado
          passos={passosDoTutorial(usuario.perfil, usuario.nome)}
          aoConcluir={concluirTour}
        />
      )}
    </AppShell>
  );
}
