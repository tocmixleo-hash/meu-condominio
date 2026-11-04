#!/usr/bin/env python3
"""Gera logo Parque Florida (arte floral do California + texto FLORIDA),
foto da fachada e ícones PWA (192/512) do ícone-flor."""
from PIL import Image, ImageDraw, ImageFont
import shutil, os

RAIZ = "/home/z/my-project"
FONTE_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
ORIG = f"{RAIZ}/public/fotos/logo-parque-california.png"
DEST_LOGO = f"{RAIZ}/public/fotos/logo-parque-florida.png"
FOTO_ORIG = f"{RAIZ}/public/fotos/parque-california.jpg"
FOTO_DEST = f"{RAIZ}/public/fotos/parque-florida.jpg"
ICONE_FONTE = f"{RAIZ}/public/fotos/logo-flor.png"
PASTA_ICONES = f"{RAIZ}/public/icons"

L, A = 480, 288
COR_TEXTO = (55, 56, 60)

im = Image.open(ORIG).convert("RGB")
arte = im.crop((0, 0, L, 172))

logo = Image.new("RGB", (L, A), (255, 255, 255))
logo.paste(arte, (0, 0))
d = ImageDraw.Draw(logo)

def texto_espacado(draw, texto, y_centro, fonte, espacamento, cor):
    larguras = [draw.textlength(ch, font=fonte) for ch in texto]
    total = sum(larguras) + espacamento * (len(texto) - 1)
    x = (L - total) / 2
    asc, desc = fonte.getmetrics()
    y = y_centro - (asc + desc) / 2
    for ch, w in zip(texto, larguras):
        draw.text((x, y), ch, font=fonte, fill=cor)
        x += w + espacamento

texto_espacado(d, "PARQUE", 194, ImageFont.truetype(FONTE_BOLD, 26), 9, COR_TEXTO)

alvo, tamanho = 300, 70
while tamanho > 30:
    f = ImageFont.truetype(FONTE_BOLD, tamanho)
    if d.textlength("FLORIDA", font=f) <= alvo:
        break
    tamanho -= 2
f_florida = ImageFont.truetype(FONTE_BOLD, tamanho)
d.text(((L - d.textlength("FLORIDA", font=f_florida)) / 2, 210), "FLORIDA",
       font=f_florida, fill=COR_TEXTO)
logo.save(DEST_LOGO)

# Foto da fachada (mesmo bloco, mesma imagem)
shutil.copyfile(FOTO_ORIG, FOTO_DEST)

# Ícones PWA a partir do ícone-flor
os.makedirs(PASTA_ICONES, exist_ok=True)
flor = Image.open(ICONE_FONTE).convert("RGB")
print("logo-flor.png:", flor.size)
for lado in (192, 512):
    # Fundo branco quadrado + flor centralizada com folga
    canvas = Image.new("RGB", (lado, lado), (255, 255, 255))
    margem = int(lado * 0.18)
    area = lado - 2 * margem
    flor_ajustada = flor.resize((area, area), Image.LANCZOS)
    canvas.paste(flor_ajustada, (margem, margem))
    canvas.save(f"{PASTA_ICONES}/icon-{lado}.png")

print("OK: logo Florida, foto e ícones PWA gerados.")
