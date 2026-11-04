#!/usr/bin/env python3
"""Aplica a paleta neutra quente (Parque Califórnia) em todo o portal.

Paleta base:
  #f7f6f3 off-white (fundo) · #dfdacf bege · #a3968d greige
  #4d403a marrom-escuro (primário) · #262626 quase-preto (texto)
"""
from pathlib import Path

RAIZ = Path('/home/z/my-project')

ARQUIVOS_CORES = [
    'src/components/portal/app-shell.tsx',
    'src/components/portal/dashboard.tsx',
    'src/components/portal/reservas.tsx',
    'src/components/portal/financeiro.tsx',
    'src/components/portal/documentos.tsx',
    'src/components/portal/assembleias.tsx',
    'src/components/portal/moradores.tsx',
    'src/components/portal/login-screen.tsx',
    'src/components/portal/comunicados.tsx',
    'src/components/portal/ui.tsx',
    'src/app/page.tsx',
    'src/app/layout.tsx',
    'public/manifest.json',
]

# A ordem importa: tokens mais específicos/longos primeiro
MAPA = [
    # azul-marinho -> marrom-escuro da paleta
    ('hover:bg-[#123A5F]', 'hover:bg-[#61514A]'),
    ('#0E2B4C', '#4D403A'),
    ('#123A5F', '#4D403A'),
    ('#33506E', '#6B5B51'),
    ('#5B7A9D', '#A3968D'),
    # fundos frios -> neutros quentes
    ('#EEF3F9', '#EFE9E1'),
    ('#F6F8FB', '#F7F6F3'),
    # cinza frio (slate) -> cinza quente (stone)
    ('slate-900', 'stone-900'),
    ('slate-800', 'stone-800'),
    ('slate-700', 'stone-700'),
    ('slate-600', 'stone-600'),
    ('slate-500', 'stone-500'),
    ('slate-400', 'stone-400'),
    ('slate-300', 'stone-300'),
    ('slate-200', 'stone-200'),
    ('slate-100', 'stone-200'),
    ('slate-50', 'stone-100'),
    # azul funcional (badges/avisos) -> tinta bege com texto marrom
    ('blue-100', '[#EFE9E1]'),
    ('blue-50', '[#EFE9E1]'),
    ('blue-700', '[#4D403A]'),
    ('blue-900', '[#4D403A]'),
]

for rel in ARQUIVOS_CORES:
    p = RAIZ / rel
    txt = p.read_text(encoding='utf-8')
    antes = txt
    for velho, novo in MAPA:
        txt = txt.replace(velho, novo)
    if txt != antes:
        p.write_text(txt, encoding='utf-8')
        print(f'atualizado: {rel}')

# Comentário do shell descrevia a cor antiga
shell = RAIZ / 'src/components/portal/app-shell.tsx'
txt = shell.read_text(encoding='utf-8')
txt = txt.replace('menu lateral fixo azul-marinho', 'menu lateral fixo marrom-escuro')
shell.write_text(txt, encoding='utf-8')

# CardStat: destaque 'marinho' passa a se chamar 'neutro'
for rel in ['src/components/portal/ui.tsx', 'src/components/portal/dashboard.tsx']:
    p = RAIZ / rel
    txt = p.read_text(encoding='utf-8')
    txt = txt.replace('marinho', 'neutro')
    p.write_text(txt, encoding='utf-8')
    print(f"renomeado 'marinho' -> 'neutro': {rel}")

print('Paleta aplicada com sucesso.')
