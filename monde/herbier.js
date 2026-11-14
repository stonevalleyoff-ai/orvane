// Orvane — L'HERBIER (monde/herbier.js) — docs/49
// À chaque cycle, chaque plante d'un biome dessinée, comme sur une planche de botaniste : pour qu'un jeu, dans n'importe quel
// moteur, montre la flore d'Orvane sans refaire son dessin. Godot lit un SVG (Image.load_svg_from_string), un navigateur aussi.
//   morceaux/herbier/<biome>.json : { orvane, monde, cycle, biome, cadre: [120, 150], meteo,
//     plantes: { <lignée>: { svg, nom, forme, port, hauteur_m, stade, feuillage, part, defense, caracteres, sinistre } } }
// Le dessin vient du plan de la lignée (sa forme, son port, sa hauteur) et de ce qu'elle est ce cycle : son stade (nue, en fleurs,
// en fruits… docs/46), la part de son feuillage, un sinistre récent (docs/47), sa défense la plus fréquente ici (des épines, docs/17).
// Deux lignées de la même forme n'ont pas tout à fait le même dessin : chacune tire le sien de son nom. Une plante remplit son cadre,
// le pied en bas : sa taille vraie est dans son plan (hauteur_m). part : son poids parmi les plantes du biome, pour en semer plus ou moins.
//   Herbier.dessiner(plan, etat, id) → le SVG ; etat : { stade, feuillage, sinistre, defense }
//   Herbier.planche(flore, biome)    → l'herbier d'un biome ; flore : flore.json ; biome : { id, meteo… }
//   Herbier.planches(flore, biomes)  → { 'herbier/<biome>.json': … }
// Sans dépendance. Déterministe. Node (require) ou navigateur (globalThis.OrvaneHerbier).
(function (racine) {
'use strict';
const W = 120, H = 150, SOL = 144;
const n1 = v => +(+v).toFixed(1), clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const hasard = s => { let g = 2166136261 >>> 0; for (const c of String(s)) g = Math.imul(g ^ c.charCodeAt(0), 16777619) >>> 0; return () => { g = (Math.imul(g, 1664525) + 1013904223) >>> 0; return g / 4294967296; }; };
// les couleurs : le vert d'une lignée vient de sa niche (sombre au froid, vif au chaud et à l'humide) ; le stade le déplace
const hsl = (h, s, l) => `hsl(${Math.round(h)},${Math.round(s)}%,${Math.round(l)}%)`;
function teintes(plan, etat, R) {
  const T = plan.niche?.temperature ?? .5, Hm = plan.niche?.humidite ?? .5, st = etat.stade;
  let h = 95 + 45 * (1 - T) - 20 * (1 - Hm) + 16 * (R() - .5), s = 32 + 30 * Hm, l = 26 + 14 * T + 6 * (R() - .5);
  if (plan.forme === 'conifere' || plan.forme === 'varech') { l -= 6; s -= 6; }
  if (st === 'feuilles_tombent') { h = 28 + 18 * R(); s = 62; l = 44; } else if (st === 'seche') { h = 48; s = 42; l = 58; } else if (st === 'bourgeons') { h = 82; s = 50; l = 55; }
  const brule = etat.sinistre?.type === 'incendie' && st === 'brule';
  return { feuille: brule ? '#3a3531' : hsl(h, s, l), clair: brule ? '#57504a' : hsl(h - 6, s, l + 12), bois: brule ? '#1f1c1a' : hsl(24 + 10 * R(), 28, 26 + 8 * R()), fleur: hsl([330, 48, 280, 0, 200, 15][Math.floor(R() * 6)], 72, 72), fruit: hsl([8, 28, 350, 280, 45][Math.floor(R() * 5)], 74, 48), brule };
}
const rond = (x, y, r, c, o) => `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r)}" fill="${c}"${o != null ? ` opacity="${n1(o)}"` : ''}/>`;
const trait = (d, c, w, o) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${n1(w)}" stroke-linecap="round"${o != null ? ` opacity="${n1(o)}"` : ''}/>`;
const plein = (d, c, o) => `<path d="${d}" fill="${c}"${o != null ? ` opacity="${n1(o)}"` : ''}/>`;
// des points semés dans un disque (les fleurs, les fruits, les bourgeons)
const semis = (R, cx, cy, rx, ry, nb, r, c) => { let s = ''; for (let i = 0; i < nb; i++) { const a = 2 * Math.PI * R(), d = Math.sqrt(R()); s += rond(cx + rx * d * Math.cos(a), cy + ry * d * Math.sin(a), r * (.7 + .6 * R()), c); } return s; };
// une couronne de feuillage : des boules autour d'un centre ; f : la part du feuillage qui est là
function couronne(R, C, cx, cy, rx, ry, f, nb = 7) {
  if (f <= .02) return ''; let s = '';
  for (let i = 0; i < nb; i++) { const a = 2 * Math.PI * (i + R() * .6) / nb, d = .45 + .3 * R(); s += rond(cx + rx * d * Math.cos(a), cy + ry * d * Math.sin(a), Math.min(rx, ry) * (.48 + .2 * R()) * (.6 + .4 * f), i % 2 ? C.feuille : C.clair, .55 + .45 * f); }
  return s + rond(cx, cy, Math.min(rx, ry) * .62 * (.6 + .4 * f), C.feuille, .6 + .4 * f);
}
// des branches nues (un arbre caduc en hiver, un arbre brûlé)
function branches(R, C, x, y, h, l, prof = 3) { let s = ''; const b = (x0, y0, ang, len, w, k) => { const x1 = x0 + len * Math.sin(ang), y1 = y0 - len * Math.cos(ang); s += trait(`M${n1(x0)},${n1(y0)} L${n1(x1)},${n1(y1)}`, C.bois, w); if (k > 0) { b(x1, y1, ang - .45 - .3 * R(), len * .68, w * .65, k - 1); b(x1, y1, ang + .45 + .3 * R(), len * .68, w * .65, k - 1); } };
  b(x, y, (R() - .5) * .2, h, l, prof); return s; }
const decor = (R, C, etat, cx, cy, rx, ry, nb) => etat.stade === 'fleurs' ? semis(R, cx, cy, rx, ry, nb, 2.2, C.fleur) : etat.stade === 'fruits' ? semis(R, cx, cy, rx, ry, nb, 2.4, C.fruit) : etat.stade === 'bourgeons' ? semis(R, cx, cy, rx, ry, nb, 1.6, C.clair) : etat.stade === 'graines' ? semis(R, cx, cy, rx, ry, nb, 1.5, '#c9a86a') : '';
const epines = (R, x, y0, y1, nb, c = '#5b4a3a') => { let s = ''; for (let i = 0; i < nb; i++) { const y = y0 + (y1 - y0) * R(), d = R() < .5 ? -1 : 1; s += trait(`M${n1(x)},${n1(y)} l${n1(4 * d)},${n1(-2.5)}`, c, .9); } return s; };
const neige = () => plein(`M8,${SOL} Q60,${SOL - 40} 112,${SOL} Z`, '#f2f6fa', .92);
const eau = y => trait(`M4,${y} q14,-5 28,0 t28,0 t28,0 t28,0`, '#6fa8c9', 1.6, .8);

// --- chaque port, et les formes qui s'en écartent ---
function arbre(R, C, plan, etat) {
  const f = etat.feuillage ?? 1, forme = plan.forme, nu = etat.stade === 'nu' || C.brule, x = 60 + 6 * (R() - .5); let s = '';
  if (forme === 'conifere') { s += trait(`M${x},${SOL} L${x},40`, C.bois, 5); if (!C.brule) for (let i = 0; i < 5; i++) { const y = 118 - i * 22, w = 34 - i * 5.5; s += plein(`M${n1(x - w)},${y} L${x},${y - 34} L${n1(x + w)},${y} Z`, i % 2 ? C.feuille : C.clair, .7 + .3 * f); } else s += branches(R, C, x, 110, 24, 2.5, 2); return s; }
  if (forme === 'palmier' || forme === 'fougere_arbre') { const c = 10 * (R() - .5), y = forme === 'palmier' ? 44 : 70; s += trait(`M${x},${SOL} Q${n1(x + c)},${n1((SOL + y) / 2)} ${n1(x + c / 2)},${y}`, C.bois, forme === 'palmier' ? 5 : 7);
    if (!C.brule) for (let i = 0; i < 11; i++) { const a = Math.PI * (i / 10) + (R() - .5) * .15, l = 44 + 10 * R(), ex = x + c / 2 + l * Math.cos(a), ey = y - l * Math.sin(a) * .5 + 22 * (1 - Math.sin(a)); s += trait(`M${n1(x + c / 2)},${y} Q${n1(x + c / 2 + l * .6 * Math.cos(a))},${n1(y - 34 * Math.sin(a) - 6)} ${n1(ex)},${n1(ey)}`, i % 2 ? C.feuille : C.clair, forme === 'palmier' ? 5 : 6, .65 + .35 * f); }
    return s + (forme === 'palmier' ? decor(R, C, etat, x + c / 2, y + 6, 7, 5, 6) : ''); }
  const haut = forme === 'geant' || forme === 'emergent', gros = forme === 'bouteille', bas = forme === 'sous_bois' || forme === 'fruitier', large = forme === 'figuier';
  const yc = haut ? 30 : bas ? 78 : 58, rx = haut ? 30 : large ? 52 : bas ? 40 : 44, ry = haut ? 22 : bas ? 34 : 40, lt = gros ? 22 : haut ? 9 : large ? 11 : 7;
  if (forme === 'paletuvier') for (let i = 0; i < 6; i++) { const d = (i - 2.5) * 9; s += trait(`M${x},${SOL - 34} Q${n1(x + d)},${SOL - 26} ${n1(x + d * 1.6)},${SOL}`, C.bois, 2.2); }
  if (large) for (let i = 0; i < 4; i++) { const d = (i - 1.5) * 8; s += trait(`M${n1(x + d)},${SOL} Q${n1(x + d * .4)},${SOL - 40} ${n1(x + d * .2)},${yc + 10}`, C.bois, 3.2); }
  s += gros ? plein(`M${n1(x - lt / 2)},${SOL} Q${n1(x - lt * .8)},${SOL - 40} ${n1(x - lt * .22)},${yc + 18} L${n1(x + lt * .22)},${yc + 18} Q${n1(x + lt * .8)},${SOL - 40} ${n1(x + lt / 2)},${SOL} Z`, C.bois)
    : plein(`M${n1(x - lt / 2)},${SOL} L${n1(x - lt * .28)},${yc + 8} L${n1(x + lt * .28)},${yc + 8} L${n1(x + lt / 2)},${SOL} Z`, C.bois);
  if (nu || f < .25) s += branches(R, C, x - 8, yc + 22, 20, 3, 3) + branches(R, C, x + 8, yc + 24, 18, 3, 3) + branches(R, C, x, yc + 14, 22, 3.2, 3);
  if (!nu) s += couronne(R, C, x, yc, rx, ry, gros ? f * .7 : f, gros ? 5 : 8) + decor(R, C, etat, x, yc, rx * .8, ry * .75, 14);
  if (etat.stade === 'bourgeons') s += decor(R, C, etat, x, yc, rx * .7, ry * .6, 16);
  if (etat.defense?.includes('epineux')) s += epines(R, x, yc + 20, SOL - 6, 7);
  return s;
}
function buisson(R, C, plan, etat) {
  const f = etat.feuillage ?? 1, forme = plan.forme, nu = etat.stade === 'nu' || C.brule; let s = '';
  if (forme === 'liane') { for (let i = 0; i < 5; i++) { const x = 20 + i * 20 + 8 * (R() - .5), l = 70 + 50 * R(); s += trait(`M${n1(x)},8 Q${n1(x + 14 * (R() - .5))},${n1(8 + l / 2)} ${n1(x + 10 * (R() - .5))},${n1(8 + l)}`, C.bois, 1.8); if (!C.brule) for (let k = 0; k < 5; k++) s += rond(x + 6 * (R() - .5), 14 + l * k / 5, 4.5 * (.5 + .5 * f), k % 2 ? C.feuille : C.clair, .9); } return s + decor(R, C, etat, 60, 60, 44, 44, 10); }
  const nb = forme === 'bruyere' ? 6 : 4, hb = forme === 'bruyere' ? 34 : forme === 'aromatique' ? 44 : 62;
  for (let i = 0; i < nb; i++) { const x = 22 + (76 * i) / (nb - 1) + 6 * (R() - .5); s += trait(`M60,${SOL} Q${n1((60 + x) / 2)},${SOL - hb * .5} ${n1(x)},${SOL - hb * (.6 + .3 * R())}`, C.bois, 2.2); }
  if (nu) return s + (etat.defense?.includes('epineux') || forme === 'epine' || forme === 'ronce' ? epines(R, 60, SOL - hb, SOL - 8, 10) : '');
  s += couronne(R, C, 60, SOL - hb * .72, 46, hb * .5, f, forme === 'epine' ? 5 : 8);
  if (forme === 'bruyere' && etat.stade !== 'fruits') s += semis(R, 60, SOL - hb * .8, 40, hb * .35, 18, 1.8, etat.stade === 'fleurs' ? '#b56bb0' : C.clair);
  s += decor(R, C, etat, 60, SOL - hb * .72, 38, hb * .4, forme === 'ronce' || forme === 'baies' ? 18 : 10);
  if (etat.defense?.includes('epineux') || forme === 'epine' || forme === 'ronce') for (let i = 0; i < 9; i++) { const a = Math.PI * R(), x = 60 + 44 * Math.cos(a), y = SOL - hb * .72 - hb * .5 * Math.sin(a); s += trait(`M${n1(x)},${n1(y)} l${n1(5 * Math.cos(a))},${n1(-5 * Math.sin(a))}`, '#5b4a3a', 1); }
  return s;
}
function herbe(R, C, plan, etat) {
  const f = etat.feuillage ?? 1, forme = plan.forme; let s = '';
  if (forme === 'mousse' || forme === 'coussin' || forme === 'sphaigne') { s += plein(`M14,${SOL} Q60,${SOL - (forme === 'coussin' ? 46 : 26)} 106,${SOL} Z`, C.feuille) + semis(R, 60, SOL - 12, 40, 9, 22, 2.4, C.clair); return s + decor(R, C, etat, 60, SOL - 16, 36, 8, 9); }
  if (forme === 'bromelia') { for (let i = 0; i < 9; i++) { const a = Math.PI * (i + .5) / 9; s += plein(`M56,${SOL} Q${n1(60 + 30 * Math.cos(a))},${n1(SOL - 30 * Math.sin(a))} ${n1(60 + 52 * Math.cos(a))},${n1(SOL - 58 * Math.sin(a))} Q${n1(60 + 34 * Math.cos(a))},${n1(SOL - 22 * Math.sin(a))} 64,${SOL} Z`, i % 2 ? C.feuille : C.clair); } return s + (etat.stade === 'fleurs' ? trait(`M60,${SOL - 20} L60,${SOL - 78}`, C.fleur, 5) : ''); }
  const fougere = forme === 'fougere', haut = forme === 'hautes_herbes' || forme === 'grande_herbe' || forme === 'cereale', nb = fougere ? 7 : 13, hh = haut ? 118 : fougere ? 84 : forme === 'orchidee' ? 70 : 62;
  for (let i = 0; i < nb; i++) { const x0 = 60 + 22 * (i / (nb - 1) - .5), a = (i / (nb - 1) - .5) * (fougere ? 2.2 : haut ? .8 : 1.3) + .2 * (R() - .5), l = hh * (.6 + .4 * R()) * (.55 + .45 * f), x1 = x0 + l * Math.sin(a), y1 = SOL - l * Math.cos(a);
    s += trait(`M${n1(x0)},${SOL} Q${n1(x0 + l * .2 * Math.sin(a))},${n1(SOL - l * .6)} ${n1(x1)},${n1(y1)}`, i % 2 ? C.feuille : C.clair, fougere ? 5 : forme === 'grande_herbe' ? 4 : 2.2, .9);
    if (forme === 'cereale' || etat.stade === 'graines') s += trait(`M${n1(x1)},${n1(y1)} l${n1(3 * Math.sin(a))},${n1(-9)}`, '#c9a86a', 3.2);
    if ((forme === 'fleur' || forme === 'bulbe' || forme === 'legumineuse' || forme === 'orchidee') && etat.stade === 'fleurs' && i % 2 === 0) s += rond(x1, y1, forme === 'orchidee' ? 6 : 4, C.fleur) + rond(x1, y1, 1.4, '#f4d35e'); }
  if (etat.stade === 'fleurs' && !['fleur', 'bulbe', 'legumineuse', 'orchidee', 'fougere'].includes(forme)) s += semis(R, 60, SOL - hh * .6, 30, hh * .25, 8, 1.8, C.fleur);
  if (forme === 'bulbe') s += rond(60, SOL + 1, 7, '#b08a5a');
  return s;
}
function roseau(R, C, plan, etat) {
  const f = etat.feuillage ?? 1, forme = plan.forme, nb = forme === 'bambou' ? 5 : 9; let s = eau(SOL - 4);
  for (let i = 0; i < nb; i++) { const x = 24 + 72 * (i + R() * .5) / nb, h = (forme === 'jonc' ? 78 : 124) * (.7 + .3 * R()), y = SOL - h, pl = 6 * (R() - .5);
    s += trait(`M${n1(x)},${SOL} Q${n1(x + pl)},${n1(SOL - h / 2)} ${n1(x + pl * 1.6)},${n1(y)}`, etat.stade === 'seche' ? C.feuille : forme === 'bambou' ? C.clair : C.feuille, forme === 'bambou' ? 4.5 : 2.2);
    if (forme === 'bambou') { for (let k = 1; k < 5; k++) s += trait(`M${n1(x - 2.4)},${n1(SOL - h * k / 5)} l4.8,0`, C.bois, 1); for (let k = 0; k < 3; k++) s += trait(`M${n1(x + pl * 1.3)},${n1(y + 14 + 12 * k)} l${n1(13 * (k % 2 ? 1 : -1))},-6`, C.feuille, 3, .5 + .5 * f); }
    else if (forme === 'papyrus') { for (let k = 0; k < 7; k++) { const a = Math.PI * (k + .5) / 7; s += trait(`M${n1(x + pl * 1.6)},${n1(y)} l${n1(11 * Math.cos(a))},${n1(-9 * Math.sin(a))}`, C.clair, 1.1); } }
    else if (forme === 'riz') s += trait(`M${n1(x + pl * 1.6)},${n1(y)} q6,2 8,12`, '#c9a86a', 2.6);
    else s += trait(`M${n1(x + pl * 1.6)},${n1(y + 2)} l0,13`, '#6b4a2f', 4); }
  return s;
}
function algue(R, C, plan, etat) {
  const forme = plan.forme; let s = '';
  if (forme === 'plancton') return eau(18) + semis(R, 60, 78, 48, 52, 70, 1.6, C.clair) + semis(R, 60, 78, 46, 50, 30, 2.4, C.feuille);
  if (forme === 'nenuphar' || forme === 'lentille') { s += eau(SOL - 60); const nb = forme === 'lentille' ? 34 : 6;
    for (let i = 0; i < nb; i++) { const x = 14 + 92 * R(), y = SOL - 60 + 5 * (R() - .5); s += forme === 'lentille' ? rond(x, y, 2.2, i % 2 ? C.feuille : C.clair) : `<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n1(11 + 5 * R())}" ry="4.5" fill="${i % 2 ? C.feuille : C.clair}"/>` + trait(`M${n1(x)},${n1(y)} Q${n1(x + 6 * (R() - .5))},${SOL - 30} ${n1(60 + 20 * (R() - .5))},${SOL}`, C.feuille, 1, .6); }
    return s + (forme === 'nenuphar' && etat.stade === 'fleurs' ? rond(60, SOL - 66, 7, C.fleur) + rond(60, SOL - 66, 2.4, '#f4d35e') : ''); }
  const nb = forme === 'herbier' ? 16 : 7, hh = forme === 'varech' ? 136 : forme === 'herbier' ? 52 : forme === 'algue_glace' ? 40 : 96; s += eau(6);
  for (let i = 0; i < nb; i++) { const x = 14 + 92 * (i + R() * .6) / nb, h = hh * (.6 + .4 * R()), o = 10 * (R() - .5);
    s += trait(`M${n1(x)},${SOL} q${n1(9 + o)},${n1(-h / 4)} 0,${n1(-h / 2)} t0,${n1(-h / 2)}`, i % 2 ? C.feuille : C.clair, forme === 'herbier' ? 2 : forme === 'varech' ? 6 : 4.5, .9);
    if (forme === 'varech') for (let k = 1; k < 4; k++) s += rond(x + 4 * (k % 2 ? 1 : -1), SOL - h * k / 4, 2.6, '#c9a86a'); }
  return forme === 'algue_glace' ? plein('M0,0 L120,0 L120,14 Q60,26 0,14 Z', '#e8f1f7', .9) + s : s;
}
function lichen(R, C, plan, etat) {
  let s = plein(`M10,${SOL} Q22,${SOL - 46} 58,${SOL - 50} Q100,${SOL - 46} 110,${SOL} Z`, '#8d8a85') + plein(`M26,${SOL} Q40,${SOL - 30} 62,${SOL - 34} Q64,${SOL - 16} 50,${SOL} Z`, '#7a7772', .6);
  if (plan.forme === 'lichen_rennes') { for (let i = 0; i < 7; i++) s += branches(R, { bois: i % 2 ? '#cfd6c4' : '#b9c4ad' }, 22 + 13 * i, SOL - 30 - 14 * R(), 13, 2.2, 2); return s; }
  for (let i = 0; i < 9; i++) { const x = 24 + 74 * R(), y = SOL - 14 - 28 * R(); s += rond(x, y, 5 + 5 * R(), i % 3 ? '#c9c36a' : i % 2 ? '#d98a3a' : '#b9c4ad', .85) + rond(x, y, 2, '#8d8a85', .5); }
  return s;
}
function succulente(R, C, plan, etat) {
  const forme = plan.forme; let s = '';
  if (forme === 'cactus') { const col = (x, y, h, w) => plein(`M${n1(x - w)},${n1(y)} L${n1(x - w)},${n1(y - h + w)} Q${n1(x)},${n1(y - h - w)} ${n1(x + w)},${n1(y - h + w)} L${n1(x + w)},${n1(y)} Z`, C.feuille) + trait(`M${n1(x)},${n1(y - 4)} L${n1(x)},${n1(y - h + 4)}`, C.clair, 1.2, .7);
    s += col(60, SOL, 122, 10) + trait(`M50,${SOL - 54} Q30,${SOL - 54} 30,${SOL - 80}`, C.feuille, 13) + trait(`M70,${SOL - 70} Q92,${SOL - 70} 92,${SOL - 100}`, C.feuille, 13) + epines(R, 60, 28, SOL - 6, 14, '#e9e2c8');
    return s + (etat.stade === 'fleurs' ? rond(60, 18, 5, C.fleur) + rond(30, SOL - 88, 4, C.fleur) : etat.stade === 'fruits' ? rond(60, 18, 4.5, C.fruit) + rond(92, SOL - 106, 4, C.fruit) : ''); }
  if (forme === 'caillou') { for (let i = 0; i < 6; i++) { const x = 22 + 15 * i + 6 * (R() - .5); s += `<ellipse cx="${n1(x)}" cy="${SOL - 7}" rx="${n1(8 + 3 * R())}" ry="8" fill="${i % 2 ? '#a79f8e' : '#8f9a7c'}"/>` + trait(`M${n1(x - 5)},${SOL - 9} l10,0`, '#6f6a5e', 1); } return s + (etat.stade === 'fleurs' ? rond(52, SOL - 17, 5, C.fleur) : ''); }
  const nb = forme === 'agave' ? 11 : 9, l = forme === 'agave' ? 62 : 44;
  for (let i = 0; i < nb; i++) { const a = Math.PI * (i + .5) / nb; s += plein(`M54,${SOL} Q${n1(60 + l * .5 * Math.cos(a) - 6)},${n1(SOL - l * .55 * Math.sin(a))} ${n1(60 + l * Math.cos(a))},${n1(SOL - l * Math.sin(a))} Q${n1(60 + l * .5 * Math.cos(a) + 6)},${n1(SOL - l * .45 * Math.sin(a))} 66,${SOL} Z`, i % 2 ? C.feuille : C.clair); }
  if (forme === 'agave' && (etat.stade === 'fleurs' || etat.stade === 'fruits')) s += trait(`M60,${SOL - 30} L60,14`, C.clair, 3) + semis(R, 60, 24, 14, 14, 12, 2.4, etat.stade === 'fleurs' ? '#f4d35e' : C.fruit);
  else s += decor(R, C, etat, 60, SOL - l * .5, 26, l * .3, 6);
  return s + (etat.defense?.includes('epineux') ? epines(R, 60, SOL - l, SOL - 6, 8, '#e9e2c8') : '');
}
function champignon(R, C, plan, etat) {
  const forme = plan.forme; let s = '';
  if (forme === 'moisissure') return plein(`M12,${SOL} Q60,${SOL - 22} 108,${SOL} Z`, '#cfd3c6') + semis(R, 60, SOL - 8, 44, 7, 60, 1.5, '#9fb59a') + semis(R, 60, SOL - 9, 40, 6, 24, 1, '#5d7a66');
  const un = (x, h, w, c) => plein(`M${n1(x - w * .16)},${SOL} L${n1(x - w * .1)},${n1(SOL - h)} L${n1(x + w * .1)},${n1(SOL - h)} L${n1(x + w * .16)},${SOL} Z`, '#e7dcc6') + plein(`M${n1(x - w / 2)},${n1(SOL - h)} Q${n1(x)},${n1(SOL - h - w * .75)} ${n1(x + w / 2)},${n1(SOL - h)} Z`, c);
  const c = forme === 'champignon_lumineux' ? '#7fe3c4' : hsl(18 + 30 * R(), 55, 42);
  if (forme === 'champignon_lumineux') s += rond(60, SOL - 50, 50, '#7fe3c4', .18);
  s += forme === 'champignon_geant' ? un(60, 96, 84, c) + semis(R, 60, SOL - 118, 30, 12, 8, 3, '#f1e6cf') : un(40, 44, 36, c) + un(72, 62, 44, c) + un(92, 30, 26, c);
  return s;
}
const PORTS = { arbre, buisson, herbe, roseau, algue, lichen, succulente, champignon };

// le dessin d'une plante : son plan, ce qu'elle est ce cycle, et son nom (d'où vient sa forme à elle)
function dessiner(plan, etat = {}, id = '') {
  const port = plan.port || plan.forme, R = hasard(id + '|' + (plan.forme || port)), E = { feuillage: 1, ...etat }, C = teintes(plan, E, R), f = PORTS[port] || herbe;
  let s = f(R, C, plan, E);
  if (E.stade === 'sous_la_neige') s += neige();
  if (C.brule && port !== 'arbre') s += plein(`M10,${SOL} Q60,${SOL - 10} 110,${SOL} Z`, '#2a2623', .8);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${s}</svg>`;
}
// la défense la plus fréquente d'une lignée dans ce biome (ses épines se dessinent)
function defense(t, p) { const f = p.frequences || []; let k = 0; for (let i = 1; i < f.length; i++) if (f[i] > f[k]) k = i; return t.phenotypes?.[k]?.traits || []; }

function planche(flore, biome, tete) {
  const bid = typeof biome === 'string' ? biome : biome.id, plantes = {}, L = [];
  for (const t of flore?.taxons || []) { if (t.eteint) continue; const p = (t.populations || []).find(x => x.biome === bid); if (p && p.effectif > 0) L.push({ t, p, w: p.effectif * (t.plan.masse_kg || 1) }); }
  const tot = L.reduce((s, x) => s + x.w, 0) || 1;
  for (const { t, p, w } of L.sort((a, b) => b.w - a.w || (a.t.id < b.t.id ? -1 : 1))) { const d = defense(t, p), etat = { stade: p.stade, feuillage: p.feuillage, sinistre: p.sinistre, defense: d };
    try { plantes[t.id] = { svg: dessiner(t.plan, etat, t.id), nom: t.nom, forme: t.plan.forme, port: t.plan.port || t.plan.forme, hauteur_m: t.plan.hauteur_m, part: +(w / tot).toFixed(4),
      ...(p.stade ? { stade: p.stade } : {}), ...(p.feuillage != null ? { feuillage: p.feuillage } : {}), ...(d.length ? { defense: d } : {}), ...(t.plan.caracteres?.length ? { caracteres: t.plan.caracteres } : {}), ...(p.sinistre ? { sinistre: p.sinistre } : {}) }; }
    catch (e) { /* une forme que le dessin ne connaît pas : la plante n'a pas de planche, le jeu fait sans */ } }
  const m = typeof biome === 'object' && biome.meteo && typeof biome.meteo === 'object' ? biome.meteo : null;
  return { orvane: tete?.orvane ?? flore?.orvane, monde: { id: (tete?.monde || flore?.monde)?.id }, cycle: tete?.cycle || flore?.cycle, biome: bid, cadre: [W, H], ...(m ? { meteo: m } : {}), plantes };
}
function planches(flore, biomes, tete) { const out = {}; for (const b of biomes || []) out['herbier/' + encodeURIComponent(b.id) + '.json'] = planche(flore, b, tete); return out; }

const API = { dessiner, planche, planches, defense, CADRE: [W, H] };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvaneHerbier = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
