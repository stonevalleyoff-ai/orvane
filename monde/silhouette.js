// Orvane — LES SILHOUETTES DE L'OBSERVATOIRE (monde/silhouette.js)
// Une lignée dessinée de profil, d'après son corps (moteur/corps.js) et sa façon de vivre (son plan), pour que deux lignées qui vivent
// autrement ne se ressemblent pas :
//  - sa masse fait sa taille et sa carrure (une bête de 20 g est petite et fine, une bête de 60 kg grande et massive) ;
//  - ses déplacements, ses pattes : un coureur haut sur jarrets, un sauteur aux cuisses lourdes, un fouisseur court et griffu,
//    un grimpeur à la queue qui s'enroule ;
//  - son régime, sa tête : le museau effilé et le croc d'un chasseur, le mufle d'un brouteur ; chez un oiseau, le bec crochu d'un
//    rapace, le poignard d'un pêcheur, le gros bec d'un mangeur de fruits ;
//  - son heure, ses yeux (grands chez une bête de nuit) ;
//  - ses organes, chacun sous sa forme (des cornes recourbées, droites ou ramifiées ; une carapace bombée ou en anneaux ; des ailes
//    de plumes ou de peau…), sa robe, son ventre plus clair, son dos plus sombre, ses motifs.
// Chaque forme a son dessin : quadrupède, bipède (debout ou à la queue tendue), oiseau, insecte (tête, thorax, abdomen, six pattes
// articulées), serpent, poisson, pieuvre, méduse ou étoile, mille-pattes ; et les machines de la Mère, d'après leurs modules
// (panneaux, foreuse, pince, blindage, arme…). Rien ici ne touche au monde : c'est un dessin. Un jeu peut le reprendre.
// Le dessin sait aussi ce qu'il dessine : le corps, la tête, chaque patte, la queue, les organes. Il le rend à part, en parties
// (docs/21), pour qu'un jeu anime une bête sans relire son SVG ; elles ne changent rien au dessin.
//   OrvaneSilhouette.dessiner(corps, plan, traits) → une image SVG (170 × 90), le corps normalisé par moteur/corps.js
//   OrvaneSilhouette.dessiner(corps, plan, traits, sortie) → la même, et dans sortie : yeux, sol, parties
//   (dans un navigateur, après moteur/corps.js ; dans Node, globalThis.OrvaneCorps = require('../moteur/corps.js') d'abord)
(function (racine) {
'use strict';
const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const rgb = c => `rgb(${c.map(v => Math.round(cl(v, 0, 255))).join(',')})`;
const mel = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const n1 = v => Math.round(v * 10) / 10;
const RAD = Math.PI / 180;
let NUMERO = 0;   // (un identifiant par dessin : une page en montre des centaines, et leurs découpes ne doivent pas se mêler)
const hasard = s => { let g = 2166136261; for (let i = 0; i < s.length; i++) { g ^= s.charCodeAt(i); g = Math.imul(g, 16777619); } g >>>= 0; return () => { g = (Math.imul(g, 1664525) + 1013904223) >>> 0; return g / 4294967296; }; };

// --- la toile : les éléments, la boîte qui les contient (pour cadrer le dessin à la fin), et les parties du corps ---
function Toile() {
  const E = [], B = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const voir = pts => { for (const [x, y] of pts) { if (x < B.x0) B.x0 = x; if (x > B.x1) B.x1 = x; if (y < B.y0) B.y0 = y; if (y > B.y1) B.y1 = y; } };
  return { E, B, Y: [], P: { pattes: [], bras: [], organes: [] }, voir, mettre(s, pts) { E.push(s); if (pts) voir(pts); } };
}
// le dessin cadré : au sol (ses pieds sur la ligne du bas) ou en pleine eau (au milieu) ; chaque bête remplit son cadre, comme
// dans un guide naturaliste (agrandie au plus 2,4 fois) : la masse se lit à la carrure, aux pattes, à la tête
function cadrer(T, sol, ombre = true) {
  const B = T.B; if (!Number.isFinite(B.x0)) return '<svg viewBox="0 0 170 90" width="170" height="90" aria-hidden="true"></svg>';
  const w = B.x1 - B.x0, h = B.y1 - B.y0, k = Math.min(2.4, 156 / Math.max(1, w), 78 / Math.max(1, h));
  const tx = 85 - k * (B.x0 + B.x1) / 2, ty = sol ? 86 - k * B.y1 : 45 - k * (B.y0 + B.y1) / 2; T.cadre = { k, tx, ty, sol, ombre: sol && ombre };
  const sous = sol && ombre ? `<ellipse cx="${n1((B.x0 + B.x1) / 2)}" cy="${n1(B.y1)}" rx="${n1(w * .36)}" ry="${n1(2.4 / k)}" fill="#3b3423" opacity=".13"/>` : '';
  return `<svg viewBox="0 0 170 90" width="170" height="90" aria-hidden="true"><g transform="translate(${n1(tx)} ${n1(ty)}) scale(${+k.toFixed(3)})" stroke-linecap="round" stroke-linejoin="round">${sous}${T.E.join('')}</g></svg>`;
}
// un ruban effilé le long d'une courbe (un cou, une queue, un tentacule) : de la largeur w0 à w1
function ruban(p0, p1, p2, w0, w1, n = 12) {
  const L = [], R = [];
  for (let i = 0; i <= n; i++) { const t = i / n, a = (1 - t) ** 2, b = 2 * (1 - t) * t, d = t * t;
    const x = a * p0[0] + b * p1[0] + d * p2[0], y = a * p0[1] + b * p1[1] + d * p2[1];
    const dx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]), dy = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]), l = Math.hypot(dx, dy) || 1;
    const w = (w0 + (w1 - w0) * t) / 2; L.push([x - dy / l * w, y + dx / l * w]); R.push([x + dy / l * w, y - dx / l * w]); }
  const P = [...L, ...R.reverse()]; return { d: 'M' + P.map(([x, y]) => n1(x) + ' ' + n1(y)).join('L') + 'Z', pts: P };
}
const bout = (p0, p1, p2, t = 1) => { const a = (1 - t) ** 2, b = 2 * (1 - t) * t, d = t * t; return [a * p0[0] + b * p1[0] + d * p2[0], a * p0[1] + b * p1[1] + d * p2[1]]; };
// un membre articulé : des segments de plus en plus fins, aux jointures rondes (rend l'épaisseur de chaque segment)
function membre(T, pts, w0, w1, coul) {
  const W = [];
  for (let i = 0; i < pts.length - 1; i++) { const w = w0 + (w1 - w0) * i / Math.max(1, pts.length - 2); W.push(w);
    T.mettre(`<line x1="${n1(pts[i][0])}" y1="${n1(pts[i][1])}" x2="${n1(pts[i + 1][0])}" y2="${n1(pts[i + 1][1])}" stroke="${coul}" stroke-width="${n1(w)}"/>`, [pts[i], pts[i + 1]]); }
  return W;
}
const ellipse = (T, x, y, rx, ry, fill, plus = '') => T.mettre(`<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n1(rx)}" ry="${n1(ry)}" fill="${fill}"${plus}/>`, [[x - rx, y - ry], [x + rx, y + ry]]);
const chemin = (T, d, fill, pts, plus = '') => T.mettre(`<path d="${d}" fill="${fill}"${plus}/>`, pts);
const trait = (T, d, coul, w, pts, plus = '') => T.mettre(`<path d="${d}" stroke="${coul}" stroke-width="${n1(w)}" fill="none"${plus}/>`, pts);

// --- les parties du corps (docs/21) : ce que le dessin sait de ce qu'il dessine, pour qu'un jeu l'anime ---
// Chaque partie garde ses points dans le repère du dessin, et ses entrées de la toile (e : de la première à la dernière) ;
// dessiner les ramène dans le cadre de 170 × 90 (parties). Les noter ne change rien au dessin.
const partie = (T, a, o) => ({ ...o, e: [a, T.E.length - 1] });   // (une partie dessinée depuis l'entrée a)
const organe = (T, a, type, place, attache, plus) => { if (T.E.length > a) T.P.organes.push(partie(T, a, { type, ...(place ? { place } : {}), attache, ...plus })); };
const boiteDe = pts => [[Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1]))], [Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1]))]];

// --- ce qui vaut pour toutes les formes : la taille, la carrure, les couleurs, la façon de vivre ---
function contexte(c, plan, traits) {
  const m = plan?.masse_kg || 1, lm = Math.log10(Math.max(.001, m));
  const S = cl(.72 + .1 * (lm + 2), .68, 1.12), rob = cl((lm + 1.3) / 3.3);   // la taille : 10 g → 0,72, 1 kg → 0,92, 100 kg → 1,12
  const K = c.couleurs, robe = K.robe, sombre = K.sombre, ventre = K.ventre;
  const loco = plan?.locomotion || [], reg = plan?.regime || 'herbivore', diete = plan?.diete || {};
  return { m, S, rob, u: 110 * S, loco, reg, diete, nuit: plan?.activite === 'nocturne' || traits.includes('yeux-nocturnes'), tr: traits,
    robe: rgb(robe), sombre: rgb(sombre), ventre: rgb(ventre), oeil: rgb(K.oeil), loin: rgb(mel(sombre, robe, .25)), accent: rgb(OrvaneCorpsRef().tourner(robe, 150)),
    R: hasard(JSON.stringify([robe, sombre, c.long, c.haut, c.motif])), og: (ty, pl) => c.organes.find(o => o.type === ty && (!pl || o.place === pl)) };
}
const OrvaneCorpsRef = () => racine.OrvaneCorps;
const os = '#efe7d2';   // les cornes, les défenses, les griffes

// un œil : plus grand la nuit, un éclat ; un sourcil chez un chasseur
function oeil(T, x, y, r, X, brow) {
  ellipse(T, x, y, r, r, X.oeil); ellipse(T, x + r * .35, y - r * .35, r * .32, r * .32, '#fffaf0', ' opacity=".85"'); T.Y.push([x, y, r]);
  if (brow) trait(T, `M${n1(x - r * 1.6)} ${n1(y - r * 1.5)} L${n1(x + r * 1.4)} ${n1(y - r * .9)}`, X.sombre, Math.max(1, r * .6), []);
}
// les motifs, dans la découpe d'un corps (rayures, taches, bandes)
function motifs(c, X, x0, x1, y0, y1, traits) {
  const out = [], w = x1 - x0, h = y1 - y0, apo = traits.includes('coloration-aposematique');
  if (c.motif === 'rayures' || apo) for (let i = 1; i < 7; i++) { const x = x0 + w * i / 7; out.push(`<path d="M${n1(x)} ${n1(y0)} L${n1(x - w * .04)} ${n1(y1)}" stroke="${apo ? '#d8a23a' : X.sombre}" stroke-width="${n1(Math.max(1.2, w * .045))}" opacity=".85"/>`); }
  if (c.motif === 'taches') for (let i = 0; i < 9; i++) out.push(`<circle cx="${n1(x0 + w * (.12 + .76 * X.R()))}" cy="${n1(y0 + h * (.15 + .5 * X.R()))}" r="${n1(Math.max(1, h * (.07 + .07 * X.R())))}" fill="${X.sombre}" opacity=".8"/>`);
  if (c.motif === 'bandes') out.push(`<path d="M${n1(x0)} ${n1(y0 + h * .32)} L${n1(x1)} ${n1(y0 + h * .3)}" stroke="${X.sombre}" stroke-width="${n1(Math.max(1.2, h * .14))}" opacity=".8"/>`);
  return out.join('');
}

