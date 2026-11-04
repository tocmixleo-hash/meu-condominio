#!/usr/bin/env python3
"""Gera os ativos visuais do portal a partir da logotipo oficial do Parque Califórnia.

Saídas em /home/z/my-project/public/:
  - logo-parque-california.png : logotipo completa recortada, fundo transparente
  - logo-emblema.png           : emblema (sol + folhas), fundo transparente
  - icon-512.png / icon-192.png / favicon.png : ícones PWA com emblema sobre fundo creme
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

RAIZ = Path('/home/z/my-project')
PUBLIC = RAIZ / 'public'
ORIGEM = RAIZ / 'upload' / 'Logotipo Parque Califórnia com Folhas.png'

CREME = (247, 246, 243, 255)  # #F7F6F3 — fundo dos ícones PWA


def fundo_transparente(img: Image.Image, remover_cinza: bool = False) -> Image.Image:
    """Converte pixels quase brancos em transparentes, com leve suavização.

    Com remover_cinza=True também elimina pixels cinzas (o texto da logotipo),
    útil para isolar o emblema colorido.
    """
    rgba = img.convert('RGBA')
    arr = np.array(rgba)
    r, g, b = arr[..., 0].astype(int), arr[..., 1].astype(int), arr[..., 2].astype(int)
    quase_branco = (r > 238) & (g > 238) & (b > 238)
    alfa = np.where(quase_branco, 0, 255).astype('uint8')
    if remover_cinza:
        hsv = np.array(img.convert('HSV'))
        s, v = hsv[..., 1].astype(int), hsv[..., 2].astype(int)
        cinza = (s < 45) & (v < 175)
        alfa = np.where(cinza, 0, alfa).astype('uint8')
    alfa_suave = Image.fromarray(alfa).filter(ImageFilter.GaussianBlur(0.7))
    rgba.putalpha(alfa_suave)
    return rgba


def recortar_margens(img: Image.Image) -> Image.Image:
    """Remove margens brancas ao redor da imagem."""
    arr = np.array(img.convert('RGBA'))
    opaco = arr[..., 3] > 10
    linhas = np.any(opaco, axis=1)
    colunas = np.any(opaco, axis=0)
    topo, base = np.argmax(linhas), len(linhas) - np.argmax(linhas[::-1])
    esq, dir_ = np.argmax(colunas), len(colunas) - np.argmax(colunas[::-1])
    return img.crop((esq, topo, dir_, base))


def bbox_emblema(img: Image.Image) -> tuple[int, int, int, int]:
    """Caixa do emblema = pixels quentes (laranja/vermelho/amarelo), ignorando o texto cinza."""
    hsv = np.array(img.convert('HSV'))
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    quente = (s > 60) & (v > 110)
    linhas = np.any(quente, axis=1)
    colunas = np.any(quente, axis=0)
    topo, base = np.argmax(linhas), len(linhas) - np.argmax(linhas[::-1])
    esq, dir_ = np.argmax(colunas), len(colunas) - np.argmax(colunas[::-1])
    return esq, topo, dir_, base


def icone_pwa(emblema: Image.Image, lado: int) -> Image.Image:
    """Quadrado creme com o emblema centralizado (62% do lado — área segura maskable)."""
    canvas = Image.new('RGBA', (lado, lado), CREME)
    alvo = int(lado * 0.62)
    escala = alvo / max(emblema.size)
    novo = emblema.resize((round(emblema.width * escala), round(emblema.height * escala)), Image.LANCZOS)
    x = (lado - novo.width) // 2
    y = (lado - novo.height) // 2
    canvas.paste(novo, (x, y), novo)
    return canvas


def main() -> None:
    original = Image.open(ORIGEM)

    # 1) Logotipo completa (recortada + transparente)
    completa = fundo_transparente(original)
    completa = recortar_margens(completa)
    completa.save(PUBLIC / 'logo-parque-california.png')
    print(f"logo-parque-california.png ok ({completa.size[0]}x{completa.size[1]})")

    # 2) Emblema (sol com folhas), sem o texto
    x0, y0, x1, y1 = bbox_emblema(original)
    pad = 6
    caixa = (max(0, x0 - pad), max(0, y0 - pad), min(original.width, x1 + pad), min(original.height, y1 + pad))
    emblema = fundo_transparente(original.crop(caixa), remover_cinza=True)
    emblema.save(PUBLIC / 'logo-emblema.png')
    print(f"logo-emblema.png ok ({emblema.size[0]}x{emblema.size[1]})")

    # 3) Ícones PWA + favicon
    icone_pwa(emblema, 512).save(PUBLIC / 'icon-512.png')
    icone_pwa(emblema, 512).resize((192, 192), Image.LANCZOS).save(PUBLIC / 'icon-192.png')
    icone_pwa(emblema, 512).resize((64, 64), Image.LANCZOS).save(PUBLIC / 'favicon.png')
    print('icon-512.png, icon-192.png e favicon.png ok')


if __name__ == '__main__':
    main()
