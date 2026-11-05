// Orvane — LES INDIVIDUS (tampon/individus.js) — docs/35
// Le moteur fait vivre des populations. Un jeu, lui, montre des bêtes : celle-ci, sa mère, ses petits. Ce fichier tire de la
// population réelle des individus complets, et les croise.
//  - tirer(inst, taxon, biome, opt)   : une bête de cette population. Son génotype (deux copies par locus, aux fréquences
//                                       d'allèles de la population : un récessif peut s'y cacher), ses valeurs génétique (a) et
//                                       propre (z) pour chaque trait continu, ses savoirs, son sexe, un nom. opt.montre : ce que
//                                       le jeu montre déjà d'elle (ses traits) ; opt.z : ses valeurs déjà tirées. Le génotype
//                                       se tire alors sachant cela : une bête qui ne montre pas l'albinisme peut le porter.
//  - croiser(mere, pere, inst, opt)   : le petit de deux bêtes. Un allèle de chaque parent à chaque locus (Mendel) ; pour les
//                                       traits continus, la moyenne des parents plus l'aléa de Mendel (le modèle infinitésimal,
//                                       réduit par leur consanguinité). Deux lignées proches donnent un hybride, moins souvent.
//  - parente(x, y), pedigree(ind, n), montre(ind, cat), caches(ind, cat), genome(inds), echantillon(inst, taxon, biome, n)
// Un individu est un objet JSON simple, que le jeu sauvegarde tel quel. Node (require) ou navigateur (globalThis.OrvaneIndividus).
// Zéro dépendance. Le hasard : opt.r (Math.random par défaut).
(function (racine) {
'use strict';
const REGLES = {
  profondeur: 6,          // les générations d'ascendance gardées (de quoi calculer la consanguinité ; au-delà, des fondateurs)
  depression: .6,         // la vigueur perdue à consanguinité 1 : un petit de frère et sœur (0,25) a 85 % de vigueur
  apprendre_mere: .9,     // un petit sait ce que sait sa mère, neuf fois sur dix (docs/34)
  hybride: { distance: 2, fertilite: [1, .5, .25], sterile: .5 }   // deux lignées à 1 ou 2 séparations : un petit, une fois sur 2 ou 4 ; un hybride, moitié moins fertile
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const r3 = v => Math.round(v * 1000) / 1000, r4 = v => Math.round(v * 1e4) / 1e4;
const gauss = r => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
const dom = (cat, id) => cat?.[id]?.heredite !== 'recessif';
const taxonDe = (inst, id) => inst?.taxons?.find(t => t.id === id) || null;
const ident = r => { let s = ''; for (let i = 0; i < 8; i++) s += '0123456789abcdefghijklmnopqrstuvwxyz'[Math.floor(r() * 36)]; return s; };

// ce qui se voit d'un jeu de traits portés (tampon.exprimer, docs/9) : dans l'ordre du catalogue, un trait reste si ce qu'il
// exige est là et si rien de gardé ne l'exclut
function exprimer(porte, cat) {
  const ordre = Object.keys(cat || {}), rang = id => { const i = ordre.indexOf(id); return i < 0 ? 999 : i; }, garde = [];
  for (const id of [...porte].sort((a, b) => rang(a) - rang(b) || (a < b ? -1 : 1))) { const t = cat?.[id] || {};
    if ((t.exige || []).some(x => !garde.includes(x))) continue;
    if ((t.exclut || []).some(x => garde.includes(x)) || garde.some(x => (cat?.[x]?.exclut || []).includes(id))) continue;
    garde.push(id); }
  return garde.sort();
}
// ce que montre une bête, et ce qu'elle porte sans le montrer (un récessif à une copie, un trait masqué par un autre)
const portes = (ind, cat) => Object.entries(ind.alleles || {}).filter(([id, c]) => c >= (dom(cat, id) ? 1 : 2)).map(([id]) => id);
const montre = (ind, cat) => exprimer(portes(ind, cat), cat);
const caches = (ind, cat) => { const m = new Set(montre(ind, cat)); return Object.keys(ind.alleles || {}).filter(id => !m.has(id)); };

// les fréquences d'allèles d'une population ; un monde sans reproduction sexuée : Hardy-Weinberg à rebours, des phénotypes
function allelesDe(t, pop, cat) {
  if (pop?.alleles) return pop.alleles;
  const e = {}; for (const ph of t.phenotypes || []) { const f = ph.frequence_par_biome?.[pop?.biome] ?? ph.frequence ?? 0; for (const id of ph.traits || []) e[id] = (e[id] || 0) + f; }
  const A = {}; for (const [id, x0] of Object.entries(e)) { const x = clamp(x0, 0, .999999); A[id] = dom(cat, id) ? 1 - Math.sqrt(1 - x) : Math.sqrt(x); }
  return A;
}
// la loi des traits continus d'une lignée : sa population ici, sinon toutes, pondérées par leur effectif ({ m, v, g })
function quantDe(t, bid) {
  let pops = (t?.populations || []).filter(p => p.quant && (!bid || p.biome === bid)); if (!pops.length) pops = (t?.populations || []).filter(p => p.quant); if (!pops.length) return {};
  const W = pops.reduce((a, p) => a + Math.max(1, p.effectif), 0), o = {};
  for (const k of Object.keys(pops[0].quant)) { let m = 0, m2 = 0, g = 0;
    for (const p of pops) { const x = p.quant[k] || { m: 0, v: 1, g: .4 }, w = Math.max(1, p.effectif) / W; m += w * x.m; m2 += w * (x.v + x.m * x.m); g += w * (x.g ?? .4 * x.v); }
    const v = Math.max(1e-4, m2 - m * m); o[k] = { m, v, g: clamp(g, 0, v) }; }
  return o;
}
// un nom tiré de celui de la lignée : une de ses syllabes, une autre, parfois une finale
const SYLL = ['ra', 'ka', 'li', 'no', 'mi', 'sa', 'to', 've', 'lu', 'ne', 'da', 'ri', 'so', 'ma', 'ti', 'be'], FIN = ['n', 'l', 'r', 's'];
function nommer(nomLignee, r) {
  const s = String(nomLignee || '').split(/[\s'’-]/)[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[^aeiouy]?[aeiouy]{1,2}/g) || ['or'];
  const a = s[Math.floor(r() * s.length)], b = SYLL[Math.floor(r() * SYLL.length)], n = (r() < .5 ? a + b : b + a) + (r() < .3 ? FIN[Math.floor(r() * 4)] : '');
  return n.charAt(0).toUpperCase() + n.slice(1);
}

// === une bête de la population réelle ===
// Sans opt.montre : deux copies tirées à la fréquence p de chaque allèle (Hardy-Weinberg). Avec : sachant ce qu'elle montre. Un
// dominant montré : une ou deux copies ; un récessif montré : deux ; un dominant absent : aucune ; un récessif absent : une copie
// (porteuse cachée) avec la chance 2p/(1+p). Un trait masqué par un autre (exclu, ou sans ce qu'il exige) se tire sans condition.
// Un trait montré que la population n'a pas (le jeu l'a tiré à ses propres taux) : la bête le porte.
function tirer(inst, tid, bid, opt = {}) {
  const r = opt.r || Math.random, t = taxonDe(inst, tid); if (!t) return null;
  const cat = inst.catalogue?.traits || {}, pop = (bid && t.populations.find(p => p.biome === bid)) || [...t.populations].sort((a, b) => b.effectif - a.effectif)[0] || null;
  const A = allelesDe(t, pop, cat), M = opt.montre ? new Set(opt.montre) : null, alleles = {};
  const masque = id => { const c = cat[id] || {}; return (c.exige || []).some(x => !M.has(x)) || [...M].some(x => (c.exclut || []).includes(x) || (cat[x]?.exclut || []).includes(id)); };
  for (const [id, p0] of Object.entries(A)) { const p = clamp(p0, 0, 1); let c;
    if (!M || (!M.has(id) && masque(id))) c = (r() < p ? 1 : 0) + (r() < p ? 1 : 0);
    else if (M.has(id)) c = dom(cat, id) ? (r() < p * p / Math.max(1e-12, p * p + 2 * p * (1 - p)) ? 2 : 1) : 2;
    else c = dom(cat, id) ? 0 : r() < 2 * p / (1 + p) ? 1 : 0;
    if (c) alleles[id] = c; }
  if (M) for (const id of M) if (!alleles[id] && cat[id]) alleles[id] = dom(cat, id) ? 1 : 2;
  // les traits continus : a dans N(m, g), z = a + e, e dans N(0, v − g) ; sa valeur z déjà tirée par le jeu : a sachant z
  const Q = quantDe(t, pop?.biome), a = {}, z = {};
  for (const [k, x] of Object.entries(Q)) { const h2 = x.v > 0 ? x.g / x.v : 0, zj = opt.z?.[k];
    if (Number.isFinite(zj)) { z[k] = r3(zj); a[k] = r3(x.m + h2 * (zj - x.m) + Math.sqrt(Math.max(0, x.g * (1 - h2))) * gauss(r)); }
    else { const ak = x.m + Math.sqrt(x.g) * gauss(r); a[k] = r3(ak); z[k] = r3(ak + Math.sqrt(Math.max(0, x.v - x.g)) * gauss(r)); } }
  const sav = opt.savoirs || Object.entries(pop?.savoirs || {}).filter(([, f]) => r() < f).map(([k]) => k);
  return { id: opt.id || ident(r), nom: opt.nom || nommer(t.nom, r), sexe: opt.sexe || (r() < .5 ? 'f' : 'm'), taxon: t.id, biome: pop?.biome || bid || null,
    ne: inst.cycle?.n ?? null, gen: 0, parents: null, F: 0, vigueur: 1, alleles, a, z, ...(sav.length ? { savoirs: sav } : {}), ascendance: {} };
}
const echantillon = (inst, tid, bid, n, opt = {}) => Array.from({ length: n }, () => tirer(inst, tid, bid, opt)).filter(Boolean);

// === la parenté ===
// Le coefficient de parenté f(x, y) : la chance que deux allèles pris au hasard, un chez chacun, viennent d'un même ancêtre.
// f(x, x) = (1 + F_x) / 2 ; sinon, on remonte par le plus jeune des deux (un ancêtre est toujours d'une génération plus
// ancienne). Un fondateur (une bête sauvage, ou au-delà de la profondeur gardée) n'est parent d'aucun autre.
function parente(x, y) {
  const A = { ...(x.ascendance || {}), ...(y.ascendance || {}) };
  A[x.id] = [x.parents?.[0] ?? null, x.parents?.[1] ?? null, x.gen || 0]; A[y.id] = [y.parents?.[0] ?? null, y.parents?.[1] ?? null, y.gen || 0];
  const memo = new Map();
  const f = (i, j) => {
    if (!i || !j) return 0;
    const k = i < j ? i + '|' + j : j + '|' + i; if (memo.has(k)) return memo.get(k);
    let v;
    if (i === j) v = (1 + (A[i] ? f(A[i][0], A[i][1]) : 0)) / 2;
    else { const gi = A[i]?.[2] ?? -1, gj = A[j]?.[2] ?? -1, [u, w] = gi >= gj ? [i, j] : [j, i], P = A[u];
      v = P && (P[0] || P[1]) ? (f(P[0], w) + f(P[1], w)) / 2 : 0; }
    memo.set(k, v); return v;
  };
  return f(x.id, y.id);
}
// l'ascendance d'un petit : ses parents et leurs ancêtres, jusqu'à REGLES.profondeur générations
function ascendanceDe(mere, pere) {
  const A = { ...(mere.ascendance || {}), ...(pere.ascendance || {}) }, o = {};
  A[mere.id] = [mere.parents?.[0] ?? null, mere.parents?.[1] ?? null, mere.gen || 0, mere.nom]; A[pere.id] = [pere.parents?.[0] ?? null, pere.parents?.[1] ?? null, pere.gen || 0, pere.nom];
  let front = [mere.id, pere.id];
  for (let d = 1; d <= REGLES.profondeur && front.length; d++) { const suiv = [];
    for (const id of front) if (A[id] && !o[id]) { o[id] = A[id]; if (d < REGLES.profondeur) suiv.push(...A[id].slice(0, 2).filter(Boolean)); }
    front = suiv; }
  return o;
}
// l'arbre d'une bête, sur n générations : { id, nom, mere, pere }
function pedigree(ind, n = 3) {
  const A = ind.ascendance || {};
  const noeud = (id, d) => { if (!id) return null; const P = A[id]; return { id, nom: P?.[3] ?? null, ...(d < n && P ? { mere: noeud(P[0], d + 1), pere: noeud(P[1], d + 1) } : {}) }; };
  return { id: ind.id, nom: ind.nom, mere: n > 0 ? noeud(ind.parents?.[0], 1) : null, pere: n > 0 ? noeud(ind.parents?.[1], 1) : null };
}
// la distance entre deux lignées : les séparations qui les relient par leur ancêtre commun (0 : la même ; Infinity : aucun connu)
function chaine(inst, id) {
  const I = new Map((inst?.taxons || []).map(t => [t.id, t])), L = [], vus = new Set();
  while (id && !vus.has(id)) { vus.add(id); L.push(id); id = I.get(id)?.parent ?? (id.includes('.') ? id.slice(0, id.lastIndexOf('.')) : null); }
  return L;
}
function distanceLignees(inst, ta, tb) {
  if (ta === tb) return 0; const A = chaine(inst, ta), B = chaine(inst, tb);
  for (let i = 0; i < A.length; i++) { const j = B.indexOf(A[i]); if (j >= 0) return i + j; }
  return Infinity;
}

// === le petit de deux bêtes ===
// → { ok: true, petit } ou { ok: false, raison } : 'meme-sexe', 'sterile' (une ouvrière, un soldat), 'ne-se-croise-pas' (une
// machine, une plante), 'trop-eloignees' (plus de REGLES.hybride.distance séparations), 'pas-de-petit' (deux lignées proches,
// ou un hybride : ça n'a pas pris cette fois)
function croiser(m0, p0, inst, opt = {}) {
  const r = opt.r || Math.random, cat = inst?.catalogue?.traits || {}, H = REGLES.hybride;
  if (!m0 || !p0) return { ok: false, raison: 'absent' };
  let [mere, pere] = m0.sexe === 'm' && p0.sexe === 'f' ? [p0, m0] : [m0, p0];
  if (mere.sexe && pere.sexe && mere.sexe === pere.sexe) return { ok: false, raison: 'meme-sexe' };
  if (['ouvriere', 'soldat'].includes(mere.caste) || ['ouvriere', 'soldat'].includes(pere.caste)) return { ok: false, raison: 'sterile' };
  const t = taxonDe(inst, mere.taxon); if (['synthetique', 'vegetal'].includes(t?.plan?.regime)) return { ok: false, raison: 'ne-se-croise-pas' };
  const d = distanceLignees(inst, mere.taxon, pere.taxon); if (!(d <= H.distance)) return { ok: false, raison: 'trop-eloignees' };
  const chance = (H.fertilite[d] ?? 0) * (mere.hybride ? H.sterile : 1) * (pere.hybride ? H.sterile : 1);
  if (chance < 1 && !(r() < chance)) return { ok: false, raison: 'pas-de-petit' };
  // Mendel : un allèle de chaque parent, à chaque locus
  const alleles = {}, gamete = c => c >= 2 ? 1 : c === 1 ? (r() < .5 ? 1 : 0) : 0;
  for (const id of new Set([...Object.keys(mere.alleles || {}), ...Object.keys(pere.alleles || {})])) { const c = gamete(mere.alleles?.[id] || 0) + gamete(pere.alleles?.[id] || 0); if (c) alleles[id] = c; }
  // les traits continus : la moyenne des parents, plus l'aléa de Mendel (g/2, moins ce que la consanguinité des parents a déjà fixé)
  const Q = quantDe(t, null), a = {}, z = {}, Fp = ((mere.F || 0) + (pere.F || 0)) / 2;
  for (const k of new Set([...Object.keys(Q), ...Object.keys(mere.a || {}), ...Object.keys(pere.a || {})])) { const x = Q[k] || { m: 0, v: 1, g: .4 };
    const am = mere.a?.[k] ?? pere.a?.[k] ?? x.m, ap = pere.a?.[k] ?? am, ak = (am + ap) / 2 + Math.sqrt(Math.max(0, x.g / 2 * (1 - Fp))) * gauss(r);
    a[k] = r3(ak); z[k] = r3(ak + Math.sqrt(Math.max(0, x.v - x.g)) * gauss(r)); }
  const F = r4(parente(mere, pere)), sav = (mere.savoirs || []).filter(() => r() < REGLES.apprendre_mere);
  const petit = { id: opt.id || ident(r), nom: opt.nom || nommer(t?.nom || mere.nom, r), sexe: opt.sexe || (r() < .5 ? 'f' : 'm'), taxon: mere.taxon, biome: opt.biome ?? mere.biome ?? null,
    ne: inst?.cycle?.n ?? null, gen: Math.max(mere.gen || 0, pere.gen || 0) + 1, parents: [mere.id, pere.id], F, vigueur: r4(1 - REGLES.depression * F), alleles, a, z,
    ...(sav.length ? { savoirs: sav } : {}), ...(d > 0 || mere.hybride || pere.hybride ? { hybride: d > 0 ? pere.taxon : mere.hybride || pere.hybride } : {}), ascendance: ascendanceDe(mere, pere) };
  return { ok: true, petit };
}

// ce qu'un jeu joint à un événement « liberation » (docs/4) quand il relâche des bêtes dont il connaît le génotype : la
// fréquence de chaque allèle parmi elles, et leur valeur génétique moyenne (docs/36 : l'élevage remonte au monde)
function genome(inds) {
  const L = (Array.isArray(inds) ? inds : [inds]).filter(Boolean); if (!L.length) return null;
  const al = {}, a = {}, na = {};
  for (const x of L) { for (const [id, c] of Object.entries(x.alleles || {})) al[id] = (al[id] || 0) + c; for (const [k, v] of Object.entries(x.a || {})) if (Number.isFinite(v)) { a[k] = (a[k] || 0) + v; na[k] = (na[k] || 0) + 1; } }
  for (const id in al) al[id] = r3(al[id] / (2 * L.length)); for (const k in a) a[k] = r3(a[k] / na[k]);
  return { n: L.length, alleles: al, a };
}

const API = { REGLES, tirer, echantillon, croiser, parente, pedigree, montre, caches, exprimer, genome, distanceLignees, nommer, quantDe, allelesDe };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvaneIndividus = API;
})(globalThis);