// --- les organes de la tête, du dos, de la queue (quadrupède, bipède) ---
function cornes(T, X, hx, hy, hs, o, devant) {
  const t = .5 + o.taille, n = o.nombre || 2;
  if (n === 1) { const x = devant[0], y = devant[1]; chemin(T, `M${n1(x - hs * .12)} ${n1(y)} L${n1(x + hs * .1)} ${n1(y - hs * .9 * t)} L${n1(x + hs * .22)} ${n1(y + 1)}Z`, os, [[x, y - hs * .9 * t]]); return; }
  const bx = hx - hs * .05, by = hy - hs * .4;
  if (o.forme === 'ramifiees') { const L = hs * 1.3 * t; const p = [bx, by], q = [bx - L * .35, by - L], w = Math.max(1.2, hs * .09);
    trait(T, `M${n1(p[0])} ${n1(p[1])} L${n1(q[0])} ${n1(q[1])}`, '#8d7a5c', w, [p, q]);
    for (const k of [.35, .6, .85]) { const a = [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k], b = [a[0] + L * .3, a[1] - L * .18]; trait(T, `M${n1(a[0])} ${n1(a[1])} L${n1(b[0])} ${n1(b[1])}`, '#8d7a5c', w * .8, [b]); }
    return; }
  if (o.forme === 'droites') { for (const d of [0, hs * .14]) { const q = [bx + d + hs * .25 * t, by - hs * 1.1 * t]; trait(T, `M${n1(bx + d)} ${n1(by)} L${n1(q[0])} ${n1(q[1])}`, os, Math.max(1.4, hs * .12), [q]); } return; }
  // recourbées : vers l'arrière, en croissant
  for (const d of [0, hs * .14]) { const q = [bx + d - hs * .9 * t, by - hs * .35 * t], c1 = [bx + d + hs * .15, by - hs * 1.1 * t]; trait(T, `M${n1(bx + d)} ${n1(by)} Q${n1(c1[0])} ${n1(c1[1])} ${n1(q[0])} ${n1(q[1])}`, os, Math.max(1.4, hs * .13), [c1, q]); }
}
function organesTete(T, X, c, hx, hy, hs, museau) {
  const og = X.og, tl = o => .5 + (o?.taille || .5); let a = T.E.length;
  const co = og('cornes'); if (co) { cornes(T, X, hx, hy, hs, co, museau); organe(T, a, 'cornes', co.place, (co.nombre || 2) === 1 ? museau : [hx - hs * .05, hy - hs * .4]); }
  a = T.E.length; const de = og('defenses'); if (de) { const q = de.forme === 'droites' ? [museau[0] + hs * .6 * tl(de), museau[1] + hs * .3] : [museau[0] + hs * .2, museau[1] - hs * .55 * tl(de)], c1 = [museau[0] + hs * .4 * tl(de), museau[1] + hs * .5];
    trait(T, `M${n1(museau[0] - hs * .2)} ${n1(museau[1] + hs * .2)} Q${n1(c1[0])} ${n1(c1[1])} ${n1(q[0])} ${n1(q[1])}`, os, Math.max(1.5, hs * .13), [c1, q]); organe(T, a, 'defenses', de.place, [museau[0] - hs * .2, museau[1] + hs * .2]); }
  a = T.E.length; const tr = og('trompe'); if (tr) { const L = hs * (tr.forme === 'longue' ? 1.6 : .8) * tl(tr), p = [museau[0], museau[1] + hs * .05], q = [p[0] + L * .2, p[1] + L], c1 = [p[0] + L * .6, p[1] + L * .2];
    const r = ruban(p, c1, q, hs * .32, hs * .14); chemin(T, r.d, X.robe, r.pts); organe(T, a, 'trompe', tr.place, p, { courbe: [p, c1, q], epaisseurs: [hs * .32, hs * .14] }); }
  a = T.E.length; const an = og('antennes'); if (an || c.antennes > .3) { const L = hs * (1 + 1.6 * (an?.taille ?? c.antennes)), p = [hx + hs * .1, hy - hs * .35];
    for (const d of [0, hs * .12]) { const q = [p[0] + d + L * .55, p[1] - L * .75], c1 = [p[0] + d + L * .05, p[1] - L * .7]; trait(T, `M${n1(p[0] + d)} ${n1(p[1])} Q${n1(c1[0])} ${n1(c1[1])} ${n1(q[0])} ${n1(q[1])}`, X.sombre, Math.max(.8, hs * .06), [q]);
      if (an?.forme === 'plumeuses') ellipse(T, q[0] - L * .08, q[1] + L * .05, L * .12, L * .05, X.sombre, ` transform="rotate(-50 ${n1(q[0])} ${n1(q[1])})"`); }
    organe(T, a, 'antennes', an?.place || 'tete', p); }
  a = T.E.length; const cr = og('crete', 'tete'); if (cr) { const h = hs * (.4 + .9 * cr.taille), x0 = hx - hs * .45, x1 = hx + hs * .3, y = hy - hs * .38;
    chemin(T, cr.forme === 'dentelee' ? `M${n1(x0)} ${n1(y)} L${n1(x0 + (x1 - x0) * .25)} ${n1(y - h)} L${n1(x0 + (x1 - x0) * .45)} ${n1(y - h * .5)} L${n1(x0 + (x1 - x0) * .7)} ${n1(y - h * .9)} L${n1(x1)} ${n1(y)}Z` : `M${n1(x0)} ${n1(y)} Q${n1(hx - hs * .2)} ${n1(y - h * 1.3)} ${n1(x1)} ${n1(y)}Z`, X.accent, [[hx, y - h]]);
    organe(T, a, 'crete', cr.place, [(x0 + x1) / 2, y]); }
}
// la collerette, derrière la tête (dessinée avant elle)
function collerette(T, X, hx, hy, hs) { const o = X.og('collerette'); if (!o) return; const a0 = T.E.length, r = hs * (.75 + .8 * o.taille), x = hx - hs * .35;
  if (o.forme === 'frangee') { let d = ''; for (let i = 0; i <= 12; i++) { const a = (-100 + 200 * i / 12) * RAD, rr = i % 2 ? r * .82 : r; d += (i ? 'L' : 'M') + n1(x + Math.sin(a) * rr * .45) + ' ' + n1(hy - Math.cos(a) * rr); } chemin(T, d + 'Z', X.accent, [[x - r * .5, hy - r], [x + r * .5, hy + r]]); }
  else ellipse(T, x, hy - hs * .05, r * .45, r, X.accent);
  organe(T, a0, 'collerette', o.place, [x, hy]); }
function organesDos(T, X, c, x0, x1, yDos, Th) {
  const og = X.og, w = x1 - x0; let a0 = T.E.length;
  const ca = og('carapace'); if (ca || c.carapace > .3) { const h = Th * (.35 + .4 * (ca?.taille ?? c.carapace)), a = x0 + w * .05, b = x1 - w * .08;
    chemin(T, `M${n1(a)} ${n1(yDos + Th * .3)} Q${n1(a + (b - a) * .05)} ${n1(yDos - h)} ${n1((a + b) / 2)} ${n1(yDos - h)} Q${n1(b - (b - a) * .05)} ${n1(yDos - h)} ${n1(b)} ${n1(yDos + Th * .3)}Z`, X.sombre, [[a, yDos - h], [b, yDos + Th * .3]]);
    if (ca?.forme === 'segmentee') for (let i = 1; i < 6; i++) { const x = a + (b - a) * i / 6; trait(T, `M${n1(x)} ${n1(yDos - h * .95)} L${n1(x)} ${n1(yDos + Th * .28)}`, X.robe, 1.2, [], ' opacity=".6"'); }
    else for (let i = 0; i < 3; i++) { const x = a + (b - a) * (.25 + i * .25); ellipse(T, x, yDos - h * .45, (b - a) * .1, h * .25, 'none', ` stroke="${X.robe}" stroke-width="1.1" opacity=".55"`); }
    organe(T, a0, 'carapace', ca?.place || 'dos', [(a + b) / 2, yDos]); }
  a0 = T.E.length; const pl = og('plaques'); if (pl) { const n = Math.min(9, pl.nombre || 5), h = Th * (.25 + .5 * pl.taille);
    for (let i = 0; i < n; i++) { const x = x0 + w * (.12 + .76 * (i + .5) / n), hh = h * (.6 + .4 * Math.sin(Math.PI * (i + .5) / n));
      if (pl.forme === 'rondes') ellipse(T, x, yDos - hh * .45, w * .04 + 1, hh * .55, X.accent); else chemin(T, `M${n1(x - w * .045)} ${n1(yDos + 1)} L${n1(x)} ${n1(yDos - hh)} L${n1(x + w * .045)} ${n1(yDos + 1)}Z`, X.accent, [[x, yDos - hh]]); }
    organe(T, a0, 'plaques', pl.place, [x0 + w * .5, yDos]); }
  a0 = T.E.length; const cr = og('crete', 'dos'); if (cr) { const h = Th * (.3 + .9 * cr.taille);
    if (cr.forme === 'dentelee') { let d = `M${n1(x0 + w * .15)} ${n1(yDos + 1)}`; for (let i = 0; i < 7; i++) d += ` L${n1(x0 + w * (.15 + .65 * (i + .5) / 7))} ${n1(yDos - (i % 2 ? h * .5 : h))}`; chemin(T, d + ` L${n1(x0 + w * .8)} ${n1(yDos + 1)}Z`, X.accent, [[x0, yDos - h]]); }
    else chemin(T, `M${n1(x0 + w * .15)} ${n1(yDos + 1)} Q${n1(x0 + w * .45)} ${n1(yDos - h * 1.5)} ${n1(x0 + w * .82)} ${n1(yDos + 1)}Z`, X.accent, [[x0 + w * .45, yDos - h]]);
    organe(T, a0, 'crete', cr.place, [x0 + w * .48, yDos]); }
  a0 = T.E.length; const ep = og('epines', 'dos'); if (ep) { const n = Math.min(10, ep.nombre || 7), l = Th * (.25 + .45 * ep.taille), lw = ep.forme === 'massives' ? 2.4 : 1.3;
    for (let i = 0; i < n; i++) { const x = x0 + w * (.15 + .7 * (i + .5) / n); trait(T, `M${n1(x)} ${n1(yDos + 1)} L${n1(x - l * .25)} ${n1(yDos - l)}`, os, lw, [[x - l * .25, yDos - l]]); }
    organe(T, a0, 'epines', ep.place, [x0 + w * .5, yDos]); }
  a0 = T.E.length; const na = og('nageoires', 'dos'); if (na) { const h = Th * (.4 + .8 * na.taille); chemin(T, `M${n1(x0 + w * .35)} ${n1(yDos + 1)} L${n1(x0 + w * .5)} ${n1(yDos - h)} L${n1(x0 + w * .68)} ${n1(yDos + 1)}Z`, X.sombre, [[x0 + w * .5, yDos - h]]);
    organe(T, a0, 'nageoires', na.place, [x0 + w * .5, yDos]); }
}
// les ailes d'une bête à pattes : de plumes, ou de peau tendue sur des doigts
function ailes(T, X, c, xA, yA, L) {
  const o = X.og('ailes'); if (!o && c.ailes <= .3) return; const a = T.E.length, t = .6 + (o?.taille ?? c.ailes) * .8, l = L * t;
  if (o?.forme === 'membranes') { const P = [[xA, yA], [xA - l * .3, yA - l * .75], [xA - l * .75, yA - l * .55], [xA - l * .95, yA - l * .1]];
    chemin(T, `M${n1(xA)} ${n1(yA)} L${P.slice(1).map(p => n1(p[0]) + ' ' + n1(p[1])).join(' L')} Q${n1(xA - l * .55)} ${n1(yA - l * .05)} ${n1(xA - l * .4)} ${n1(yA + 2)}Z`, X.sombre, P, ' opacity=".85"');
    for (const p of P.slice(1)) trait(T, `M${n1(xA)} ${n1(yA)} L${n1(p[0])} ${n1(p[1])}`, X.robe, 1, []); organe(T, a, 'ailes', o.place, [xA, yA]); return; }
  const d = `M${n1(xA)} ${n1(yA)} Q${n1(xA - l * .2)} ${n1(yA - l * .9)} ${n1(xA - l * .95)} ${n1(yA - l * .55)} L${n1(xA - l * .75)} ${n1(yA - l * .38)} L${n1(xA - l * .85)} ${n1(yA - l * .28)} L${n1(xA - l * .6)} ${n1(yA - l * .15)} Q${n1(xA - l * .3)} ${n1(yA)} ${n1(xA - l * .1)} ${n1(yA + 2)}Z`;
  chemin(T, d, X.sombre, [[xA - l * .95, yA - l * .9], [xA, yA]], ' opacity=".9"');
  organe(T, a, 'ailes', o?.place || 'flancs', [xA, yA]);
}
// le bout de la queue : massue, aiguillon, panache, épines
function organesQueue(T, X, q, dir, Th) {
  const og = X.og, [x, y] = q; let a0 = T.E.length;
  const ma = og('massue'); if (ma) { const r = Th * (.25 + .35 * ma.taille); ellipse(T, x, y, r * 1.2, r, X.sombre); if (ma.forme === 'cloutee') for (let i = 0; i < 6; i++) { const a = i * 60 * RAD; trait(T, `M${n1(x + Math.cos(a) * r)} ${n1(y + Math.sin(a) * r * .85)} L${n1(x + Math.cos(a) * r * 1.6)} ${n1(y + Math.sin(a) * r * 1.4)}`, os, 1.5, [[x + Math.cos(a) * r * 1.6, y + Math.sin(a) * r * 1.4]]); }
    organe(T, a0, 'massue', ma.place, q); }
  a0 = T.E.length; const ai = og('aiguillon'); if (ai) { const l = Th * (.4 + .7 * ai.taille), e = ai.forme === 'courbe' ? [x + dir * l * .2, y - l] : [x + dir * l, y - l * .2], c1 = ai.forme === 'courbe' ? [x - dir * l * .35, y - l * .6] : [x + dir * l * .5, y];
    trait(T, `M${n1(x)} ${n1(y)} Q${n1(c1[0])} ${n1(c1[1])} ${n1(e[0])} ${n1(e[1])}`, '#3c2834', Math.max(1.6, Th * .12), [c1, e]); organe(T, a0, 'aiguillon', ai.place, q); }
  a0 = T.E.length; const pa = og('panache'); if (pa) { const l = Th * (.5 + .9 * pa.taille);
    if (pa.forme === 'eventail') for (let i = 0; i < 6; i++) { const a = (200 + i * 22) * RAD, e = [x + dir * Math.cos(a) * -l, y + Math.sin(a) * l]; trait(T, `M${n1(x)} ${n1(y)} L${n1(e[0])} ${n1(e[1])}`, X.accent, Math.max(1.5, Th * .12), [e]); }
    else { chemin(T, `M${n1(x)} ${n1(y - l * .3)} Q${n1(x + dir * l * .9)} ${n1(y - l * .6)} ${n1(x + dir * l * 1.1)} ${n1(y)} Q${n1(x + dir * l * .9)} ${n1(y + l * .6)} ${n1(x)} ${n1(y + l * .3)}Z`, X.accent, [[x + dir * l * 1.1, y - l * .6], [x, y + l * .6]]); }
    organe(T, a0, 'panache', pa.place, q); }
  a0 = T.E.length; const ep = og('epines', 'queue'); if (ep) { for (const d of [-1, 0, 1]) { const e = [x + d * Th * .2, y - Th * (.35 + .5 * ep.taille)]; trait(T, `M${n1(x + d * Th * .1)} ${n1(y)} L${n1(e[0])} ${n1(e[1])}`, os, 1.5, [e]); }
    organe(T, a0, 'epines', ep.place, q); }
}

