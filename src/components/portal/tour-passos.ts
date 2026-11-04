import type { PassoTour } from "@/components/portal/tour-guiado";
import type { Perfil } from "@/components/portal/app-shell";

// ── Roteiros do mini tutorial por perfil ─────────────────────────
// Cada passo aponta para elementos marcados com data-tour no shell e
// no painel inicial. Passos cujo alvo não existe para o perfil/perfil
// de permissões são pulados automaticamente pelo TourGuiado.

export function passosDoTutorial(perfil: Perfil, nome: string): PassoTour[] {
  const primeiro = {
    titulo: `Bem-vindo(a), ${nome.split(" ")[0]}!`,
    texto:
      "Este passeio rápido mostra o essencial em menos de um minuto — e você pode revê-lo quando quiser, no rodapé do menu.",
  };

  const passos: Record<string, PassoTour[]> = {
    MORADOR: [
      primeiro,
      {
        alvos: ["acoes-rapidas"],
        titulo: "Comece por aqui",
        texto:
          "Nova reserva, autorizar visitante e reportar um problema ficam sempre a um clique de distância.",
      },
      {
        alvos: ["dash-comunicados"],
        titulo: "Comunicados da administração",
        texto: "Avisos do síndico e da administração aparecem aqui, com categoria e data de publicação.",
      },
      {
        alvos: ["dash-reservas"],
        titulo: "Suas reservas",
        texto: "Acompanhe as reservas confirmadas e as aguardando aprovação — do salão de festas à churrasqueira.",
      },
      {
        alvos: ["menu", "botao-menu"],
        titulo: "Tudo neste menu",
        texto:
          "Comunicados, reservas, encomendas, autorizações, ocorrências e documentos ficam reunidos no menu lateral.",
      },
      {
        alvos: ["usuario"],
        titulo: "Sua conta",
        texto:
          "No rodapé do menu você altera a senha, revê este tutorial e sai da conta com segurança.",
      },
    ],
    SINDICO: [
      primeiro,
      {
        alvos: ["acoes-rapidas"],
        titulo: "Rotina da gestão",
        texto: "Publicar comunicados, aprovar reservas e acompanhar ocorrências sem perder tempo.",
      },
      {
        alvos: ["dash-reservas-pendentes"],
        titulo: "Reservas aguardando aprovação",
        texto: "Pedidos dos moradores chegam aqui — clique em Analisar para confirmar ou recusar com justificativa.",
      },
      {
        alvos: ["dash-ocorrencias"],
        titulo: "Ocorrências em andamento",
        texto: "Chamados abertos pelos moradores: atenda, acompanhe o status e registre a resolução.",
      },
      {
        alvos: ["menu", "botao-menu"],
        titulo: "Gestão completa no menu",
        texto:
          "Além do dia a dia: manutenção preventiva, documentos, assembleias, moradores, identidade visual e auditoria.",
      },
      {
        alvos: ["usuario"],
        titulo: "Sua conta",
        texto:
          "No rodapé do menu você altera a senha, revê este tutorial e sai da conta com segurança.",
      },
    ],
    ADMINISTRATIVO: [
      primeiro,
      {
        alvos: ["acoes-rapidas"],
        titulo: "Rotina da administração",
        texto: "Publicar comunicados, aprovar reservas e cadastrar moradores em poucos cliques.",
      },
      {
        alvos: ["dash-reservas-pendentes"],
        titulo: "Reservas aguardando aprovação",
        texto: "Pedidos dos moradores chegam aqui — clique em Analisar para confirmar ou recusar com justificativa.",
      },
      {
        alvos: ["dash-ocorrencias"],
        titulo: "Ocorrências em andamento",
        texto: "Chamados abertos pelos moradores: atenda, acompanhe o status e registre a resolução.",
      },
      {
        alvos: ["menu", "botao-menu"],
        titulo: "Gestão completa no menu",
        texto:
          "Além do dia a dia: manutenção preventiva, documentos, assembleias, moradores, identidade visual e auditoria.",
      },
      {
        alvos: ["usuario"],
        titulo: "Sua conta",
        texto:
          "No rodapé do menu você altera a senha, revê este tutorial e sai da conta com segurança.",
      },
    ],
    PORTARIA: [
      primeiro,
      {
        alvos: ["acoes-rapidas"],
        titulo: "Rotina da guarita",
        texto: "Registrar encomenda e consultar autorizações do dia sem sair da tela inicial.",
      },
      {
        alvos: ["dash-encomendas"],
        titulo: "Encomendas na portaria",
        texto:
          "Registre cada entrega e informe o código de retirada ao morador — a baixa acontece com o código certo.",
      },
      {
        alvos: ["dash-autorizacoes"],
        titulo: "Autorizações válidas",
        texto: "Confira o visitante e o período autorizado pelo morador antes de liberar a entrada.",
      },
      {
        alvos: ["menu", "botao-menu"],
        titulo: "Ferramentas da guarita",
        texto: "Encomendas, autorizações e ocorrências do condomínio ficam reunidas no menu.",
      },
      {
        alvos: ["usuario"],
        titulo: "Sua conta",
        texto:
          "No rodapé do menu você altera a senha, revê este tutorial e sai da conta com segurança.",
      },
    ],
    PLATAFORMA: [
      primeiro,
      {
        alvos: ["seletor-condominio"],
        titulo: "Condomínio ativo",
        texto:
          "O console opera no condomínio selecionado aqui — troque de ambiente quando precisar gerenciar o outro parque.",
      },
      {
        alvos: ["acoes-rapidas"],
        titulo: "Gestão da plataforma",
        texto: "Gerencie os condomínios cadastrados e a identidade visual de cada um.",
      },
      {
        alvos: ["menu", "botao-menu"],
        titulo: "Console completo",
        texto:
          "Condomínios, funções personalizadas, moradores, identidade visual e auditoria. No rodapé fica o Simular perfis.",
      },
      {
        alvos: ["usuario"],
        titulo: "Sua conta",
        texto:
          "No rodapé: alterar senha, simular perfis (testar a visão de cada um), rever o tutorial e sair.",
      },
    ],
    FUNCAO: [
      primeiro,
      {
        alvos: ["acoes-rapidas"],
        titulo: "Suas atribuições",
        texto: "As ações rápidas mostram os atalhos dos módulos concedidos à sua função.",
      },
      {
        alvos: ["menu", "botao-menu"],
        titulo: "Somente o que lhe compete",
        texto: "O menu exibe apenas os módulos liberados pela administração para a sua função.",
      },
      {
        alvos: ["usuario"],
        titulo: "Sua conta",
        texto:
          "No rodapé do menu você altera a senha, revê este tutorial e sai da conta com segurança.",
      },
    ],
  };

  return passos[perfil] ?? passos.FUNCAO;
}
