# -*- coding: utf-8 -*-
"""Genera el PDF de requerimientos para los socios (Agencia LGA)."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle,
    ListFlowable, ListItem, KeepTogether, FrameBreak, NextPageTemplate, PageBreak,
)
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet

OUT = r"C:\Users\joaqu\Desktop\Projectos\wolf-control-bot\docs\Wolf-Control-Bot_Requerimientos_AgenciaLGA.pdf"

# --- Marca jqsystem (tokens oklch -> hex aprox) ---
BLUE_DEEP = colors.HexColor("#1B2B63")
BLUE      = colors.HexColor("#2C5AD0")
GREEN     = colors.HexColor("#16A47C")
INK       = colors.HexColor("#1E2229")
INK_SOFT  = colors.HexColor("#5A616E")
INK_MUTE  = colors.HexColor("#8A909C")
PAPER2    = colors.HexColor("#F3F5F8")
LINE      = colors.HexColor("#E2E6EC")
GREEN_BG  = colors.HexColor("#E7F5EF")
AMBER_BG  = colors.HexColor("#FBF3E2")
RED_BG    = colors.HexColor("#FBEAEA")

PAGE_W, PAGE_H = A4
ML, MR, MT, MB = 18*mm, 18*mm, 20*mm, 18*mm

# --- Estilos ---
ss = getSampleStyleSheet()

def style(name, **kw):
    base = kw.pop("parent", ss["Normal"])
    return ParagraphStyle(name, parent=base, **kw)

st_title   = style("t", fontName="Helvetica-Bold", fontSize=22, leading=26, textColor=INK, spaceAfter=2)
st_sub     = style("s", fontName="Helvetica", fontSize=12.5, leading=16, textColor=INK_SOFT, spaceAfter=2)
st_meta    = style("m", fontName="Helvetica", fontSize=8.5, leading=12, textColor=INK_MUTE)
st_kicker  = style("k", fontName="Helvetica-Bold", fontSize=8, leading=12, textColor=BLUE, spaceBefore=4, spaceAfter=3)
st_h2      = style("h2", fontName="Helvetica-Bold", fontSize=14.5, leading=18, textColor=BLUE_DEEP, spaceBefore=2, spaceAfter=5)
st_h3      = style("h3", fontName="Helvetica-Bold", fontSize=11, leading=14, textColor=INK, spaceBefore=8, spaceAfter=2)
st_body    = style("b", fontName="Helvetica", fontSize=9.7, leading=14.5, textColor=INK, spaceAfter=5)
st_bodysm  = style("bs", fontName="Helvetica", fontSize=9, leading=13, textColor=INK_SOFT, spaceAfter=4)
st_li      = style("li", fontName="Helvetica", fontSize=9.7, leading=14, textColor=INK)
st_cellh   = style("ch", fontName="Helvetica-Bold", fontSize=8.6, leading=11, textColor=colors.white)
st_cell    = style("c", fontName="Helvetica", fontSize=9, leading=12.5, textColor=INK)
st_cellb   = style("cb", fontName="Helvetica-Bold", fontSize=9, leading=12.5, textColor=INK)
st_white_t = style("wt", fontName="Helvetica-Bold", fontSize=15, leading=18, textColor=colors.white)
st_white_s = style("ws", fontName="Helvetica", fontSize=8.4, leading=12, textColor=colors.HexColor("#C7D2F0"))
st_code    = style("code", fontName="Courier-Bold", fontSize=9, leading=13, textColor=BLUE_DEEP)

def kicker(txt):
    return Paragraph(txt.upper(), st_kicker)

def bullets(items, st=st_li):
    return ListFlowable(
        [ListItem(Paragraph(t, st), leftIndent=6, value="•") for t in items],
        bulletType="bullet", bulletColor=GREEN, bulletFontSize=8,
        leftIndent=10, spaceBefore=0, spaceAfter=4,
    )

def masthead():
    jq = Paragraph('<font color="white"><b>JQ</b></font>', style("jq", fontName="Helvetica-Bold", fontSize=17, leading=20, textColor=colors.white))
    word = Paragraph('<font color="white"><b>JQ</b>system</font>', st_white_t)
    tag = Paragraph("AI · AUTOMATION SYSTEMS", st_white_s)
    inner = Table([[word],[tag]], colWidths=[120*mm])
    inner.setStyle(TableStyle([
        ("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(-1,-1),0),
        ("TOPPADDING",(0,0),(-1,-1),0),("BOTTOMPADDING",(0,0),(-1,-1),0),
    ]))
    jqbox = Table([[jq]], colWidths=[13*mm], rowHeights=[13*mm])
    jqbox.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,-1),BLUE),
        ("VALIGN",(0,0),(-1,-1),"MIDDLE"),("ALIGN",(0,0),(-1,-1),"CENTER"),
    ]))
    band = Table([[jqbox, inner]], colWidths=[18*mm, (PAGE_W-ML-MR-18*mm)])
    band.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,-1),BLUE_DEEP),
        ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
        ("LEFTPADDING",(0,0),(0,0),6),("LEFTPADDING",(1,0),(1,0),9),
        ("RIGHTPADDING",(0,0),(-1,-1),6),
        ("TOPPADDING",(0,0),(-1,-1),8),("BOTTOMPADDING",(0,0),(-1,-1),8),
    ]))
    return band

def section_table(data, col_widths, header=True, zebra=True, body_styles=None):
    t = Table(data, colWidths=col_widths, repeatRows=1 if header else 0)
    cmds = [
        ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
        ("LEFTPADDING",(0,0),(-1,-1),7),("RIGHTPADDING",(0,0),(-1,-1),7),
        ("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6),
        ("LINEBELOW",(0,0),(-1,-1),0.5,LINE),
        ("LINEAFTER",(0,0),(-2,-1),0.5,LINE),
        ("BOX",(0,0),(-1,-1),0.6,LINE),
    ]
    if header:
        cmds += [("BACKGROUND",(0,0),(-1,0),BLUE_DEEP)]
    if zebra:
        start = 1 if header else 0
        for r in range(start, len(data)):
            if (r-start) % 2 == 1:
                cmds.append(("BACKGROUND",(0,r),(-1,r),PAPER2))
    t.setStyle(TableStyle(cmds))
    return t

# --- Pie de página ---
def on_page(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.6)
    canvas.line(ML, MB-4, PAGE_W-MR, MB-4)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(INK_MUTE)
    canvas.drawString(ML, MB-12, "jqsystem  ·  Wolf Control — Bot de selección por WhatsApp")
    canvas.drawRightString(PAGE_W-MR, MB-12, "Pág. %d" % doc.page)
    canvas.setFillColor(GREEN)
    canvas.circle(PAGE_W-MR-1.2, MB-9.6, 1.3, fill=1, stroke=0)
    canvas.restoreState()

doc = BaseDocTemplate(OUT, pagesize=A4, leftMargin=ML, rightMargin=MR, topMargin=MT, bottomMargin=MB,
                      title="Wolf Control — Bot de selección: requerimientos",
                      author="jqsystem")
frame = Frame(ML, MB, PAGE_W-ML-MR, PAGE_H-MT-MB, id="main")
doc.addPageTemplates([PageTemplate(id="all", frames=[frame], onPage=on_page)])

S = []
W = PAGE_W-ML-MR

# ---------- PORTADA ----------
S.append(masthead())
S.append(Spacer(1, 14))
S.append(Paragraph("Bot de selección por WhatsApp — Wolf Control", st_title))
S.append(Paragraph("Estado del proyecto y lo que necesitamos para ponerlo en marcha", st_sub))
S.append(Spacer(1, 6))
S.append(Paragraph("Preparado por <b>jqsystem</b> para <b>Agencia LGA</b>  ·  8 de junio de 2026  ·  Documento interno de socios", st_meta))
S.append(Spacer(1, 10))
S.append(Table([[ "" ]], colWidths=[W], rowHeights=[2], style=TableStyle([("BACKGROUND",(0,0),(-1,-1),GREEN)])))
S.append(Spacer(1, 12))
S.append(Paragraph(
    "El bot ya está construido en su base técnica y verificado. Para activarlo necesitamos algunos "
    "accesos por vuestra parte y concretar con Wolf Control los criterios de selección. Este documento "
    "lo resume todo en un solo sitio, con un cálculo real de costes y un checklist final de quién hace qué.",
    st_body))

# ---------- 01 ESTADO ----------
S.append(Spacer(1, 6))
S.append(kicker("01 · Estado actual del bot"))
S.append(Paragraph("Qué hace y por qué no se inventa nada", st_h2))
S.append(Paragraph(
    "El bot conversa por WhatsApp con cada candidato de forma natural (no como un formulario), recoge su "
    "información y lo clasifica en <b>APTO</b> o <b>NO APTO</b> según los criterios de Wolf Control.", st_body))
S.append(Paragraph(
    "<b>Clave para que sea fiable:</b> la inteligencia artificial <b>solo conversa</b>. La decisión de si "
    "alguien es apto la toma <b>código fijo</b>, no la IA. Así el bot nunca se inventa requisitos ni "
    "“perdona” a quien no cumple — la IA pone el tono humano, las reglas ponen el rigor.", st_body))
S.append(Spacer(1, 2))
done = [
    "<b>Fase 1 — hecha y verificada:</b> recibe mensajes de WhatsApp, conversa con la IA, guarda todo en "
    "base de datos y responde automáticamente. Lista para desplegar.",
    "<b>Fase 2 — pendiente:</b> la lógica concreta de filtrado y puntuación, que depende de los criterios "
    "que nos concrete Wolf Control (sección 04).",
]
S.append(bullets(done))

# ---------- 02 ACCESOS ----------
S.append(Spacer(1, 6))
S.append(kicker("02 · Lo que necesitamos de vuestra parte (accesos)"))
S.append(Paragraph("Clave de API de OpenAI (ChatGPT)", st_h2))
S.append(Paragraph(
    "Es la “llave” que permite al bot usar la IA. Se crea en <b>platform.openai.com</b> con la cuenta de la "
    "agencia o del cliente. Usamos el modelo <b>gpt-4.1-mini</b>: el mejor equilibrio entre calidad, precio "
    "y baja tasa de errores para este tipo de bot.", st_body))
S.append(Paragraph(
    "Se paga <b>por uso</b>, con <b>saldo prepago</b> (cargáis un importe y se va descontando). Cada "
    "conversación completa con un candidato cuesta <b>~1,5 céntimos de dólar</b>. No hay cuota mensual fija.", st_body))

cost = [
    [Paragraph("Carga inicial", st_cellh), Paragraph("Conversaciones aprox.", st_cellh), Paragraph("Para haceros una idea", st_cellh)],
    [Paragraph("10 USD", st_cellb), Paragraph("~650", st_cell), Paragraph("Pruebas y arranque con volumen bajo", st_cell)],
    [Paragraph("<b>20 USD &nbsp;(recomendado)</b>", st_cellb), Paragraph("<b>~1.300</b>", st_cellb), Paragraph("Sobra para el lanzamiento y los primeros meses de campaña", st_cell)],
    [Paragraph("50 USD", st_cellb), Paragraph("~3.300", st_cell), Paragraph("Campaña intensa o largo plazo", st_cell)],
]
S.append(section_table(cost, [30*mm, 38*mm, W-30*mm-38*mm]))
S.append(Spacer(1, 5))
S.append(Paragraph(
    "<b>Duración según volumen de candidatos</b> (con 20 USD): ~100 candidatos/mes ≈ 13 meses · "
    "~300/mes ≈ 4 meses · ~500/mes ≈ 2-3 meses. Recargar lleva 2 minutos cuando haga falta.", st_bodysm))
S.append(Spacer(1, 4))
st_callout = style("callout", fontName="Helvetica-Bold", fontSize=9, leading=13, textColor=colors.HexColor("#0C6B4F"))
S.append(Table([[Paragraph(
    "Recomendación: cargad 20 USD (~18 €) la primera vez. Es más que suficiente para empezar y validar el bot con candidatos reales.",
    st_callout)]],
    colWidths=[W], style=TableStyle([
        ("BACKGROUND",(0,0),(-1,-1),GREEN_BG),("BOX",(0,0),(-1,-1),0.6,GREEN),
        ("LEFTPADDING",(0,0),(-1,-1),9),("RIGHTPADDING",(0,0),(-1,-1),9),
        ("TOPPADDING",(0,0),(-1,-1),7),("BOTTOMPADDING",(0,0),(-1,-1),7),
    ])))

S.append(Paragraph("Cuenta de GitHub + repositorio", st_h3))
S.append(Paragraph(
    "Vuestro panel <b>panel.servidorlga.uk</b> (EasyPanel) despliega las aplicaciones conectándose a un "
    "repositorio de <b>GitHub</b>. Necesitamos una cuenta de GitHub de la agencia y crear ahí el repositorio "
    "del bot. Nosotros subimos el código y lo conectamos; a partir de ahí cada actualización se despliega "
    "sola. <b>Solo necesitamos</b> que creéis la cuenta (o nos digáis cuál usar) y nos deis acceso para subir el código.", st_body))

S.append(Paragraph("WhatsApp: YCloud + número + Meta", st_h3))
S.append(bullets([
    "Cuenta de <b>YCloud</b> (proveedor oficial de WhatsApp) y su clave de API.",
    "Un <b>número de teléfono dedicado</b> para el bot (no un número personal en uso).",
    "<b>Verificación de Meta Business</b> del número/empresa — lo exige WhatsApp oficial. Es el paso que "
    "más suele tardar: conviene empezarlo cuanto antes.",
    "Definir <b>de quién es la cuenta</b> de YCloud (agencia o Wolf Control).",
]))

S.append(Paragraph("Dominio del bot bajo panel.servidorlga.uk", st_h3))
S.append(Paragraph(
    "El bot vivirá como una app dentro de vuestro EasyPanel, con su propio subdominio. Por ejemplo:", st_body))
S.append(Table([[Paragraph("bot-wolfcontrol.servidorlga.uk", st_code)]], colWidths=[W],
    style=TableStyle([("BACKGROUND",(0,0),(-1,-1),PAPER2),("BOX",(0,0),(-1,-1),0.6,LINE),
        ("LEFTPADDING",(0,0),(-1,-1),9),("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6)])))
S.append(Spacer(1, 4))
S.append(Paragraph(
    "La dirección que conectaremos en YCloud (el <b>webhook</b>, por donde entran los mensajes de los "
    "candidatos) tendrá esta forma:", st_body))
S.append(Table([[Paragraph("https://bot-wolfcontrol.servidorlga.uk/webhook?secret=CLAVE", st_code)]], colWidths=[W],
    style=TableStyle([("BACKGROUND",(0,0),(-1,-1),PAPER2),("BOX",(0,0),(-1,-1),0.6,LINE),
        ("LEFTPADDING",(0,0),(-1,-1),9),("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6)])))
S.append(Spacer(1, 3))
S.append(Paragraph("Solo necesitamos que el subdominio apunte al EasyPanel; la configuración la hacemos juntos.", st_bodysm))

# ---------- 03 FLUJO ----------
S.append(Spacer(1, 6))
S.append(kicker("03 · Cómo se conecta todo"))
S.append(Paragraph("El recorrido de un mensaje", st_h2))
flow = [[
    Paragraph("Candidato<br/>(WhatsApp)", st_cellb),
    Paragraph("→", st_h3),
    Paragraph("YCloud<br/>(WhatsApp oficial)", st_cellb),
    Paragraph("→", st_h3),
    Paragraph("Bot en EasyPanel<br/>servidorlga.uk", st_cellb),
    Paragraph("→", st_h3),
    Paragraph("IA + base de datos<br/>→ respuesta", st_cellb),
]]
ft = Table(flow, colWidths=[W*0.18, W*0.05, W*0.21, W*0.05, W*0.22, W*0.05, W*0.24])
ft.setStyle(TableStyle([
    ("VALIGN",(0,0),(-1,-1),"MIDDLE"),("ALIGN",(0,0),(-1,-1),"CENTER"),
    ("BACKGROUND",(0,0),(0,0),BLUE_DEEP),("TEXTCOLOR",(0,0),(0,0),colors.white),
    ("BACKGROUND",(2,0),(2,0),PAPER2),("BACKGROUND",(4,0),(4,0),PAPER2),
    ("BACKGROUND",(6,0),(6,0),GREEN),("TEXTCOLOR",(6,0),(6,0),colors.white),
    ("BOX",(0,0),(0,0),0.6,BLUE_DEEP),("BOX",(2,0),(2,0),0.6,LINE),
    ("BOX",(4,0),(4,0),0.6,LINE),("BOX",(6,0),(6,0),0.6,GREEN),
    ("TOPPADDING",(0,0),(-1,-1),10),("BOTTOMPADDING",(0,0),(-1,-1),10),
    ("TEXTCOLOR",(1,0),(1,0),INK_MUTE),("TEXTCOLOR",(3,0),(3,0),INK_MUTE),("TEXTCOLOR",(5,0),(5,0),INK_MUTE),
]))
S.append(ft)

# ---------- 04 CRITERIOS ----------
S.append(Spacer(1, 8))
S.append(kicker("04 · Lo que necesitamos definir con Wolf Control"))
S.append(Paragraph("Los criterios del bot (para la Fase 2)", st_h2))
S.append(Paragraph(
    "El cuestionario inicial nos dio la base. Para que el bot decida bien y <b>sin inventar</b>, necesitamos "
    "que Wolf Control concrete estos puntos:", st_body))

S.append(Paragraph("4.1 · Personalidad y nombre del bot", st_h3))
S.append(bullets([
    "¿Cómo se llama el bot y cómo se presenta? (¿“Wolf Control”? ¿“equipo de selección de Wolf Control”?)",
    "Tono propuesto: cercano, profesional, de tú, en castellano. ¿Os encaja o lo ajustamos?",
]))

S.append(Paragraph("4.2 · Filtros de descarte directo (knockout)", st_h3))
S.append(Paragraph("Para cada requisito, necesitamos saber qué respuesta descarta <b>sí o sí</b>:", st_bodysm))
S.append(bullets([
    "¿Permiso de trabajo obligatorio?",
    "Vehículo propio: ¿obligatorio o solo suma puntos?",
    "Idiomas: ¿catalán obligatorio o basta con castellano?",
    "Zona: ¿se descarta a quien no sea de Girona, Barcelona o Tarragona?",
    "TIP: ¿obligatorio para algún puesto, o solo habilita el de controlador de acceso?",
]))

S.append(Paragraph("4.3 · Cómo puntuamos las respuestas abiertas (lo más importante)", st_h3))
S.append(Paragraph(
    "Las preguntas situacionales (p. ej. “una persona se desmaya, ¿cómo actúas?”) y las de compromiso no son "
    "de sí/no: hay que <b>valorarlas</b>. Para que la IA puntúe <b>igual que lo haría vuestro equipo</b> "
    "—y no a ojo— necesitamos una guía con ejemplos en tres niveles por cada pregunta:", st_body))
rub = [
    [Paragraph("Nivel", st_cellh), Paragraph("Qué significa", st_cellh), Paragraph("Ejemplo de respuesta del candidato", st_cellh)],
    [Paragraph("<b>Aceptable</b>", st_cellb), Paragraph("Correcta, muestra criterio y compromiso", st_cell), Paragraph("“Mantendría la calma, avisaría a emergencias y no dejaría sola a la persona.”", st_cell)],
    [Paragraph("<b>Poco aceptable</b>", st_cellb), Paragraph("Tibia o incompleta", st_cell), Paragraph("“Pues no sé, llamaría a alguien…”", st_cell)],
    [Paragraph("<b>No aceptable</b>", st_cellb), Paragraph("Red flag: falta de criterio o compromiso", st_cell), Paragraph("“Me iría, eso no es mi problema.”", st_cell)],
]
rt = section_table(rub, [28*mm, 45*mm, W-28*mm-45*mm], zebra=False)
rt.setStyle(TableStyle([
    ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
    ("LEFTPADDING",(0,0),(-1,-1),7),("RIGHTPADDING",(0,0),(-1,-1),7),
    ("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6),
    ("BOX",(0,0),(-1,-1),0.6,LINE),("INNERGRID",(0,0),(-1,-1),0.5,LINE),
    ("BACKGROUND",(0,0),(-1,0),BLUE_DEEP),
    ("BACKGROUND",(0,1),(0,1),GREEN_BG),
    ("BACKGROUND",(0,2),(0,2),AMBER_BG),
    ("BACKGROUND",(0,3),(0,3),RED_BG),
]))
S.append(rt)
S.append(Spacer(1, 4))
S.append(Paragraph(
    "<b>Os pedimos:</b> 2-3 ejemplos reales de respuesta buena, regular y mala por cada pregunta situacional "
    "y de compromiso. Con eso calibramos la nota <b>1-10</b> (≥5 apto, &lt;5 descartado), tal como nos indicasteis.", st_body))

S.append(Paragraph("4.4 · Qué pasa cuando un candidato es APTO", st_h3))
S.append(Paragraph("¿Qué hace el bot al final? Elegid una opción:", st_bodysm))
S.append(bullets([
    "<b>Opción A:</b> el bot da al candidato el teléfono del responsable de su zona (Marc / Demba / Santi) para que coordine la entrevista.",
    "<b>Opción B:</b> el bot avisa al responsable de la zona con los datos del candidato, y este lo contacta.",
]))

S.append(Paragraph("4.5 · Aviso de privacidad (RGPD)", st_h3))
S.append(Paragraph(
    "Al recoger datos de candidatos en España, WhatsApp y la ley exigen un aviso de privacidad / "
    "consentimiento. ¿Lo tenéis ya o lo redactamos nosotros?", st_body))

# ---------- 05 CHECKLIST ----------
S.append(Spacer(1, 8))
S.append(kicker("05 · Próximos pasos"))
S.append(Paragraph("Quién hace qué", st_h2))
chk = [
    [Paragraph("Responsable", st_cellh), Paragraph("Tarea", st_cellh)],
    [Paragraph("<b>Agencia LGA</b>", st_cellb), Paragraph("Crear la clave de API de OpenAI y cargar saldo (recomendado: 20 USD).", st_cell)],
    [Paragraph("<b>Agencia LGA</b>", st_cellb), Paragraph("Crear cuenta de GitHub y darnos acceso al repositorio del bot.", st_cell)],
    [Paragraph("<b>Agencia LGA</b>", st_cellb), Paragraph("Cuenta de YCloud + número dedicado + iniciar la verificación de Meta Business.", st_cell)],
    [Paragraph("<b>LGA + Wolf Control</b>", st_cellb), Paragraph("Completar los criterios de la sección 04 (filtros, rúbrica con ejemplos, acción del apto, RGPD).", st_cell)],
    [Paragraph("<b>Agencia LGA</b>", st_cellb), Paragraph("Confirmar el subdominio del bot en panel.servidorlga.uk.", st_cell)],
    [Paragraph("<b>jqsystem</b>", st_cellb), Paragraph("Subir el código, desplegar en EasyPanel, conectar el webhook a YCloud y construir la Fase 2.", st_cell)],
    [Paragraph("<b>jqsystem</b>", st_cellb), Paragraph("Pruebas (~20 conversaciones simuladas) y lanzamiento.", st_cell)],
]
S.append(section_table(chk, [38*mm, W-38*mm]))
S.append(Spacer(1, 10))
S.append(Table([[ "" ]], colWidths=[W], rowHeights=[2], style=TableStyle([("BACKGROUND",(0,0),(-1,-1),GREEN)])))
S.append(Spacer(1, 6))
S.append(Paragraph(
    "En cuanto tengamos los accesos (sección 02) lo desplegamos en marcha en pocos días. La sección 04 la "
    "podemos ir resolviendo en paralelo con Wolf Control mientras tanto. Cualquier duda, me decís.", st_bodysm))
S.append(Paragraph("— jqsystem", style("sig", fontName="Helvetica-Bold", fontSize=9.5, textColor=BLUE_DEEP, spaceBefore=4)))

doc.build(S)
print("OK ->", OUT)