// --- la tête d'une bête à pattes, selon son régime (pivot : où elle tient au corps, pour les parties) ---
function tete(T, X, c, hx, hy, hs, pivot) {
  const { reg, nuit } = X, ml = X.u * (.012 + .12 * c.museau), a = T.E.length;
  collerette(T, X, hx, hy, hs);
  // les oreilles : dressées et pointues chez un chasseur, en feuille couchée chez un brouteur
  const e = c.oreilles; if (e > .12) { const l = hs * (.25 + 1.05 * e);
    if (reg === 'herbivore' || reg === 'filtreur') ellipse(T, hx - hs * .35, hy - hs * .45, l * .22, l * .55, X.robe, ` transform="rotate(-40 ${n1(hx - hs * .35)} ${n1(hy - hs * .45)})"`);
    else chemin(T, `M${n1(hx - hs * .45)} ${n1(hy - hs * .2)} L${n1(hx - hs * .32)} ${n1(hy - hs * .35 - l)} L${n1(hx - hs * .02)} ${n1(hy - hs * .32)}Z`, X.robe, [[hx - hs * .32, hy - hs * .35 - l]]); }
  ellipse(T, hx, hy, hs * .55, hs * .46, X.robe);
  let bout;
  if (reg === 'carnivore') { const tip = [hx + hs * .45 + ml, hy + hs * .06]; bout = tip;
    chemin(T, `M${n1(hx + hs * .15)} ${n1(hy - hs * .34)} Q${n1(hx + hs * .5 + ml * .5)} ${n1(hy - hs * .28)} ${n1(tip[0])} ${n1(tip[1])} L${n1(hx + hs * .3 + ml * .7)} ${n1(hy + hs * .3)} Q${n1(hx + hs * .2)} ${n1(hy + hs * .45)} ${n1(hx)} ${n1(hy + hs * .4)}Z`, X.robe, [tip, [hx, hy + hs * .45]]);
    trait(T, `M${n1(hx + hs * .15)} ${n1(hy + hs * .2)} L${n1(tip[0] - 1)} ${n1(tip[1] + hs * .08)}`, X.sombre, Math.max(.8, hs * .07), []);
    ellipse(T, tip[0] - 1, tip[1] - hs * .04, hs * .09, hs * .07, '#2e2620');
    if (X.rob > .2 || X.tr.includes('crocs-allonges')) { const L = hs * (X.tr.includes('crocs-allonges') ? .45 : .22); chemin(T, `M${n1(tip[0] - ml * .35)} ${n1(tip[1] + hs * .08)} L${n1(tip[0] - ml * .3)} ${n1(tip[1] + hs * .08 + L)} L${n1(tip[0] - ml * .2)} ${n1(tip[1] + hs * .08)}Z`, '#fbf6ea', []); } }
  else if (reg === 'filtreur' || reg === 'detritivore') { const tip = [hx + hs * .5 + ml * 1.1, hy + hs * .12]; bout = tip;   // un bec plat, large (une bête qui fouille la vase ou filtre l'eau)
    chemin(T, `M${n1(hx + hs * .3)} ${n1(hy - hs * .08)} L${n1(tip[0])} ${n1(tip[1] - hs * .12)} Q${n1(tip[0] + hs * .15)} ${n1(tip[1])} ${n1(tip[0])} ${n1(tip[1] + hs * .12)} L${n1(hx + hs * .3)} ${n1(hy + hs * .3)}Z`, X.sombre, [tip]); }
  else { const r = reg === 'omnivore' ? .32 : .4, tip = [hx + hs * .35 + ml * .9, hy + hs * .1]; bout = tip;   // le mufle d'un brouteur, plus fin chez un omnivore
    ellipse(T, hx + hs * .3 + ml * .5, hy + hs * .1, ml * .55 + hs * .22, hs * r, X.robe);
    ellipse(T, tip[0] - hs * .05, tip[1] - hs * .05, hs * .06, hs * .05, '#2e2620');
    trait(T, `M${n1(tip[0] - hs * .1)} ${n1(tip[1] + hs * .18)} L${n1(tip[0] - ml * .5 - hs * .1)} ${n1(tip[1] + hs * .2)}`, X.sombre, Math.max(.7, hs * .05), []); }
  if (c.motif === 'masque') ellipse(T, hx + hs * .15, hy - hs * .08, hs * .42, hs * .17, X.sombre, ' opacity=".85"');
  oeil(T, hx + hs * (reg === 'carnivore' ? .22 : .12), hy - hs * .1, hs * (.1 + (nuit ? .08 : 0)), X, reg === 'carnivore');
  organesTete(T, X, c, hx, hy, hs, bout);
  T.P.tete = partie(T, a, { centre: [hx, hy], rayon: hs * .55, museau: bout, pivot });
}

