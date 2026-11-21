// Orvane — LE BILAN DE SAISON (tampon/bilan.js) — docs/4
// Ce que chaque jeu a ôté et rendu à chaque population, saison par saison, et la part de l'effectif que cela représente. Le tampon le
// dit à chaque cycle (Tampon.agreger(…, { bilan: true }) : par jeu, lignée et biome, ce que ses lots demandaient et ce qu'il en reste
// après chaque plafond) ; ce fichier le cumule sur la saison, puis en fait le bilan publié (schemas/bilan.schema.json) :
//  - saison(n, annee) : la saison du bilan d'un cycle. Un monde qui a une année (monde.annee) : ses saisons, telles que le moteur les
//    nomme (le monde d'Orvane : quatre saisons de 30 cycles ; l'hiver ouvre l'année, il commence 15 cycles avant elle) ; un monde
//    sans année : des tranches de 30 cycles, comptées depuis le cycle 0 ;
//  - noter(cumul, cycle) : un cycle de plus dans le cumul ; la saison qui s'achève en sort, finie, et ne change plus. Un monde né à
//    nouveau (un autre monde.ne) repart d'un cumul neuf ;
//  - publier(cumul, en_cours) : le bilan publié, en bêtes (celles que le moteur retire ou ajoute : un adulte en compte 1,2, un
//    nourrissage 0,2). Aucun compte, aucun pseudonyme : seulement chaque jeu, son id et son nom public (jeux.json) ;
//  - indexer(finis, en_cours) : l'index des bilans d'un monde (bilans/index.json), le plus récent d'abord.
// L'effectif de référence : celui de la population (la lignée dans le biome, toutes ses parcelles) au début de chaque cycle, celui sur
// lequel les plafonds se comptent ; sa moyenne sur les cycles de la saison où le jeu l'a touchée. La part maximale en un cycle se
// compare donc directement au plafond d'un jeu (5 % dans le monde d'Orvane).
// Rien de ce qui est ici ne touche au monde. Déterministe. Node (require) ou navigateur (globalThis.OrvaneBilan).
(function (racine) {
'use strict';
const Tampon = typeof require === 'function' ? require('./tampon.js') : racine.OrvaneTampon;
const ETAPES = Tampon.ETAPES_BILAN, N = ETAPES.length;    // demandé, puis après chaque plafond ; le dernier : appliqué
const RABOTS = ETAPES.slice(1);                             // ce que chaque plafond a ôté à la demande
const TRANCHE = 30;                                         // un monde sans année : des saisons de 30 cycles
const SAISONS = ['hiver', 'printemps', 'été', 'automne'], SLUG = ['hiver', 'printemps', 'ete', 'automne'];
const INTERDITS = new Set(['__proto__', 'constructor', 'prototype']);
const sur = k => typeof k === 'string' && !INTERDITS.has(k);
const fini = x => typeof x === 'number' && Number.isFinite(x);
const r3 = x => +(+x).toFixed(3), r6 = x => +(+x).toFixed(6);

// --- la saison d'un cycle ---
// (le moteur, moteur/orvane.js saisonDe : la phase (n mod année) / année ; l'hiver est centré sur la phase 0, le printemps sur ¼…)
function cle(n, annee) {
  if (!(annee > 0)) return { k: Math.floor(n / TRANCHE), an: null, i: null };
  const phase = (n % annee) / annee, i = Math.floor(((phase + .125) % 1) * 4), an = Math.floor(n / annee) + (i === 0 && phase >= .5 ? 1 : 0);
  return { k: an * 4 + i, an, i };
}
function saison(n, annee) {
  const c = cle(n, annee); let de = n, a = n;
  if (!(annee > 0)) { de = c.k * TRANCHE; a = de + TRANCHE - 1; }
  else { while (de > n - annee && cle(de - 1, annee).k === c.k) de--; while (a < n + annee && cle(a + 1, annee).k === c.k) a++; }
  return c.an == null ? { id: `tranche-${c.k}`, an: null, nom: null, de, a }
    : { id: `an-${c.an}-${SLUG[c.i]}`, an: c.an, nom: SAISONS[c.i], de, a };
}

// --- un cycle de plus ---
// cycle : { orvane (la version du contrat), monde: { id, ne }, n (le cycle que le moteur vient de faire), date, annee, bilan (celui du
//   tampon), jeux (jeux.json : id, nom), noms (lignée → nom), plafonds, memoire_cycles }. Rend { cumul, finies } : finies, les cumuls
//   des saisons qui s'achèvent (zéro ou un).
function neuf(c, S) {
  return { orvane: c.orvane ?? null, monde: { id: c.monde?.id ?? null, ne: c.monde?.ne ?? null }, saison: S,
    compte: { de: c.n, a: c.n, cycles: 0, date_de: c.date ?? null, date_a: c.date ?? null }, plafonds: null, memoire_cycles: null, jeux: {}, noms: {} };
}
function noter(cumul, c) {
  const S = saison(c.n, c.annee), finies = [];
  let C = cumul && typeof cumul === 'object' && cumul.monde?.id === (c.monde?.id ?? null) && cumul.monde?.ne === (c.monde?.ne ?? null) && fini(cumul.compte?.a) ? cumul : null;
  if (C && !(c.n > C.compte.a)) C = null;                                  // (un cumul d'un état plus avancé que celui-ci : il ne vaut plus)
  if (C && C.saison?.id !== S.id) { finies.push(C); C = null; }           // la saison s'achève : elle sort, finie
  if (!C) C = neuf(c, S);
  C.compte.a = c.n; C.compte.date_a = c.date ?? null; C.compte.cycles++; if (c.orvane) C.orvane = c.orvane;
  if (c.plafonds && typeof c.plafonds === 'object') C.plafonds = { ...c.plafonds };
  if (c.memoire_cycles != null) C.memoire_cycles = c.memoire_cycles;
  for (const j of Object.keys(c.bilan || {})) { const B = c.bilan[j]; if (!sur(j) || !B || typeof B !== 'object') continue;
    const J = Object.prototype.hasOwnProperty.call(C.jeux, j) ? C.jeux[j] : (C.jeux[j] = { nom: null, plafond: null, lots: 0, evenements: 0, cycles: 0, taxons: {} });
    J.lots += B.lots || 0; J.evenements += B.evenements || 0; if (B.lots > 0) J.cycles++; J.plafond = fini(B.plafond) ? B.plafond : null;
    for (const tid of Object.keys(B.taxons || {})) { if (!sur(tid)) continue;
      for (const bid of Object.keys(B.taxons[tid] || {})) { const x = B.taxons[tid][bid]; if (!sur(bid) || !x || !Array.isArray(x.ote) || !Array.isArray(x.rendu)) continue;
        const T = J.taxons[tid] ??= {}, P = T[bid] ??= { o: new Array(N).fill(0), r: new Array(N).fill(0), e: 0, n: 0, m: 0, mc: null };
        for (let i = 0; i < N; i++) { P.o[i] += fini(x.ote[i]) ? x.ote[i] : 0; P.r[i] += fini(x.rendu[i]) ? x.rendu[i] : 0; }
        const e = fini(x.eff) ? x.eff : 0, part = e > 0 ? x.ote[N - 1] / e : 0; P.e += e; P.n++;
        if (part > P.m) { P.m = part; P.mc = c.n; }                       // la part maximale ôtée en un cycle, et ce cycle
        if (typeof c.noms?.[tid] === 'string') C.noms[tid] = c.noms[tid]; } } }
  // le nom public de chaque jeu (jeux.json) : gardé toute la saison, même pour un jeu suspendu depuis (il n'y est plus)
  for (const g of Array.isArray(c.jeux) ? c.jeux : []) if (g && sur(g.id) && Object.prototype.hasOwnProperty.call(C.jeux, g.id) && typeof g.nom === 'string') C.jeux[g.id].nom = g.nom;
  return { cumul: C, finies };
}

// --- le bilan publié ---
function rabote(v) { const R = {}; for (let i = 1; i < N; i++) { const d = v[i - 1] - v[i]; if (d >= 5e-4) R[RABOTS[i - 1]] = r3(d); } return R; }
function cote(v, e, avecMax, P) {
  const o = { demande: r3(v[0]), applique: r3(v[N - 1]), rabote: rabote(v), part: e > 0 ? r6(v[N - 1] / e) : null };
  if (avecMax) { o.part_max_cycle = r6(P.m); o.cycle_max = P.mc ?? null; }
  return o;
}
function publier(C, en_cours = false) {
  if (!C) return null;
  const jeux = Object.keys(C.jeux).sort((a, b) => (a === '') - (b === '') || (a < b ? -1 : a > b ? 1 : 0)).map(j => { const J = C.jeux[j], L = [];
    for (const tid of Object.keys(J.taxons).sort()) for (const bid of Object.keys(J.taxons[tid]).sort()) { const P = J.taxons[tid][bid], e = P.n > 0 ? P.e / P.n : 0;
      L.push({ taxon: tid, nom: C.noms?.[tid] ?? null, biome: bid, cycles: P.n, effectif_moyen: +e.toFixed(1), ote: cote(P.o, e, true, P), rendu: cote(P.r, e, false) }); }
    // (trié par la part de l'effectif ôtée, puis rendue : ce qui pèse le plus d'abord)
    L.sort((x, y) => (y.ote.part ?? 0) - (x.ote.part ?? 0) || (y.rendu.part ?? 0) - (x.rendu.part ?? 0) || y.ote.applique - x.ote.applique || (x.taxon < y.taxon ? -1 : x.taxon > y.taxon ? 1 : x.biome < y.biome ? -1 : 1));
    const tot = k => { const v = new Array(N).fill(0); for (const tid in J.taxons) for (const bid in J.taxons[tid]) for (let i = 0; i < N; i++) v[i] += J.taxons[tid][bid][k][i]; return v; };
    const O = tot('o'), R = tot('r'), mx = L.reduce((m, x) => x.ote.part_max_cycle > (m?.ote.part_max_cycle ?? 0) ? x : m, null);
    return { id: j, nom: J.nom ?? null, plafond: J.plafond ?? null, lots: J.lots, evenements: J.evenements, cycles: J.cycles,
      ote: { demande: r3(O[0]), applique: r3(O[N - 1]), rabote: rabote(O) }, rendu: { demande: r3(R[0]), applique: r3(R[N - 1]), rabote: rabote(R) },
      part_max_cycle: mx ? { part: mx.ote.part_max_cycle, cycle: mx.ote.cycle_max, taxon: mx.taxon, biome: mx.biome } : null, lignees: L }; });
  return { orvane: C.orvane ?? null, monde: { id: C.monde?.id ?? null, ne: C.monde?.ne ?? null }, saison: { ...C.saison }, en_cours: !!en_cours,
    compte: { ...C.compte }, plafonds: C.plafonds || null, memoire_cycles: C.memoire_cycles ?? null, jeux };
}
// l'index : chaque bilan fini (le plus récent d'abord), puis celui en cours
const entree = (B, fichier) => ({ id: B.saison.id, an: B.saison.an, nom: B.saison.nom, de: B.saison.de, a: B.saison.a, compte: { de: B.compte.de, a: B.compte.a, cycles: B.compte.cycles },
  fichier, jeux: B.jeux.map(j => j.id) });
function indexer(finis, en_cours) {
  const L = (finis || []).filter(x => x?.bilan?.saison).sort((x, y) => y.bilan.compte.de - x.bilan.compte.de).map(x => entree(x.bilan, x.fichier));
  const M = en_cours || finis?.[0]?.bilan || null;
  return { orvane: M?.orvane ?? null, monde: M ? { id: M.monde?.id ?? null, ne: M.monde?.ne ?? null } : null, saisons: L, en_cours: en_cours ? entree(en_cours, 'en-cours.json') : null };
}

const API = { saison, noter, publier, indexer, ETAPES, RABOTS, TRANCHE };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvaneBilan = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
