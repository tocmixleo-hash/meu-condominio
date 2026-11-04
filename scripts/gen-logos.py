#!/usr/bin/env python3
"""
Gera os assets de marca a partir das logos enviadas pelo usuário:

1. upload/Logo Clara.png (arte preta sobre branco, círculo + "MEU CONDOMÍNIO")
   → public/fotos/logo-meu-condominio.png  (fundo transparente)
   → public/icons/icon-192.png / icon-512.png (parte do círculo, fundo branco)

2. upload/Gemini_Generated_Image_*.jfif (lótus roxo "PARQUE FLÓRIDA", fundo cinza)
   → public/fotos/logo-parque-florida.png (fundo transparente)
"""
from PIL import Image
import numpy as np

OUT_MC = "public/fotos/logo-meu-condominio.png"
OUT_FL = "public/fotos/logo-parque-florida.png"
ICON_192 = "public/icons/icon-192.png"
ICON_512 = "public/icons/icon-512.png"


def trim(alPHA: np.ndarray, pad: int = 8):
    ys, xs = np.where(alPHA > 8)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    return y0, y1, x0, x1


# ── 1. Logo Clara ────────────────────────────────────────────────────────────
mc = Image.open("upload/Logo Clara.png").convert("RGBA")
arr = np.array(mc).astype(int)
rgb, a = arr[..., :3], arr[..., 3]
lum = rgb.mean(-1)
coloridos = int(((rgb.max(-1) - rgb.min(-1)) > 12).sum())
print(f"Logo Clara: {mc.size}, pixels coloridos: {coloridos}, opacos: {(a > 250).sum()}")

# arte monocromática preta sobre branco → luminância vira alfa
alpha_mc = np.clip(255 - lum, 0, 255).astype(np.uint8)
alpha_mc[a < 10] = 0  # já transparente antes, mantém
y0, y1, x0, x1 = trim(alpha_mc)
y0 = max(0, y0 - 6); x0 = max(0, x0 - 6); y1 = min(alpha_mc.shape[0] - 1, y1 + 6); x1 = min(alpha_mc.shape[1] - 1, x1 + 6)

out = np.zeros((y1 - y0 + 1, x1 - x0 + 1, 4), dtype=np.uint8)
out[..., 0] = 16  # preto levemente suave (#101010)
out[..., 1] = 16
out[..., 2] = 16
out[..., 3] = alpha_mc[y0:y1 + 1, x0:x1 + 1]
mc_final = Image.fromarray(out, "RGBA")
mc_final.save(OUT_MC)
print(f"→ {OUT_MC}: {mc_final.size}")

# círculo (ícone) = do topo até a primeira lacuna vazia de ≥5 linhas (antes do texto)
linhas_com_tinta = (alpha_mc > 8).sum(axis=1)
primeiro = int(np.where(linhas_com_tinta > 0)[0][0])
topo_y1 = alpha_mc.shape[0] - 1
run = 0
for y in range(primeiro, alpha_mc.shape[0]):
    if linhas_com_tinta[y] == 0:
        run += 1
        if run >= 5:
            topo_y1 = y - run  # fim do bloco do círculo
            break
    else:
        run = 0
alpha_icon = alpha_mc[: topo_y1 - 2, :]
iy0, iy1, ix0, ix1 = trim(alpha_icon, pad=0)
art = alpha_icon[iy0:iy1 + 1, ix0:ix1 + 1]
print(f"ícone círculo: bloco termina em y={topo_y1}, recorte {art.shape[1]}x{art.shape[0]}")

lado = int(max(art.shape) * 1.18)
for tamanho, caminho in ((512, ICON_512), (192, ICON_192)):
    canvas = Image.new("RGBA", (lado, lado), (255, 255, 255, 255))
    ic = Image.fromarray(np.dstack([
        np.zeros_like(art), np.zeros_like(art), np.zeros_like(art), art
    ]), "RGBA")
    canvas.alpha_composite(ic, ((lado - art.shape[1]) // 2, (lado - art.shape[0]) // 2))
    canvas = canvas.convert("RGB").resize((tamanho, tamanho), Image.LANCZOS)
    canvas.save(caminho)
    print(f"→ {caminho}: {canvas.size}")

# ── 2. Logo Parque Flórida ───────────────────────────────────────────────────
fl = Image.open("upload/Gemini_Generated_Image_8sru7q8sru7q8sru.jfif").convert("RGB")
fa = np.array(fl).astype(int)
bg = fa[3, 3].copy()
dist = np.abs(fa - bg).sum(-1)
print(f"Flórida: {fl.size}, cor de fundo: {tuple(bg)}, dist máx no canto: {dist[0,0]}")

tol = 46
alpha_fl = np.where(dist < tol, 0, 255).astype(np.uint8)
# erosão 3x3 do alfa para matar halo JPEG nas bordas
padded = np.pad(alpha_fl, 1, constant_values=0)
erod = padded[1:-1, 1:-1].copy()
for dy in (-1, 0, 1):
    for dx in (-1, 0, 1):
        if dy or dx:
            erod = np.minimum(erod, padded[1 + dy : padded.shape[0] - 1 + dy, 1 + dx : padded.shape[1] - 1 + dx])
alpha_fl = erod
fy0, fy1, fx0, fx1 = trim(alpha_fl, pad=6)
out_fl = np.zeros((fy1 - fy0 + 1, fx1 - fx0 + 1, 4), dtype=np.uint8)
out_fl[..., :3] = fa[fy0:fy1 + 1, fx0:fx1 + 1].astype(np.uint8)
out_fl[..., 3] = alpha_fl[fy0:fy1 + 1, fx0:fx1 + 1]
fl_final = Image.fromarray(out_fl, "RGBA")
fl_final.save(OUT_FL)
print(f"→ {OUT_FL}: {fl_final.size}")

# pré-visualizações sobre fundo claro dos temas
for nome, img, cor in (("mc", mc_final, (247, 246, 243)), ("fl", fl_final, (245, 245, 245))):
    prev = Image.new("RGB", (img.width + 40, img.height + 40), cor)
    prev.paste(img, (20, 20), img)
    prev.save(f"/tmp/preview-{nome}.png")
print("previews em /tmp/preview-mc.png e /tmp/preview-fl.png")