// --- les formes ---
// un quadrupède (et les bipèdes qui gardent un corps horizontal)
function quadrupede(T, c, X, bip = false) {
  const { u, rob, loco, reg, S } = X, course = loco.includes('course'), saut = loco.includes('saut') && !course, fouit = loco.includes('fouissage') && !course, grimpe = loco.includes('grimpe');
  const Lt = u * (.3 + .32 * c.long), Th = u * (.13 + .1 * rob + .04 * (1 - c.long));
  const Hl = u * (.05 + .34 * c.haut) * (X.tr.includes('pattes-longues') ? 1.2 : 1) * (fouit ? .7 : 1) * (bip ? 1.35 : 1);
  const yb = -Hl - Th * .45, xa = Lt / 2, xr = -Lt / 2, top = yb - Th / 2, bot = yb + Th / 2, bosse = Th * (.05 + .16 * rob) * (course ? 1.2 : 1), sag = Th * .14 * rob;
  const yt = yb + Th * .12, xf = xa - Lt * .17, xh = xr + Lt * .2, w = (1.6 + 4.6 * rob) * S * (fouit ? 1.25 : 1);
  T.P.dessin = bip ? 'bipede-tendu' : 'quadrupede';
  // une patte : ses articulations selon sa façon de se déplacer ; son pied (sabot, griffes, coussinet). Chez un bipède au corps
  // tendu, les pattes de devant sont des bras (et ses pattes de derrière ne sont pas dessinées)
  const patte = (x, devant, loin) => { const coul = loin ? X.loin : X.robe, cote = loin ? 'loin' : 'pres'; let P, a = T.E.length;
    if (bip && devant) { P = [[x, yt - Th * .1], [x + Th * .35, yt + Th * .35], [x + Th * .55, yt + Th * .1]]; const W = membre(T, P, w * .8, w * .55, coul), main = !!X.og('mains'); if (main) ellipse(T, P[2][0], P[2][1], w * .7, w * .6, coul);
      T.P.bras.push(partie(T, a, { cote, points: P, epaisseurs: W, ...(main ? { main } : {}) })); return; }
    if (saut && !devant) { ellipse(T, x, yt + Th * .05, Th * .42, Th * .5, coul); a = T.E.length; P = [[x + Th * .15, yt + Th * .3], [x - Hl * .3, -Hl * .2], [x + Hl * .2, 0]]; }   // (la cuisse reste au corps)
    else if (course) P = devant ? [[x, yt], [x + Hl * .05, yt + (Hl + Th * .3) * .48], [x, 0]] : [[x, yt], [x + Hl * .2, yt + (Hl + Th * .3) * .38], [x - Hl * .12, -Hl * .22], [x - Hl * .02, 0]];
    else if (rob > .65) P = [[x, yt], [x, 0]];
    else if (fouit) P = [[x, yt], [x + (devant ? 3 : -3) * S, -Hl * .45], [x + (devant ? 5 : 0) * S, 0]];
    else P = [[x, yt], [x + (devant ? 2.5 : -2.5) * S, yt + (Hl + Th * .3) * .5], [x, 0]];
    const W = membre(T, P, w * (rob > .65 ? 1.25 : 1), w * .7, coul);
    const [fx, fy] = P[P.length - 1]; let pied;
    if (devant && X.og('mains')) { pied = 'mains'; for (const d of [-1, 0, 1]) trait(T, `M${n1(fx)} ${n1(fy - 1)} L${n1(fx + w * .7 + d * 1.2)} ${n1(fy - w * .9 + d * 1.6)}`, coul, Math.max(1, w * .35), []); }
    else if (reg === 'carnivore' || fouit) { pied = 'griffes'; for (const d of [0, 1.6, 3.2]) trait(T, `M${n1(fx + d * S)} ${n1(fy - .5)} L${n1(fx + d * S + 2.2 * S)} ${n1(fy + .3)}`, os, Math.max(.8, w * .22), [[fx + 5 * S, fy]]); }
    else if ((reg === 'herbivore' || reg === 'omnivore') && rob > .3 && !grimpe) { pied = 'sabot'; T.mettre(`<rect x="${n1(fx - w * .6)}" y="${n1(fy - w * .7)}" width="${n1(w * 1.2)}" height="${n1(w * .75)}" rx="1" fill="#3a3027"/>`, [[fx - w, fy]]); }
    else { pied = 'coussinet'; ellipse(T, fx + w * .25, fy - w * .25, w * .6, w * .32, coul); }
    T.P.pattes.push(partie(T, a, { cote, points: P, epaisseurs: W, pied })); };
  // la queue : tendue chez un coureur, enroulée chez un grimpeur, tombante chez un lourd
  const tl = u * (.03 + .42 * c.queue) * (bip ? 1.3 : 1), qb = [xr + Th * .1, yb - Th * .18], prend = grimpe || X.tr.includes('queue-prehensile');
  let q1, q2; if (prend) { q1 = [xr - tl * .7, yb + tl * .35]; q2 = [xr - tl * .75, yb - tl * .1]; }
  else if (course || bip) { q1 = [xr - tl * .5, yb - Th * .3]; q2 = [xr - tl, yb - Th * .15 - tl * .12]; }
  else if (rob > .6) { q1 = [xr - tl * .35, yb]; q2 = [xr - tl * .45, yb + tl * .75]; }
  else { q1 = [xr - tl * .5, yb - tl * .2]; q2 = [xr - tl, yb + tl * .08]; }
  // les pattes du côté loin, la queue, le corps, puis les pattes du côté près
  patte(xf + Lt * .07, true, true); if (!bip) patte(xh + Lt * .07, false, true);
  if (c.queue > .06) { const a = T.E.length, w0 = Th * (.16 + .22 * rob) * (bip ? 1.6 : 1), w1 = Math.max(.8, S), r = ruban(qb, q1, q2, w0, w1); chemin(T, r.d, X.robe, r.pts);
    if (prend) { const [x, y] = q2; trait(T, `M${n1(x)} ${n1(y)} q${n1(-tl * .12)} ${n1(-tl * .2)} ${n1(tl * .05)} ${n1(-tl * .22)} q${n1(tl * .12)} ${n1(tl * .05)} ${n1(tl * .02)} ${n1(tl * .14)}`, X.robe, Math.max(.8, S * 1.4), [[x - tl * .12, y - tl * .25]]); }
    T.P.queue = partie(T, a, { courbe: [qb, q1, q2], epaisseurs: [w0, w1] }); }
  const corps = `M${n1(xr)} ${n1(yb)} Q${n1(xr)} ${n1(top)} ${n1(xr + Lt * .18)} ${n1(top)} Q${n1(0)} ${n1(top - bosse * .3)} ${n1(xa - Lt * .25)} ${n1(top - bosse)} Q${n1(xa)} ${n1(top - bosse * .6)} ${n1(xa)} ${n1(yb - Th * .1)} Q${n1(xa + Th * .05)} ${n1(bot)} ${n1(xa - Lt * .18)} ${n1(bot + sag * .6)} Q${n1(0)} ${n1(bot + sag * 1.5)} ${n1(xr + Lt * .18)} ${n1(bot)} Q${n1(xr)} ${n1(bot)} ${n1(xr)} ${n1(yb)}Z`;
  const id = 'sil' + (++NUMERO), ic = T.E.length;
  T.mettre(`<clipPath id="${id}"><path d="${corps}"/></clipPath><path d="${corps}" fill="${X.robe}"/><g clip-path="url(#${id})"><rect x="${n1(xr - 2)}" y="${n1(top - bosse - 2)}" width="${n1(Lt + 4)}" height="${n1(Th * .34 + bosse)}" fill="${X.sombre}" opacity=".45"/><ellipse cx="${n1(Lt * .03)}" cy="${n1(bot + sag)}" rx="${n1(Lt * .42)}" ry="${n1(Th * .3)}" fill="${X.ventre}"/>${motifs(c, X, xr, xa, top - bosse, bot, X.tr)}</g>`, [[xr, top - bosse], [xa, bot + sag * 1.5]]);
  T.P.corps = partie(T, ic, { centre: [(xr + xa) / 2, yb], boite: [[xr, top - bosse], [xa, bot + sag * 1.5]] });
  organesDos(T, X, c, xr, xa, top - bosse * .6, Th);
  ailes(T, X, c, xa - Lt * .3, top - bosse * .5, u * .45);
  if (c.queue > .06) organesQueue(T, X, prend ? [q2[0] - tl * .05, q2[1] - tl * .15] : q2, -1, Th);
  patte(xf, true, false); if (!bip) patte(xh, false, false);
  // le cou et la tête : haute chez un brouteur au long cou, basse et tendue chez un chasseur
  const hs = u * (.07 + .075 * c.tete) * (1 - .3 * rob) + 2.5 * S, nl = u * (.015 + .3 * c.cou), nb = [xa - Lt * .1, top + Th * .2];
  const ang = (reg === 'carnivore' ? -12 - 30 * c.cou : -30 - 45 * c.cou) * RAD, hx = nl > hs * .5 ? nb[0] + nl * Math.cos(ang) + hs * .2 : xa + hs * .25, hy = nl > hs * .5 ? nb[1] + nl * Math.sin(ang) : top + Th * .2;
  if (nl > hs * .5) { const a = T.E.length, c1 = [nb[0] + nl * .5 * Math.cos(ang) + hs * .1, nb[1] + nl * .5 * Math.sin(ang)], c2 = [hx - hs * .2, hy], r = ruban(nb, c1, c2, Th * .55, hs * .6); chemin(T, r.d, X.robe, r.pts);
    T.P.cou = partie(T, a, { courbe: [nb, c1, c2], epaisseurs: [Th * .55, hs * .6] }); }
  const pi = X.og('pinces'); if (pi) { const a = T.E.length, l = hs * (1 + 1.2 * pi.taille), y = yb + Th * .1, gros = pi.forme === 'massives' ? 1.6 : 1, P = [[xa - 2, y], [xa + l * .5, y - l * .2], [xa + l, y]];
    const W = membre(T, P, 2.2 * S * gros, 1.8 * S * gros, X.sombre); chemin(T, `M${n1(xa + l)} ${n1(y)} l${n1(5 * S * gros)} ${n1(-4 * S * gros)} M${n1(xa + l)} ${n1(y)} l${n1(5 * S * gros)} ${n1(3 * S * gros)}`, 'none', [[xa + l + 5 * S * gros, y]], ` stroke="${X.sombre}" stroke-width="${n1(2 * S * gros)}"`);
    organe(T, a, 'pinces', pi.place, P[0], { points: P, epaisseurs: W }); }
  tete(T, X, c, hx, hy, hs, nb);
  return cadrer(T, true);
}
// un bipède : debout (un porteur de mains, sans grande queue) ou le corps tendu sur une queue qui fait contrepoids
function bipede(T, c, X) {
  const debout = X.og('mains') || c.queue < .3 || c.posture >= .95 && c.queue < .45; if (!debout) return quadrupede(T, c, X, true);
  const { u, rob, S, loco } = X, Th = u * (.13 + .1 * rob), Lt = u * (.22 + .2 * c.long), Hl = u * (.12 + .3 * c.haut), w = (1.8 + 4.5 * rob) * S;
  const hip = [0, -Hl], sh = [Th * .2, -Hl - Lt], course = loco.includes('course');
  T.P.dessin = 'bipede';
  const jambe = (dx, loin) => { const a = T.E.length, P = course ? [[hip[0] + dx, hip[1]], [hip[0] + dx + Hl * .22, hip[1] + Hl * .45], [hip[0] + dx - Hl * .05, -Hl * .12], [hip[0] + dx + Hl * .05, 0]] : [[hip[0] + dx, hip[1]], [hip[0] + dx + Hl * .12, hip[1] + Hl * .5], [hip[0] + dx, 0]];
    const W = membre(T, P, w * 1.3, w * .8, loin ? X.loin : X.robe); T.P.pattes.push(partie(T, a, { cote: loin ? 'loin' : 'pres', points: P, epaisseurs: W, pied: 'aucun' })); };
  jambe(Th * .25, true);
  const bras = (dx, loin) => { const a = T.E.length, coul = loin ? X.loin : X.robe, P = [[sh[0] + dx, sh[1] + Th * .2], [sh[0] + dx + Lt * .25, sh[1] + Lt * .45], [sh[0] + dx + Lt * .45, sh[1] + Lt * .75]], W = membre(T, P, w, w * .7, coul), main = !!X.og('mains');
    if (main) ellipse(T, P[2][0], P[2][1], w * .75, w * .65, coul); T.P.bras.push(partie(T, a, { cote: loin ? 'loin' : 'pres', points: P, epaisseurs: W, ...(main ? { main } : {}) })); };
  bras(Th * .2, true);
  if (c.queue > .06) { const a = T.E.length, tl = u * (.03 + .3 * c.queue), Q = [[hip[0] - Th * .3, hip[1] - Th * .2], [hip[0] - tl * .6, hip[1] + tl * .3], [hip[0] - tl, hip[1] + tl * .6]], r = ruban(Q[0], Q[1], Q[2], Th * .3, 1); chemin(T, r.d, X.robe, r.pts);
    T.P.queue = partie(T, a, { courbe: Q, epaisseurs: [Th * .3, 1] }); organesQueue(T, X, [hip[0] - tl, hip[1] + tl * .6], -1, Th); }
  const ic = T.E.length, C = [[hip[0], hip[1] + Th * .2], [hip[0] + Th * .15, hip[1] - Lt * .5], sh], t = ruban(C[0], C[1], C[2], Th * 1.25, Th * .95); chemin(T, t.d, X.robe, t.pts);
  const v = ruban([hip[0] + Th * .35, hip[1]], [hip[0] + Th * .45, hip[1] - Lt * .45], [sh[0] + Th * .3, sh[1] + Th * .3], Th * .5, Th * .35); chemin(T, v.d, X.ventre, v.pts, ' opacity=".9"');
  T.P.corps = partie(T, ic, { centre: [(hip[0] + sh[0]) / 2, (hip[1] + sh[1]) / 2], boite: boiteDe(t.pts), courbe: C, epaisseurs: [Th * 1.25, Th * .95] });
  organesDos(T, X, c, hip[0] - Th * .6, sh[0] - Th * .1, sh[1] + Lt * .5, Th * .6);
  ailes(T, X, c, sh[0] - Th * .2, sh[1] + Th * .3, u * .4);
  jambe(0, false); bras(0, false);
  const hs = u * (.08 + .07 * c.tete) * (1 - .25 * rob) + 2.5 * S, hx = sh[0] + hs * .3, hy = sh[1] - hs * .55 - u * .1 * c.cou, nb = [sh[0], sh[1] + 2];
  if (c.cou > .2) { const a = T.E.length, Q = [nb, [sh[0] + hs * .1, (sh[1] + hy) / 2], [hx - hs * .1, hy + hs * .2]], r = ruban(Q[0], Q[1], Q[2], Th * .45, hs * .5); chemin(T, r.d, X.robe, r.pts);
    T.P.cou = partie(T, a, { courbe: Q, epaisseurs: [Th * .45, hs * .5] }); }
  tete(T, X, c, hx, hy, hs, nb);
  return cadrer(T, true);
}
// un oiseau : le bec dit ce qu'il mange, les pattes s'il marche dans l'eau, la queue s'il parade
function oiseau(T, c, X) {
  const { u, rob, S, reg, loco, diete } = X, Lt = u * (.26 + .2 * c.long), Th = u * (.15 + .08 * rob), Hl = u * (.06 + .4 * c.haut) * (loco.includes('nage') && c.haut > .5 ? 1.2 : 1), w = Math.max(1, (1 + 2 * rob) * S);
  const cx = 0, cy = -Hl - Th * .5;
  T.P.dessin = 'oiseau';
  const patte = (dx, loin) => { const a = T.E.length, coul = loin ? X.loin : X.robe, P = [[cx + dx, cy + Th * .3], [cx + dx + Hl * .12, cy + Th * .3 + Hl * .45], [cx + dx - Hl * .05, 0]], W = membre(T, P, w * 1.2, w * .8, coul); const [fx, fy] = P[2];
    for (const d of [-4, 0, 5]) trait(T, `M${n1(fx)} ${n1(fy)} L${n1(fx + d * S)} ${n1(fy + .2)}`, coul, Math.max(.8, w * .7), [[fx + d * S, fy]]);
    if (reg === 'carnivore') trait(T, `M${n1(fx + 5 * S)} ${n1(fy)} q${n1(1.5 * S)} 0 ${n1(1.5 * S)} ${n1(-1.5 * S)}`, '#2e2620', 1, []);
    T.P.pattes.push(partie(T, a, { cote: loin ? 'loin' : 'pres', points: P, epaisseurs: W, pied: reg === 'carnivore' ? 'serres' : 'doigts' })); };
  patte(Th * .15, true);
  // la queue : un éventail, des plumes longues, ou courte
  const pa = X.og('panache'), tl = u * (.04 + .3 * c.queue) * (pa ? 1.6 : 1), tq = [cx - Lt * .45, cy - Th * .05], aq = T.E.length;
  if (pa?.forme === 'eventail') for (let i = 0; i < 7; i++) { const a = (150 + i * 12) * RAD, e = [tq[0] + Math.cos(a) * tl * 1.4, tq[1] - Math.sin(a) * tl * 1.4 + tl * .3]; trait(T, `M${n1(tq[0])} ${n1(tq[1])} L${n1(e[0])} ${n1(e[1])}`, i % 2 ? X.accent : X.sombre, Math.max(1.5, 3 * S), [e]); }
  else chemin(T, `M${n1(tq[0] + Lt * .1)} ${n1(tq[1] - Th * .2)} L${n1(tq[0] - tl)} ${n1(tq[1] - tl * .25)} L${n1(tq[0] - tl * .9)} ${n1(tq[1] + tl * .15)} L${n1(tq[0] + Lt * .1)} ${n1(tq[1] + Th * .2)}Z`, X.sombre, [[tq[0] - tl, tq[1] - tl * .25]]);
  // (de sa base à sa pointe : la plume du milieu de l'éventail, ou le milieu du bout de la queue)
  T.P.queue = partie(T, aq, { points: [tq, pa?.forme === 'eventail' ? [tq[0] + Math.cos(186 * RAD) * tl * 1.4, tq[1] - Math.sin(186 * RAD) * tl * 1.4 + tl * .3] : [tq[0] - tl * .95, tq[1] - tl * .05]] });
  if (pa) organe(T, aq, 'panache', pa.place, tq);
  const id = 'sil' + (++NUMERO), ic = T.E.length, corps = `M${n1(cx - Lt * .5)} ${n1(cy)} Q${n1(cx - Lt * .3)} ${n1(cy - Th * .6)} ${n1(cx + Lt * .15)} ${n1(cy - Th * .55)} Q${n1(cx + Lt * .5)} ${n1(cy - Th * .45)} ${n1(cx + Lt * .45)} ${n1(cy + Th * .05)} Q${n1(cx + Lt * .3)} ${n1(cy + Th * .62)} ${n1(cx - Lt * .1)} ${n1(cy + Th * .5)} Q${n1(cx - Lt * .4)} ${n1(cy + Th * .35)} ${n1(cx - Lt * .5)} ${n1(cy)}Z`;
  T.mettre(`<clipPath id="${id}"><path d="${corps}"/></clipPath><path d="${corps}" fill="${X.robe}"/><g clip-path="url(#${id})"><ellipse cx="${n1(cx + Lt * .1)}" cy="${n1(cy + Th * .45)}" rx="${n1(Lt * .4)}" ry="${n1(Th * .35)}" fill="${X.ventre}"/>${motifs(c, X, cx - Lt * .5, cx + Lt * .5, cy - Th * .6, cy + Th * .5, X.tr)}</g>`, [[cx - Lt * .5, cy - Th * .6], [cx + Lt * .5, cy + Th * .6]]);
  T.P.corps = partie(T, ic, { centre: [cx, cy], boite: [[cx - Lt * .5, cy - Th * .6], [cx + Lt * .5, cy + Th * .6]] });
  // l'aile repliée : grande chez un planeur
  const aa = T.E.length, al = Lt * (.5 + .55 * c.ailes); chemin(T, `M${n1(cx + Lt * .25)} ${n1(cy - Th * .3)} Q${n1(cx - Lt * .1)} ${n1(cy - Th * .55)} ${n1(cx - al * .9)} ${n1(cy + Th * .05)} Q${n1(cx - Lt * .05)} ${n1(cy + Th * .25)} ${n1(cx + Lt * .25)} ${n1(cy - Th * .3)}Z`, X.sombre, [[cx - al * .9, cy]]);
  organe(T, aa, 'ailes', X.og('ailes')?.place || 'flancs', [cx + Lt * .25, cy - Th * .3]);
  patte(0, false);
  const hs = u * (.08 + .06 * c.tete) + 2 * S, nl = u * (.02 + .3 * c.cou), hx = cx + Lt * .42 + nl * .35, hy = cy - Th * .45 - nl * .8, nb = [cx + Lt * .3, cy - Th * .2];
  if (nl > 3) { const a = T.E.length, Q = [nb, [cx + Lt * .45, (cy + hy) / 2], [hx - hs * .1, hy + hs * .1]], r = ruban(Q[0], Q[1], Q[2], Th * .55, hs * .7); chemin(T, r.d, X.robe, r.pts);
    T.P.cou = partie(T, a, { courbe: Q, epaisseurs: [Th * .55, hs * .7] }); }
  const at = T.E.length, cr = X.og('crete', 'tete'); if (cr) { for (let i = 0; i < 4; i++) { const e = [hx - hs * (.2 + i * .18), hy - hs * (.5 + .6 * cr.taille) - i * .5]; trait(T, `M${n1(hx - hs * .05 - i * hs * .1)} ${n1(hy - hs * .3)} L${n1(e[0])} ${n1(e[1])}`, X.accent, Math.max(1.2, hs * .12), [e]); }
    organe(T, at, 'crete', cr.place, [hx - hs * .2, hy - hs * .3]); }
  ellipse(T, hx, hy, hs * .5, hs * .45, X.robe);
  // le bec (museau : sa pointe)
  const bl = hs * (.4 + 1.2 * c.museau), by = hy + hs * .05, bx = hx + hs * .4, jaune = '#d6a24e'; let museau;
  if (reg === 'carnivore') { museau = [bx + bl * .75, by + hs * .2]; chemin(T, `M${n1(bx)} ${n1(by - hs * .2)} Q${n1(bx + bl * .7)} ${n1(by - hs * .25)} ${n1(bx + bl * .75)} ${n1(by + hs * .2)} Q${n1(bx + bl * .45)} ${n1(by)} ${n1(bx)} ${n1(by + hs * .15)}Z`, '#3d3328', [[bx + bl * .75, by + hs * .2]]); }
  else if ((diete.fruits || 0) >= .4) { museau = [bx + bl * 1.4, by + hs * .05]; chemin(T, `M${n1(bx - 1)} ${n1(by - hs * .35)} Q${n1(bx + bl * 1.3)} ${n1(by - hs * .4)} ${n1(bx + bl * 1.4)} ${n1(by + hs * .05)} Q${n1(bx + bl * .6)} ${n1(by + hs * .35)} ${n1(bx - 1)} ${n1(by + hs * .25)}Z`, X.accent, [[bx + bl * 1.4, by]]); }
  else if (loco.includes('nage')) { museau = [bx + bl * 1.6, by + hs * .05]; chemin(T, `M${n1(bx)} ${n1(by - hs * .1)} L${n1(bx + bl * 1.6)} ${n1(by + hs * .05)} L${n1(bx)} ${n1(by + hs * .15)}Z`, jaune, [[bx + bl * 1.6, by]]); }
  else { museau = [bx + bl * (reg === 'omnivore' ? .8 : .55), by + hs * .03]; chemin(T, `M${n1(bx)} ${n1(by - hs * .18)} L${n1(bx + bl * (reg === 'omnivore' ? .8 : .55))} ${n1(by + hs * .03)} L${n1(bx)} ${n1(by + hs * .2)}Z`, jaune, [[bx + bl * .8, by]]); }
  if (c.motif === 'masque') ellipse(T, hx + hs * .1, hy - hs * .05, hs * .4, hs * .15, X.sombre, ' opacity=".85"');
  oeil(T, hx + hs * .12, hy - hs * .08, hs * (.11 + (X.nuit ? .1 : 0)), X, reg === 'carnivore');
  T.P.tete = partie(T, at, { centre: [hx, hy], rayon: hs * .5, museau, pivot: nb });
  return cadrer(T, true);
}
// un insecte : la tête, le thorax, l'abdomen ; ses pattes articulées ; ses antennes, ses élytres, son aiguillon
function insecte(T, c, X) {
  const { u, rob, S, reg } = X, Lt = u * (.34 + .3 * c.long) * (.9 + .4 * rob), Th = u * (.1 + .06 * rob), Hl = u * (.07 + .15 * c.haut);
  const yb = -Hl * .55 - Th * .5, n = Math.max(2, Math.min(5, Math.round((c.pattes || 6) / 2))), xt = Lt * .12, xab = -Lt * .2;
  T.P.dessin = 'insecte';
  const pattes = loin => { for (let i = 0; i < n; i++) { const x = xt + Lt * .1 * (i - (n - 1) / 2), d = (i - (n - 1) / 2) / Math.max(1, (n - 1) / 2), dx = d * Lt * .22 + (loin ? Lt * .04 : 0);
    const a = T.E.length, P = [[x, yb + Th * .2], [x + dx * .6, yb - Th * .3 - Hl * .2], [x + dx * 1.35, 0]], W = membre(T, P, Math.max(.8, (1 + 1.6 * rob) * S), Math.max(.6, .8 * S), loin ? X.loin : X.sombre);
    T.P.pattes.push(partie(T, a, { cote: loin ? 'loin' : 'pres', points: P, epaisseurs: W, pied: 'aucun' })); } };
  pattes(true);
  // les ailes, translucides, au-dessus du dos (attachées là où le dessin les fait tourner)
  const aw = T.E.length, al = X.og('ailes'); if (al || c.ailes > .3) { const l = Lt * (.4 + .5 * (al?.taille ?? c.ailes)); for (const d of [0, 5]) ellipse(T, xab + d * S, yb - Th * .7 - l * .1, l * .55, l * .2, '#f4f6f2', ` transform="rotate(-12 ${n1(xab)} ${n1(yb)})" stroke="${X.sombre}" stroke-width=".8" opacity=".55"`);
    organe(T, aw, 'ailes', al?.place || 'flancs', [xab, yb]); }
  const id = 'sil' + (++NUMERO), ax = xab - Lt * .05, arx = Lt * .3, ary = Th * .62, ic = T.E.length;
  T.mettre(`<clipPath id="${id}"><ellipse cx="${n1(ax)}" cy="${n1(yb)}" rx="${n1(arx)}" ry="${n1(ary)}"/></clipPath><ellipse cx="${n1(ax)}" cy="${n1(yb)}" rx="${n1(arx)}" ry="${n1(ary)}" fill="${X.robe}"/><g clip-path="url(#${id})">${motifs(c, X, ax - arx, ax + arx, yb - ary, yb + ary, X.tr)}${c.motif === 'uni' ? [1, 2, 3].map(i => `<path d="M${n1(ax - arx + arx * i * .5)} ${n1(yb - ary)} L${n1(ax - arx + arx * i * .5)} ${n1(yb + ary)}" stroke="${X.sombre}" stroke-width="1" opacity=".4"/>`).join('') : ''}</g>`, [[ax - arx, yb - ary], [ax + arx, yb + ary]]);
  T.P.corps = partie(T, ic, { centre: [ax, yb], boite: [[ax - arx, yb - ary], [ax + arx, yb + ary]] });   // (l'abdomen ; le thorax, à part)
  // l'élytre (une carapace d'insecte) : un scarabée
  const ae = T.E.length, ca = X.og('carapace'); if (ca || c.carapace > .3) { chemin(T, `M${n1(ax - arx * .95)} ${n1(yb + ary * .1)} Q${n1(ax - arx * .6)} ${n1(yb - ary * 1.35)} ${n1(ax + arx * .7)} ${n1(yb - ary * .7)} L${n1(ax + arx * .7)} ${n1(yb + ary * .2)}Z`, X.sombre, [[ax, yb - ary * 1.3]], ' opacity=".9"');
    organe(T, ae, 'carapace', ca?.place || 'dos', [ax, yb - ary]); }
  // l'aiguillon : relevé au-dessus du dos (un scorpion) ou droit (une guêpe)
  const ai = X.og('aiguillon'); if (ai) { const a = T.E.length, l = Lt * (.3 + .4 * ai.taille), p = [ax - arx * .95, yb], e = ai.forme === 'courbe' ? [ax - arx * .2, yb - ary - l * .6] : [p[0] - l * .5, yb + 1], c1 = ai.forme === 'courbe' ? [p[0] - l * .7, yb - l * .9] : [p[0] - l * .25, yb];
    const r = ruban(p, c1, e, Th * .45, 1.2); chemin(T, r.d, X.sombre, r.pts); organe(T, a, 'aiguillon', ai.place, p, { courbe: [p, c1, e], epaisseurs: [Th * .45, 1.2] }); }
  const ix = T.E.length; ellipse(T, xt, yb - Th * .05, Lt * .13, Th * .48, X.sombre);
  T.P.thorax = partie(T, ix, { centre: [xt, yb - Th * .05], rayon: Math.max(Lt * .13, Th * .48) });
  pattes(false);
  const hs = u * (.06 + .06 * c.tete) + 1.5 * S, hx = xt + Lt * .13 + hs * .35, hy = yb - Th * .15, at = T.E.length;
  // les antennes : longues chez un insecte qui tâte l'ombre ; plumeuses chez certains
  const an = X.og('antennes'), L = Lt * (.25 + .5 * (an?.taille ?? Math.max(.3, c.antennes)));
  for (const d of [0, 3 * S]) { const q = [hx + L * .6 + d, hy - L * .7], c1 = [hx + d + L * .1, hy - L * .8]; trait(T, `M${n1(hx + d)} ${n1(hy - hs * .3)} Q${n1(c1[0])} ${n1(c1[1])} ${n1(q[0])} ${n1(q[1])}`, X.sombre, Math.max(.7, .9 * S), [q]); if (an?.forme === 'plumeuses') ellipse(T, q[0], q[1], L * .1, L * .04, X.sombre); }
  organe(T, at, 'antennes', an?.place || 'tete', [hx, hy - hs * .3]);
  ellipse(T, hx, hy, hs * .5, hs * .45, X.robe);
  // les pinces (un scorpion, un crabe de terre) ou les mandibules d'un chasseur
  const pi = X.og('pinces'); if (pi) { const a = T.E.length, l = Lt * (.25 + .3 * pi.taille), gros = pi.forme === 'massives' ? 1.6 : 1, y = yb + Th * .1, P = [[xt + Lt * .1, y], [hx + l * .4, y - l * .3], [hx + l, y - l * .05]];
    const W = membre(T, P, 2 * S * gros, 1.6 * S * gros, X.sombre); ellipse(T, hx + l + 2 * S, y - l * .05, 4 * S * gros, 2.5 * S * gros, X.sombre); organe(T, a, 'pinces', pi.place, P[0], { points: P, epaisseurs: W }); }
  else if (reg === 'carnivore') for (const d of [-1, 1]) trait(T, `M${n1(hx + hs * .4)} ${n1(hy + d * hs * .15)} q${n1(hs * .5)} ${n1(d * hs * .1)} ${n1(hs * .55)} ${n1(-d * hs * .3)}`, X.sombre, Math.max(1, S * 1.2), [[hx + hs, hy]]);
  oeil(T, hx + hs * .18, hy - hs * .1, hs * (.16 + (X.nuit ? .08 : 0)), X, false);
  T.P.tete = partie(T, at, { centre: [hx, hy], rayon: hs * .5, museau: [hx + hs * .5, hy], pivot: [xt + Lt * .13, hy] });
  return cadrer(T, true);
}
// un serpent : son épaisseur dit sa masse ; la tête en triangle et la langue d'un chasseur
function serpent(T, c, X) {
  const { u, rob, S, reg } = X, w = (3 + 9 * rob) * S, L = u * (.7 + .6 * c.long), A = w * 1.1 + 3 * S, P = [];
  for (let i = 0; i <= 24; i++) { const t = i / 24; P.push([-L / 2 + L * t, -w / 2 - A - A * Math.sin(t * Math.PI * 2.2) * (.4 + .6 * t)]); }
  const d = 'M' + P.map(([x, y]) => n1(x) + ' ' + n1(y)).join('L'), ic = T.E.length;
  T.P.dessin = 'serpent';
  trait(T, d, X.robe, w, P.map(([x, y]) => [x, y + w / 2]).concat(P.map(([x, y]) => [x, y - w / 2])));
  trait(T, d, X.ventre, w * .3, [], ` transform="translate(0 ${n1(w * .28)})" opacity=".85"`);
  if (c.motif === 'rayures' || c.motif === 'bandes') trait(T, d, X.sombre, w * .22, [], ' opacity=".8"');
  if (c.motif === 'taches' || X.tr.includes('coloration-aposematique')) for (let i = 2; i < 23; i += 2) ellipse(T, P[i][0], P[i][1], w * .28, w * .22, X.tr.includes('coloration-aposematique') ? '#d8a23a' : X.sombre);
  // (le corps : son échine, de la queue à la tête, les points mêmes de son trait)
  T.P.corps = partie(T, ic, { centre: P[12], boite: boiteDe(P.map(([x, y]) => [x, y - w / 2]).concat(P.map(([x, y]) => [x, y + w / 2]))), points: P, epaisseur: w });
  const [hx, hy] = P[24], hs = w * (reg === 'carnivore' ? 1.6 : 1.3) + 2 * S, at = T.E.length;
  if (reg === 'carnivore') { chemin(T, `M${n1(hx - hs * .4)} ${n1(hy - hs * .35)} L${n1(hx + hs * .55)} ${n1(hy - hs * .1)} L${n1(hx + hs * .55)} ${n1(hy + hs * .15)} L${n1(hx - hs * .4)} ${n1(hy + hs * .35)}Z`, X.robe, [[hx + hs * .55, hy]]);
    trait(T, `M${n1(hx + hs * .55)} ${n1(hy + hs * .05)} l${n1(4 * S)} 0 l${n1(2 * S)} ${n1(-1.5 * S)} M${n1(hx + hs * .55 + 4 * S)} ${n1(hy + hs * .05)} l${n1(2 * S)} ${n1(1.5 * S)}`, '#b0303a', Math.max(.7, .8 * S), [[hx + hs * .55 + 6 * S, hy]]); }
  else ellipse(T, hx + hs * .1, hy, hs * .55, hs * .38, X.robe);
  oeil(T, hx + hs * .15, hy - hs * .12, hs * (.13 + (X.nuit ? .06 : 0)), X, reg === 'carnivore');
  T.P.tete = partie(T, at, { centre: [hx + hs * .1, hy], rayon: hs * .55, museau: [hx + hs * (reg === 'carnivore' ? .55 : .65), hy], pivot: [hx - hs * .4, hy] });
  return cadrer(T, true);
}
// un poisson : effilé chez un chasseur du large, haut et rond chez un brouteur de récif, une anguille quand il est très long ;
// la bouche dit ce qu'il mange
function poisson(T, c, X) {
  const { u, rob, S, reg } = X, ang = c.long > .85, rx = ang ? u * .55 : u * (.22 + .2 * c.long) * (.85 + .3 * rob), ry = ang ? u * .06 : u * (.17 - .1 * c.long) * (.85 + .3 * rob);
  const voile = c.organes.some(o => o.type === 'nageoires' && o.forme === 'voiles') ? 1.6 : 1, nf = X.og('nageoires')?.taille || 0, cq = ry * (ang ? 1.6 : 1.1) * (.8 + c.queue * .5) * voile;
  const xq = -rx, xt = rx;
  T.P.dessin = 'poisson';
  // la nageoire de la queue (de sa base à sa pointe), celle du dos, celle du ventre
  let a = T.E.length; chemin(T, `M${n1(xq + 4 * S)} 0 L${n1(xq - u * .1 - c.queue * u * .06)} ${n1(-cq)} Q${n1(xq - 4 * S)} 0 ${n1(xq - u * .1 - c.queue * u * .06)} ${n1(cq)}Z`, X.sombre, [[xq - u * .16, -cq], [xq, cq]]);
  T.P.queue = partie(T, a, { points: [[xq + 4 * S, 0], [xq - u * .1 - c.queue * u * .06, 0]] });
  a = T.E.length; chemin(T, `M${n1(-rx * .45)} ${n1(-ry + 2)} Q${n1(-rx * .1)} ${n1(-ry - (6 + nf * 12) * S * voile)} ${n1(rx * .25)} ${n1(-ry + 1)}Z`, X.sombre, [[0, -ry - (6 + nf * 12) * S * voile]]);
  organe(T, a, 'nageoires', 'dos', [-rx * .1, -ry + 1.5]);
  if (!ang) { a = T.E.length; chemin(T, `M${n1(-rx * .25)} ${n1(ry - 2)} Q${n1(-rx * .05)} ${n1(ry + (4 + nf * 8) * S * voile)} ${n1(rx * .15)} ${n1(ry - 1)}Z`, X.sombre, [[0, ry + (4 + nf * 8) * S]], ' opacity=".8"'); organe(T, a, 'nageoires', 'ventre', [-rx * .05, ry - 1.5]); }
  const id = 'sil' + (++NUMERO), ic = T.E.length;
  T.mettre(`<clipPath id="${id}"><ellipse cx="0" cy="0" rx="${n1(rx)}" ry="${n1(ry)}"/></clipPath><ellipse cx="0" cy="0" rx="${n1(rx)}" ry="${n1(ry)}" fill="${X.robe}"/><g clip-path="url(#${id})"><rect x="${n1(-rx)}" y="${n1(-ry)}" width="${n1(2 * rx)}" height="${n1(ry * .6)}" fill="${X.sombre}" opacity=".4"/><ellipse cx="${n1(rx * .05)}" cy="${n1(ry * .75)}" rx="${n1(rx * .9)}" ry="${n1(ry * .5)}" fill="${X.ventre}"/>${motifs(c, X, -rx * .7, rx * .7, -ry, ry, X.tr)}</g>`, [[-rx, -ry], [rx, ry]]);
  T.P.corps = partie(T, ic, { centre: [0, 0], boite: [[-rx, -ry], [rx, ry]] });
  a = T.E.length; if (X.og('epines')) { for (let i = 0; i < 5; i++) trait(T, `M${n1(-rx * .4 + i * rx * .16)} ${n1(-ry + 3)} L${n1(-rx * .45 + i * rx * .16)} ${n1(-ry - 6 * S - X.og('epines').taille * 8 * S)}`, os, 1.4, [[0, -ry - 14 * S]]);
    organe(T, a, 'epines', X.og('epines').place, [-rx * .08, -ry + 3]); }
  // la tête : l'avant du corps, de l'opercule au museau (la bouche)
  const at = T.E.length;
  trait(T, `M${n1(xt - ry * .9)} ${n1(-ry * .55)} Q${n1(xt - ry * 1.1)} 0 ${n1(xt - ry * .9)} ${n1(ry * .55)}`, X.sombre, 1.2, [], ' opacity=".7"');
  if (!ang) { a = T.E.length; chemin(T, `M${n1(xt - ry * 1.4)} 2 l${n1(-9 * S)} ${n1((6 + nf * 6) * S)} l${n1(12 * S)} ${n1(-2 * S)}Z`, X.sombre, [], ' opacity=".85"'); organe(T, a, 'nageoires', 'flancs', [xt - ry * 1.4, 2]); }
  // la bouche : grande et dentée chez un chasseur, béante chez un filtreur, petite chez un brouteur
  if (reg === 'carnivore') { chemin(T, `M${n1(xt + 1)} ${n1(ry * .05)} L${n1(xt - ry * .7)} ${n1(ry * .25)} L${n1(xt - 1)} ${n1(ry * .35)}Z`, '#3a1f1f', []); for (let i = 0; i < 3; i++) chemin(T, `M${n1(xt - 2 - i * ry * .2)} ${n1(ry * .1)} l${n1(-1.2 * S)} ${n1(2.2 * S)} l${n1(-1.2 * S)} ${n1(-2.2 * S)}Z`, '#fbf6ea', []); }
  else if (reg === 'filtreur') ellipse(T, xt - ry * .15, ry * .08, ry * .28, ry * .26, '#3a2a2a');
  else trait(T, `M${n1(xt - 1)} ${n1(ry * .15)} l${n1(-5 * S)} ${n1(1.5 * S)}`, X.sombre, 1.2, []);
  if (X.og('antennes') || c.antennes > .25) { a = T.E.length; trait(T, `M${n1(xt - 3)} ${n1(ry * .3)} q${n1(8 * S)} ${n1(6 * S)} ${n1(12 * S)} ${n1(14 * S)}`, X.sombre, 1.3, [[xt + 12 * S, ry + 14 * S]]); organe(T, a, 'antennes', X.og('antennes')?.place || 'tete', [xt - 3, ry * .3]); }
  oeil(T, xt - ry * .55, -ry * .25, Math.max(1.6, ry * .14) * (X.nuit ? 1.4 : 1), X, false);
  T.P.tete = partie(T, at, { centre: [xt - ry * .5, 0], rayon: ry * .6, museau: [xt, ry * .1], pivot: [xt - ry, 0] });
  return cadrer(T, false);
}
// une pieuvre : une tête et ses bras
function pieuvre(T, c, X) {
  const { u, S } = X, n = Math.max(4, Math.min(10, c.pattes || 8)), r = u * (.12 + .08 * c.tete);
  T.P.dessin = 'pieuvre';
  for (let i = 0; i < n; i++) { const a = -.95 + 1.9 * i / (n - 1), p0 = [a * r * .7, r * .6], e = [a * r * 2.8, r * 2.6 + Math.cos(a * 2) * r * .4], c1 = [a * r * 1.8 + (i % 2 ? r * .5 : -r * .5), r * 2.2];
    const ib = T.E.length, rb = ruban(p0, c1, e, r * .32, 1); chemin(T, rb.d, i % 2 ? X.sombre : X.robe, rb.pts); T.P.bras.push(partie(T, ib, { courbe: [p0, c1, e], epaisseurs: [r * .32, 1] })); }
  const id = 'sil' + (++NUMERO), ic = T.E.length;
  T.mettre(`<clipPath id="${id}"><ellipse cx="0" cy="0" rx="${n1(r)}" ry="${n1(r * 1.15)}"/></clipPath><ellipse cx="0" cy="0" rx="${n1(r)}" ry="${n1(r * 1.15)}" fill="${X.robe}"/><g clip-path="url(#${id})">${motifs(c, X, -r, r, -r * 1.15, r * 1.15, X.tr)}<ellipse cx="${n1(-r * .3)}" cy="${n1(-r * .4)}" rx="${n1(r * .45)}" ry="${n1(r * .55)}" fill="${X.ventre}" opacity=".35"/></g>`, [[-r, -r * 1.15], [r, r * 1.15]]);
  T.P.corps = partie(T, ic, { centre: [0, 0], boite: [[-r, -r * 1.15], [r, r * 1.15]] });   // (le manteau : la tête d'une pieuvre)
  for (const d of [-1, 1]) oeil(T, d * r * .42, r * .42, Math.max(1.8, r * .14) * (X.nuit ? 1.3 : 1), X, false);
  return cadrer(T, false);
}
// un corps rayonné : une méduse qui nage, une étoile qui rampe au fond
function rayonne(T, c, X, plan) {
  const { u } = X, n = Math.max(4, Math.min(8, c.pattes || 5));
  if ((plan?.locomotion || ['nage']).includes('nage')) { const r = u * (.16 + .1 * c.tete);
    T.P.dessin = 'meduse';
    for (let i = 0; i < n; i++) { const a = T.E.length, x = -r * .8 + 1.6 * r * i / (n - 1), q = [x + (i % 2 ? 6 : -6), r * 1.8 + (i % 3) * r * .3], c1 = [x + (i % 2 ? r * .3 : -r * .3), r * .9];
      trait(T, `M${n1(x)} 0 Q${n1(c1[0])} ${n1(c1[1])} ${n1(q[0])} ${n1(q[1])}`, X.sombre, 1.5, [q], ' opacity=".75"'); T.P.bras.push(partie(T, a, { courbe: [[x, 0], c1, q], epaisseur: 1.5 })); }
    const ic = T.E.length;
    chemin(T, `M${n1(-r)} 0 Q${n1(-r)} ${n1(-r * 1.05)} 0 ${n1(-r * 1.05)} Q${n1(r)} ${n1(-r * 1.05)} ${n1(r)} 0 Q0 ${n1(-r * .25)} ${n1(-r)} 0Z`, X.robe, [[-r, -r * 1.05], [r, 0]], ' opacity=".85"');
    trait(T, `M${n1(-r * .6)} ${n1(-r * .2)} Q0 ${n1(-r * .9)} ${n1(r * .6)} ${n1(-r * .2)}`, X.ventre, 2, [], ' opacity=".7"');
    T.P.corps = partie(T, ic, { centre: [0, -r * .5], boite: [[-r, -r * 1.05], [r, 0]] });   // (la cloche)
    return cadrer(T, false); }
  T.P.dessin = 'etoile';
  const R1 = u * (.22 + .1 * c.long), R0 = R1 * .32; let d = ''; for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + Math.PI * i / n, rr = i % 2 ? R0 : R1; d += (i ? 'L' : 'M') + n1(rr * Math.cos(a)) + ' ' + n1(rr * Math.sin(a) * .85 - R1 * .85); }
  const ic = T.E.length; chemin(T, d + 'Z', X.robe, [[-R1, -R1 * 1.7], [R1, 0]], ` stroke="${X.sombre}" stroke-width="1.5"`); ellipse(T, 0, -R1 * .85, R0 * .5, R0 * .45, X.ventre);
  T.P.corps = partie(T, ic, { centre: [0, -R1 * .85], boite: [[-R1, -R1 * 1.7], [R1, 0]] });
  // (ses bras, du centre à chaque pointe : un seul trait les dessine tous)
  for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + Math.PI * 2 * i / n; T.P.bras.push({ points: [[0, -R1 * .85], [R1 * Math.cos(a), R1 * Math.sin(a) * .85 - R1 * .85]], e: [ic, ic] }); }
  return cadrer(T, true);
}
// un corps segmenté : des anneaux, une paire de pattes à chacun
function segmente(T, c, X) {
  const { u, S, rob } = X, n = Math.max(6, Math.min(16, Math.round((c.pattes || 24) / 2))), r = (2.5 + 4 * rob) * S + 2, w = r * 1.5;
  T.P.dessin = 'mille-pattes';
  // (à chaque anneau, deux pattes en V sous lui : celle qui part vers l'arrière, dessinée d'abord, est dite du côté lointain)
  const anneaux = []; let ic = -1;
  for (let i = 0; i < n; i++) { const x = i * w, y = -r - 3 * S - Math.sin(i * .7) * 2.5 * S;
    for (const s of [-1, 1]) { const a = T.E.length; T.mettre(`<line x1="${n1(x)}" y1="${n1(y)}" x2="${n1(x + s * r * .5)}" y2="0" stroke="${X.sombre}" stroke-width="${n1(Math.max(.8, S))}"/>`, [[x + s * r * .5, 0]]);
      T.P.pattes.push(partie(T, a, { cote: s < 0 ? 'loin' : 'pres', points: [[x, y], [x + s * r * .5, 0]], epaisseurs: [Math.max(.8, S)], pied: 'aucun' })); }
    if (ic < 0) ic = T.E.length; ellipse(T, x, y - r * .3, r, r, i % 2 ? X.robe : X.sombre); anneaux.push([x, y - r * .3, r]); }
  // (le corps : ses anneaux, du premier au dernier ; les pattes des suivants sont dessinées entre eux)
  T.P.corps = partie(T, ic, { centre: [(n - 1) * w / 2, anneaux.reduce((s, q) => s + q[1], 0) / n], boite: [[-r, Math.min(...anneaux.map(q => q[1])) - r], [(n - 1) * w + r, Math.max(...anneaux.map(q => q[1])) + r]], anneaux });
  const hx = n * w, hy = -r - 4 * S, at = T.E.length; ellipse(T, hx, hy, r * 1.1, r, X.robe);
  const aa = T.E.length; trait(T, `M${n1(hx + 2)} ${n1(hy - r * .6)} q${n1(8 * S)} ${n1(-10 * S)} ${n1(14 * S)} ${n1(-8 * S)} M${n1(hx)} ${n1(hy - r * .7)} q${n1(4 * S)} ${n1(-12 * S)} ${n1(10 * S)} ${n1(-14 * S)}`, X.sombre, 1.2, [[hx + 14 * S, hy - 18 * S]]);
  organe(T, aa, 'antennes', X.og('antennes')?.place || 'tete', [hx + 1, hy - r * .65]);
  oeil(T, hx + r * .4, hy - r * .1, Math.max(1.4, r * .25), X, false);
  T.P.tete = partie(T, at, { centre: [hx, hy], rayon: r * 1.1, museau: [hx + r * 1.1, hy], pivot: [hx - r * 1.1, hy] });
  return cadrer(T, true);
}
// une machine de la Mère : un châssis, des pattes de métal, et ce que ses modules lui font porter
function machine(T, plan, X) {
  const M = plan.modules || {}, m = plan.masse_kg || 10, lm = Math.log10(Math.max(.01, m)), S = cl(.72 + .1 * (lm + 2), .68, 1.12), u = 110 * S;
  const ACC = { regulateur: [214, 154, 52], foreuse: [196, 92, 52], recycleur: [96, 160, 88], capteur: [70, 150, 200] }, acc = rgb(ACC[plan.role] || [214, 154, 52]);
  const acier = (M.discretion || 0) > .3 ? [70, 74, 72] : mel([128, 134, 138], [96, 102, 108], M.blindage || 0), coque = rgb(acier), fonce = rgb(mel(acier, [30, 32, 35], .45)), clair = rgb(mel(acier, [235, 238, 240], .35));
  const L = u * .42, H = u * (.16 + .12 * (M.blindage || 0)), Hl = u * .2, y0 = -Hl - H, x0 = -L / 2;
  T.P.dessin = 'machine';
  // quatre pattes articulées (deux de chaque côté), des articulations rondes, un patin
  const patte = (x, loin) => { const a = T.E.length, P = [[x, y0 + H * .8], [x + (loin ? 4 : -4) * S, -Hl * .55], [x + (loin ? 1 : -1) * S, 0]], W = membre(T, P, 3.2 * S, 2.4 * S, loin ? fonce : coque); for (const p of P.slice(0, 2)) ellipse(T, p[0], p[1], 2 * S, 2 * S, fonce); T.mettre(`<rect x="${n1(P[2][0] - 3 * S)}" y="${n1(-2 * S)}" width="${n1(6 * S)}" height="${n1(2 * S)}" fill="${fonce}"/>`, [[P[2][0] - 3 * S, 0]]);
    T.P.pattes.push(partie(T, a, { cote: loin ? 'loin' : 'pres', points: P, epaisseurs: W, pied: 'patin' })); };
  patte(x0 + L * .25, true); patte(x0 + L * .8, true);
  // le panneau solaire, sur le dos, incliné ; le recycleur, une trémie à l'arrière (les modules sont ses organes)
  let a = T.E.length; if ((M.panneau || 0) > .2) { const w = L * (.5 + .5 * M.panneau), x = x0 + L * .15, y = y0 - 3 * S;
    T.mettre(`<path d="M${n1(x)} ${n1(y)} L${n1(x + w)} ${n1(y - w * .28)} L${n1(x + w)} ${n1(y - w * .28 - 3 * S)} L${n1(x)} ${n1(y - 3 * S)}Z" fill="#2c4a6b" stroke="${clair}" stroke-width=".8"/>`, [[x, y - w * .28 - 3 * S], [x + w, y]]);
    for (let i = 1; i < 4; i++) T.mettre(`<line x1="${n1(x + w * i / 4)}" y1="${n1(y - w * .28 * i / 4)}" x2="${n1(x + w * i / 4)}" y2="${n1(y - w * .28 * i / 4 - 3 * S)}" stroke="${clair}" stroke-width=".6"/>`);
    T.mettre(`<line x1="${n1(x + w * .5)}" y1="${n1(y - w * .14)}" x2="${n1(x + w * .5)}" y2="${n1(y0)}" stroke="${fonce}" stroke-width="${n1(1.5 * S)}"/>`); organe(T, a, 'panneau', null, [x + w * .5, y0]); }
  a = T.E.length; if ((M.recycleur || 0) > .3) { chemin(T, `M${n1(x0 - 2 * S)} ${n1(y0 - H * .5 * M.recycleur)} L${n1(x0 + L * .2)} ${n1(y0)} L${n1(x0 + L * .05)} ${n1(y0 + H * .3)}Z`, fonce, [[x0 - 2 * S, y0 - H * .5]]); organe(T, a, 'recycleur', null, [x0, y0]); }
  // le châssis : arrondi, plus haut et plus sombre s'il est blindé
  const ic = T.E.length;
  T.mettre(`<rect x="${n1(x0)}" y="${n1(y0)}" width="${n1(L)}" height="${n1(H)}" rx="${n1(H * .3)}" fill="${coque}"/><rect x="${n1(x0)}" y="${n1(y0 + H * .62)}" width="${n1(L)}" height="${n1(H * .38)}" rx="${n1(H * .2)}" fill="${fonce}" opacity=".55"/>`, [[x0, y0], [x0 + L, y0 + H]]);
  if ((M.blindage || 0) > .2) for (let i = 1; i < 4; i++) T.mettre(`<line x1="${n1(x0 + L * i / 4)}" y1="${n1(y0 + 1)}" x2="${n1(x0 + L * i / 4)}" y2="${n1(y0 + H - 1)}" stroke="${fonce}" stroke-width="1.2"/>`);
  if ((M.thermique || 0) > .3) for (let i = 0; i < 4; i++) T.mettre(`<line x1="${n1(x0 + L * (.3 + i * .08))}" y1="${n1(y0 + H * .2)}" x2="${n1(x0 + L * (.3 + i * .08))}" y2="${n1(y0 + H * .55)}" stroke="${clair}" stroke-width="1.4"/>`);
  if ((M.batterie || 0) > .3) T.mettre(`<rect x="${n1(x0 + L * .65)}" y="${n1(y0 + H * .2)}" width="${n1(L * .14)}" height="${n1(H * .32)}" rx="1" fill="${acc}"/>`);
  T.mettre(`<rect x="${n1(x0 + L * .05)}" y="${n1(y0 + H * .12)}" width="${n1(L * .9)}" height="${n1(Math.max(1.2, H * .07))}" fill="${acc}" opacity=".9"/>`);
  T.P.corps = partie(T, ic, { centre: [x0 + L / 2, y0 + H / 2], boite: [[x0, y0], [x0 + L, y0 + H]] });   // (le châssis, son blindage, ses ailettes, sa batterie)
  patte(x0 + L * .2, false); patte(x0 + L * .75, false);
  // devant : la foreuse (un cône rayé), la pince (un bras articulé), l'arme (un canon) ; l'œil, une lentille qui luit
  const xa = x0 + L, ym = y0 + H * .5;
  a = T.E.length; if ((M.foreuse || 0) > .3) { const l = u * (.08 + .14 * M.foreuse); chemin(T, `M${n1(xa)} ${n1(ym - H * .25)} L${n1(xa + l)} ${n1(ym + H * .05)} L${n1(xa)} ${n1(ym + H * .35)}Z`, clair, [[xa + l, ym]]); for (let i = 1; i < 4; i++) T.mettre(`<line x1="${n1(xa + l * i / 4)}" y1="${n1(ym - H * .25 * (1 - i / 4))}" x2="${n1(xa + l * i / 4 - 2)}" y2="${n1(ym + H * .35 * (1 - i / 4))}" stroke="${fonce}" stroke-width=".9"/>`);
    organe(T, a, 'foreuse', null, [xa, ym]); }
  a = T.E.length; if ((M.pince || 0) > .3) { const l = u * (.1 + .1 * M.pince), p = [[xa - L * .1, y0 + H * .2], [xa + l * .4, y0 - l * .4], [xa + l, y0 - l * .1]], W = membre(T, p, 2.4 * S, 1.8 * S, coque); for (const p2 of p.slice(0, 2)) ellipse(T, p2[0], p2[1], 1.8 * S, 1.8 * S, fonce);
    chemin(T, `M${n1(p[2][0])} ${n1(p[2][1])} l${n1(5 * S)} ${n1(-4 * S)} M${n1(p[2][0])} ${n1(p[2][1])} l${n1(5 * S)} ${n1(3 * S)}`, 'none', [[p[2][0] + 5 * S, p[2][1] - 4 * S]], ` stroke="${fonce}" stroke-width="${n1(1.8 * S)}"`);
    organe(T, a, 'pince', null, p[0], { points: p, epaisseurs: W }); }
  a = T.E.length; if ((M.arme || 0) > .2) { T.mettre(`<rect x="${n1(xa - L * .2)}" y="${n1(y0 - 4 * S)}" width="${n1(L * .45)}" height="${n1(2.5 * S)}" fill="${fonce}"/>`, [[xa + L * .25, y0 - 4 * S]]); organe(T, a, 'arme', null, [xa - L * .2, y0 - 2.75 * S]); }
  const r = 2.4 * S * (.8 + (plan.perception || .5)); ellipse(T, xa - r * 1.3, y0 + H * .35, r * 1.4, r * 1.4, fonce); ellipse(T, xa - r * 1.3, y0 + H * .35, r * .8, r * .8, '#7fe0ff'); T.Y.push([xa - r * 1.3, y0 + H * .35, r * 1.4]);
  return cadrer(T, true);
}

