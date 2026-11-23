// Orvane — L'ATLAS (monde/atlas.js) : chaque lignée en planche de naturaliste, pour l'Observatoire
// Le dessin de monde/silhouette.js est celui que les jeux lisent (docs/21) : l'atlas n'y touche pas. Il le reprend avec ce que le dessin
// sait de lui-même (ses parties : le corps, la tête, chaque patte et ses articulations, les organes, les yeux) et ce que la fiche dit de
// la lignée (monde/fiche.js : sa famille visuelle, son tégument), et en fait une planche d'atlas (docs/55) :
//  - un trait d'encre sépia autour de chaque masse, plus appuyé du côté de l'ombre ; le corps, le cou, la tête et la queue d'un seul
//    contour, sans couture ; chaque patte, chaque organe, du sien ;
//  - les volumes, sous une lumière venue d'en haut, et des hachures de graveur dans les ombres ;
//  - le tégument de sa famille : le poil (long dans le froid, ras et lustré chez une nageuse), les plumes, les écailles, la chitine
//    luisante, la cuirasse, la peau nue et humide, la gelée translucide, les tôles d'une machine ;
//  - des pattes redessinées sur leurs articulations : la cuisse en muscle, le sabot fendu, la griffe, le coussinet, la serre ;
//  - un œil vivant : l'iris, la pupille selon la bête (la fente d'une chasseuse de nuit, la barre d'une brouteuse à sabots, les
//    facettes d'un insecte), ses reflets ;
//  - ce que portent la plupart de ses bêtes, et que le dessin des jeux ne montre pas : la robe d'un albinos, d'un mélanique, d'une
//    robe dorée, le camouflage, les palmes, la membrane d'une planeuse, les vibrisses, la peau épaisse ;
//  - l'épaisseur vraie d'un serpent, d'après sa masse et sa longueur.
// Rien ici ne touche au monde, ni au dessin des jeux. Les mêmes données donnent toujours la même planche.
//   OrvaneAtlas.dessiner(corps, plan, traits, options) → { svg, parties, cadre, famille, renvois, echelle }
//   options : { famille, details (monde/fiche.js), graine (une chaîne : l'identifiant de la lignée), grain (le papier et le lavis :
//               pour la grande planche), encre (l'épaisseur du trait, dans le cadre de 170 × 90 ; 0,5 par défaut), noms (du catalogue) }
//   (dans un navigateur, après moteur/corps.js et monde/silhouette.js ; dans Node, globalThis.OrvaneCorps d'abord)
(function (racine) {
'use strict';
const Sil = () => racine.OrvaneSilhouette || (typeof require === 'function' ? require('./silhouette.js') : null);
const Corps = () => racine.OrvaneCorps || (typeof require === 'function' ? require('../moteur/corps.js') : null);

// --- les nombres, les couleurs ---
const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const n2 = v => Math.round(v * 100) / 100;
const P2 = (x, y) => n2(x) + ' ' + n2(y);
const hasard = s => { let g = 2166136261; for (let i = 0; i < s.length; i++) { g ^= s.charCodeAt(i); g = Math.imul(g, 16777619); } g >>>= 0;
  return () => { g = (Math.imul(g, 1664525) + 1013904223) >>> 0; return g / 4294967296; }; };
const ENCRE = [43, 35, 27], PAPIER = [244, 238, 224], OS = [239, 231, 210], CORNE = [58, 48, 39];
const lireCouleur = s => { if (!s || s === 'none' || s.startsWith('url')) return null; let m = /rgb\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/.exec(s); if (m) return [+m[1], +m[2], +m[3]];
  m = /^#([0-9a-f]{6})$/i.exec(s); if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16));
  m = /^#([0-9a-f]{3})$/i.exec(s); if (m) return [0, 1, 2].map(i => parseInt(m[1][i] + m[1][i], 16)); return null; };
const rgb = c => `rgb(${c.map(v => Math.round(cl(v, 0, 255))).join(',')})`;
const mel = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const lum = c => (.2126 * c[0] + .7152 * c[1] + .0722 * c[2]) / 255;

// --- le SVG du dessin, lu élément par élément (ceux du groupe du dessin, au premier niveau : ce que disent les parties) ---
const attributs = t => { const o = {}; for (const m of t.matchAll(/([\w:-]+)="([^"]*)"/g)) o[m[1]] = m[2]; return o; };
function lireSvg(svg) {
  const g = /<g transform="translate\(([-\d.]+)[ ,]+([-\d.]+)\) scale\(([-\d.]+)\)"([^>]*)>/.exec(svg); if (!g) return null;
  const els = [], re = /<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g; let prof = 0, cur = null; re.lastIndex = g.index + g[0].length;
  for (let m; (m = re.exec(svg));) { const ferme = m[1] === '/', seul = m[4] === '/';
    if (prof === 0) { if (ferme) break; const el = { nom: m[2], attr: attributs(m[3]), deb: m.index }; if (seul) { el.brut = m[0]; els.push(el); } else { cur = el; prof = 1; } }
    else if (ferme) { if (--prof === 0) { cur.brut = svg.slice(cur.deb, m.index + m[0].length); els.push(cur); } }
    else if (!seul) prof++; }
  return { tx: +g[1], ty: +g[2], k: +g[3], els };
}
const balise = (nom, A, dedans) => `<${nom}${Object.entries(A).filter(([, v]) => v != null && v !== '').map(([c, v]) => ` ${c}="${v}"`).join('')}${dedans == null ? '/>' : `>${dedans}</${nom}>`}`;
// les points d'un élément (pour sa boîte) : les nombres d'un chemin, deux à deux ; une ellipse, un cercle, un rectangle, une ligne
function boiteEl(el) {
  const A = el.attr, N = v => +(v || 0);
  if (el.nom === 'ellipse' || el.nom === 'circle') { const rx = N(A.rx ?? A.r), ry = N(A.ry ?? A.r); return [N(A.cx) - rx, N(A.cy) - ry, N(A.cx) + rx, N(A.cy) + ry]; }
  if (el.nom === 'rect') return [N(A.x), N(A.y), N(A.x) + N(A.width), N(A.y) + N(A.height)];
  if (el.nom === 'line') return [Math.min(N(A.x1), N(A.x2)), Math.min(N(A.y1), N(A.y2)), Math.max(N(A.x1), N(A.x2)), Math.max(N(A.y1), N(A.y2))];
  if (el.nom === 'path') { const d = A.d || ''; if (/[a-z]/.test(d.replace(/e[-+]?\d/g, ''))) return null;   // (un chemin relatif : sa boîte ne se lit pas ainsi)
    const v = [...d.matchAll(/[-+]?(?:\d+\.?\d*|\.\d+)/g)].map(x => +x[0]); if (v.length < 2) return null; const X = [], Y = []; for (let i = 0; i + 1 < v.length; i += 2) { X.push(v[i]); Y.push(v[i + 1]); }
    return [Math.min(...X), Math.min(...Y), Math.max(...X), Math.max(...Y)]; }
  return null;
}
const unir = (a, b) => !a ? b : !b ? a : [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
// des points le long d'un chemin absolu (M L Q C H V Z ; un chemin relatif n'est pas lu) : [x, y, tx, ty] (la tangente)
function echantillonner(d, pas) {
  if (!d || /[mlqchvsta]/.test(d.replace(/e[-+]?\d/g, ''))) return [];
  const T = [...d.matchAll(/([MLQCHVZ])([^MLQCHVZ]*)/g)], out = []; let c = [0, 0], s0 = [0, 0];
  const pousser = (f, L) => { const n = Math.max(1, Math.ceil(L / pas)); for (let i = 1; i <= n; i++) { const t = i / n, p = f(t), q = f(Math.max(0, t - .01)), r = f(Math.min(1, t + .01)), dx = r[0] - q[0], dy = r[1] - q[1], l = Math.hypot(dx, dy) || 1; out.push([p[0], p[1], dx / l, dy / l]); } };
  for (const [, cmd, args] of T) { const v = [...args.matchAll(/[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi)].map(x => +x[0]);
    if (cmd === 'M') { c = [v[0], v[1]]; s0 = c.slice(); for (let i = 2; i + 1 < v.length; i += 2) { const a = c, b = [v[i], v[i + 1]]; pousser(t => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], Math.hypot(b[0] - a[0], b[1] - a[1])); c = b; } }
    else if (cmd === 'L' || cmd === 'H' || cmd === 'V' || cmd === 'Z') { const pts = cmd === 'Z' ? [s0] : cmd === 'H' ? v.map(x => [x, c[1]]) : cmd === 'V' ? v.map(y => [c[0], y]) : v.reduce((a, x, i) => (i % 2 ? a[a.length - 1].push(x) : a.push([x]), a), []);
      for (const b of pts) { const a = c; pousser(t => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], Math.hypot(b[0] - a[0], b[1] - a[1])); c = b; } }
    else if (cmd === 'Q') for (let i = 0; i + 3 < v.length; i += 4) { const a = c, q = [v[i], v[i + 1]], b = [v[i + 2], v[i + 3]];
      pousser(t => [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * q[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * q[1] + t * t * b[1]], Math.hypot(q[0] - a[0], q[1] - a[1]) + Math.hypot(b[0] - q[0], b[1] - q[1])); c = b; }
    else if (cmd === 'C') for (let i = 0; i + 5 < v.length; i += 6) { const a = c, q = [v[i], v[i + 1]], r = [v[i + 2], v[i + 3]], b = [v[i + 4], v[i + 5]];
      pousser(t => { const u = 1 - t; return [u ** 3 * a[0] + 3 * u * u * t * q[0] + 3 * u * t * t * r[0] + t ** 3 * b[0], u ** 3 * a[1] + 3 * u * u * t * q[1] + 3 * u * t * t * r[1] + t ** 3 * b[1]]; }, Math.hypot(q[0] - a[0], q[1] - a[1]) + Math.hypot(r[0] - q[0], r[1] - q[1]) + Math.hypot(b[0] - r[0], b[1] - r[1])); c = b; } }
  return out;
}
// un chemin lisse par des points (Catmull-Rom, en courbes de Bézier), fermé ou non
function lisse(pts, ferme = false) {
  const n = pts.length; if (n < 2) return ''; const P = i => ferme ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
  let d = `M${P2(...pts[0])}`; const m = ferme ? n : n - 1;
  for (let i = 0; i < m; i++) { const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    d += `C${P2(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)} ${P2(p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)} ${P2(...p2)}`; }
  return d + (ferme ? 'Z' : '');
}
// un ruban le long d'une courbe (des points), de largeurs W (une par point) ; poil : l'amplitude des mèches sur ses bords (0 : lisse)
function rubanLisse(pts, W, poil = 0, R = Math.random) {
  const n = pts.length, G = [], D = [];
  for (let i = 0; i < n; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    const m = poil && i > 0 && i < n - 1 ? (i % 2 ? 1 + poil * (.6 + .8 * R()) : 1 - poil * .3) : 1, h = W[i] / 2;
    G.push([pts[i][0] + nx * h * m - (poil && i % 2 ? dx / l * h * poil * 1.2 : 0), pts[i][1] + ny * h * m]); D.push([pts[i][0] - nx * h * (poil && i % 2 ? 1 + poil * .5 * R() : 1), pts[i][1] - ny * h]); }
  return lisse([...G, ...D.reverse()], true);
}
const bezQ = (p0, c1, p2, t) => [(1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c1[0] + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c1[1] + t * t * p2[1]];

// --- la famille visuelle, quand la fiche ne la donne pas : lue sur le dessin ---
const INSECTES = ['insecte', 'mille-pattes', 'araignee', 'ecrevisse', 'gammare', 'papillon', 'abeille', 'plancton'];
function familleDe(P, plan) {
  if (plan?.regime === 'synthetique') return 'machine';
  const d = P?.dessin || '';
  if (d === 'oiseau') return 'plumage';
  if (d === 'poisson' || d === 'serpent') return 'ecailles';
  if (INSECTES.includes(d)) return 'chitine';
  if (['meduse', 'etoile', 'pieuvre', 'gasteropode', 'bivalve'].includes(d)) return 'gelee';
  if (d === 'grenouille') return 'peau-nue';
  if (d === 'tortue-marine') return 'cuirasse';
  return 'pelage';
}

// --- ce que portent la plupart des bêtes et que le dessin des jeux ne montre pas : leur robe ---
function robeDesTraits(couleurs, traits) {
  const C = { robe: couleurs.robe.slice(), sombre: couleurs.sombre.slice(), ventre: couleurs.ventre.slice(), oeil: couleurs.oeil.slice() }, a = id => traits.includes(id);
  if (a('albinisme')) { C.robe = mel(C.robe, [240, 234, 222], .86); C.sombre = mel(C.sombre, [214, 200, 192], .82); C.ventre = mel(C.ventre, [250, 246, 238], .9); C.oeil = [196, 74, 88]; }
  else if (a('melanisme')) { C.robe = mel(C.robe, [34, 31, 30], .82); C.sombre = mel(C.sombre, [18, 16, 16], .85); C.ventre = mel(C.ventre, [58, 52, 48], .72); }
  else if (a('robe-doree')) { C.robe = mel(C.robe, [206, 160, 64], .7); C.sombre = mel(C.sombre, [138, 96, 34], .62); C.ventre = mel(C.ventre, [236, 212, 150], .6); }
  return C;
}

let NUM = 0;
function dessiner(corps, plan = {}, traits = [], o = {}) {
  const S = Sil(), Co = Corps(); if (!S || !Co) return null;
  traits = traits || [];
  // la robe que montrent ses bêtes : le dessin la reçoit telle quelle (rien d'autre ne change à son dessin)
  const c0 = corps && Co.normaliser ? Co.normaliser(corps) : null, robes = c0 ? robeDesTraits(c0.couleurs, traits) : null;
  const corpsVu = c0 && robes ? { ...corps, couleurs: robes } : corps;
  const so = {}, svg0 = S.dessiner(corpsVu, plan, traits, so), L = lireSvg(svg0);
  if (!L) return { svg: svg0, parties: so.parties || null, cadre: null, famille: null, pupille: null, yeux: so.yeux || [], sol: !!so.sol };
  const P = so.parties || null, Lk = L.k, id = 'atl' + (++NUM), R = hasard(String(o.graine || '') + JSON.stringify(corps?.couleurs || '') + (plan?.masse_kg || ''));
  const cetace = P?.dessin === 'poisson' && plan?.reproduction === 'vivipare' && plan?.masse_kg >= 10;   // (un « poisson » qui met bas : un cétacé)
  const fam = ['gasteropode', 'bivalve'].includes(P?.dessin) ? 'peau-nue' : cetace ? 'peau-lisse' : o.famille || familleDe(P, plan), det = new Set(o.details || []), insecte = INSECTES.includes(P?.dessin) || fam === 'chitine';
  const ink = rgb(robes ? mel(ENCRE, robes.sombre, .18) : ENCRE);
  const K = robes ? { robe: rgb(robes.robe), sombre: rgb(robes.sombre), ventre: rgb(robes.ventre), oeil: robes.oeil, motif: c0.motif } : { robe: null, sombre: null, ventre: null, oeil: [40, 34, 30], motif: 'uni' };
  const els = L.els, n = els.length, defs = [], out = [];
  const reg = plan?.regime || '', nuit = plan?.activite === 'nocturne' || plan?.activite === 'crepusculaire' || traits.includes('yeux-nocturnes');
  const dansLe = ([x, y]) => [(x - L.tx) / Lk, (y - L.ty) / Lk];   // (un point des parties, dans le groupe du dessin)

  // les rôles de chaque élément, d'après les parties (la plus précise l'emporte : un organe dans la tête reste un organe)
  const role = Array.from({ length: n }, () => ({}));
  const marquer = (sv, x) => { if (Array.isArray(sv)) for (let i = sv[0]; i <= sv[1] && i < n; i++) Object.assign(role[i], x); };
  if (P) { for (const c of ['corps', 'thorax', 'queue', 'cou', 'tete']) marquer(P[c]?.svg, { partie: c });
    (P.pattes || []).forEach((p, i) => marquer(p.svg, { partie: 'patte', i }));
    (P.bras || []).forEach((p, i) => marquer(p.svg, { partie: 'bras', i }));
    (P.organes || []).forEach(x => marquer(x.svg, { organe: x.type })); }
  const ombre = els[0]?.nom === 'ellipse' && els[0].attr.fill === '#3b3423';
  const yeux = (so.yeux || []).map(([x, y, r]) => [...dansLe([x, y]), r / Lk]);
  const robeS = K.robe, plein = el => ['path', 'ellipse', 'circle', 'rect'].includes(el.nom) && el.attr.fill && el.attr.fill !== 'none' && !el.attr.fill.startsWith('url');

  // --- le serpent : son corps à sa vraie épaisseur, d'après sa masse et sa longueur (le dessin des jeux le garde fin), la tête à sa mesure ---
  let SN = null;
  if (P?.dessin === 'serpent' && P.corps?.points && plan?.masse_kg > 0 && plan?.taille_m > 0) {
    const pts = P.corps.points.map(dansLe); let Lg = 0; for (let i = 1; i < pts.length; i++) Lg += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const ratio = Math.sqrt(4 * plan.masse_kg / (1000 * Math.PI * plan.taille_m ** 3)), W0 = P.corps.epaisseur / Lk, Wm = cl(ratio * Lg, W0, Lg * .085), N = pts.length;
    const W = pts.map((_, i) => { const t = i / (N - 1); return Wm * (t < .32 ? .1 + .9 * Math.pow(t / .32, .8) : t > .86 ? 1 - .3 * (t - .86) / .14 : 1); });
    let bas = -Infinity; pts.forEach((p, i) => { bas = Math.max(bas, p[1] + W[i] / 2); }); const dy = Math.min(0, -bas - .2 * W0) + (bas < 0 ? 0 : 0), q = pts.map(([x, y]) => [x, y + (bas > -W0 ? -(bas + .15 * W0) : 0)]);
    const tete = P.tete, piv = tete ? dansLe(tete.pivot) : q[N - 1], hsz = tete ? tete.rayon / Lk / .55 : W0, kH = Math.max(1, (W[N - 1] * 1.22) / (.74 * hsz));
    const dY = q[0][1] - pts[0][1];
    SN = { pts: q, W, Wm, dY, piv, kH, hsz }; }

  // --- la tête d'une bête à pattes, à sa mesure : le dessin des jeux la rétrécit quand la bête s'alourdit (de 30 % au plus) pendant
  //     que son corps s'épaissit, si bien qu'une bête de 60 kg y a une tête haute du quart de son corps ; chez un mammifère, elle en
  //     fait à peu près la moitié (un loup, un cerf, un renard). Elle grandit depuis la nuque, jamais ne rapetisse ---
  let TT = null;
  if (!SN && P?.tete?.rayon && P.corps?.boite && ['quadrupede', 'bipede-tendu', 'bipede'].includes(P.dessin) && !INSECTES.includes(P.dessin) && plan?.regime !== 'synthetique') {
    const b = P.corps.boite, epais = P.dessin === 'bipede' ? b[2] - b[0] : b[3] - b[1], haute = P.tete.rayon / .55 * .92, kT = cl(.5 * epais / haute, 1, 1.8);
    if (kT > 1.05) { const c = dansLe(P.tete.centre), r = P.tete.rayon / Lk; TT = { k: kT, ancre: [c[0] - r * .55, c[1] + r * .1], centre: c, r }; } }

  // --- le cadre : celui du dessin ; celui d'un serpent remis à sa mesure (plus épais, il demande sa place) ---
  let tx = L.tx, ty = L.ty, k = Lk;
  if (SN) { let B = null; SN.pts.forEach((p, i) => { B = unir(B, [p[0] - SN.W[i] / 2, p[1] - SN.W[i] / 2, p[0] + SN.W[i] / 2, p[1] + SN.W[i] / 2]); });
    const hb = P.tete ? (() => { const c = dansLe(P.tete.centre), r = P.tete.rayon / Lk, [px, py] = SN.piv, s2 = SN.kH; return [px + (c[0] - r - px) * s2, py + SN.dY + (c[1] - r * .8 - py) * s2, px + (c[0] + r * 1.9 - px) * s2, py + SN.dY + (c[1] + r * .8 - py) * s2]; })() : null;
    B = unir(B, hb); const w = B[2] - B[0], h = B[3] - B[1]; k = Math.min(2.4, 156 / Math.max(1, w), 78 / Math.max(1, h)); tx = 85 - k * (B[0] + B[2]) / 2; ty = 86 - k * B[3]; }
  if (TT && P.boite) {   // (la tête agrandie, ses oreilles, ses cornes : le dessin se recadre pour les garder)
    let HB = null; for (let i = P.tete.svg[0]; i <= P.tete.svg[1] && i < n; i++) HB = unir(HB, boiteEl(els[i]));
    const c = TT.centre, r = TT.r; HB = unir(HB, [c[0] - r * 1.2, c[1] - r * 1.4, c[0] + r * 1.9, c[1] + r * 1.1]);
    const g = p => [TT.ancre[0] + (p[0] - TT.ancre[0]) * TT.k, TT.ancre[1] + (p[1] - TT.ancre[1]) * TT.k], h0 = g([HB[0], HB[1]]), h1 = g([HB[2], HB[3]]);
    const a0 = dansLe([P.boite[0], P.boite[1]]), a1 = dansLe([P.boite[2], P.boite[3]]), B = unir([a0[0], a0[1], a1[0], a1[1]], [h0[0], h0[1], h1[0], h1[1]]);
    if (B[0] < a0[0] - .01 || B[1] < a0[1] - .01 || B[2] > a1[0] + .01) { const w = B[2] - B[0], h = B[3] - B[1]; k = Math.min(Lk, 156 / Math.max(1, w), 78 / Math.max(1, h)); tx = 85 - k * (B[0] + B[2]) / 2;
      ty = so.sol ? 86 - k * (86 - L.ty) / Lk : 45 - k * (B[1] + B[3]) / 2; } }   // (au sol, le bas du dessin reste sur la ligne du bas)
  const f = 1 / k, e = (o.encre ?? .5) * f;

  // (un point de la tête, là où la tête agrandie le porte)
  const versTete = p => TT ? [TT.ancre[0] + (p[0] - TT.ancre[0]) * TT.k, TT.ancre[1] + (p[1] - TT.ancre[1]) * TT.k] : p;

  // --- les dégradés, les hachures de la planche (les identifiants lui sont propres) ---
  defs.push(`<linearGradient id="${id}v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffaf0" stop-opacity=".22"/><stop offset=".36" stop-color="#fffaf0" stop-opacity="0"/><stop offset=".6" stop-color="${ink}" stop-opacity="0"/><stop offset="1" stop-color="${ink}" stop-opacity=".32"/></linearGradient>`);
  const hs = 1.05 * f;   // l'écart des hachures : un peu plus d'une unité du cadre
  defs.push(`<pattern id="${id}h" width="${n2(hs)}" height="${n2(hs)}" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)"><line x1="0" y1="0" x2="0" y2="${n2(hs)}" stroke="${ink}" stroke-width="${n2(.28 * f)}"/></pattern>`);
  defs.push(`<linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset=".45" stop-color="#000"/><stop offset="1" stop-color="#fff"/></linearGradient><mask id="${id}m" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#${id}f)"/></mask>`);
  let nclip = 0; const clipDe = forme => { const cid = `${id}c${++nclip}`; defs.push(`<clipPath id="${cid}">${forme}</clipPath>`); return cid; };

  // --- ce qui fait la masse du corps : un seul contour pour le corps, le cou, la tête, la queue (sans couture entre eux) ---
  const masse = new Set(), forme = new Map();   // (forme : l'élément qui en remplace un autre, pour son contour)
  if (P && !insecte && !SN) for (let i = 1; i < n; i++) { const r = role[i], el = els[i]; if (TT && r.partie === 'tete') continue;
    if (el.nom === 'clipPath' || el.nom === 'g') continue;
    const libre = !r.partie && !r.organe;   // (la cuisse d'un sauteur : dessinée à part, elle fait corps avec lui)
    if (!libre && (!['corps', 'cou', 'tete', 'queue'].includes(r.partie) || (r.organe && r.organe !== 'trompe'))) continue;
    if (plein(el) && el.attr.fill === robeS && !el.attr.opacity) masse.add(i); }
  // l'encre d'un élément : sa forme en encre, élargie du trait (dessinée sous lui, elle n'en laisse voir que le bord)
  const encre = (el, w = 2 * e, plus = {}) => { const A = { ...el.attr }; delete A.opacity; delete A['clip-path'];
    if (el.nom === 'line' || (el.nom === 'path' && (!A.fill || A.fill === 'none') && A.stroke)) return balise(el.nom, { ...A, stroke: ink, 'stroke-width': n2(+(A['stroke-width'] || 1) + w), fill: 'none', ...plus });
    return balise(el.nom, { ...A, fill: ink, stroke: ink, 'stroke-width': n2(w), ...plus }); };
  // (l'appui du trait : la même encre, un peu plus bas et en arrière, qui épaissit le bord du côté de l'ombre)
  const appui = el => encre(el, 2 * e, { transform: `translate(${n2(-.16 * f)} ${n2(.3 * f)})${el.attr.transform ? ' ' + el.attr.transform : ''}` });

  // --- le tégument, dans la découpe d'une forme : selon la famille ---
  const leger = !!o.leger;   // (une vignette : le trait, les volumes, les yeux ; ni tégument, ni hachures)
  const tegument = (B, quoi = 'corps', fond = null) => { if (!B || leger) return ''; const [x0, y0, x1, y1] = B, w = x1 - x0, h = y1 - y0; if (w <= 0 || h <= 0) return '';
    const sombre = [], fort = [], clair = [], A = w * h * k * k;   // (A : la surface, dans le cadre)
    const nuitF = fond && lum(fond) < .22, tr = nuitF ? '#f6efe0' : ink, kop = nuitF ? (fam === 'pelage' ? .5 : .8) : 1;   // (sur un fond sombre, le trait se fait clair)
    if (fam === 'pelage') {
      const froid = det.has('pelage-froid'), ras = det.has('pelage-chaud') || det.has('pelage-nageur'), L0 = froid ? 3 : det.has('pelage-chaud') ? 1.15 : det.has('pelage-nageur') ? 1 : det.has('pelage-froid-ras') ? 1.4 : 2;
      const pas = (froid ? 1.6 : ras ? 1.05 : 1.35) * f;
      for (let y = y0 + pas * .35; y < y1; y += pas * .82) for (let x = x1 - pas * .3; x > x0 - pas; x -= pas * 1.2) {
        const jx = x + (R() - .5) * pas, jy = y + (R() - .5) * pas * .6, t = (jy - y0) / h, Lh = L0 * f * (.7 + .6 * R()), a = (10 + 22 * t + (R() - .5) * 18) * Math.PI / 180;
        const dx = -Math.cos(a) * Lh, dy = Math.sin(a) * Lh, d = `M${P2(jx, jy)}q${P2(dx * .45, dy * .45 - Lh * .12)} ${P2(dx, dy)}`;
        if (t < .22) fort.push(d); else if (t < .68 || R() < .3) sombre.push(d);
        if (t > .08 && t < .42 && R() < .28) clair.push(`M${P2(jx + .35 * f, jy - .25 * f)}q${P2(dx * .4, dy * .4 - Lh * .08)} ${P2(dx * .75, dy * .75)}`); }
      const op = det.has('pelage-nageur') ? .5 : 1;
      return (sombre.length ? `<path d="${sombre.join('')}" stroke="${tr}" stroke-width="${n2(.2 * f)}" fill="none" opacity="${n2(.26 * op * kop)}"/>` : '')
        + (fort.length ? `<path d="${fort.join('')}" stroke="${tr}" stroke-width="${n2(.24 * f)}" fill="none" opacity="${n2(.4 * op * kop)}"/>` : '')
        + (clair.length ? `<path d="${clair.join('')}" stroke="#fffaf0" stroke-width="${n2(.2 * f)}" fill="none" opacity="${det.has('pelage-nageur') ? .5 : .3}"/>` : '');
    }
    if (fam === 'ecailles' || fam === 'cuirasse') {
      const s = (P?.dessin === 'serpent' ? 1.05 : P?.dessin === 'poisson' ? 1.6 : 1.2) * f;
      let j = 0; for (let x = x1 - s * .2; x > x0 - s; x -= s * .62, j++) for (let y = y0 - (j % 2) * s * .5; y < y1 + s; y += s) {
        sombre.push(`M${P2(x, y - s * .5)}Q${P2(x - s * .62, y)} ${P2(x, y + s * .5)}`);
        if (y < y0 + h * .5 && R() < .5) clair.push(`M${P2(x - s * .12, y - s * .3)}Q${P2(x - s * .45, y)} ${P2(x - s * .12, y + s * .25)}`); }
      return `<path d="${sombre.join('')}" stroke="${tr}" stroke-width="${n2(.2 * f)}" fill="none" opacity="${n2(.34 * kop)}"/>`
        + (clair.length ? `<path d="${clair.join('')}" stroke="#fffaf0" stroke-width="${n2(.18 * f)}" fill="none" opacity=".35"/>` : '');
    }
    if (fam === 'plumage') {
      if (quoi === 'aile') {   // une aile repliée : les couvertures en écailles à l'avant, les rémiges en éventail vers la pointe
        const sc = 1.5 * f; let j = 0;
        for (let x = x1 - sc * .2; x > x1 - w * .5; x -= sc * .6, j++) for (let y = y0 - (j % 2) * sc * .5; y < y0 + h * .62; y += sc * .85)
          fort.push(`M${P2(x, y - sc * .42)}C${P2(x - sc * .5, y - sc * .38)} ${P2(x - sc * .5, y + sc * .38)} ${P2(x, y + sc * .42)}`);
        for (let i = 0; i < 8; i++) { const t = i / 7, a0 = [x1 - w * (.46 + .06 * t), y0 + h * (.22 + .5 * t)], b0 = [x0 + w * (.02 + .05 * t), y0 + h * (.42 + .4 * t)];
          sombre.push(`M${P2(...a0)}Q${P2((a0[0] + b0[0]) / 2, (a0[1] + b0[1]) / 2 - h * .06)} ${P2(...b0)}`); clair.push(`M${P2(a0[0] - w * .03, a0[1] + h * .035)}Q${P2((a0[0] + b0[0]) / 2, (a0[1] + b0[1]) / 2 - h * .025)} ${P2(b0[0] + w * .04, b0[1] + h * .03)}`); }
        return `<path d="${fort.join('')}" stroke="${tr}" stroke-width="${n2(.2 * f)}" fill="none" opacity="${n2(.42 * kop)}"/><path d="${sombre.join('')}" stroke="${tr}" stroke-width="${n2(.26 * f)}" fill="none" opacity="${n2(.55 * kop)}"/>`
          + `<path d="${clair.join('')}" stroke="${nuitF ? ink : '#fffaf0'}" stroke-width="${n2(.2 * f)}" fill="none" opacity=".3"/>`; }
      const sp = 1.7 * f; let j = 0;
      for (let x = x1 - sp * .1; x > x0 - sp; x -= sp * .55, j++) for (let y = y0 - (j % 2) * sp * .5; y < y1 + sp; y += sp * .9)
        (y - y0 < h * .3 ? fort : sombre).push(`M${P2(x, y - sp * .45)}C${P2(x - sp * .55, y - sp * .4)} ${P2(x - sp * .55, y + sp * .4)} ${P2(x, y + sp * .45)}`);
      return `<path d="${sombre.join('')}" stroke="${tr}" stroke-width="${n2(.2 * f)}" fill="none" opacity="${n2(.22 * kop)}"/><path d="${fort.join('')}" stroke="${tr}" stroke-width="${n2(.2 * f)}" fill="none" opacity="${n2(.32 * kop)}"/>`;
    }
    if (fam === 'chitine') {
      const lignes = []; if (quoi === 'corps') for (let x = x1 - w * .18; x > x0 + w * .08; x -= Math.max(1.8 * f, w * .16)) lignes.push(`M${P2(x, y0)}Q${P2(x - w * .05, (y0 + y1) / 2)} ${P2(x, y1)}`);
      return (lignes.length ? `<path d="${lignes.join('')}" stroke="${ink}" stroke-width="${n2(.26 * f)}" fill="none" opacity=".45"/>` : '')
        + `<ellipse cx="${n2(x0 + w * .55)}" cy="${n2(y0 + h * .28)}" rx="${n2(w * .3)}" ry="${n2(h * .11)}" fill="#fffdf6" opacity=".38"/><ellipse cx="${n2(x0 + w * .62)}" cy="${n2(y0 + h * .25)}" rx="${n2(w * .1)}" ry="${n2(h * .05)}" fill="#fff" opacity=".6"/>`;
    }
    if (fam === 'peau-nue') {
      const pts = []; for (let i = 0; i < Math.min(40, A / 6); i++) pts.push(`M${P2(x0 + w * R(), y0 + h * (.15 + .6 * R()))}h.01`);
      return `<path d="${pts.join('')}" stroke="${ink}" stroke-width="${n2(.5 * f)}" opacity=".18"/><ellipse cx="${n2(x0 + w * .55)}" cy="${n2(y0 + h * .26)}" rx="${n2(w * .22)}" ry="${n2(h * .08)}" fill="#fffdf6" opacity=".5"/>`;
    }
    if (fam === 'peau-lisse') return `<path d="M${P2(x0 + w * .18, y0 + h * .2)}Q${P2(x0 + w * .55, y0 + h * .02)} ${P2(x0 + w * .86, y0 + h * .2)}" stroke="#fffdf6" stroke-width="${n2(h * .07)}" fill="none" opacity=".35"/><path d="M${P2(x0 + w * .4, y0 + h * .16)}Q${P2(x0 + w * .6, y0 + h * .09)} ${P2(x0 + w * .75, y0 + h * .16)}" stroke="#fff" stroke-width="${n2(h * .035)}" fill="none" opacity=".5"/>`;
    if (fam === 'gelee') {
      const cx = (x0 + x1) / 2, L2 = []; for (let i = 0; i < 9; i++) { const xx = x0 + w * (.08 + .84 * i / 8); L2.push(`M${P2(cx, y0 + h * .08)}Q${P2((cx + xx) / 2, y0 + h * .2)} ${P2(xx, y1)}`); }
      return `<path d="${L2.join('')}" stroke="#fffaf0" stroke-width="${n2(.3 * f)}" fill="none" opacity=".45"/><ellipse cx="${n2(cx)}" cy="${n2(y0 + h * .55)}" rx="${n2(w * .28)}" ry="${n2(h * .16)}" fill="none" stroke="${ink}" stroke-width="${n2(.3 * f)}" opacity=".25"/>`;
    }
    if (fam === 'machine') {
      const L2 = []; for (let x = x0 + w * .25; x < x1; x += w * .25) L2.push(`M${P2(x, y0)}V${n2(y1)}`); L2.push(`M${P2(x0, y0 + h * .45)}H${n2(x1)}`);
      const riv = []; for (let x = x0 + w * .12; x < x1; x += w * .25) riv.push(`M${P2(x, y0 + h * .3)}h.01M${P2(x, y0 + h * .62)}h.01`);
      return `<path d="${L2.join('')}" stroke="${ink}" stroke-width="${n2(.25 * f)}" opacity=".35"/><path d="${riv.join('')}" stroke="${ink}" stroke-width="${n2(.55 * f)}" opacity=".45"/><rect x="${n2(x0)}" y="${n2(y0 + h * .12)}" width="${n2(w)}" height="${n2(h * .12)}" fill="#fff" opacity=".22"/>`;
    }
    return '';
  };
  // l'ombre d'une forme : le volume (le haut éclairé, le bas dans l'ombre), et des hachures qui s'épaississent vers le bas
  const ombrer = B => !B ? '' : `<rect x="${n2(B[0] - f)}" y="${n2(B[1] - f)}" width="${n2(B[2] - B[0] + 2 * f)}" height="${n2(B[3] - B[1] + 2 * f)}" fill="url(#${id}v)"/>`
    + (leger ? '' : `<rect x="${n2(B[0] - f)}" y="${n2(B[1] + (B[3] - B[1]) * .35)}" width="${n2(B[2] - B[0] + 2 * f)}" height="${n2((B[3] - B[1]) * .65 + f)}" fill="url(#${id}h)" mask="url(#${id}m)" opacity=".55"/>`);
  // une forme pleine, en planche : elle, puis dans sa découpe son tégument (si elle est de la masse, ou une aile, une carapace) et son volume
  const remplir = (el, r, avecTeg) => { const B = boiteEl(el); let s = el.brut || balise(el.nom, el.attr);
    if (!B || el.attr.transform || !['path', 'ellipse', 'circle'].includes(el.nom)) return s;
    const big = (B[2] - B[0]) * k > 4 && (B[3] - B[1]) * k > 3, teg = big && avecTeg ? tegument(B, r.organe === 'ailes' ? 'aile' : r.partie || 'organe', lireCouleur(el.attr.fill)) : '';
    if (teg || big) { const cid = clipDe(balise(el.nom, Object.fromEntries(Object.entries(el.attr).filter(([c]) => ['d', 'cx', 'cy', 'rx', 'ry', 'r'].includes(c))))); s += `<g clip-path="url(#${cid})">${teg}${big ? ombrer(B) : ''}</g>`; }
    return s; };

  // --- ce qui est redessiné : la queue (effilée, fournie chez une bête à poil), le corps d'un serpent ---
  const remplace = new Map();   // (l'élément de départ → { s : ce qu'on dessine à sa place, fin : le dernier élément remplacé })
  const Q = P?.queue;
  if (!SN && Q?.courbe?.length === 3 && Q.epaisseurs?.length === 2 && Array.isArray(Q.svg) && Q.svg[0] === Q.svg[1] && els[Q.svg[0]]?.nom === 'path' && els[Q.svg[0]].attr.fill === robeS) {
    const [p0, c1, p2] = Q.courbe.map(dansLe), [w0, w1] = Q.epaisseurs.map(v => v / Lk), N = 26, pts = [], W = [];
    for (let i = 0; i <= N; i++) { const t = i / N; pts.push(bezQ(p0, c1, p2, t)); W.push(Math.max(.7 * f, w0 + (w1 - w0) * Math.pow(t, .75))); }
    const poil = fam === 'pelage' ? (det.has('pelage-froid') ? .38 : det.has('pelage-chaud') || det.has('pelage-nageur') ? .05 : .18) : 0;
    if (poil > .3) for (let i = 6; i < N; i++) W[i] = Math.max(W[i], w0 * (.55 + .25 * Math.sin(Math.PI * (i / N))));   // (une queue de poil long : fournie jusqu'au bout)
    const el = { nom: 'path', attr: { d: rubanLisse(pts, W, poil, R), fill: robeS } }; forme.set(Q.svg[0], el);
    remplace.set(Q.svg[0], { s: remplir(el, { partie: 'queue' }, true), fin: Q.svg[0] }); }
  if (SN && Array.isArray(P.corps.svg)) {
    const { pts, W } = SN, N = pts.length, d = rubanLisse(pts, W, 0), el = { nom: 'path', attr: { d, fill: robeS } }, cid = clipDe(`<path d="${d}"/>`);
    const nrm = i => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; };
    // le ventre : une bande claire sur le bas du corps, ses plaques en travers
    const bas = [], haut = [], plaques = []; for (let i = 0; i < N; i++) { const [nx, ny] = nrm(i), h = W[i] / 2; bas.push([pts[i][0] + nx * h * 1.05, pts[i][1] + ny * h * 1.05]); haut.push([pts[i][0] + nx * h * .3, pts[i][1] + ny * h * .3]); }
    const ventre = lisse([...bas, ...haut.slice().reverse()], true);
    let acc = 0; for (let i = 1; i < N - 1; i++) { acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (acc < SN.Wm * .42) continue; acc = 0; plaques.push(`M${P2(...haut[i])}L${P2(...bas[i])}`); }
    // le motif du dos : des bandes en travers, une raie, des taches ; la livrée d'avertissement
    let motif = ''; const mot = traits.includes('coloration-aposematique') ? 'apo' : K.motif;
    if (mot === 'bandes' || mot === 'apo' || mot === 'rayures' && false) { const B2 = []; let a2 = 0; for (let i = 3; i < N - 2; i++) { a2 += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (a2 < SN.Wm * 1.5) continue; a2 = 0; const [nx, ny] = nrm(i), h = W[i] / 2;
      B2.push(`M${P2(pts[i][0] - nx * h * 1.2, pts[i][1] - ny * h * 1.2)}L${P2(pts[i][0] + nx * h * .35, pts[i][1] + ny * h * .35)}`); }
      motif = `<path d="${B2.join('')}" stroke="${mot === 'apo' ? '#d8a23a' : K.sombre}" stroke-width="${n2(SN.Wm * .55)}" stroke-linecap="butt" opacity=".9"/>`; }
    else if (mot === 'rayures') motif = `<path d="${lisse(pts.map((p, i) => { const [nx, ny] = nrm(i); return [p[0] - nx * W[i] * .18, p[1] - ny * W[i] * .18]; }))}" stroke="${K.sombre}" stroke-width="${n2(SN.Wm * .22)}" fill="none" opacity=".85"/>`;
    else if (mot === 'taches') { const T2 = []; for (let i = 3; i < N - 2; i += 2) { const [nx, ny] = nrm(i), h = W[i] / 2; T2.push(`<ellipse cx="${n2(pts[i][0] - nx * h * .25)}" cy="${n2(pts[i][1] - ny * h * .25)}" rx="${n2(h * .55)}" ry="${n2(h * .4)}" fill="${K.sombre}" opacity=".85"/>`); } motif = T2.join(''); }
    let B = null; pts.forEach((p, i) => { B = unir(B, [p[0] - W[i] / 2, p[1] - W[i] / 2, p[0] + W[i] / 2, p[1] + W[i] / 2]); });
    forme.set(P.corps.svg[0], el); masse.add(P.corps.svg[0]);
    remplace.set(P.corps.svg[0], { fin: P.corps.svg[1], s: `<path d="${d}" fill="${robeS}"/><g clip-path="url(#${cid})"><path d="${ventre}" fill="${K.ventre}"/>${motif}<path d="${plaques.join('')}" stroke="${ink}" stroke-width="${n2(.22 * f)}" opacity=".45"/>${tegument(B, 'corps')}${ombrer(B)}</g>` }); }
  const estOeil = i => { const el = els[i]; if (el?.nom !== 'ellipse') return null; const x = +el.attr.cx, y = +el.attr.cy, r = +el.attr.rx, t = .06 / Lk + .02;
    return yeux.find(q => Math.abs(q[0] - x) < t && Math.abs(q[1] - y) < t && Math.abs(q[2] - r) < 2 * t) || null; };
  const cetSaute = new Set(); let cetAjout = '';
  if (cetace && P.tete && P.queue) {
    const corpsC = els[P.corps.svg[0]]?.brut ? attributs((/<ellipse[^>]*>/.exec(els[P.corps.svg[0]].brut) || [''])[0]) : null, rx = +(corpsC?.rx || 20), ry = +(corpsC?.ry || 6);
    for (let i = P.tete.svg[0]; i <= P.tete.svg[1]; i++) { const el = els[i], A = el.attr; if (estOeil(i) || (i > 0 && estOeil(i - 1) && A.fill === '#fffaf0')) continue;
      if (role[i].organe === 'nageoires') continue;
      if ((el.nom === 'path' && A.opacity === '.7' && A.stroke) || A.fill === '#3a1f1f' || A.fill === '#fbf6ea' || A.fill === '#3a2a2a') cetSaute.add(i); }
    for (const x of P.organes || []) if (x.type === 'nageoires' && x.place === 'ventre') for (let i = x.svg[0]; i <= x.svg[1]; i++) cetSaute.add(i);
    const [qb, qt] = (P.queue.points || []).map(dansLe), xq = qb ? qb[0] : -rx, xT = qt ? qt[0] : -rx * 1.4, Lq = xq - xT, hb = ry * .14;
    const fl = `M${P2(xq + 2 * f, -hb)}Q${P2(xq - Lq * .5, -hb * 1.1)} ${P2(xT - Lq * .05, -ry * .26)}Q${P2(xT + Lq * .2, -ry * .1)} ${P2(xT + Lq * .34, -ry * .03)}Q${P2(xT + Lq * .18, ry * .03)} ${P2(xT + Lq * .02, ry * .12)}Q${P2(xq - Lq * .5, hb * 1.2)} ${P2(xq + 2 * f, hb)}Z`;
    remplace.set(P.queue.svg[0], { fin: P.queue.svg[1], s: `<path d="${fl}" fill="${ink}" stroke="${ink}" stroke-width="${n2(2 * e)}"/><path d="${fl}" fill="${K.sombre}"/>` });
    const xt = rx, bouche = `M${P2(xt - .4 * f, ry * .12)}Q${P2(xt - ry * .55, ry * .32)} ${P2(xt - ry * 1.05, ry * .2)}`;
    cetAjout = `<path d="${bouche}" stroke="${ink}" stroke-width="${n2(.35 * f)}" fill="none"/><path d="M${P2(xt - ry * 1.75, -ry * .97)}q${P2(ry * .14, -ry * .1)} ${P2(ry * .28, 0)}" stroke="${ink}" stroke-width="${n2(.4 * f)}" fill="none"/>`;
    if (K.motif === 'masque') cetAjout = `<ellipse cx="${n2(xt - ry * 1.15)}" cy="${n2(-ry * .34)}" rx="${n2(ry * .5)}" ry="${n2(ry * .2)}" fill="#f4f1ea" stroke="${ink}" stroke-width="${n2(.25 * f)}" transform="rotate(-8 ${n2(xt - ry * 1.15)} ${n2(-ry * .34)})"/>` + cetAjout; }
  // le corps d'un quadrupède, modelé sur son contour : le garrot et la croupe un peu hauts, le dos qui fléchit entre eux, le poitrail plus
  // profond, le ventre qui remonte devant la cuisse (sans toucher aux attaches des pattes) ; sa découpe le suit
  let corpsModele = null;
  if (P?.dessin === 'quadrupede' && Array.isArray(P.corps?.svg) && els[P.corps.svg[0]]?.nom === 'clipPath') {
    const fo = /<clipPath[^>]*>([\s\S]*)<\/clipPath>/.exec(els[P.corps.svg[0]].brut)?.[1], d0 = fo ? attributs(fo).d : null, E = d0 ? echantillonner(d0, .6 * f) : [];
    if (E.length > 20) { let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const [x, y] of E) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      const w = x1 - x0, h = y1 - y0, yc = (y0 + y1) / 2, bosse = (u, c, l) => Math.exp(-(((u - c) / l) ** 2)), pts = [];
      for (let i = 0; i < E.length; i += 2) { const [x, y] = E[i], u = (x - x0) / w, bas = y > yc;
        const lourd = cl((Math.log10(Math.max(.001, plan?.masse_kg || 1)) + 1.3) / 3.3), allege = h * .09 * lourd * bosse(u, .5, .32);
        const dy = bas ? -h * .13 * bosse(u, .44, .12) + h * .05 * bosse(u, .8, .12) - allege : -h * .035 * bosse(u, .8, .1) + h * .03 * bosse(u, .55, .14) - h * .03 * bosse(u, .2, .12);
        pts.push([x, y + dy]); }
      corpsModele = lisse(pts, true); } }
  if (corpsModele) { const j = P.corps.svg[0] + 1, el = els[j]; if (el?.nom === 'path' && el.attr.fill === robeS) { const m = { nom: 'path', attr: { ...el.attr, d: corpsModele } }; forme.set(j, m); remplace.set(j, { s: balise('path', m.attr), fin: j }); } }
  const premiere = masse.size ? Math.min(...masse) : -1;

  // --- les pattes, redessinées sur leurs articulations ---
  const pattes = new Map(); if (P) for (const p of [...(P.pattes || []), ...(P.bras || [])]) if (p.points && p.epaisseurs && Array.isArray(p.svg)) pattes.set(p.svg[0], p);
  const vertebre = P && !insecte && fam !== 'machine', xs = (P?.pattes || []).map(q => q.points[0][0]), xMid = xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : 0;
  const jambe = p => { const nL = p.points.length - 1, L2 = []; for (let j = 0; j < nL; j++) { const el = els[p.svg[0] + j]; if (el?.nom !== 'line') return null; const A = el.attr; L2.push({ a: [+A.x1, +A.y1], b: [+A.x2, +A.y2], w: +A['stroke-width'], c: A.stroke }); }
    const coul = lireCouleur(L2[0].c) || [120, 110, 100], loin = p.cote === 'loin', fill = rgb(coul);
    const caps = L2.map((s, j) => { const muscle = j === 0 && nL > 1 && vertebre;
      return capsule(s.a, s.b, s.w * (muscle ? 1.7 : j === nL - 1 ? .9 : 1.05), s.w * (muscle ? .84 : .76), muscle ? .32 : 0); });
    const noeuds = vertebre ? L2.slice(1).map(s => ({ x: s.a[0], y: s.a[1], r: s.w * .5 })) : L2.slice(1).map(s => ({ x: s.a[0], y: s.a[1], r: s.w * .62 }));
    const pied = els.slice(p.svg[0] + nL, p.svg[1] + 1), B = caps.reduce((b, q) => unir(b, q.b), null);
    const gid = `${id}j${p.svg[0]}`; defs.push(`<linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="${n2(B[0])}" y1="0" x2="${n2(B[2])}" y2="0"><stop offset="0" stop-color="${ink}" stop-opacity=".32"/><stop offset=".45" stop-color="${ink}" stop-opacity="0"/><stop offset=".72" stop-color="#fffaf0" stop-opacity=".2"/><stop offset="1" stop-color="#fffaf0" stop-opacity="0"/></linearGradient>`);
    // (une patte du côté proche : le haut de la cuisse, de l'épaule, se fond dans le corps — ni contour ni aplat, le pelage du corps y paraît)
    let fondu = ''; if (!loin && vertebre && nL > 1 && ['quadrupede', 'bipede-tendu'].includes(P.dessin)) { const a = L2[0].a, b = L2[0].b, mid = `${id}u${p.svg[0]}`;
      defs.push(`<linearGradient id="${mid}g" gradientUnits="userSpaceOnUse" x1="0" y1="${n2(a[1] - L2[0].w)}" x2="0" y2="${n2(a[1] + (b[1] - a[1]) * .5)}"><stop offset="0" stop-color="#000"/><stop offset=".55" stop-color="#000"/><stop offset="1" stop-color="#fff"/></linearGradient><mask id="${mid}" maskUnits="userSpaceOnUse" x="${n2(B[0] - 5)}" y="${n2(B[1] - 5)}" width="${n2(B[2] - B[0] + 10)}" height="${n2(B[3] - B[1] + 10)}"><rect x="${n2(B[0] - 5)}" y="${n2(B[1] - 5)}" width="${n2(B[2] - B[0] + 10)}" height="${n2(B[3] - B[1] + 10)}" fill="url(#${mid}g)"/></mask>`);
      fondu = ` mask="url(#${mid})"`; }
    const formes = [...caps.map(q => `<path d="${q.d}"`), ...noeuds.map(q => `<circle cx="${n2(q.x)}" cy="${n2(q.y)}" r="${n2(q.r)}"`)], m0 = j => j === 0 ? fondu : '';
    let s = formes.map((x, j) => `${x} fill="${ink}" stroke="${ink}" stroke-width="${n2(2 * e)}"${m0(j)}/>`).join('') + formes.map((x, j) => `${x} fill="${fill}"${m0(j)}/>`).join('') + formes.map((x, j) => `${x} fill="url(#${gid})"${m0(j)}/>`).join('');
    if (loin && !leger) s += caps.map(q => `<path d="${q.d}" fill="url(#${id}h)" opacity=".4"/>`).join('');
    if (fam === 'pelage' && nL > 1 && vertebre && !leger) {   // (le pli du muscle, le long de la cuisse ou du bras : il suit le membre)
      const a = L2[0].a, b = L2[0].b, w = L2[0].w, dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * w * .32, ny = dx / l * w * .32, pt = t => [a[0] + dx * t + nx, a[1] + dy * t + ny];
      s += `<path d="M${P2(...pt(.14))}Q${P2(pt(.35)[0] + nx * .5, pt(.35)[1] + ny * .5)} ${P2(...pt(.58))}" stroke="${ink}" stroke-width="${n2(.25 * f)}" fill="none" opacity=".45"/>`; }
    // l'épaule, la hanche : le muscle qui porte la patte, dessiné sur le corps (le côté proche)
    if (!loin && vertebre && P.dessin === 'quadrupede' && nL > 1) { const [ax, ay] = L2[0].a, w = L2[0].w * 1.5, avant = ax > xMid;
      s += avant ? `<path d="M${P2(ax + w * .55, ay + w * .55)}Q${P2(ax + w * .75, ay - w * 1.2)} ${P2(ax - w * .55, ay - w * 1.05)}" stroke="${ink}" stroke-width="${n2(.3 * f)}" fill="none" opacity=".55"/>`
        : `<path d="M${P2(ax + w * .85, ay - w * .7)}Q${P2(ax - w * .1, ay - w * 1.75)} ${P2(ax - w * 1.05, ay + w * .25)}" stroke="${ink}" stroke-width="${n2(.3 * f)}" fill="none" opacity=".55"/>`; }
    s += piedAtlas(p, pied, L2[nL - 1], coul);
    return s; };
  // un pied : le sabot fendu, les griffes de corne sur un pied de poil, le coussinet et ses doigts, les doigts écaillés d'un oiseau, les serres
  const piedAtlas = (p, pied, der, coul) => { let s = ''; const fx = der.b[0], fy = der.b[1], wl = der.w, horn = rgb(CORNE), palme = traits.includes('palmes');
    // (le dessin des jeux donne un sabot à tout omnivore un peu lourd ; un mangeur de viande ou d'insectes a des doigts griffus, comme un renard)
    const D = plan?.diete || {}, chair = (D.viande || 0) + (D.insectes || 0) + (D.charogne || 0), sabot = p.pied === 'sabot' && (reg === 'herbivore' || chair < .45);
    if (p.pied === 'sabot' && !sabot) return piedAtlas({ ...p, pied: 'griffes' }, [], der, coul);
    if (sabot && pied[0]?.nom === 'rect') { const A = pied[0].attr, x = +A.x, y = +A.y, w = +A.width, h = +A.height;
      const d = `M${P2(x + w * .08, y)}L${P2(x + w * .92, y)}L${P2(x + w * 1.1, y + h)}L${P2(x - w * .04, y + h)}Z`;
      s += `<path d="${d}" fill="${ink}" stroke="${ink}" stroke-width="${n2(2 * e)}"/><path d="${d}" fill="${horn}"/><path d="M${P2(x + w * .2, y + h * .22)}L${P2(x + w * .72, y + h * .22)}" stroke="#fffaf0" stroke-width="${n2(.3 * f)}" opacity=".35"/>`;
      if (reg === 'herbivore') s += `<path d="M${P2(x + w * .6, y + h * .35)}L${P2(x + w * .66, y + h)}" stroke="${ink}" stroke-width="${n2(.3 * f)}"/>`;
      return s; }
    if (p.pied === 'coussinet' || p.pied === 'griffes') { const r = Math.max(wl * .62, .9 * f), cx = fx + wl * .3, cy = fy - r * .58, d = `M${P2(cx - r * 1.05, fy)}Q${P2(cx - r * 1.1, cy - r * .75)} ${P2(cx, cy - r * .7)}Q${P2(cx + r * 1.25, cy - r * .6)} ${P2(cx + r * 1.2, fy)}Z`;
      s += `<path d="${d}" fill="${ink}" stroke="${ink}" stroke-width="${n2(2 * e)}"/><path d="${d}" fill="${rgb(coul)}"/>`;
      s += `<path d="M${P2(cx + r * .1, cy - r * .55)}v${n2(r * .75)}M${P2(cx + r * .62, cy - r * .4)}v${n2(r * .62)}" stroke="${ink}" stroke-width="${n2(.22 * f)}" opacity=".6"/>`;
      if (p.pied === 'griffes') { const G = []; for (const t of [.15, .55, .95]) { const gx = cx + r * (t * 1.1 - .1), gy = fy - r * .25; G.push(`M${P2(gx, gy)}q${P2(r * .55, -r * .05)} ${P2(r * .75, r * .32)}`); }
        s += `<path d="${G.join('')}" stroke="${ink}" stroke-width="${n2(Math.max(.4 * f, r * .3) + e)}" fill="none"/><path d="${G.join('')}" stroke="${horn}" stroke-width="${n2(Math.max(.4 * f, r * .3))}" fill="none"/>`; }
      if (palme) s += `<path d="M${P2(cx - r * .4, fy - r * .1)}Q${P2(cx + r * 1.2, fy + r * .45)} ${P2(cx + r * 2.2, fy - r * .05)}L${P2(cx + r * .9, fy - r * .55)}Z" fill="${rgb(mel(coul, PAPIER, .2))}" opacity=".75" stroke="${ink}" stroke-width="${n2(.22 * f)}"/>`;
      return s; }
    // mains, doigts, serres : leurs traits, chacun cerné ; écailles sur les doigts d'un oiseau
    for (const el of pied) { if (el.nom !== 'path') { s += el.brut; continue; } s += encre(el, 1.4 * e) + el.brut; }
    if (p.pied === 'doigts' || p.pied === 'serres') { const tics = []; for (let t = .2; t < .95; t += .16) tics.push(`M${P2(der.a[0] + (fx - der.a[0]) * t - wl * .42, der.a[1] + (fy - der.a[1]) * t)}h${n2(wl * .84)}`);
      s += `<path d="${tics.join('')}" stroke="${ink}" stroke-width="${n2(.18 * f)}" opacity=".5"/>`;
      if (palme) s += `<path d="M${P2(fx - 3.6 * f, fy)}L${P2(fx, fy - wl * .4)}L${P2(fx + 4.6 * f, fy)}Z" fill="${rgb(mel(coul, PAPIER, .15))}" opacity=".7" stroke="${ink}" stroke-width="${n2(.2 * f)}"/>`; }
    return s; };

  // --- un œil vivant : son iris, sa pupille (selon la bête), ses reflets, sa paupière ---
  const pupille = (() => {
    if (fam === 'chitine') return 'facettes';
    if (fam === 'machine') return 'objectif';
    if (fam === 'ecailles' && P?.dessin === 'poisson') return 'ronde';
    if (fam === 'peau-nue') return 'barre';
    if (reg === 'carnivore' && nuit && fam !== 'plumage') return 'fente';
    if (fam === 'ecailles' && reg === 'carnivore') return 'fente';
    if (fam === 'pelage' && reg === 'herbivore' && (P?.pattes || []).some(q => q.pied === 'sabot')) return 'barre';
    return 'ronde'; })();
  let noe = 0;
  const oeilAtlas = (x, y, r) => { const io = K.oeil, gid = `${id}o${++noe}`;
    defs.push(`<radialGradient id="${gid}" cx=".38" cy=".34" r=".7"><stop offset="0" stop-color="${rgb(mel(io, [255, 250, 235], .45))}"/><stop offset=".55" stop-color="${rgb(io)}"/><stop offset="1" stop-color="${rgb(mel(io, ENCRE, .55))}"/></radialGradient>`);
    let s = `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(r * 1.16 + e)}" fill="${ink}"/>`;
    if (pupille === 'facettes') { s += `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(r)}" fill="${rgb(mel(io, ENCRE, .35))}"/>`; const pts = [];
      for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) { const px = x + i * r * .36 + (j % 2) * r * .18, py = y + j * r * .32; if (Math.hypot(px - x, py - y) < r * .85) pts.push(`M${P2(px, py)}h.01`); }
      return s + `<path d="${pts.join('')}" stroke="#fffaf0" stroke-width="${n2(r * .14)}" opacity=".35"/><ellipse cx="${n2(x - r * .3)}" cy="${n2(y - r * .38)}" rx="${n2(r * .38)}" ry="${n2(r * .22)}" fill="#fffdf6" opacity=".7"/>`; }
    if (pupille === 'objectif') return s + `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(r)}" fill="#1e2a30"/><circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(r * .62)}" fill="none" stroke="#7fb4c4" stroke-width="${n2(r * .18)}"/><circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(r * .28)}" fill="#c9f1ff"/><circle cx="${n2(x - r * .35)}" cy="${n2(y - r * .4)}" r="${n2(r * .16)}" fill="#fff"/>`;
    s += `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(r)}" fill="url(#${gid})"/>`;
    const dil = nuit ? 1.25 : 1, pc = '#14100c';
    if (pupille === 'fente') s += `<ellipse cx="${n2(x + r * .04)}" cy="${n2(y)}" rx="${n2(r * .17 * dil)}" ry="${n2(r * .84)}" fill="${pc}"/>`;
    else if (pupille === 'barre') s += `<rect x="${n2(x - r * .62)}" y="${n2(y - r * .2)}" width="${n2(r * 1.24)}" height="${n2(r * .4)}" rx="${n2(r * .2)}" fill="${pc}"/>`;
    else s += `<circle cx="${n2(x + r * .06)}" cy="${n2(y + r * .02)}" r="${n2(r * .5 * dil)}" fill="${pc}"/>`;
    s += `<circle cx="${n2(x - r * .34)}" cy="${n2(y - r * .36)}" r="${n2(r * .26)}" fill="#fffdf6"/><circle cx="${n2(x + r * .32)}" cy="${n2(y + r * .3)}" r="${n2(r * .1)}" fill="#fffdf6" opacity=".7"/>`;
    if (fam === 'pelage' || fam === 'ecailles' && P?.dessin !== 'poisson' || fam === 'cuirasse') s += `<path d="M${P2(x - r * 1.28, y - r * .1)}Q${P2(x, y - r * 1.75)} ${P2(x + r * 1.3, y - r * .2)}" stroke="${ink}" stroke-width="${n2(Math.max(.35 * f, r * .16))}" fill="none" opacity=".75"/>`;
    return s; };

  // une aile d'insecte : la membrane translucide, ses nervures depuis sa base ; une aile de papillon garde sa couleur et prend sa bordure
  const aileAtlas = el => { const A = el.attr, papi = A.fill !== '#f4f6f2', base = { ...A };
    if (!papi) { base['fill-opacity'] = '.5'; delete base.opacity; delete base.stroke; delete base['stroke-width']; }
    let veines = '';
    if (el.nom === 'ellipse') { const cx = +A.cx, cy = +A.cy, rx = +A.rx, ry = +A.ry;
      veines = `<path d="M${P2(cx - rx * .92, cy)}L${P2(cx + rx * .85, cy - ry * .15)}M${P2(cx - rx * .6, cy)}Q${P2(cx, cy - ry * .8)} ${P2(cx + rx * .7, cy - ry * .55)}M${P2(cx - rx * .55, cy)}Q${P2(cx, cy + ry * .75)} ${P2(cx + rx * .6, cy + ry * .55)}M${P2(cx + rx * .1, cy - ry * .45)}L${P2(cx + rx * .2, cy + ry * .5)}" stroke="${ink}" stroke-width="${n2(.2 * f)}" fill="none" opacity=".55"${A.transform ? ` transform="${A.transform}"` : ''}/>`; }
    else if (el.nom === 'path') { const E = echantillonner(A.d, 1.2 * f), b0 = E[0]; if (b0) { const L2 = []; for (let j = 1; j < 7; j++) { const q = E[Math.floor(E.length * j / 7)]; if (q) L2.push(`M${P2(b0[0], b0[1])}L${P2(q[0], q[1])}`); }
      const cid = clipDe(`<path d="${A.d}"/>`); veines = `<g clip-path="url(#${cid})"><path d="${L2.join('')}" stroke="${ink}" stroke-width="${n2(.22 * f)}" opacity=".5"/>${papi ? `<path d="${A.d}" fill="none" stroke="${K.sombre}" stroke-width="${n2(2.6 * f)}" opacity=".85"/>` : ''}</g>`; } }
    return balise(el.nom, { ...base, stroke: ink, 'stroke-width': n2(e * (papi ? 1.6 : 1)), 'stroke-opacity': papi ? 1 : .7 }) + veines; };

  // la queue d'un oiseau : ses pennes, de sa base au bout, chacune bordée de clair
  const pennesAtlas = el => { const A = el.attr, E = echantillonner(A.d, .8 * f), base = P.queue.points?.[0] ? dansLe(P.queue.points[0]) : null;
    let s = appui(el) + encre(el) + el.brut; if (!base || E.length < 6) return s;
    const loin = E.map(q => [q, Math.hypot(q[0] - base[0], q[1] - base[1])]).sort((a, b) => b[1] - a[1]), dmax = loin[0][1], bout = E.filter(q => Math.hypot(q[0] - base[0], q[1] - base[1]) > dmax * .78);
    const L2 = [], C2 = []; for (let j = 0; j < 6 && bout.length; j++) { const q = bout[Math.floor(bout.length * (j + .5) / 6)]; L2.push(`M${P2(...base)}L${P2(q[0], q[1])}`); C2.push(`M${P2(base[0] - .3 * f, base[1] + .25 * f)}L${P2(q[0] + .25 * f, q[1] + .35 * f)}`); }
    const fond = lireCouleur(A.fill), cl2 = fond && lum(fond) < .22 ? '#f6efe0' : ink, cid = clipDe(`<path d="${A.d}"/>`);
    return s + `<g clip-path="url(#${cid})"><path d="${L2.join('')}" stroke="${cl2}" stroke-width="${n2(.26 * f)}" opacity=".5"/><path d="${C2.join('')}" stroke="#fffaf0" stroke-width="${n2(.18 * f)}" opacity=".3"/>${ombrer(boiteEl(el))}</g>`; };
  // l'intérieur d'une oreille (une bête à poil : les deux premières formes de sa tête, en feuille ou en pointe), plus clair et rosé
  const oreille = (el, i, r) => { if (fam !== 'pelage' || leger || r.partie !== 'tete' || r.organe || !P?.tete || i > P.tete.svg[0] + 1 || el.attr.fill !== robeS || !robes) return '';
    const dedans = rgb(mel(robes.robe, [222, 168, 160], .5)), A = el.attr;
    if (el.nom === 'ellipse' && A.transform) return `<ellipse cx="${A.cx}" cy="${n2(+A.cy + +A.ry * .1)}" rx="${n2(+A.rx * .5)}" ry="${n2(+A.ry * .66)}" fill="${dedans}" transform="${A.transform}"/><ellipse cx="${A.cx}" cy="${n2(+A.cy + +A.ry * .1)}" rx="${n2(+A.rx * .5)}" ry="${n2(+A.ry * .66)}" fill="url(#${id}v)" transform="${A.transform}"/>`;
    const v = el.nom === 'path' ? [...(A.d || '').matchAll(/[-+]?(?:\d+\.?\d*|\.\d+)/g)].map(x => +x[0]) : [];
    if (v.length === 6 && /^M[^QCA]*L[^QCA]*L[^QCA]*Z$/.test(A.d)) { const T3 = [[v[0], v[1]], [v[2], v[3]], [v[4], v[5]]], c = [(v[0] + v[2] + v[4]) / 3, (v[1] + v[3] + v[5]) / 3];
      const q = T3.map(([x, y]) => [c[0] + (x - c[0]) * .52, c[1] + (y - c[1]) * .58 + (y > c[1] ? -.3 * f : .4 * f)]); return `<path d="M${q.map(p => P2(...p)).join('L')}Z" fill="${dedans}"/>`; }
    return ''; };
  // ce que la plupart des bêtes portent sur le corps : le camouflage (des taches irrégulières, sombres et claires, qui cassent la
  // silhouette), la peau épaisse (ses plis, sur l'avant du corps)
  const livree = B => { if (!B || leger) return ''; const [x0, y0, x1, y1] = B, w = x1 - x0, h = y1 - y0; let s2 = '';
    if (traits.includes('camouflage')) { const T2 = []; for (let i = 0; i < 14; i++) { const cx = x0 + w * (.05 + .9 * R()), cy = y0 + h * (.1 + .6 * R()), rx = w * (.04 + .06 * R()), ry = h * (.06 + .08 * R()), a = Math.round(R() * 180);
        T2.push(`<ellipse cx="${n2(cx)}" cy="${n2(cy)}" rx="${n2(rx)}" ry="${n2(ry)}" transform="rotate(${a} ${n2(cx)} ${n2(cy)})" fill="${i % 3 ? K.sombre : o.camouflage || rgb(mel(robes?.robe || [120, 110, 90], [120, 140, 80], .35))}" opacity="${i % 3 ? .42 : .5}"/>`); }
      s2 += T2.join(''); }
    if (traits.includes('peau-epaisse')) { const Pl2 = []; for (let i = 0; i < 6; i++) { const x = x1 - w * (.12 + i * .05), yA = y0 + h * (.2 + .05 * (i % 2)); Pl2.push(`M${P2(x, yA)}Q${P2(x - w * .03, y0 + h * .5)} ${P2(x + w * .01, y0 + h * .82)}`); }
      s2 += `<path d="${Pl2.join('')}" stroke="${ink}" stroke-width="${n2(.3 * f)}" fill="none" opacity=".4"/>`; }
    return s2; };
  // une nageoire de poisson : cernée, la membrane un peu translucide, ses rayons depuis sa base
  const nageoireAtlas = el => { const A = el.attr, E = el.nom === 'path' ? echantillonner(A.d, .9 * f) : [];
    let s = encre(el, 1.5 * e) + balise(el.nom, { ...A, 'fill-opacity': .88 });
    if (E.length > 4) { const b0 = E[0], L2 = []; for (let j = 1; j < 9; j++) { const q = E[Math.floor(E.length * j / 9)]; L2.push(`M${P2(b0[0], b0[1])}L${P2(q[0], q[1])}`); }
      const cid = clipDe(`<path d="${A.d}"/>`); s += `<g clip-path="url(#${cid})"><path d="${L2.join('')}" stroke="#f6efe0" stroke-width="${n2(.2 * f)}" opacity=".45"/></g>`; }
    return s; };

  // --- le sol : une ombre douce et quelques tailles de graveur ; en pleine eau, rien ---
  const solAtlas = el => { const A = el.attr, cx = +A.cx, cy = SN ? 0 : +A.cy, rx = +A.rx * (SN ? 1.1 : 1), gid = `${id}s`;
    defs.push(`<radialGradient id="${gid}"><stop offset="0" stop-color="${ink}" stop-opacity=".3"/><stop offset="1" stop-color="${ink}" stop-opacity="0"/></radialGradient>`);
    const T = []; for (let i = 0; i < 7; i++) { const x = cx - rx * 1.15 + rx * 2.3 * (i + R() * .5) / 7, l = rx * (.12 + .14 * R()); T.push(`M${P2(x, cy + (R() - .3) * .6 * f)}h${n2(l)}`); }
    return `<ellipse cx="${n2(cx)}" cy="${n2(cy)}" rx="${n2(rx * 1.25)}" ry="${n2(Math.max(+A.ry, 1.6 * f))}" fill="url(#${gid})"/><path d="${T.join('')}" stroke="${ink}" stroke-width="${n2(.26 * f)}" opacity=".45"/>`; };

  // --- les éléments du dessin, dans leur ordre : chacun repris en planche ---
  const saute = new Set(); let boiteCorps = null, dansTete = false;
  const teteSvg = P?.tete?.svg, grandeTete = SN && teteSvg ? `translate(${n2(SN.piv[0])} ${n2(SN.piv[1] + SN.dY)}) scale(${n2(SN.kH)}) translate(${n2(-SN.piv[0])} ${n2(-SN.piv[1])})`
    : TT && teteSvg ? `translate(${n2(TT.ancre[0])} ${n2(TT.ancre[1])}) scale(${n2(TT.k)}) translate(${n2(-TT.ancre[0])} ${n2(-TT.ancre[1])})` : null;
  for (let i = 0; i < n; i++) {
    if (grandeTete && i === teteSvg[0]) { out.push(`<g transform="${grandeTete}">`); dansTete = true; }
    if (cetSaute.has(i)) { if (P.tete && i === P.tete.svg[1]) out.push(cetAjout); continue; }
    if (!saute.has(i)) {
      const el = els[i], r = role[i];
      if (i === premiere) out.push([...masse].map(j => { const x = forme.get(j) || els[j]; return appui(x) + encre(x); }).join(''));
      const rp = remplace.get(i), pj = pattes.get(i), oe = estOeil(i); let sj = null;
      if (i === 0 && ombre) out.push(solAtlas(el));
      else if (rp) { out.push(rp.s); for (let j = i + 1; j <= rp.fin; j++) saute.add(j); }
      else if (pj && (sj = jambe(pj)) != null) { out.push(sj); for (let j = pj.svg[0]; j <= pj.svg[1]; j++) saute.add(j); }
      else if (oe) { out.push(oeilAtlas(oe[0], oe[1], oe[2])); const h = els[i + 1]; if (h?.nom === 'ellipse' && h.attr.fill === '#fffaf0') saute.add(i + 1); }
      else if (el.nom === 'clipPath') { out.push(corpsModele && r.partie === 'corps' && i === P.corps.svg[0] ? el.brut.replace(/<path d="[^"]*"/, `<path d="${corpsModele}"`) : el.brut); if (r.partie === 'corps' || r.partie === 'thorax') { const fo = /<clipPath[^>]*>([\s\S]*)<\/clipPath>/.exec(el.brut)?.[1]; boiteCorps = fo ? boiteEl({ nom: /<(\w+)/.exec(fo)[1], attr: attributs(fo) }) : null; if (r.partie === 'corps' && fo) boiteCorps.forme = attributs(fo).d || null; } }
      else if (el.nom === 'g') {   // le dedans du corps (sa découpe) : le motif du dessin, puis le tégument, le volume et les hachures ; les mèches de son dos
        const B = boiteCorps, lat = P?.dessin === 'poisson' && !cetace && B && !leger ? `<path d="M${P2(B[2] - (B[2] - B[0]) * .2, B[1] + (B[3] - B[1]) * .36)}Q${P2((B[0] + B[2]) / 2, B[1] + (B[3] - B[1]) * .3)} ${P2(B[0] + (B[2] - B[0]) * .03, B[1] + (B[3] - B[1]) * .5)}" stroke="${ink}" stroke-width="${n2(.26 * f)}" fill="none" stroke-dasharray="${n2(.8 * f)} ${n2(.45 * f)}" opacity=".55"/>` : '';
        out.push(el.brut.replace(/<\/g>$/, `${tegument(B, 'corps', robes?.robe)}${lat}${livree(B)}${ombrer(B)}</g>`));
        if (fam === 'pelage' && B?.forme && !det.has('pelage-nageur') && !leger) out.push(meches(B.forme, B)); }
      else if (el.nom === 'line') out.push(encre(el) + el.brut);
      else if (el.nom === 'path' && (!el.attr.fill || el.attr.fill === 'none') && el.attr.stroke) {   // un trait : une moustache, une bouche, une corne, une antenne
        const sw = +(el.attr['stroke-width'] || 1), sc = lireCouleur(el.attr.stroke), fonce = sc && lum(sc) < .3;
        if (sw * k < .9 || fonce) out.push(balise('path', { ...el.attr, stroke: fonce ? ink : el.attr.stroke }));
        else out.push(encre(el, 1.6 * e) + el.brut); }
      else if (plein(el) && P?.dessin === 'oiseau' && r.partie === 'queue' && el.nom === 'path' && !leger) out.push(pennesAtlas(el));
      else if (plein(el) && r.organe === 'nageoires' && fam === 'ecailles' || plein(el) && P?.dessin === 'poisson' && !cetace && r.partie === 'queue') out.push(nageoireAtlas(el));
      else if (plein(el) && insecte && (el.attr.fill === '#f4f6f2' || P?.dessin === 'papillon' && r.partie === 'corps' && el.attr.fill === robeS && i <= P.corps.svg[0] + 1)) out.push(aileAtlas(el));
      else if (!plein(el)) out.push(el.brut);
      else {   // une forme pleine : son encre (sauf dans la masse, déjà cernée), elle, son volume ; le tégument sur la masse, les ailes, la carapace
        const enMasse = masse.has(i), B = boiteEl(el), petit = !B || (B[2] - B[0]) * k < 1.6 || (B[3] - B[1]) * k < 1.2;
        let s = enMasse || petit && lum(lireCouleur(el.attr.fill) || [0, 0, 0]) < .25 ? '' : (r.organe || r.partie === 'tete' ? '' : appui(el)) + encre(el);
        out.push(s + (petit ? el.brut : remplir(el, r, enMasse || r.organe === 'ailes' || r.organe === 'carapace')) + oreille(el, i, r)); }
    }
    if (cetAjout && P.tete && i === P.tete.svg[1] && !cetSaute.has(i)) out.push(cetAjout);
    if (dansTete && i === teteSvg[1]) { out.push('</g>'); dansTete = false; }
  }
  if (dansTete) out.push('</g>');
  // ce que portent la plupart des bêtes : les vibrisses, la membrane d'une planeuse
  if (P?.tete?.museau && traits.includes('vibrisses') && fam === 'pelage') { const [mx, my] = versTete(dansLe(P.tete.museau)), r0 = (P.tete.rayon || 6) / Lk * (TT?.k || 1), V = [];
    for (const d of [-.25, 0, .25, .5]) V.push(`M${P2(mx - r0 * .25, my + r0 * .05)}q${P2(r0 * .6, d * r0 * .4)} ${P2(r0 * 1.25, d * r0 * .9 - r0 * .15)}`);
    out.push(`<path d="${V.join('')}" stroke="${ink}" stroke-width="${n2(.18 * f)}" fill="none" opacity=".7"/>`); }
  if (P && traits.includes('membrane-planante') && (P.pattes || []).length >= 4) { const pr = P.pattes.filter(q => q.cote === 'pres'); if (pr.length >= 2) {
    const A = pr.map(q => dansLe(q.points[Math.min(1, q.points.length - 1)])).sort((a, b) => a[0] - b[0]), [h, d] = [A[0], A[A.length - 1]];
    const m = `M${P2(h[0], h[1])}Q${P2((h[0] + d[0]) / 2, Math.max(h[1], d[1]) + Math.abs(d[0] - h[0]) * .18)} ${P2(d[0], d[1])}L${P2(d[0] - 1 * f, d[1] - 4 * f)}L${P2(h[0] + 1 * f, h[1] - 4 * f)}Z`;
    out.push(`<path d="${m}" fill="${K.sombre || ink}" opacity=".7" stroke="${ink}" stroke-width="${n2(e)}"/>`); } }

  // --- la planche : le groupe du dessin, avec ses définitions ; le papier et le lavis pour la grande planche ---
  const g = `<g transform="translate(${n2(tx)} ${n2(ty)}) scale(${+k.toFixed(3)})" stroke-linecap="round" stroke-linejoin="round"><defs>${defs.join('')}</defs>${out.join('')}</g>`;
  const filtre = o.grain ? `<filter id="${id}q" x="-4%" y="-4%" width="108%" height="108%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="${Math.floor(R() * 90)}" result="b"/><feDisplacementMap in="SourceGraphic" in2="b" scale=".55" xChannelSelector="R" yChannelSelector="G" result="d"/><feTurbulence type="fractalNoise" baseFrequency="2.2" numOctaves="1" seed="3" result="g"/><feColorMatrix in="g" type="matrix" values="0 0 0 0 .5  0 0 0 0 .44  0 0 0 0 .36  0 0 0 -.9 .62" result="t"/><feComposite in="t" in2="d" operator="in" result="tt"/><feBlend in="tt" in2="d" mode="multiply"/></filter>` : '';
  const svg = `<svg viewBox="0 0 170 90" width="170" height="90" aria-hidden="true" class="atlas">${filtre ? `<defs>${filtre}</defs><g filter="url(#${id}q)">${g}</g>` : g}</svg>`;
  return { svg, parties: P, cadre: { tx, ty, k, dessin: [L.tx, L.ty, Lk] }, tete: TT ? { k: TT.k, ancre: TT.ancre, centre: TT.centre, r: TT.r } : null, famille: fam, pupille, yeux: so.yeux || [], sol: !!so.sol };

  // les mèches du dos : de courtes touffes sur le haut du contour, couchées vers l'arrière (un poil long en fait de longues)
  function meches(d, B) { const pas = (det.has('pelage-froid') ? 1.1 : 1.5) * f, Lm = (det.has('pelage-froid') ? 2.4 : det.has('pelage-chaud') ? .9 : 1.5) * f, cy = (B[1] + B[3]) / 2, cx = (B[0] + B[2]) / 2, M = [];
    for (const [x, y, ux, uy] of echantillonner(d, pas)) { if (y > cy - (B[3] - B[1]) * .05) continue; let nx = uy, ny = -ux; if ((x - cx) * nx + (y - cy) * ny < 0) { nx = -nx; ny = -ny; }
      const l = Lm * (.6 + .7 * R()), ex = x + nx * l * .55 - l * .75, ey = y + ny * l * .55 + l * .12; M.push(`M${P2(x - nx * .3 * f, y - ny * .3 * f)}Q${P2(x + nx * l * .5, y + ny * l * .5)} ${P2(ex, ey)}`); }
    return M.length ? `<path d="${M.join('')}" stroke="${ink}" stroke-width="${n2(.24 * f)}" fill="none" opacity=".62"/>` : ''; }
}
// --- la planche entière, pour la fiche de l'Observatoire : le dessin, l'échelle de sa taille vraie, ses renvois numérotés ---
//   OrvaneAtlas.planche(corps, plan, traits, options) → { svg, renvois: [{ n, texte }], echelle: { m, texte } }
//   options : celles de dessiner ; taille (sa longueur vue, en mètres : celle de la fiche quand un trait majoritaire la change)
const FORMES_FR = { recourbees: 'recourbées', droites: 'droites', ramifiees: 'ramifiées', dentelee: 'dentelée', lisse: 'lisse', frangee: 'frangée', segmentee: 'en anneaux',
  bombee: 'bombée', cloutee: 'cloutée', ronde: 'ronde', courbe: 'courbe', droit: 'droit', eventail: 'en éventail', touffe: 'en touffe', massives: 'massives', fines: 'fines',
  plumeuses: 'plumeuses', plumes: 'de plumes', membranes: 'de peau', longue: 'longue', courte: 'courte', rondes: 'rondes', pointues: 'pointues' };
const PLACES_FR = { dos: 'sur le dos', queue: 'au bout de la queue', flancs: 'sur les flancs', avant: "à l'avant" };
const CHIFFRES = ['', 'un', 'deux', 'trois', 'quatre'];
const TRAITS_FR = { albinisme: 'albinisme : robe blanche, yeux rosés', melanisme: 'mélanisme : robe noire', 'robe-doree': 'robe dorée', camouflage: 'robe de camouflage',
  palmes: 'pieds palmés', 'membrane-planante': 'membrane de vol plané', vibrisses: 'vibrisses', 'crocs-allonges': 'crocs allongés', 'yeux-nocturnes': 'grands yeux de nuit',
  'queue-prehensile': 'queue préhensile', 'pattes-longues': 'pattes longues', 'peau-epaisse': 'peau épaisse', 'coloration-aposematique': "livrée d'avertissement",
  gigantisme: 'gigantisme', nanisme: 'nanisme', 'glande-irritante': 'glandes irritantes' };
const MOTIFS_FR = { taches: 'robe tachetée', rayures: 'robe rayée', bandes: 'robe à bandes', masque: 'masque sombre' };
function nomOrgane(o) {
  const C = racine.OrvaneCorps?.catalogueOrganes ? racine.OrvaneCorps.catalogueOrganes() : null, T = C?.[o.type], plur = (o.nombre || 1) > 1;
  const mot = T?.mot ? T.mot[plur ? 1 : 0] : o.type.replace(/-/g, ' '), nb = (o.nombre || 1) > 4 ? 'des' : (o.nombre || 1) === 1 ? (T?.fem ? 'une' : 'un') : CHIFFRES[o.nombre];
  if (o.type === 'ailes') return `ailes ${FORMES_FR[o.forme] || 'de plumes'}`;
  return `${nb} ${mot}${o.forme && FORMES_FR[o.forme] ? ' ' + FORMES_FR[o.forme] : ''}${PLACES_FR[o.place] && o.type !== 'massue' && o.type !== 'aiguillon' && o.type !== 'panache' ? ' ' + PLACES_FR[o.place] : o.type === 'massue' ? ' au bout de la queue' : ''}`;
}
// le sol de son milieu, d'après le décor de sa fiche : herbes hautes ou rases, roseaux et vase, litière et fougère, feuilles géantes,
// neige, sable et pierres, rocaille, galets, lichens ; en pleine eau, la surface, des bulles, des herbiers, des coraux, la nuit des abysses
function solDuMilieu(decor, auSol, R, ink) {
  const T = [], A = (d, w = .3, op = .5, plus = '') => T.push(`<path d="${d}" stroke="${ink}" stroke-width="${w}" fill="none" opacity="${op}"${plus}/>`), y = 86, a = re => re.test(decor);
  const xs = (n, x0 = 4, x1 = 166) => Array.from({ length: n }, (_, i) => x0 + (x1 - x0) * (i + .2 + .6 * R()) / n);
  if (!auSol) {   // en pleine eau
    if (a(/noir profond|particules/)) { T.push(`<rect x="0" y="0" width="170" height="90" fill="#1d2a33" opacity=".1"/>`); const D = []; for (let i = 0; i < 40; i++) D.push(`M${n2(170 * R())} ${n2(90 * R())}h.01`); A(D.join(''), .7, .35); return T.join(''); }
    const W = []; for (const yy of [6, 9.5]) { let d = `M2 ${yy}`; for (let x = 2; x < 168; x += 8) d += ` q2 -1.2 4 0 q2 1.2 4 0`; W.push(d); } A(W.join(''), .25, .35);
    const B = []; for (let i = 0; i < 7; i++) { const x = 20 + 130 * R(), yy = 14 + 60 * R(), r = .6 + 1.2 * R(); B.push(`<circle cx="${n2(x)}" cy="${n2(yy)}" r="${n2(r)}" fill="none" stroke="${ink}" stroke-width=".2" opacity=".35"/>`); } T.push(B.join(''));
    if (a(/herbiers|coraux|galets/)) { for (const x of xs(5)) { let d = `M${n2(x)} 90`; for (let k = 1; k <= 4; k++) d += ` Q${n2(x + (k % 2 ? 3 : -3))} ${n2(90 - k * 5 + 2.5)} ${n2(x)} ${n2(90 - k * 5)}`; A(d, .35, .45); } }
    return T.join(''); }
  // la ligne du sol, à peine tremblée
  let base = `M3 ${y + .4}`; for (let x = 3; x < 167; x += 6) base += ` L${n2(x + 6)} ${n2(y + .4 + (R() - .5) * .5)}`; A(base, .3, .4);
  if (a(/neige/)) { T.push(`<path d="M0 ${y + 1} Q30 ${y - 3} 60 ${y - .5} Q100 ${y - 4} 130 ${y - 1} Q155 ${y - 3} 170 ${y} L170 90 L0 90Z" fill="#fbfdff" opacity=".75"/>`); A(`M8 ${y + 1.5} Q40 ${y - 1} 70 ${y + 1}M100 ${y + .5} Q130 ${y - 2} 160 ${y + 1}`, .25, .35); }
  if (a(/sable/)) { const D = []; for (let k = 0; k < 3; k++) { let d = `M${n2(6 + 20 * R())} ${y + 1.2 + k * 1.1}`; for (let x = 0; x < 5; x++) d += ` q4 -.6 8 0`; D.push(d); } A(D.join(''), .22, .4); }
  if (a(/roche|rocaille|pierre|pentes rocheuses|lichens/)) for (const x of xs(3)) { const w = 5 + 5 * R(), h = 2.5 + 2.5 * R(), d = `M${n2(x - w / 2)} ${y + .3}L${n2(x - w * .3)} ${n2(y - h)}L${n2(x + w * .15)} ${n2(y - h * 1.15)}L${n2(x + w / 2)} ${y + .3}Z`;
    T.push(`<path d="${d}" fill="#e9e2d2" stroke="${ink}" stroke-width=".3" opacity=".8"/><path d="M${n2(x + w * .05)} ${n2(y - h * .9)}l${n2(w * .3)} ${n2(h * .8)}M${n2(x + w * .18)} ${n2(y - h * .7)}l${n2(w * .22)} ${n2(h * .6)}" stroke="${ink}" stroke-width=".2" opacity=".5"/>`);
    if (a(/lichens/)) T.push(`<circle cx="${n2(x - w * .15)}" cy="${n2(y - h * .5)}" r=".8" fill="#b9b46a" opacity=".7"/><circle cx="${n2(x + w * .1)}" cy="${n2(y - h * .7)}" r=".6" fill="#b9b46a" opacity=".7"/>`); }
  if (a(/galets/)) for (const x of xs(6)) T.push(`<ellipse cx="${n2(x)}" cy="${n2(y - .4)}" rx="${n2(1.2 + R())}" ry=".8" fill="#ece6d8" stroke="${ink}" stroke-width=".25" opacity=".8"/>`);
  if (a(/herbes hautes|herbiers/)) for (const x of xs(9)) { const D = []; for (let k = 0; k < 5; k++) { const dx = (k - 2) * 1.2 + (R() - .5), h = 5 + 6 * R(); D.push(`M${n2(x + k * .4)} ${y}Q${n2(x + dx * .4)} ${n2(y - h * .6)} ${n2(x + dx)} ${n2(y - h)}`); } A(D.join(''), .26, .5); }
  if (a(/herbe rase|horizon ouvert/)) { const D = []; for (let x = 4; x < 166; x += 2.2 + 2 * R()) D.push(`M${n2(x)} ${y}l${n2((R() - .5) * .8)} ${n2(-1.2 - 1.4 * R())}`); A(D.join(''), .22, .45); }
  if (a(/roseaux|vase|eau stagnante/)) { for (const x of xs(5)) { const h = 22 + 12 * R(); A(`M${n2(x)} ${y}Q${n2(x + 1.5)} ${n2(y - h * .5)} ${n2(x + .8)} ${n2(y - h)}M${n2(x + .3)} ${n2(y - h * .35)}q3 -3 5 -9`, .3, .45); T.push(`<ellipse cx="${n2(x + .9)}" cy="${n2(y - h + 1.5)}" rx=".9" ry="2.6" fill="#6b5232" opacity=".55"/>`); }
    A(`M4 ${y + 1.6}q10 .8 20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0`, .22, .35); }
  if (a(/litière|sous-bois|fougères|troncs/)) { for (const x of xs(10)) { const r = Math.round(R() * 180); T.push(`<ellipse cx="${n2(x)}" cy="${n2(y - .3)}" rx="1.3" ry=".55" transform="rotate(${r} ${n2(x)} ${n2(y - .3)})" fill="#b99b62" opacity=".55"/>`); }
    const fx = R() < .5 ? 10 : 160, sg = fx < 85 ? 1 : -1, F = [`M${fx} ${y}Q${fx + sg * 4} ${y - 14} ${fx + sg * 12} ${y - 20}`]; for (let k = 1; k < 7; k++) { const t = k / 7, px = fx + sg * 12 * t * t + sg * 1.5, py = y - 20 * t; F.push(`M${n2(px)} ${n2(py)}l${n2(sg * 3.5)} ${n2(-1.2)}M${n2(px)} ${n2(py)}l${n2(-sg * 1.5)} ${n2(-2.8)}`); } A(F.join(''), .3, .5); }
  if (a(/feuilles géantes|lianes/)) { const fx = R() < .5 ? 14 : 156; T.push(`<path d="M${fx} ${y}C${fx - 10} ${y - 10} ${fx - 4} ${y - 22} ${fx} ${y - 26}C${fx + 4} ${y - 22} ${fx + 10} ${y - 10} ${fx} ${y}Z" fill="#9fb07a" opacity=".45" stroke="${ink}" stroke-width=".3"/><path d="M${fx} ${y}V${y - 25}" stroke="${ink}" stroke-width=".25" opacity=".5"/>`); }
  if (a(/buissons/)) for (const x of xs(2)) { const D = []; for (let k = 0; k < 6; k++) { const ang = -Math.PI / 2 + (k - 2.5) * .35, l = 5 + 4 * R(); D.push(`M${n2(x)} ${y}l${n2(Math.cos(ang) * l)} ${n2(Math.sin(ang) * l)}`); } A(D.join(''), .28, .45); }
  return T.join('');
}
const LONGUEURS = [.001, .002, .005, .01, .02, .05, .1, .2, .5, 1, 2, 5, 10, 20];
const longueurFR = m => m >= 1 ? `${m} m` : m >= .01 ? `${Math.round(m * 100)} cm` : `${Math.round(m * 1000)} mm`;
// (la fiche, quand on la donne : sa famille, son tégument, sa taille vue, ses variantes, son milieu, ses couleurs)
const VARIANTES_FR = { albinisme: 'albinos', melanisme: 'mélanique', 'robe-doree': 'robe dorée', camouflage: 'camouflage', palmes: 'pieds palmés', vibrisses: 'vibrisses',
  'peau-epaisse': 'peau épaisse', 'crocs-allonges': 'crocs allongés', 'yeux-nocturnes': 'yeux de nuit', 'membrane-planante': 'planeuse', 'queue-prehensile': 'queue préhensile',
  'pattes-longues': 'pattes longues', 'coloration-aposematique': "livrée d'avertissement" };
const pourcent = x => { const v = x * 100; return v < 1 ? 'moins de 1 %' : (v < 10 ? v.toFixed(1).replace('.', ',') : Math.round(v)) + ' %'; };
// la lumière de son milieu (la fiche : milieu.lumiere), en un lavis derrière la bête
const LUMIERES = [[/rasante|aube|crépuscule/, '#e8b45f', .32], [/bleutée|sous l'eau/, '#79aec2', .3], [/lune/, '#7f90b8', .3], [/pénombre/, '#8b8e76', .28],
  [/tamisée/, '#c3cba0', .24], [/franc et froid/, '#d9e5ec', .32], [/soleil franc/, '#f7e2a4', .3]];
function planche(corps, plan = {}, traits = [], o = {}) {
  const Fi = o.fiche || null; o = { famille: Fi?.famille?.id, details: (Fi?.famille?.details || []).map(d => d.id), taille: Fi?.silhouette?.taille_vue_m, ...o };
  const D = dessiner(corps, plan, traits, { ...o, grain: o.grain !== false }); if (!D) return null;
  const corpsSvg = D.svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, ''), P = D.parties, C = D.cadre;
  if (!C) return { svg: D.svg, renvois: [], echelle: null };
  // un point des parties (le cadre du dessin des jeux) dans le cadre de la planche
  const vers = p => { const [tx0, ty0, k0] = C.dessin; let x = (p[0] - tx0) / k0, y = (p[1] - ty0) / k0; const T = D.tete;
    if (T && Math.hypot(x - T.centre[0], y - T.centre[1]) < T.r * 2.6) { x = T.ancre[0] + (x - T.ancre[0]) * T.k; y = T.ancre[1] + (y - T.ancre[1]) * T.k; }
    return [C.tx + C.k * x, C.ty + C.k * y]; };
  const B = P?.boite ? [vers([P.boite[0], P.boite[1]]), vers([P.boite[2], P.boite[3]])] : [[7, 5], [163, 86]];
  const ink = '#2b231b', centre = P?.corps?.centre ? vers(P.corps.centre) : [85, 50];
  // les renvois : ses organes, ce que portent la plupart de ses bêtes, son motif
  const R = [], vu = new Set();
  for (const x of P?.organes || []) { if (vu.has(x.type)) continue; vu.add(x.type); const org = (racine.OrvaneCorps?.normaliser(corps).organes || []).find(q => q.type === x.type && (!x.place || q.place === x.place)) || { type: x.type, place: x.place };
    R.push({ p: vers(x.attache || P.corps?.centre || [85, 45]), texte: nomOrgane(org) }); }
  const pied = (P?.pattes || []).filter(q => q.cote === 'pres').map(q => q.points[q.points.length - 1])[0], museau = P?.tete?.museau, oeil = D.yeux?.[0];
  const dessin = P?.dessin, fam = D.famille, pieds = (P?.pattes || []).some(q => ['coussinet', 'griffes', 'doigts', 'serres', 'sabot'].includes(q.pied));
  const MONTRE = { vibrisses: fam === 'pelage', palmes: pieds, 'membrane-planante': dessin === 'quadrupede' && (P?.pattes || []).length >= 4, camouflage: !!P?.corps,
    'crocs-allonges': ['quadrupede', 'bipede', 'bipede-tendu'].includes(dessin) && plan?.regime === 'carnivore', 'queue-prehensile': !!P?.queue, 'pattes-longues': pieds, 'yeux-nocturnes': !!D.yeux?.length,
    'peau-epaisse': !!P?.corps, 'coloration-aposematique': !!P?.corps };
  for (const t of traits) { const texte = TRAITS_FR[t]; if (!texte || MONTRE[t] === false) continue;
    const p = t === 'palmes' && pied ? pied : (t === 'vibrisses' || t === 'crocs-allonges') && museau ? museau : t === 'yeux-nocturnes' && oeil ? oeil : t === 'queue-prehensile' && P?.queue ? (P.queue.courbe || P.queue.points)?.slice(-1)[0] : t === 'pattes-longues' && pied ? (P.pattes.find(q => q.cote === 'pres').points[1]) : P?.corps?.centre;
    if (p) R.push({ p: vers(p), texte }); }
  const motif = racine.OrvaneCorps?.normaliser(corps).motif; if (MOTIFS_FR[motif] && !traits.includes('albinisme')) R.push({ p: motif === 'masque' && oeil ? vers(oeil) : vers(P?.corps?.centre || [85, 45]), texte: MOTIFS_FR[motif] });
  const renvois = R.slice(0, 7).sort((a, b) => a.p[0] - b.p[0]).map((x, i) => ({ ...x, n: i + 1 }));
  // chaque renvoi : un point sur la bête, un trait vers son numéro, posé hors du corps (vers le haut ou le bas, loin du centre)
  const marques = renvois.map(({ p, n }) => { const haut = p[1] < centre[1] + 4, dy = haut ? -1 : 1, mx = cl(p[0] + (p[0] - centre[0]) * .06, 6, 164), my = cl(haut ? Math.min(p[1] - 8, B[0][1] - 2) : Math.max(p[1] + 8, B[1][1] + 4), 5, 93);
    return `<circle cx="${n2(p[0])}" cy="${n2(p[1])}" r=".7" fill="${ink}"/><path d="M${P2(p[0], p[1])}L${P2(mx, my - dy * 2.6)}" stroke="${ink}" stroke-width=".22" stroke-dasharray=".9 .6"/>`
      + `<circle class="renvoi" cx="${n2(mx)}" cy="${n2(my)}" r="2.55" fill="#f8f3e7" stroke="${ink}" stroke-width=".28"/><text class="renvoi-n" x="${n2(mx)}" y="${n2(my)}" dy=".36em" text-anchor="middle" font-size="3.3" font-style="italic" font-family="Georgia, serif" fill="${ink}">${n}</text>`; }).join('');
  // l'échelle : la longueur vue de la bête, rapportée à son dessin ; une barre de deux à quatre pas
  let echelle = null, barre = ''; const taille = o.taille || plan?.taille_m, lw = B[1][0] - B[0][0];
  if (taille > 0 && lw > 1) { const parM = lw / taille, m = LONGUEURS.reduce((best, v) => { const u = v * parM; return u >= 14 && u <= 44 && (!best || Math.abs(u - 26) < Math.abs(best * parM - 26)) ? v : best; }, null) || LONGUEURS.find(v => v * parM >= 8) || LONGUEURS[LONGUEURS.length - 1];
    const u = m * parM, pas = u > 30 ? 4 : u > 18 ? 2 : 1, y = 97.5, x0 = 8; echelle = { m, texte: longueurFR(m) };
    for (let i = 0; i < pas; i++) barre += `<rect x="${n2(x0 + u * i / pas)}" y="${y}" width="${n2(u / pas)}" height="1.1" fill="${i % 2 ? '#f8f3e7' : ink}" stroke="${ink}" stroke-width=".2"/>`;
    barre += `<text class="echelle-t" x="${n2(x0 + u + 2.4)}" y="${y + .55}" dy=".36em" font-size="3.1" font-family="Georgia, serif" font-style="italic" fill="${ink}">${echelle.texte}</text>`; }
  // le lavis de la lumière, le sol de son milieu (derrière la bête)
  const decor = (Fi?.milieu?.decor?.fr || []).join(', ').toLowerCase(), lumiere = (Fi?.milieu?.lumiere?.fr || []).join(', ').toLowerCase(), RR = hasard(String(o.graine || '') + decor);
  const L0 = LUMIERES.find(([re]) => re.test(lumiere)), lavis = L0 ? `<defs><radialGradient id="pl${++NUM}l"><stop offset="0" stop-color="${L0[1]}" stop-opacity="${L0[2]}"/><stop offset="1" stop-color="${L0[1]}" stop-opacity="0"/></radialGradient></defs><ellipse cx="${n2(centre[0])}" cy="${n2(centre[1])}" rx="92" ry="58" fill="url(#pl${NUM}l)"/>` : '';
  const sol = decor ? solDuMilieu(decor, D.sol, RR, ink) : '';
  // les variantes : les traits que montre une partie des bêtes (la fiche : variations), et qui se voient ; trois au plus, d'au moins 1 %
  const piedsV = (P?.pattes || []).length > 0, VOIT = { vibrisses: D.famille === 'pelage', palmes: piedsV, 'membrane-planante': dessin === 'quadrupede', 'crocs-allonges': ['quadrupede', 'bipede', 'bipede-tendu'].includes(dessin) && plan?.regime === 'carnivore', 'queue-prehensile': !!P?.queue, 'pattes-longues': piedsV };
  const variantes = (Fi?.variations || []).filter(v => VARIANTES_FR[v.trait] && VOIT[v.trait] !== false && v.part >= .01 && !traits.includes(v.trait)).sort((a, b) => b.part - a.part).slice(0, 3)
    .map(v => { const cam = v.trait === 'camouflage' ? /#[0-9a-f]{6}/i.exec(v.en || '')?.[0] : null, V = dessiner(corps, plan, [...traits, v.trait], { ...o, grain: false, ...(cam ? { camouflage: cam } : {}) });
      return { trait: v.trait, part: v.part, texte: `${VARIANTES_FR[v.trait]} · ${pourcent(v.part)}`, svg: V?.svg || '' }; });
  // les notes de couleur : celles du dessin (la robe que montrent ses bêtes), et leur nom
  const c0 = racine.OrvaneCorps?.normaliser ? racine.OrvaneCorps.normaliser(corps) : null, rb = c0 ? robeDesTraits(c0.couleurs, traits) : null, nomC = racine.OrvaneFiche?.nomCouleur;
  const hexDe = c => '#' + c.map(v => Math.round(cl(v, 0, 255)).toString(16).padStart(2, '0')).join('').toUpperCase();
  const couleurs = rb && plan?.regime !== 'synthetique' ? [['robe', 'robe'], ['sombre', 'sombre'], ['ventre', 'ventre'], ['oeil', 'œil']].map(([k, nom]) => ({ role: nom, hex: hexDe(rb[k]), fr: nomC ? nomC(rb[k]).fr : Fi?.couleurs?.[k]?.fr || '' })) : [];
  const svg = `<svg viewBox="0 0 170 102" class="planche" role="img">${lavis}${sol}${corpsSvg}${marques}${barre}</svg>`;
  return { svg, renvois: renvois.map(({ n, texte }) => ({ n, texte })), echelle, variantes, couleurs, famille: D.famille, pupille: D.pupille };
}
// un membre : un segment arrondi, de l'épaisseur wa à wb ; bombe : le muscle, en avant (une cuisse, un bras)
function capsule(a, b, wa, wb, bombe = 0) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1e-6, ux = dx / L, uy = dy / L, nx = -uy, ny = ux, ra = wa / 2, rb = wb / 2, kc = 1.333;
  const a1 = [a[0] + nx * ra, a[1] + ny * ra], a2 = [a[0] - nx * ra, a[1] - ny * ra], b1 = [b[0] + nx * rb, b[1] + ny * rb], b2 = [b[0] - nx * rb, b[1] - ny * rb];
  const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], q1 = [m[0] + nx * (ra + rb) / 2 * (1 + bombe), m[1] + ny * (ra + rb) / 2 * (1 + bombe)], q2 = [m[0] - nx * (ra + rb) / 2 * (1 + bombe * .4), m[1] - ny * (ra + rb) / 2 * (1 + bombe * .4)];
  const d = `M${P2(...a1)}Q${P2(...q1)} ${P2(...b1)}C${P2(b1[0] + ux * rb * kc, b1[1] + uy * rb * kc)} ${P2(b2[0] + ux * rb * kc, b2[1] + uy * rb * kc)} ${P2(...b2)}`
    + `Q${P2(...q2)} ${P2(...a2)}C${P2(a2[0] - ux * ra * kc, a2[1] - uy * ra * kc)} ${P2(a1[0] - ux * ra * kc, a1[1] - uy * ra * kc)} ${P2(...a1)}Z`;
  const r = Math.max(ra, rb) * (1 + bombe); return { d, b: [Math.min(a[0], b[0]) - r, Math.min(a[1], b[1]) - r, Math.max(a[0], b[0]) + r, Math.max(a[1], b[1]) + r] };
}

const API = { dessiner, planche, robeDesTraits, familleDe, nomOrgane };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvaneAtlas = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
