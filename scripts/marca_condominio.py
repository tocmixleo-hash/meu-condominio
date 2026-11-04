#!/usr/bin/env python3
"""Gera os ativos da marca 'Meu Condomínio' a partir do logo oficial do usuário.

Entrada: /home/z/my-project/upload/Logo Clara.png (selo vertical: círculo + legenda)
Saídas em /home/z/my-project/public/:
  fotos/logo-meu-condominio-simbolo.png    — só o círculo (transparente)
  fotos/logo-meu-condominio-horizontal.png — símbolo à esquerda + legenda à direita
  icons/icon-192.png / icons/icon-512.png  — ícones PWA com o símbolo limpo
"""
from PIL import Image, ImageDraw
import numpy as np

SRC = "/home/z/my-project/upload/Logo Clara.png"
PUB = "/home/z/my-project/public/"

# bbox medidos previamente
CIRC = (137, 53, 435, 352)   # x0,y0,x1,y1 do círculo
TXT = (70, 371, 503, 418)    # x0,y0,x1,y1 da legenda "MEU CONDOMÍNIO"


def fundo_transparente(im: Image.Image) -> Image.Image:
    """Torna o fundo branco externo transparente (flood fill pelas bordas)."""
    rgb = im.convert("RGB")
    w, h = rgb.size
    work = rgb.copy()
    for seed in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1),
                 (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]:
        px = work.getpixel(seed)
        if min(px) > 200:
            ImageDraw.floodfill(work, seed, (255, 0, 255), thresh=60)
    a = np.array(work)
    mascara = (a[:, :, 0] == 255) & (a[:, :, 1] == 0) & (a[:, :, 2] == 255)
    out = np.array(im.convert("RGBA"))
    out[mascara] = (0, 0, 0, 0)
    # pixels claros remanescentes junto à borda: esmaece halo branco
    g = out[:, :, :3].mean(axis=2)
    halo = (g > 245) & (out[:, :, 3] > 0)
    fora = np.zeros_like(halo)
    # halo apenas se vizinho de transparente
    t = out[:, :, 3] == 0
    viz = np.zeros_like(t)
    viz[1:, :] |= t[:-1, :]; viz[:-1, :] |= t[1:, :]
    viz[:, 1:] |= t[:, :-1]; viz[:, :-1] |= t[:, 1:]
    halo &= viz
    out[halo, 3] = 0
    return Image.fromarray(out)


src = Image.open(SRC).convert("RGBA")

# 1) Símbolo (círculo com prédios) — recorte com folga, fundo transparente
sim = src.crop((CIRC[0] - 2, CIRC[1] - 2, CIRC[2] + 3, CIRC[3] + 3))
sim = fundo_transparente(sim)
bbox = sim.getbbox()
sim = sim.crop(bbox)
sim.save(PUB + "fotos/logo-meu-condominio-simbolo.png")
print("símbolo:", sim.size)

# 2) Legenda
txt = src.crop((TXT[0] - 2, TXT[1] - 2, TXT[2] + 3, TXT[3] + 3))
txt = fundo_transparente(txt)
tb = txt.getbbox()
txt = txt.crop(tb)
print("legenda:", txt.size)

# 3) Lockup horizontal — símbolo 150px, legenda em altura nativa (~49px, nítida)
HS = 150
sim_h = sim.resize((round(sim.width * HS / sim.height), HS), Image.LANCZOS)
HT = txt.height  # nativo, sem upscale
gap = 14
pad = 4
W = sim_h.width + gap + txt.width + 2 * pad
H = HS + 2 * pad
lock = Image.new("RGBA", (W, H), (0, 0, 0, 0))
lock.paste(sim_h, (pad, pad), sim_h)
lock.paste(txt, (pad + sim_h.width + gap, pad + (HS - HT) // 2), txt)
lock.save(PUB + "fotos/logo-meu-condominio-horizontal.png")
print("lockup horizontal:", lock.size, "proporção", round(W / H, 2))

# 4) Ícones PWA — símbolo centralizado sobre branco
for tamanho, nome in [(192, "icon-192.png"), (512, "icon-512.png")]:
    ico = Image.new("RGB", (tamanho, tamanho), (255, 255, 255))
    alvo = round(tamanho * 0.64)
    s = sim.resize((alvo, round(sim.height * alvo / sim.width)), Image.LANCZOS)
    ico.paste(s, ((tamanho - s.width) // 2, (tamanho - s.height) // 2), s)
    ico.save(PUB + "icons/" + nome)
    print("ícone", nome, ico.size)