// les éléments au premier niveau d'un morceau de SVG (un <clipPath>…</clipPath> en est un, ce qu'il contient non)
const elements = s => { let n = 0, p = 0; for (const m of s.matchAll(/<(\/?)[a-zA-Z][^>]*?(\/?)>/g)) { if (m[1]) p--; else { if (!p) n++; if (!m[2]) p++; } } return n; };
// les parties du corps, dans le cadre de 170 × 90 (docs/21). Chaque point est là où le SVG le place : écrit au dixième dans le
// groupe du dessin, posé par le groupe tel qu'il est écrit (translate(tx ty) scale(k)), puis arrondi au dixième. Chaque partie dit
// ses éléments dans le groupe du SVG (svg : [premier, dernier], comptés de 0, l'ombre au sol comprise)
function parties(T, yeux) {
  const C = T.cadre, Q = T.P; if (!C || !Q.dessin) return null;
  const tx = n1(C.tx), ty = n1(C.ty), k = +C.k.toFixed(3), pt = p => [n1(tx + k * n1(p[0])), n1(ty + k * n1(p[1]))], lg = v => n1(k * n1(v));
  const debut = [C.ombre ? 1 : 0]; for (const s of T.E) debut.push(debut[debut.length - 1] + elements(s));
  const F = { points: v => v.map(pt), courbe: v => v.map(pt), epaisseurs: v => v.map(lg), epaisseur: lg, rayon: lg, centre: pt, museau: pt, pivot: pt, attache: pt,
    boite: ([a, b]) => [...pt(a), ...pt(b)], anneaux: v => v.map(([x, y, r]) => [...pt([x, y]), lg(r)]), e: ([a, b]) => [debut[a], debut[b + 1] - 1] };
  const part = o => Object.fromEntries(Object.entries(o).map(([c, v]) => [c === 'e' ? 'svg' : c, F[c] ? F[c](v) : v]));
  // (au sol, bas : le milieu du bas du dessin, où est son ombre ; contact : là où elle touche le sol, la ligne de ses pieds (y = 0
  // du groupe) quand elle a des pattes, qu'une queue lourde ou une trompe peut dépasser vers le bas ; sans pattes, le bas du dessin)
  const B = T.B, out = { dessin: Q.dessin, groupe: [tx, ty, k], boite: F.boite([[B.x0, B.y0], [B.x1, B.y1]]), ...(C.sol ? { contact: [85, Q.pattes.length ? ty : 86], bas: [85, 86] } : {}) };
  for (const c of ['corps', 'thorax', 'tete', 'cou', 'queue']) if (Q[c]) out[c] = part(Q[c]);
  out.pattes = Q.pattes.map(part);
  for (const c of ['bras', 'organes']) if (Q[c].length) out[c] = Q[c].map(part);
  out.yeux = yeux.map(e => [...e]);
  return out;
}

