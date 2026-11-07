#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gera os PDFs oficiais do portal (Regimento Interno + Convenção) para os
dois condomínios, em public/docs/. Layout formal em serifada (Liberation
Serif), artigos numerados manualmente, numeração de página.
"""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle,
)

pdfmetrics.registerFont(TTFont("Serif", "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf"))
pdfmetrics.registerFont(TTFont("Serif-B", "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"))
pdfmetrics.registerFont(TTFont("Serif-I", "/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf"))
pdfmetrics.registerFont(TTFont("Sans-B", "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"))

DESTAQUE = "#3F3730"  # tom pedra escuro do portal

ESTILOS = {
    "titulo": ParagraphStyle("titulo", fontName="Sans-B", fontSize=17, leading=22,
                             alignment=TA_CENTER, textColor=DESTAQUE, spaceAfter=2),
    "subtitulo": ParagraphStyle("subtitulo", fontName="Serif", fontSize=10.5, leading=14,
                                alignment=TA_CENTER, textColor="#57534E"),
    "capitulo": ParagraphStyle("capitulo", fontName="Sans-B", fontSize=11.5, leading=15,
                               textColor=DESTAQUE, spaceBefore=16, spaceAfter=6),
    "artigo": ParagraphStyle("artigo", fontName="Serif", fontSize=10, leading=14.5,
                             alignment=TA_JUSTIFY, spaceAfter=5),
    "inciso": ParagraphStyle("inciso", fontName="Serif", fontSize=10, leading=14,
                             alignment=TA_JUSTIFY, leftIndent=14, spaceAfter=3),
    "nota": ParagraphStyle("nota", fontName="Serif-I", fontSize=9, leading=12.5,
                           alignment=TA_JUSTIFY, textColor="#57534E", spaceBefore=10),
}


def montar_doc(caminho, condominio, subtitulo, paragrafos, rodape_nota):
    doc = BaseDocTemplate(caminho, pagesize=A4,
                          leftMargin=22 * mm, rightMargin=22 * mm,
                          topMargin=20 * mm, bottomMargin=20 * mm,
                          title=f"{subtitulo} — {condominio}", author="Meu Condomínio")
    largura = doc.width

    def decorar(canvas, _doc):
        canvas.saveState()
        canvas.setStrokeColor(DESTAQUE)
        canvas.setLineWidth(0.6)
        canvas.line(doc.leftMargin, A4[1] - 14 * mm, A4[0] - doc.rightMargin, A4[1] - 14 * mm)
        canvas.setFont("Sans-B", 8)
        canvas.setFillColor(DESTAQUE)
        canvas.drawString(doc.leftMargin, A4[1] - 12 * mm, condominio.upper())
        canvas.setFont("Serif", 8)
        canvas.drawRightString(A4[0] - doc.rightMargin, A4[1] - 12 * mm, subtitulo)
        canvas.line(doc.leftMargin, 14 * mm, A4[0] - doc.rightMargin, 14 * mm)
        canvas.drawCentredString(A4[0] / 2, 9.5 * mm, f"Página {canvas.getPageNumber()}")
        canvas.restoreState()

    quadro = Frame(doc.leftMargin, doc.bottomMargin, largura, doc.height, id="texto")
    doc.addPageTemplates([PageTemplate(id="folha", frames=[quadro], onPage=decorar)])

    historia = [
        Spacer(1, 4 * mm),
        Paragraph(condominio, ESTILOS["titulo"]),
        Paragraph(subtitulo, ESTILOS["subtitulo"]),
        Spacer(1, 3 * mm),
    ]
    for tipo, texto in paragrafos:
        if tipo == "sep":
            historia.append(Spacer(1, 2.5 * mm))
        else:
            historia.append(Paragraph(texto, ESTILOS[tipo]))
    historia.append(Paragraph(rodape_nota, ESTILOS["nota"]))
    doc.build(historia)
    print(f"OK {caminho} ({os.path.getsize(caminho) // 1024} KB)")


# ── Regimento Interno ────────────────────────────────────────────

def artigos_regimento(condominio):
    return [
        ("capitulo", "CAPÍTULO I — DA CONVIVÊNCIA E DO HORÁRIO DE SILÊNCIO"),
        ("artigo", "<b>Art. 1º</b> O horário de silêncio no {cond} compreende o período das <b>22h às 8h</b>. "
                   "Nesse intervalo, som, televisão, reuniões e conversas devem ser mantidos em volume "
                   "compatível com o repouso dos demais moradores."),
        ("artigo", "<b>Art. 2º</b> Eventos no salão de festas encerram-se até as <b>23h</b>, com o espaço devolvido "
                   "limpo e sem lixo nas áreas comuns. O som deve permanecer dentro do salão, com janelas fechadas."),
        ("capitulo", "CAPÍTULO II — DA PISCINA E DAS ÁREAS DE LAZER"),
        ("artigo", "<b>Art. 3º</b> A piscina funciona de <b>terça a domingo, das 9h às 19h</b>. Às segundas-feiras "
                   "permanece fechada para limpeza e tratamento da água. Fora desse horário o uso é proibido."),
        ("artigo", "<b>Art. 4º</b> É obrigatório o uso da ducha antes de entrar na piscina, por todos os "
                   "usuários, inclusive crianças."),
        ("artigo", "<b>Art. 5º</b> É <b>proibido</b> o uso de recipientes de vidro na área da piscina, bem como o "
                   "consumo de alimentos e bebidas fora das mesas da área gourmet adjacente."),
        ("artigo", "<b>Art. 6º</b> Crianças menores de <b>12 anos</b> somente podem permanecer na área da piscina "
                   "acompanhadas de adulto responsável. Bebês devem usar fralda própria para piscinas."),
        ("artigo", "<b>Art. 7º</b> Cada unidade pode levar até <b>2 convidados</b> para a área da piscina, sempre "
                   "acompanhados pelo morador, que responde pelo comportamento e por eventuais danos."),
        ("artigo", "<b>Art. 8º</b> O traje de banho é permitido exclusivamente na área da piscina. Nos demais "
                   "ambientes comuns, exige-se roupa e calçado adequados."),
        ("capitulo", "CAPÍTULO III — DAS MUDANÇAS"),
        ("artigo", "<b>Art. 9º</b> Mudanças somente podem ser realizadas de <b>segunda a sexta, das 8h às 18h</b>, "
                   "e aos <b>sábados, das 8h às 12h</b>. É proibida a realização de mudanças aos domingos, "
                   "feriados e em horário noturno."),
        ("artigo", "<b>Art. 10</b> A mudança deve ser <b>agendada com no mínimo 48 horas úteis</b> de antecedência "
                   "junto à administração ou portaria, informando data, horário, unidade e empresa responsável. "
                   "Sem o agendamento, o acesso pode ser negado."),
        ("artigo", "<b>Art. 11</b> O transporte de móveis deve utilizar o <b>elevador de serviço</b>, com forração "
                   "das paredes e piso, e proteção de corredores e halls. Danos causados serão ressarcidos pelo "
                   "morador responsável."),
        ("artigo", "<b>Art. 12</b> As caixas de papelão devem ser amarradas e entregues no abrigo de resíduos no "
                   "dia da coleta de recicláveis. É proibido deixá-las em corredores, halls ou junto aos elevadores."),
        ("capitulo", "CAPÍTULO IV — DO LIXO E DA COLETA SELETIVA"),
        ("artigo", "<b>Art. 13</b> O abrigo de resíduos recebe lixo <b>todos os dias, das 6h às 21h</b>. Fora desse "
                   "horário, os sacos devem permanecer na unidade até o dia seguinte."),
        ("artigo", "<b>Art. 14</b> É <b>proibido</b> depositar lixo em corredores, halls, junto aos elevadores ou na "
                   "porta das unidades. O descarte deve ser feito diretamente no abrigo, em sacos fechados."),
        ("artigo", "<b>Art. 15</b> Recicláveis devem estar enxaguados e secos, em saco separado; o papelão deve ser "
                   "desmontado e amarrado."),
        ("artigo", "<b>Art. 16</b> Óleo de cozinha deve ser entregue no ponto de coleta da sala de recicláveis, em "
                   "garrafa PET fechada. Pilhas, baterias, lâmpadas e eletrônicos devem seguir para ecopontos ou "
                   "pontos de entrega voluntária."),
        ("artigo", "<b>Art. 17</b> Entulho de obra, móveis, colchões e eletrodomésticos <b>não podem</b> ser "
                   "descartados no abrigo comum, nos termos da Lei nº 12.305/2010. A destinação é de "
                   "responsabilidade de quem gera o resíduo."),
        ("capitulo", "CAPÍTULO V — DAS OBRAS E REFORMAS"),
        ("artigo", "<b>Art. 18</b> Serviços ruidosos (furadeira, serra, martelo) somente de <b>segunda a sexta, das "
                   "8h às 18h</b>, e aos sábados até as <b>12h</b>. Serviços silenciosos podem seguir até as 20h. "
                   "Domingos e feriados são proibidos."),
        ("artigo", "<b>Art. 19</b> Reformas que gerem barulho, entulho ou alteração de instalações devem ser "
                   "comunicadas à administração com <b>no mínimo 3 dias úteis</b> de antecedência."),
        ("artigo", "<b>Art. 20</b> O entulho deve ser retirado por caçamba contratada pelo morador, não podendo "
                   "permanecer em áreas comuns."),
        ("capitulo", "CAPÍTULO VI — DOS ANIMAIS DE ESTIMAÇÃO"),
        ("artigo", "<b>Art. 21</b> Animais devem circular nas áreas comuns com <b>guia e coleira</b>. Dejetos devem "
                   "ser recolhidos imediatamente pelo tutor."),
        ("artigo", "<b>Art. 22</b> Animais são proibidos na área da piscina, academia, salão de festas e playground."),
        ("capitulo", "CAPÍTULO VII — DA PORTARIA, VISITAS E ENCOMENDAS"),
        ("artigo", "<b>Art. 23</b> Visitantes e prestadores devem ser autorizados pelo morador pelo portal ou "
                   "diretamente à portaria, com nome e período de validade."),
        ("artigo", "<b>Art. 24</b> Entregadores e prestadores podem circular de <b>7h às 22h</b>; após esse horário, "
                   "a portaria poderá solicitar a retirada do pedido na guarita."),
        ("artigo", "<b>Art. 25</b> A portaria recebe encomendas <b>24 horas</b> e avisa o morador pelo portal. A "
                   "retirada exige identificação."),
        ("artigo", "<b>Art. 26</b> Mudanças e transportes de móveis seguem as regras do Capítulo III, com "
                   "identificação da equipe na portaria."),
        ("capitulo", "CAPÍTULO VIII — DAS INFRAÇÕES E MULTAS"),
        ("artigo", "<b>Art. 27</b> Infrações às normas deste regimento sujeitam o infrator a advertência e, em caso "
                   "de reincidência, a multa prevista na convenção e na legislação aplicável."),
        ("artigo", "<b>Art. 28</b> A reclamação de infrações pode ser registrada pelo portal, no menu Ocorrências, "
                   "ou diretamente à administração."),
        ("artigo", "<b>Art. 29</b> Situações não previstas serão decididas pelo síndico e, em último caso, pela "
                   "assembleia."),
        ("capitulo", "DISPOSIÇÕES FINAIS"),
        ("artigo", "<b>Art. 30</b> Os casos omissos serão resolvidos conforme a convenção do condomínio, o Código "
                   "Civil (arts. 1.331 a 1.358) e as decisões de assembleia."),
        ("sep", ""),
    ]


def gerar_regimento(pasta, slug, condominio):
    montar_doc(
        os.path.join(pasta, f"regimento-interno-{slug}.pdf"),
        condominio,
        "Regimento Interno — documento de referência",
        artigos_regimento(condominio),
        "Este texto resume as regras de convivência vigentes para consulta diária pelo portal. "
        "Em caso de divergência, prevalecem a convenção registrada em cartório e as decisões de "
        "assembleia. A administração mantém a versão oficial arquivada e atualiza o portal a cada revisão.",
    )


# ── Convenção (extrato) ──────────────────────────────────────────

def gerar_convencao(pasta, slug, condominio):
    paragrafos = [
        ("capitulo", "DA NATUREZA E DA FINALIDADE"),
        ("artigo", "<b>Cláusula 1ª.</b> A convenção rege o condomínio residencial {cond}, disciplinando o uso, "
                   "gozo e frução das unidades autônomas e das partes comuns, conforme o Código Civil "
                   "(arts. 1.331 a 1.358)."),
        ("artigo", "<b>Cláusula 2ª.</b> As partes comuns destinam-se ao uso de todos os condôminos, em forma "
                   "indivisível, e compreendem, entre outras: acesso, elevadores, corredores, piscina, salão "
                   "de festas, churrasqueira, quadra, academia, playground, jardins e garagens, conforme "
                   "matriz registrada em cartório."),
        ("capitulo", "DAS TAXAS E DA ADMINISTRAÇÃO"),
        ("artigo", "<b>Cláusula 3ª.</b> A contribuição condominial vence mensalmente na data fixada em assembleia "
                   "e é calculada pela fração ideal de cada unidade. O atraso sujeita o condômino aos encargos "
                   "legais."),
        ("artigo", "<b>Cláusula 4ª.</b> A administração compete ao síndico, eleito em assembleia com mandato de "
                   "dois anos, admitida uma recondução, auxiliado pelo conselho fiscal."),
        ("capitulo", "DAS ASSEMBLEIAS"),
        ("artigo", "<b>Cláusula 5ª.</b> A assembleia ordinária reúne-se anualmente para aprovar contas e "
                   "orçamento; as extraordinárias, quando convocadas com a antecedência mínima de oito dias, "
                   "por edital afixado e/ou comunicado eletrônico."),
        ("artigo", "<b>Cláusula 6ª.</b> Os quóruns para alterações da convenção, obras e outras matérias seguem os "
                   "arts. 1.349 a 1.353 do Código Civil."),
        ("capitulo", "DO USO DAS PARTES COMUNS"),
        ("artigo", "<b>Cláusula 7ª.</b> As áreas de lazer (salão de festas, churrasqueira, quadra) são reservadas "
                   "pelo portal, com aprovação da administração quando exigida, e devem ser devolvidas limpas, "
                   "nas condições da cláusula 8ª."),
        ("artigo", "<b>Cláusula 8ª.</b> As regras de convivência — horário de silêncio, piscina, mudanças, lixo, "
                   "obras, animais e portaria — estão detalhadas no Regimento Interno publicado no portal e "
                   "integram esta convenção para todos os efeitos."),
        ("capitulo", "DISPOSIÇÕES FINAIS"),
        ("artigo", "<b>Cláusula 9ª.</b> Este extrato tem finalidade informativa para consulta diária dos "
                   "condôminos pelo portal. A íntegra da convenção está registrada em cartório e permanece "
                   "arquivada com a administração."),
        ("sep", ""),
    ]
    montar_doc(
        os.path.join(pasta, f"convencao-condominial-{slug}.pdf"),
        condominio,
        "Convenção Condominial — extrato de referência",
        paragrafos,
        "Documento de referência publicado no portal para consulta dos condôminos. A íntegra "
        "registrada em cartório prevalece em caso de divergência.",
    )


if __name__ == "__main__":
    pasta = "/home/z/my-project/public/docs"
    os.makedirs(pasta, exist_ok=True)
    gerar_regimento(pasta, "parque-california", "Parque Califórnia")
    gerar_regimento(pasta, "parque-florida", "Parque Flórida")
    gerar_convencao(pasta, "parque-california", "Parque Califórnia")
    gerar_convencao(pasta, "parque-florida", "Parque Flórida")
