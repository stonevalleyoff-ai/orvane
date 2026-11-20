# Orvane — LE CONTRÔLE DES EFFECTIFS (outils/terre/especes-controle.py)
# L'ordre de grandeur tient-il ? Pour quelques espèces dont on connaît l'effectif européen, compare :
#  - « brut » : densité (especes.json) × surface des lieux de la carte où elle vit (ses habitats, dans ses cellules de présence) ;
#  - « monde » : ce que l'assembleur pose vraiment (outils/terre/assembler.js, qui pèse chaque lieu par ce qui lui convient), si on
#    lui donne une amorce (--amorce) ;
# chacun en entier et hors Russie, Biélorussie et Ukraine (les chiffres de référence ne les comptent pas).
#   python3 outils/terre/especes-controle.py [--amorce mondes/europe/amorce.json]
import argparse, json, os
ICI = os.path.dirname(os.path.abspath(__file__)); RACINE = os.path.dirname(os.path.dirname(ICI))
ap = argparse.ArgumentParser(); ap.add_argument('--amorce', default=None); args = ap.parse_args()
E = {t['id']: t for t in json.load(open(os.path.join(RACINE, 'mondes', 'europe', 'especes.json')))['especes']}
L = json.load(open(os.path.join(RACINE, 'mondes', 'europe', 'lieux.json')))['lieux']
HORS = {'RU', 'BY', 'UA', 'KZ', 'GE', 'AZ', 'AM', 'TR'}
# les chiffres connus : (bas, haut, source). « vérifié » : lu à la source ; sinon, un ordre de grandeur de la littérature générale.
REF = {
  'chevreuil':    (10e6, 20e6, 'ordre de grandeur souvent cité : ~15 millions hors Russie (Apollonio et al. 2010, non relu à la source)'),
  'sanglier':     (4e6, 10e6, 'ordre de grandeur : plusieurs millions, en hausse (non vérifié)'),
  'cerf-elaphe':  (1.5e6, 3.5e6, 'ordre de grandeur : 2 à 3 millions (non vérifié)'),
  'loup':         (17e3, 23e3, '19 400 dans l\'UE (Boitani et al. 2022, retenu par la Commission) ; ~21 500 en Europe hors Russie (LCIE, 2021-2022) — vérifié'),
  'ours-brun':    (15e3, 21e3, '~20 500 hors Russie (LCIE, 2023) ; 15 000 à 20 000 (2018) — vérifié (source secondaire)'),
  'lynx-boreal':  (7e3, 10e3, '~9 000 (LCIE, 2023) — vérifié (source secondaire)'),
  'glouton':      (.8e3, 1.5e3, '~1 000 dans l\'UE (LCIE) — vérifié (source secondaire)'),
}
def f(x): return f'{x / 1e6:.2f} M' if x >= 1e6 else f'{x / 1e3:.1f} k' if x >= 1e3 else f'{x:.0f}'
monde = None
if args.amorce:
    I = json.load(open(args.amorce)); pays = {b['id']: (b.get('lieu') or {}).get('pays') for b in I['biomes']}
    monde = {t['id']: (sum(p['effectif'] for p in t['populations']), sum(p['effectif'] for p in t['populations'] if pays.get(p['biome']) not in HORS)) for t in I['taxons']}
print(f"{'espèce':14} {'brut':>9} {'brut ouest':>11} {'monde':>9} {'monde ouest':>12}   référence")
for id, (bas, haut, src) in REF.items():
    e = E[id]; H = set(e['habitats']); C = set((e.get('presence') or {}).get('cellules', {}))
    S = [(l['lieu'].get('surface_km2') or 0, l['lieu'].get('pays')) for l in L if l['type'] in H and l['lieu']['h3'].rstrip('f') in C]
    brut = e['densite_km2'] * sum(s for s, _ in S); ouest = e['densite_km2'] * sum(s for s, p in S if p not in HORS)
    m = monde.get(id) if monde else None
    ok = lambda x: '✓' if bas / 3 <= x <= haut * 3 else '✗'
    print(f"{id:14} {f(brut):>9} {f(ouest):>10}{ok(ouest)} {f(m[0]) if m else '—':>9} {(f(m[1]) + ok(m[1])) if m else '—':>12}   {f(bas)}–{f(haut)} : {src}")
print('✓ : dans un facteur 3 de la fourchette de référence (hors Russie, Biélorussie, Ukraine)')