// sortie (facultatif) : un objet qui reçoit où sont les yeux dans le dessin, pour qu'un jeu les fasse briller dans la nuit :
//   sortie.yeux = [[x, y, r], …] (dans le cadre de 170 × 90), sortie.sol = true quand la bête tient debout sur le bas du cadre ;
//   sortie.parties : le corps, la tête, chaque patte, la queue, les organes, les yeux, dans le même cadre (docs/21)
// --- les variantes (docs/21) : à l'intérieur d'une forme, le dessin d'après ce que la bête porte et fait — ses organes, ses pattes, ses
// déplacements, son régime. Rien n'est ajouté au contrat : un escargot est un « serpent » à coquille qui rampe, une araignée un « hexapode »
// à huit pattes sans antennes, une chauve-souris un « quadrupède » ailé qui vole. Les créatures inventées en profitent de même
function variante(c, plan) {
  const o = t => c.organes.some(x => x.type === t), loco = plan?.locomotion || [], m = plan?.masse_kg || 1, seul = l => loco.length > 0 && loco.every(x => x === l);
  if (c.forme === 'serpent' && o('carapace') && m < .5 && !seul('nage')) return plan?.regime === 'filtreur' ? 'bivalve' : 'gasteropode';
  if (c.forme === 'hexapode') {
    if (!o('ailes') && (o('pinces') || (c.pattes >= 8 && o('carapace')))) return 'crustace';
    if (c.pattes === 8 && !o('antennes')) return 'araignee';
    if (c.pattes === 6 && o('ailes') && o('trompe')) return 'papillon';
    if (c.pattes === 6 && o('ailes') && o('aiguillon')) return 'abeille';
    if (m < 1e-5 && seul('nage')) return 'plancton'; }
  if (c.forme === 'quadrupede') {
    if (o('ailes') && loco.includes('vol')) return 'chauvesouris';
    if (o('nageoires') && o('carapace')) return 'tortue-marine';
    if (o('nageoires') && !loco.includes('marche') && !loco.includes('course')) return 'phoque';
    if (loco.includes('saut') && loco.includes('nage') && m < 2 && !o('carapace')) return 'grenouille'; }
  return null;
}
const spirale = (cx, cy, r, tours = 2.2) => { let d = ''; const N = 48; for (let i = 0; i <= N; i++) { const k = i / N, a = k * tours * 2 * Math.PI, rr = r * (1 - k * .92); d += (i ? 'L' : 'M') + n1(cx + rr * Math.cos(a)) + ' ' + n1(cy + rr * Math.sin(a)); } return d; };
const fin = (T, nom, ic, boite, sol = true) => { T.P.dessin = nom; T.P.corps = partie(T, ic, { centre: [(boite[0][0] + boite[1][0]) / 2, (boite[0][1] + boite[1][1]) / 2], boite }); return cadrer(T, sol); };
function gasteropode(T, c, X) {
  const { u } = X, L = u * .42, h = u * .1, ic = T.E.length;
  chemin(T, `M${n1(-L)} 0 Q${n1(-L * .3)} ${n1(-h * 1.5)} ${n1(L * .55)} ${n1(-h * 1.2)} Q${n1(L * .95)} ${n1(-h * 1.8)} ${n1(L)} ${n1(-h * .5)} Q${n1(L * .8)} 0 ${n1(L * .3)} 0Z`, X.ventre, [[-L, -h * 1.8], [L, 0]]);
  for (const k of [0, 1]) { const x2 = L * (1.02 + k * .12), y2 = -h * (3 - k * .4); trait(T, `M${n1(L * .82)} ${n1(-h * 1.3)} Q${n1(L * (.9 + k * .1))} ${n1(-h * 2.3)} ${n1(x2)} ${n1(y2)}`, X.sombre, 1.6, []); oeil(T, x2, y2, 1.8, X); }
  if (c.organes.some(o => o.type === 'carapace')) { const r = u * .2, cx = -u * .06, cy = -h * 1.05 - r * .8; ellipse(T, cx, cy, r, r * .93, X.robe, [[cx - r, cy - r], [cx + r, cy + r]]); trait(T, spirale(cx, cy, r * .88), X.sombre, 1.8, [], ' opacity=".8"'); }
  return fin(T, 'gasteropode', ic, [[-L, -u * .62], [L * 1.15, 0]]);
}
function bivalve(T, c, X) {
  const { u } = X, w = u * .3, h = u * .24, ic = T.E.length;
  chemin(T, `M${n1(-w)} ${n1(-h * .35)} Q${n1(-w * .9)} ${n1(-h * 1.15)} 0 ${n1(-h * 1.2)} Q${n1(w * .95)} ${n1(-h * 1.1)} ${n1(w)} ${n1(-h * .3)} Q${n1(w * .5)} 0 0 0 Q${n1(-w * .6)} 0 ${n1(-w)} ${n1(-h * .35)}Z`, X.robe, [[-w, -h * 1.2], [w, 0]]);
  for (let i = 0; i < 7; i++) { const a = Math.PI * (.12 + .76 * i / 6), x = -Math.cos(a) * w * .95, y = -h * .05 - Math.sin(a) * h * 1.1; trait(T, `M0 ${n1(-h * .05)} L${n1(x)} ${n1(y)}`, X.sombre, 1.2, [], ' opacity=".55"'); }
  trait(T, `M${n1(-w * .95)} ${n1(-h * .38)} Q0 ${n1(-h * .62)} ${n1(w * .97)} ${n1(-h * .32)}`, X.ventre, 1.6, []);
  return fin(T, 'bivalve', ic, [[-w, -h * 1.2], [w, 0]]);
}
function araignee(T, c, X) {
  const { u } = X, ra = u * .17, rc = u * .11, ya = -u * .2, ic = T.E.length;
  for (let i = 0; i < 4; i++) { const x0 = u * (.02 + i * .035), kx = u * (-.3 + i * .2), ky = -u * .38 + Math.abs(i - 1.5) * u * .04, fx = u * (-.42 + i * .3);
    trait(T, `M${n1(x0)} ${n1(ya)} L${n1(kx)} ${n1(ky)} L${n1(fx)} 0`, X.sombre, 2.2, [[kx, ky], [fx, 0]]); }
  ellipse(T, -ra * .9, ya - ra * .1, ra * 1.15, ra, X.robe, [[-ra * 2, ya - ra], [0, ya + ra]]); ellipse(T, rc * .9, ya, rc, rc * .85, X.sombre);
  oeil(T, rc * 1.35, ya - rc * .45, 1.6, X);
  trait(T, `M${n1(rc * 1.7)} ${n1(ya + rc * .2)} q${n1(rc * .5)} ${n1(rc * .3)} ${n1(rc * .6)} ${n1(rc * .9)}`, X.sombre, 1.8, []);
  return fin(T, 'araignee', ic, [[-u * .45, -u * .42], [u * .25, 0]]);
}
function crustace(T, c, X) {
  const { u } = X, pinces = c.organes.some(o => o.type === 'pinces'), ic = T.E.length, y = -u * .12;
  if (!pinces) {   // un gammare : un corps courbé, en anneaux
    for (let i = 0; i < 8; i++) { const a = Math.PI * (.95 - i * .1), r = u * .3, x = Math.cos(a) * r, yy = y - Math.sin(a) * r * .55 + r * .4; ellipse(T, x, yy - u * .1, u * .055, u * .07, i % 2 ? X.robe : X.sombre); }
    trait(T, `M${n1(u * .28)} ${n1(-u * .2)} q${n1(u * .15)} ${n1(-u * .15)} ${n1(u * .3)} ${n1(-u * .1)}`, X.sombre, 1.5, []);
    for (let i = 0; i < 5; i++) trait(T, `M${n1(-u * .2 + i * u * .1)} ${n1(-u * .04)} l${n1(-u * .03)} ${n1(u * .04)}`, X.sombre, 1.5, []);
    return fin(T, 'gammare', ic, [[-u * .35, -u * .45], [u * .6, 0]]); }
  for (let i = 0; i < 4; i++) trait(T, `M${n1(u * (-.02 + i * .07))} ${n1(y)} l${n1(-u * .03)} ${n1(u * .07)} l${n1(-u * .02)} ${n1(u * .05)}`, X.sombre, 1.6, []);
  for (let i = 0; i < 5; i++) ellipse(T, -u * (.12 + i * .085), y - u * .005 * i, u * (.06 - i * .005), u * (.055 - i * .006), i % 2 ? X.robe : X.sombre);
  chemin(T, `M${n1(-u * .5)} ${n1(y - u * .05)} l${n1(-u * .08)} ${n1(-u * .04)} l${n1(u * .02)} ${n1(u * .1)} l${n1(u * .06)} ${n1(-u * .02)}Z`, X.sombre, []);
  ellipse(T, u * .06, y - u * .01, u * .13, u * .075, X.robe, [[-u * .07, y - u * .08], [u * .19, y + u * .06]]);
  for (const k of [0, 1]) { const yk = y - u * (.02 + k * .05); trait(T, `M${n1(u * .16)} ${n1(yk)} L${n1(u * .3)} ${n1(yk - u * .05)}`, X.robe, 3, []);
    chemin(T, `M${n1(u * .3)} ${n1(yk - u * .05)} q${n1(u * .12)} ${n1(-u * .06)} ${n1(u * .16)} ${n1(u * .01)} q${n1(-u * .08)} 0 ${n1(-u * .1)} ${n1(u * .05)}Z`, X.robe, [[u * .46, yk]]); }
  for (const k of [0, 1]) trait(T, `M${n1(u * .17)} ${n1(y - u * .06)} q${n1(u * .2)} ${n1(-u * (.18 + k * .06))} ${n1(u * .42)} ${n1(-u * (.1 - k * .05))}`, X.sombre, 1, []);
  oeil(T, u * .16, y - u * .06, 1.6, X);
  return fin(T, 'ecrevisse', ic, [[-u * .6, -u * .35], [u * .6, 0]]);
}
function papillon(T, c, X) {
  const { u } = X, ic = T.E.length, y = -u * .12;
  chemin(T, `M0 ${n1(y)} L${n1(-u * .12)} ${n1(y - u * .55)} Q${n1(u * .2)} ${n1(y - u * .6)} ${n1(u * .16)} ${n1(y - u * .2)}Z`, X.robe, [[-u * .12, y - u * .6], [u * .2, y]]);
  chemin(T, `M0 ${n1(y)} Q${n1(-u * .3)} ${n1(y - u * .2)} ${n1(-u * .22)} ${n1(y - u * .02)} Q${n1(-u * .12)} ${n1(y + u * .06)} 0 ${n1(y)}Z`, X.robe, [[-u * .3, y - u * .2]], ' opacity=".9"');
  ellipse(T, -u * .02, y - u * .38, u * .05, u * .05, X.accent); ellipse(T, -u * .19, y - u * .07, u * .035, u * .035, X.accent);
  trait(T, `M${n1(-u * .12)} ${n1(y - u * .55)} Q${n1(u * .2)} ${n1(y - u * .6)} ${n1(u * .16)} ${n1(y - u * .2)}`, X.sombre, 1.5, []);
  ellipse(T, u * .04, y + u * .01, u * .1, u * .022, X.sombre); ellipse(T, u * .15, y - u * .005, u * .025, u * .025, X.sombre); oeil(T, u * .16, y - u * .01, u * .012, X);
  for (const k of [0, 1]) { const x2 = u * (.27 + k * .03), y2 = y - u * (.17 - k * .04); trait(T, `M${n1(u * .16)} ${n1(y - u * .02)} L${n1(x2)} ${n1(y2)}`, X.sombre, 1, []); ellipse(T, x2, y2, 1.6, 1.6, X.sombre); }
  for (let i = 0; i < 3; i++) trait(T, `M${n1(u * (.0 + i * .05))} ${n1(y + u * .015)} l${n1(-u * .02)} ${n1(-y - u * .015)}`, X.sombre, 1, []);
  return fin(T, 'papillon', ic, [[-u * .3, y - u * .6], [u * .3, 0]]);
}
function abeille(T, c, X) {
  const { u } = X, ic = T.E.length, y = -u * .14;
  chemin(T, `M${n1(-u * .05)} ${n1(y - u * .05)} Q${n1(-u * .1)} ${n1(y - u * .32)} ${n1(u * .1)} ${n1(y - u * .25)} Q${n1(u * .08)} ${n1(y - u * .1)} ${n1(-u * .05)} ${n1(y - u * .05)}Z`, '#f4f6f2', [[-u * .1, y - u * .32]], ' opacity=".75" stroke="#999" stroke-width=".8"');
  const ra = u * .14; ellipse(T, -ra * .9, y, ra, ra * .8, X.robe, [[-ra * 2, y - ra], [0, y + ra]]);
  for (let i = 0; i < 3; i++) chemin(T, `M${n1(-ra * (1.6 - i * .45))} ${n1(y - ra * .7)} l${n1(ra * .15)} 0 l0 ${n1(ra * 1.45)} l${n1(-ra * .15)} 0Z`, X.sombre, [], ' opacity=".85"');
  ellipse(T, u * .06, y - u * .01, u * .085, u * .075, X.sombre); ellipse(T, u * .17, y + u * .005, u * .05, u * .05, X.sombre); oeil(T, u * .19, y - u * .01, u * .018, X);
  for (let i = 0; i < 3; i++) trait(T, `M${n1(u * (.02 + i * .04))} ${n1(y + u * .05)} l${n1(-u * .04)} ${n1(-y - u * .05)}`, X.sombre, 1.3, []);
  trait(T, `M${n1(u * .19)} ${n1(y - u * .03)} q${n1(u * .05)} ${n1(-u * .1)} ${n1(u * .1)} ${n1(-u * .1)}`, X.sombre, 1.2, []);
  return fin(T, 'abeille', ic, [[-u * .3, y - u * .32], [u * .3, 0]]);
}
function plancton(T, c, X) {
  const { u } = X, ic = T.E.length, y = -u * .2;
  chemin(T, `M${n1(u * .16)} ${n1(y)} Q${n1(u * .1)} ${n1(y - u * .12)} ${n1(-u * .05)} ${n1(y - u * .05)} Q${n1(-u * .2)} ${n1(y)} ${n1(-u * .05)} ${n1(y + u * .05)} Q${n1(u * .1)} ${n1(y + u * .1)} ${n1(u * .16)} ${n1(y)}Z`, X.robe, [[-u * .2, y - u * .12], [u * .16, y + u * .1]], ' opacity=".85"');
  trait(T, `M${n1(-u * .17)} ${n1(y)} l${n1(-u * .12)} ${n1(-u * .04)} M${n1(-u * .17)} ${n1(y)} l${n1(-u * .12)} ${n1(u * .04)}`, X.sombre, 1, []);
  for (const k of [-1, 1]) trait(T, `M${n1(u * .14)} ${n1(y - u * .03)} Q${n1(u * .3)} ${n1(y - u * .05 + k * u * .12)} ${n1(u * .42)} ${n1(y + k * u * .2)}`, X.sombre, 1, []);
  oeil(T, u * .1, y - u * .02, 2, X);
  return fin(T, 'plancton', ic, [[-u * .3, y - u * .22], [u * .42, y + u * .22]], false);
}
function chauvesouris(T, c, X) {
  const { u } = X, ic = T.E.length, y = -u * .3, W = u * .48;
  for (const s of [-1, 1]) { chemin(T, `M0 ${n1(y - u * .02)} L${n1(s * W * .45)} ${n1(y - u * .14)} L${n1(s * W)} ${n1(y - u * .06)} L${n1(s * W * .82)} ${n1(y + u * .06)} Q${n1(s * W * .7)} ${n1(y + u * .02)} ${n1(s * W * .6)} ${n1(y + u * .1)} Q${n1(s * W * .45)} ${n1(y + u * .04)} ${n1(s * W * .35)} ${n1(y + u * .12)} Q${n1(s * W * .2)} ${n1(y + u * .06)} 0 ${n1(y + u * .1)}Z`, X.sombre, [[s * W, y - u * .14]]);
    for (const k of [.6, .82, 1]) trait(T, `M${n1(s * W * .45)} ${n1(y - u * .14)} L${n1(s * W * k * (k === 1 ? 1 : .95))} ${n1(y + (k === 1 ? -u * .06 : u * .06))}`, X.robe, 1, [], ' opacity=".6"'); }
  ellipse(T, 0, y + u * .02, u * .07, u * .1, X.robe);
  chemin(T, `M${n1(-u * .05)} ${n1(y - u * .08)} l${n1(-u * .02)} ${n1(-u * .09)} l${n1(u * .05)} ${n1(u * .06)}Z M${n1(u * .05)} ${n1(y - u * .08)} l${n1(u * .02)} ${n1(-u * .09)} l${n1(-u * .05)} ${n1(u * .06)}Z`, X.robe, []);
  ellipse(T, 0, y - u * .07, u * .05, u * .045, X.robe); oeil(T, -u * .018, y - u * .075, 1.4, X); oeil(T, u * .018, y - u * .075, 1.4, X);
  return fin(T, 'chauve-souris', ic, [[-W, y - u * .17], [W, y + u * .14]], false);
}
function grenouille(T, c, X) {
  const { u } = X, ic = T.E.length;
  chemin(T, `M${n1(-u * .28)} ${n1(-u * .04)} Q${n1(-u * .3)} ${n1(-u * .3)} ${n1(u * .02)} ${n1(-u * .3)} Q${n1(u * .22)} ${n1(-u * .3)} ${n1(u * .27)} ${n1(-u * .12)} Q${n1(u * .2)} ${n1(-u * .02)} ${n1(-u * .02)} ${n1(-u * .04)}Z`, X.robe, [[-u * .3, -u * .3], [u * .27, 0]]);
  chemin(T, `M${n1(-u * .02)} ${n1(-u * .06)} Q${n1(u * .15)} ${n1(-u * .04)} ${n1(u * .25)} ${n1(-u * .12)}`, X.ventre, [], ' stroke="none" opacity=".9"');
  ellipse(T, -u * .16, -u * .1, u * .13, u * .09, X.robe); trait(T, `M${n1(-u * .07)} ${n1(-u * .04)} L${n1(-u * .02)} 0 L${n1(u * .06)} 0`, X.sombre, 2.2, []);
  trait(T, `M${n1(u * .12)} ${n1(-u * .08)} L${n1(u * .15)} 0 l${n1(u * .04)} 0`, X.sombre, 2, []);
  ellipse(T, u * .14, -u * .3, u * .04, u * .04, X.robe); oeil(T, u * .15, -u * .31, u * .028, X);
  return fin(T, 'grenouille', ic, [[-u * .3, -u * .36], [u * .28, 0]]);
}
function phoque(T, c, X) {
  const { u } = X, ic = T.E.length, L = u * .5;
  chemin(T, `M${n1(-L)} ${n1(-u * .04)} Q${n1(-L * .5)} ${n1(-u * .24)} ${n1(L * .45)} ${n1(-u * .22)} Q${n1(L * .78)} ${n1(-u * .3)} ${n1(L * .92)} ${n1(-u * .24)} Q${n1(L * 1.02)} ${n1(-u * .19)} ${n1(L * .88)} ${n1(-u * .16)} Q${n1(L * .6)} ${n1(-u * .02)} ${n1(L * .3)} 0 L${n1(-L * .55)} 0Z`, X.robe, [[-L, -u * .3], [L, 0]]);
  chemin(T, `M${n1(-L * .4)} ${n1(-u * .02)} Q${n1(L * .1)} ${n1(-u * .06)} ${n1(L * .5)} ${n1(-u * .08)}`, X.ventre, [], ' opacity=".7"');
  chemin(T, `M${n1(-L)} ${n1(-u * .04)} l${n1(-u * .1)} ${n1(-u * .06)} l${n1(u * .02)} ${n1(u * .1)}Z`, X.sombre, []);
  chemin(T, `M${n1(L * .3)} ${n1(-u * .1)} q${n1(u * .02)} ${n1(u * .1)} ${n1(-u * .08)} ${n1(u * .1)}Z`, X.sombre, []);
  oeil(T, L * .8, -u * .23, u * .022, X); for (let i = 0; i < 3; i++) trait(T, `M${n1(L * .95)} ${n1(-u * .2)} l${n1(u * .07)} ${n1((i - 1) * u * .025)}`, X.sombre, .7, []);
  return fin(T, 'phoque', ic, [[-L - u * .1, -u * .3], [L * 1.05, 0]]);
}
function tortueMarine(T, c, X) {
  const { u } = X, ic = T.E.length, y = -u * .18;
  chemin(T, `M${n1(u * .2)} ${n1(y - u * .02)} q${n1(u * .2)} ${n1(-u * .02)} ${n1(u * .26)} ${n1(u * .16)} q${n1(-u * .14)} ${n1(-u * .06)} ${n1(-u * .28)} ${n1(-u * .08)}Z`, X.sombre, [[u * .46, y + u * .14]]);
  chemin(T, `M${n1(-u * .22)} ${n1(y + u * .04)} l${n1(-u * .12)} ${n1(u * .06)} l${n1(u * .1)} ${n1(u * .01)}Z`, X.sombre, [[-u * .34, y + u * .1]]);
  chemin(T, `M${n1(-u * .3)} ${n1(y + u * .04)} Q${n1(-u * .28)} ${n1(y - u * .2)} 0 ${n1(y - u * .2)} Q${n1(u * .26)} ${n1(y - u * .19)} ${n1(u * .28)} ${n1(y + u * .03)}Z`, X.robe, [[-u * .3, y - u * .2], [u * .28, y + u * .05]]);
  for (let i = 0; i < 3; i++) trait(T, `M${n1(-u * .18 + i * u * .14)} ${n1(y - u * .17)} l0 ${n1(u * .18)}`, X.sombre, 1, [], ' opacity=".5"');
  ellipse(T, u * .34, y - u * .01, u * .07, u * .055, X.ventre, [[u * .41, y - u * .07]]); oeil(T, u * .36, y - u * .025, u * .015, X);
  return fin(T, 'tortue-marine', ic, [[-u * .36, y - u * .2], [u * .46, y + u * .16]], false);
}
const VARIANTES = { gasteropode, bivalve, araignee, crustace, papillon, abeille, plancton, chauvesouris, grenouille, phoque, 'tortue-marine': tortueMarine };

function dessiner(corps, plan = {}, traits = [], sortie = null) {
  const T = Toile(), svg = dessin(T, corps, plan, traits);
  if (sortie) { const C = T.cadre || { k: 1, tx: 0, ty: 0, sol: false }; sortie.yeux = T.Y.map(([x, y, r]) => [n1(C.tx + C.k * x), n1(C.ty + C.k * y), n1(C.k * r)]); sortie.sol = !!C.sol;
    const P = parties(T, sortie.yeux); if (P) sortie.parties = P; }
  return svg;
}
function dessin(T, corps, plan, traits) {
  if (plan?.regime === 'synthetique' && !corps) return machine(T, plan, {});
  const Co = racine.OrvaneCorps, c = Co.normaliser(corps), X = contexte(c, plan || {}, traits || []), al = Co.allure ? Co.allure(c, plan) : c.forme;
  if (al === 'poisson') return poisson(T, c, X);
  const va = variante(c, plan || {}); if (va && VARIANTES[va]) return VARIANTES[va](T, c, X);
  switch (c.forme) {
    case 'oiseau': return oiseau(T, c, X);
    case 'bipede': return bipede(T, c, X);
    case 'hexapode': return insecte(T, c, X);
    case 'serpent': return serpent(T, c, X);
    case 'tentaculaire': return pieuvre(T, c, X);
    case 'radiaire': return rayonne(T, c, X, plan);
    case 'segmente': return segmente(T, c, X);
    default: return quadrupede(T, c, X);
  }
}

const API = { dessiner };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvaneSilhouette = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
