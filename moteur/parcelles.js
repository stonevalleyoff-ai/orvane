// Orvane — LES PARCELLES (moteur/parcelles.js) — docs/15
// Un monde a une géographie : chaque biome se découpe en parcelles voisines, et les populations vivent par parcelle.
// Une espèce gagne ses voisines de proche en proche, une catastrophe ou un défrichage ne frappe qu'une parcelle, une
// population isolée au bout d'une chaîne de parcelles diverge et se sépare.
//
// Le moteur n'a pas à changer : pour lui, une parcelle est un biome comme un autre (ses axes, sa capacité, ses voisins),
// qui porte en plus son « type », le biome dont elle est une part. Ce fichier fait le reste :
//   - decouper(inst, { par, graine }) : un monde par biomes devient un monde par parcelles (chaque biome en « par »
//     parcelles, des capacités un peu inégales, des axes un peu variés ; les parcelles d'un biome en chaîne, et quelques
//     passages vers les parcelles des biomes voisins) ; les effectifs sont répartis selon la place et la convenance ;
//   - regrouper(inst) : la vue par biome, celle que lisent les jeux et le tampon : le contrat ne change pas (chaque
//     population dit en plus comment elle se répartit, « parcelles ») ;
//   - repartir(pressions, inst) : les pressions des jeux, données par biome, réparties entre les parcelles.
// Déterministe : même monde, même graine, mêmes parcelles. Node (require) ou navigateur (globalThis.OrvaneParcelles).
//   node moteur/parcelles.js <monde.json> [--par 4] [--graine 1] [--sortie parcelles.json]
'use strict';
(function (racine) {
const clone = o => JSON.parse(JSON.stringify(o));
const MET = (typeof require === 'function' ? require('./meteo.js') : racine.OrvaneMeteo) || null;   // (docs/45) la météo : le temps d'un biome est celui de ses parcelles
const MEM = (typeof require === 'function' ? require('./memoire.js') : racine.OrvaneMemoire) || null;   // (docs/50) la mémoire : celle d'un biome est la moyenne de ses parcelles
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
function generateur(graine) { let g = ((graine | 0) ^ 0x9a7c) >>> 0; return () => { g = (Math.imul(g, 1664525) + 1013904223) >>> 0; return g / 4294967296; }; }
const AXES = ['temperature', 'humidite', 'altitude', 'lumiere', 'couvert'];
const SEP = '~';                                          // prairie~2 : la deuxième parcelle de la prairie
const estParcellaire = inst => !!inst?.monde?.parcelles?.types;
const typeDe = b => b.type || b.id;
const REGLES_PARCELLES = { dispersion: .005, fuite: .5 };
const MIN_PARCELLE = 30;                                  // l'effectif sous lequel une population n'est pas partagée entre deux parcelles

// --- découper : un biome → « par » parcelles ---
function decouper(inst, opt = {}) {
  if (estParcellaire(inst)) return clone(inst);
  const R = generateur(opt.graine ?? inst.monde?.graine ?? 1), out = clone(inst);
  const types = clone(inst.biomes), parType = typeof opt.par === 'object' ? opt.par : null, n0 = Math.max(1, Math.round(typeof opt.par === 'number' ? opt.par : 4));
  const nb = b => Math.max(1, Math.round(parType?.[b.id] ?? n0)), parcelles = [], de = {};
  for (const b of types) {
    const n = nb(b), poids = Array.from({ length: n }, () => .7 + .6 * R()), W = poids.reduce((s, x) => s + x, 0);
    de[b.id] = [];
    for (let k = 0; k < n; k++) {
      const id = n === 1 ? b.id : `${b.id}${SEP}${k + 1}`, axes = {};
      for (const a of AXES) axes[a] = n === 1 ? b.axes[a] : +clamp((b.axes[a] ?? .5) + (R() - .5) * .1, 0, 1).toFixed(3);   // à ±0,05 du biome
      const part = poids[k] / W, p = { ...clone(b), id, nom: n === 1 ? b.nom : `${b.nom || b.id} ${k + 1}`, type: b.id, axes, voisins: [] };
      // (un monde déjà éveillé) ce que le milieu et le climat gardent du lieu suit les axes de la parcelle : le même écart au type,
      // sans quoi le milieu ramènerait aussitôt chaque parcelle aux axes du biome entier (docs/22, 31)
      if (n > 1) { const dec = o => { if (!o || typeof o !== 'object') return o; const r = { ...o }; for (const a of AXES) if (typeof r[a] === 'number') r[a] = +clamp(r[a] + axes[a] - (b.axes[a] ?? .5), 0, 1).toFixed(4); return r; };
        if (p.transforme) for (const c of ['base', 'etat', 'signale']) if (p.transforme[c]) p.transforme[c] = dec(p.transforme[c]);
        if (p.climat?.base) p.climat = { ...p.climat, base: dec(p.climat.base) }; }
      if (b.capacite != null) p.capacite = +(b.capacite * part).toFixed(2);
      if (b.capacite_base != null) p.capacite_base = +(b.capacite_base * part).toFixed(2);
      if (p.ressources) for (const k of ['surface', 'minerai', 'minerai_max', 'ferraille']) if (typeof p.ressources[k] === 'number') p.ressources[k] = +(p.ressources[k] * part).toFixed(1);   // (docs/16)
      delete p.axes_saison; parcelles.push(p); de[b.id].push(p);
    }
  }
  const lier = (a, b) => { if (a === b) return; if (!a.voisins.includes(b.id)) a.voisins.push(b.id); if (!b.voisins.includes(a.id)) b.voisins.push(a.id); };
  // dans un biome : une chaîne, refermée en boucle à partir de quatre parcelles (une parcelle n'est jamais à plus de n/2 pas)
  for (const L of Object.values(de)) { for (let k = 1; k < L.length; k++) lier(L[k - 1], L[k]); if (L.length >= 4) lier(L[L.length - 1], L[0]); }
  // entre deux biomes voisins : un passage par paire de parcelles alignées, la moitié au plus — les autres parcelles en sont loin
  // (un voisinage qui n'est écrit que d'un côté — une fusion peut en laisser — compte comme s'il l'était des deux)
  const voisinDe = new Map(types.map(b => [b.id, new Set(b.voisins || [])]));
  for (const b of types) for (const v of b.voisins || []) {
    if (!(v in de) || v === b.id || (b.id > v && voisinDe.get(v)?.has(b.id))) continue;
    const A = de[b.id], B = de[v], k = Math.max(1, Math.floor(Math.min(A.length, B.length) / 2)), d = Math.floor(R() * A.length), e = Math.floor(R() * B.length);
    for (let i = 0; i < k; i++) lier(A[(d + i * 2) % A.length], B[(e + i * 2) % B.length]);
  }
  // les populations : réparties entre les parcelles de leur biome, selon leur place et ce qu'elles conviennent
  const conv = (plan, p, t) => { if (!plan?.niche) return 1; let d = 0; for (const a of AXES) d += ((plan.niche[a] ?? .5) - p.axes[a]) ** 2; const tol = plan.tolerance || .35; return Math.exp(-d / (2 * tol * tol)); };
  for (const t of out.taxons) {
    const pops = [];
    for (const pop of t.populations) {
      const L = de[pop.biome]; if (!L) { pops.push(pop); continue; }
      // une petite population n'est pas émiettée : elle garde au moins MIN_PARCELLE bêtes par parcelle, dans celles qui lui
      // conviennent le mieux (une lignée de huit bêtes reste entière dans une seule) ; le total est gardé
      const w0 = L.map(p => (p.capacite || 1) * conv(t.plan, p)), ordre = w0.map((x, i) => i).sort((i, j) => w0[j] - w0[i]);
      const k = Math.max(1, Math.min(L.length, Math.floor(pop.effectif / MIN_PARCELLE))), garde = new Set(ordre.slice(0, k));
      const w = w0.map((x, i) => garde.has(i) ? x : 0), W = w.reduce((s, x) => s + x, 0) || 1;
      const parts = L.map((p, i) => pop.effectif * w[i] / W);
      L.forEach((p, i) => { if (parts[i] > 0) pops.push({ ...clone(pop), biome: p.id, effectif: L.length === 1 ? pop.effectif : +parts[i].toFixed(3) }); });
    }
    t.populations = pops;
    for (const ph of t.phenotypes || []) if (ph.frequence_par_biome) { const f = {};
      for (const [bid, v] of Object.entries(ph.frequence_par_biome)) for (const p of de[bid] || [{ id: bid }]) f[p.id] = v;
      ph.frequence_par_biome = f; }
  }
  out.biomes = parcelles;
  out.monde = { ...out.monde, parcelles: { par: typeof opt.par === 'object' ? opt.par : n0, graine: opt.graine ?? inst.monde?.graine ?? 1, types } };
  // (docs/16) la Mère d'un monde déjà éveillé : elle s'installe dans la parcelle la plus riche de son lieu (sinon elle resterait dans
  // un lieu qui n'existe plus, inerte)
  if (out.monde.mere && de[out.monde.mere.biome]) { const L = de[out.monde.mere.biome].slice().sort((a, b) => (b.capacite || 0) - (a.capacite || 0) || (a.id < b.id ? -1 : 1)); out.monde.mere = { ...out.monde.mere, biome: L[0].id }; }
  // les règles des parcelles (moteur/orvane.js) : une dispersion continue entre parcelles d'un même biome, et la fuite d'une
  // parcelle qui a perdu sa place ; celles que le monde a déjà sont gardées
  out.monde.regles = { dispersion: REGLES_PARCELLES.dispersion, fuite: REGLES_PARCELLES.fuite, ...(out.monde.regles || {}) };
  return out;
}

// Ce qu'une parcelle ne dit pas a parfois un sens : pas de maladie, pas de prédation, pas de chasse, pas de régulation, pas de zone
// hybride (0), une nourriture entière (1). Ces valeurs-là se moyennent sur TOUTES les parcelles, chacune à son poids ; sans cela, une
// parcelle malade sur quatre faisait un biome entier malade (une infection publiée quatre fois trop forte).
const ABSENT = { predation: 0, pression: 0, regulation: 0, satiete: 0, nourriture: 1 };
function completer(m, L, w) {
  const W = w.reduce((s, x) => s + x, 0) || 1, de = (k, d) => L.reduce((s, p, i) => s + (typeof p[k] === 'number' ? p[k] : d) * w[i], 0) / W;
  for (const [k, d] of Object.entries(ABSENT)) if (L.some(p => p[k] != null)) { const v = +de(k, d).toFixed(6); if (k === 'nourriture' ? Math.abs(v - 1) >= .005 : v > 0) m[k] = v; else delete m[k]; }
  if (L.some(p => p.infection)) { const I = {};   // (docs/18) par souche : { i : la part infectée, r : la part guérie } ; absente d'une parcelle, 0
    for (const [n, p] of L.entries()) for (const [k, x] of Object.entries(p.infection || {})) {
      if (typeof x === 'number') I[k] = (typeof I[k] === 'number' ? I[k] : 0) + x * w[n];
      else if (x && typeof x === 'object') { const o = I[k] && typeof I[k] === 'object' ? I[k] : (I[k] = {}); for (const [c, v] of Object.entries(x)) if (typeof v === 'number') o[c] = (o[c] || 0) + v * w[n]; } }
    for (const k in I) I[k] = typeof I[k] === 'number' ? +(I[k] / W).toFixed(7) : Object.fromEntries(Object.entries(I[k]).map(([c, v]) => [c, +(v / W).toFixed(7)]));
    if (Object.keys(I).length) m.infection = I; else delete m.infection; }
  for (const k of ['maladie', 'hybride']) if (m[k] && typeof m[k] === 'object') {   // la part touchée se compte sur tout le biome ; la virulence, la durée, l'isolement restent ceux des parcelles touchées
    const part = L.reduce((s, p, i) => s + (typeof p[k]?.part === 'number' ? p[k].part : 0) * w[i], 0) / W; m[k] = { ...m[k], part: +part.toFixed(6) }; }
}
// --- regrouper : la vue par biome (le contrat des jeux) ---
// Une population de biome additionne ses parcelles : l'effectif est la somme, le reste une moyenne pondérée par l'effectif
// (les traits continus, les allèles, la méfiance, la satiété…) ; « depuis » est le plus ancien ; « parcelles » dit la répartition.
function moyenne(objs, poids) {
  const W = poids.reduce((s, x) => s + x, 0) || 1, out = {};
  const cles = new Set(objs.flatMap(o => Object.keys(o || {})));
  for (const k of cles) {
    const vals = objs.map((o, i) => [o?.[k], poids[i]]).filter(([v]) => v != null);
    if (!vals.length) continue;
    if (vals.every(([v]) => typeof v === 'number')) { const w = vals.reduce((s, [, p]) => s + p, 0) || 1; out[k] = +(vals.reduce((s, [v, p]) => s + v * p, 0) / w).toFixed(6); }
    else if (vals.every(([v]) => v && typeof v === 'object' && !Array.isArray(v))) out[k] = moyenne(vals.map(([v]) => v), vals.map(([, p]) => p));
    else out[k] = vals.slice().sort((a, b) => b[1] - a[1])[0][0];   // le reste : celui de la plus grande parcelle
  }
  return out;
}
function regrouper(inst) {
  if (!estParcellaire(inst)) return inst;
  const P = inst.monde.parcelles, types = P.types, parId = new Map(inst.biomes.map(b => [b.id, b])), out = { ...inst };
  out.biomes = types.map(b => { const L = inst.biomes.filter(p => typeDe(p) === b.id), x = { ...clone(b) };
    if (L.length) { x.capacite = +L.reduce((s, p) => s + (p.capacite || 0), 0).toFixed(2); if (b.capacite_base != null) x.capacite_base = +L.reduce((s, p) => s + (p.capacite_base || 0), 0).toFixed(2);
      if (L[0].axes_saison) x.axes_saison = moyenne(L.map(p => p.axes_saison), L.map(p => p.capacite || 1));
      if (MET) { const m = MET.regrouper(L, L.map(p => p.capacite || 1)); if (m) x.meteo = m; else delete x.meteo; }   // (docs/45) le temps moyen du biome ; celui de chaque parcelle est dans « parcelles »
      if (L[0].transforme) { const w = L.map(p => p.capacite || 1); x.axes = moyenne(L.map(p => p.axes), w); const W = w.reduce((a, v) => a + v, 0) || 1, J = {}; L.forEach((p, i) => { for (const [k, v] of Object.entries(p.transforme.jeu || {})) J[k] = (J[k] || 0) + v * w[i] / W; }); for (const k in J) J[k] = +J[k].toFixed(3); x.transforme = { base: L[0].transforme.base, etat: moyenne(L.map(p => p.transforme.etat || p.transforme.base), w), jeu: J, ref: moyenne(L.map(p => p.transforme.ref || { pat: 0, fou: 0 }), w), signale: { ...x.axes } }; }   // (complet : un monde solo en repart, docs/19)   // (docs/22) le milieu d'aujourd'hui, en moyenne sur ses parcelles
      if (L.some(p => p.nature)) { const W = L.reduce((a, p) => a + (p.capacite || 1), 0) || 1, N = {};   // (docs/28) la part de ses parcelles qui ont changé de nature
        for (const p of L) if (p.nature) { const y = N[p.nature.type] ??= { type: p.nature.type, nom: p.nature.nom, part: 0 }; y.part += (p.capacite || 1) / W; }
        x.natures = Object.values(N).map(y => ({ ...y, part: +y.part.toFixed(3) })); }
      if (L[0].ressources) { const S = L.map(p => p.ressources?.surface || 1), r = moyenne(L.map(p => p.ressources), S);   // (docs/16) les stocks s'additionnent
        for (const k of ['surface', 'minerai', 'minerai_max', 'ferraille']) r[k] = +L.reduce((s, p) => s + (p.ressources?.[k] || 0), 0).toFixed(1); x.ressources = r; } }
    return x; });
  out.taxons = inst.taxons.map(t => {
    const groupes = new Map();
    for (const p of t.populations) { const ty = typeDe(parId.get(p.biome) || { id: p.biome }); if (!groupes.has(ty)) groupes.set(ty, []); groupes.get(ty).push(p); }
    const populations = [...groupes].map(([ty, L]) => {
      if (L.length === 1 && L[0].biome === ty) return L[0];
      const eff = L.map(p => p.effectif), poidsL = eff.map(e => Math.max(e, 1e-9)), m = moyenne(L.map(p => { const { biome, effectif, depuis, parcelles, hivernants, ...r } = p; return r; }), poidsL);
      completer(m, L, poidsL);
      // (docs/50) la mémoire du biome : une parcelle qui n'a rien appris compte pour neutre (et non pour absente) ; le mot qui
      // la résume se relit sur la population entière
      if (MEM && inst.monde.memoire) { const mm = MEM.regrouper(L, poidsL); if (mm) m.memoire = mm; else delete m.memoire;
        const att = MEM.attitude(m, t.plan); if (att) m.attitude = att; else delete m.attitude; }
      if (L.some(p => p.hivernants)) { const H = {}, T = eff.reduce((s, x) => s + x, 0) || 1;   // (docs/38) la part du biome venue d'ailleurs pour l'hiver, par biome d'origine
        L.forEach((p, i) => { for (const [de, h] of Object.entries(p.hivernants || {})) { const ty = typeDe(parId.get(de) || { id: de }); if (ty !== typeDe(parId.get(p.biome) || { id: p.biome })) H[ty] = (H[ty] || 0) + h * eff[i]; } });
        const h = Object.fromEntries(Object.keys(H).sort().map(k => [k, +(H[k] / T).toFixed(4)]).filter(([, v]) => v >= 1e-4)); if (Object.keys(h).length) m.hivernants = h; }
      if (m.maladie?.reste != null) m.maladie.reste = Math.round(m.maladie.reste);   // (un nombre de cycles reste entier)
      return { biome: ty, effectif: +eff.reduce((s, x) => s + x, 0).toFixed(2), ...m, depuis: Math.min(...L.map(p => p.depuis ?? 0)), parcelles: Object.fromEntries(L.map(p => [p.biome, Math.round(p.effectif)])) };
    });
    const effPar = new Map(t.populations.map(p => [p.biome, p.effectif]));
    const phenotypes = (t.phenotypes || []).map(ph => { if (!ph.frequence_par_biome) return ph; const s = {}, w = {};
      for (const [pid, v] of Object.entries(ph.frequence_par_biome)) { const ty = typeDe(parId.get(pid) || { id: pid }), e = effPar.get(pid) || 0; s[ty] = (s[ty] || 0) + v * Math.max(e, 1e-9); w[ty] = (w[ty] || 0) + Math.max(e, 1e-9); }
      return { ...ph, frequence_par_biome: Object.fromEntries(Object.keys(s).map(ty => [ty, +(s[ty] / w[ty]).toFixed(4)])) }; });
    return { ...t, populations, phenotypes };
  });
  out.evenements = (inst.evenements || []).map(e => { const p = e.biome && parId.get(e.biome); return p && p.type ? { ...e, biome: p.type, detail: (e.detail ? e.detail + ' · ' : '') + 'parcelle ' + (p.nom || p.id) } : e; });
  out.monde = { ...inst.monde, parcelles: { par: P.par, graine: P.graine, nombre: inst.biomes.length } };
  if (inst.monde.mere) { const p = parId.get(inst.monde.mere.biome); out.monde.mere = { ...inst.monde.mere, biome: p ? typeDe(p) : inst.monde.mere.biome, parcelle: inst.monde.mere.biome }; }   // (docs/16)
  out.parcelles = inst.biomes.map(p => ({ id: p.id, type: typeDe(p), nom: p.nom, capacite: Math.round(p.capacite || 0), voisins: p.voisins || [], ...(p.meteo && typeof p.meteo === 'object' ? { meteo: p.meteo } : {}) }));   // (docs/45) le temps qu'il fait, parcelle par parcelle
  return out;
}

// --- repartir : les pressions par biome (celles du tampon) réparties entre les parcelles ---
// Un retrait, une rencontre se répartissent selon l'effectif du taxon dans chaque parcelle ; un déplacement va à la plus
// grande parcelle du biome d'arrivée ; une perte d'habitat, selon la capacité des parcelles. Quand le jeu a dit où ses
// joueurs étaient (« parcelle » sur ses événements : localiser), la part localisée de la pression va là, au prorata de ce qui y a
// été compté, le reste selon les effectifs ; puis aucune parcelle ne perd plus que part_max_population d'elle-même.
// Seules les quantités se partagent (n, N, retraits, habitat, milieu) : les fréquences d'allèles et les valeurs génétiques d'un
// apport, le z des retirés (q), les chaînes restent ce qu'elles sont ; ce que les bêtes ont vécu des joueurs (contact) n'est pas
// partagé : chaque parcelle le vit entier, et sa méfiance est celle qu'aurait eue le biome (docs/12, docs/15) ; de même ce que
// retient la mémoire (vecu, docs/50).
const QTE = new Set(['n', 'N']);
function fois(o, f, prof = 0) {
  if (typeof o === 'number') return Number.isFinite(o) ? +(o * f).toFixed(4) : 0;
  if (o == null || typeof o !== 'object' || prof > 6) return o;
  if (Array.isArray(o)) return o.map(x => fois(x, f, prof + 1));
  const r = {}; for (const k of Object.keys(o)) r[k] = k === 'vers' ? o[k] : fois(o[k], f, prof + 1); return r;
}
function partager(k, v, f) {
  if (k === 'q' || k === 'contact' || k === 'vecu') return v;
  if (k === 'apport' && v && typeof v === 'object') { const r = { ...v }; for (const c of Object.keys(v)) if (QTE.has(c)) r[c] = fois(v[c], f); return r; }
  return fois(v, f);
}
const propre = (o, k) => typeof k === 'string' && k !== '__proto__' && k !== 'constructor' && k !== 'prototype' && o != null && Object.prototype.hasOwnProperty.call(o, k);
function repartir(pressions, inst, loc) {
  if (!estParcellaire(inst) || !pressions) return pressions;
  const parType = Object.create(null); for (const p of inst.biomes) (parType[typeDe(p)] ??= []).push(p);
  const plusGrande = ty => (propre(parType, ty) ? parType[ty] : []).slice().sort((a, b) => (b.capacite || 0) - (a.capacite || 0))[0]?.id || ty;
  const pmax = typeof pressions.part_max_population === 'number' ? pressions.part_max_population : null, taxons = {};
  for (const [tid, Bs] of Object.entries(pressions.taxons || {})) {
    const t = inst.taxons.find(x => x.id === tid); if (!t) continue;
    for (const [ty, O] of Object.entries(Bs || {})) {
      const effs = (propre(parType, ty) ? parType[ty] : []).map(p => [p.id, t.populations.find(q => q.biome === p.id)?.effectif || 0]), We = effs.reduce((s, [, e]) => s + e, 0);
      const ici = propre(loc?.taxons, tid) && propre(loc.taxons[tid], ty) ? loc.taxons[tid][ty] : null, Ln = ici ? Object.values(ici).reduce((s, x) => s + x, 0) : 0;
      const tot = Math.max(Ln, loc?.totaux?.[tid]?.[ty] || 0), sLoc = Ln > 0 && tot > 0 ? Math.min(1, Ln / tot) : 0;   // la part localisée de ce qui a été compté
      const w = new Map();
      if (We > 0) { for (const [pid, e] of effs) if (e > 0) w.set(pid, (1 - sLoc) * e / We); }
      else if (sLoc < 1) w.set(propre(parType, ty) ? plusGrande(ty) : ty, 1 - sLoc);   // (personne ici : la plus grande parcelle)
      if (Ln > 0) for (const [pid, x] of Object.entries(ici)) w.set(pid, (w.get(pid) || 0) + sLoc * x / Ln);
      for (const [pid, f] of w) { if (!(f > 0)) continue; const x = {};
        for (const [k, v] of Object.entries(O || {})) x[k] = k === 'deplacement' ? (Array.isArray(v) ? v : []).map(d => ({ ...d, vers: propre(parType, d.vers) ? plusGrande(d.vers) : d.vers, n: +((d.n || 0) * f).toFixed(4) })) : partager(k, v, f);
        if (Ln > 0 && pmax != null) { const eff = t.populations.find(q => q.biome === pid)?.effectif || 0, lim = pmax * eff;   // (ce qu'un jeu a localisé ne vide pas une parcelle)
          const ote = Object.values(x.retrait || {}).reduce((s, r) => s + Math.max(0, r), 0) + (x.deplacement || []).reduce((s, d) => s + d.n, 0);
          if (ote > lim) { const g = ote > 0 ? lim / ote : 0; for (const k in x.retrait || {}) if (x.retrait[k] > 0) x.retrait[k] = +(x.retrait[k] * g).toFixed(4); for (const d of x.deplacement || []) d.n = +(d.n * g).toFixed(4); } }
        (taxons[tid] ??= {})[pid] = x; }
    }
  }
  const biomes = {};
  for (const [ty, O] of Object.entries(pressions.biomes || {})) {
    const L = propre(parType, ty) ? parType[ty] : null; if (!L) { biomes[ty] = O; continue; }
    const Wc = L.reduce((s, p) => s + (p.capacite || 0), 0) || 1, ici = propre(loc?.biomes, ty) ? loc.biomes[ty] : null, Ln = ici ? Object.values(ici).reduce((s, x) => s + x, 0) : 0;
    const tot = Math.max(Ln, loc?.totauxB?.[ty] || 0), sLoc = Ln > 0 && tot > 0 ? Math.min(1, Ln / tot) : 0, w = new Map();
    for (const p of L) w.set(p.id, (1 - sLoc) * (p.capacite || 0) / Wc);
    if (Ln > 0) for (const [pid, x] of Object.entries(ici)) w.set(pid, (w.get(pid) || 0) + sLoc * x / Ln);
    for (const [pid, f] of w) if (f > 0) biomes[pid] = fois(O, f);
  }
  return { ...pressions, taxons, biomes };
}

// --- localiser : ce que les lots des jeux disent des parcelles (un événement peut porter « parcelle », une parcelle du biome de
// l'événement) : par taxon et par biome, combien a été compté dans chaque parcelle, et combien en tout (localisé ou non) ; de même
// pour l'habitat. Seuls les retraits (prélèvements, captures, déplacements) se localisent : une rencontre ne déplace pas la chasse
// des autres. Un événement mal formé ne compte pas (le tampon l'écarte aussi) ---
const LIEU = new Set(['habitat_perdu', 'habitat_gagne', 'defrichage', 'reboisement', 'assechement', 'irrigation', 'construction', 'transformation']);
const RETRAIT = new Set(['prelevement', 'capture', 'deplacement']);
function localiser(lots, inst) {
  if (!estParcellaire(inst)) return null;
  const type = new Map(inst.biomes.map(b => [b.id, typeDe(b)])), types = new Set(type.values()), ids = new Set(inst.taxons.map(t => t.id));
  const loc = { taxons: Object.create(null), biomes: Object.create(null), totaux: Object.create(null), totauxB: Object.create(null) }; let n = 0;
  const ajouter = (D, a, b, c, x) => { const A = D[a] ??= Object.create(null); if (c == null) A[b] = (A[b] || 0) + x; else { const B = A[b] ??= Object.create(null); B[c] = (B[c] || 0) + x; } };
  for (const lot of Array.isArray(lots) ? lots : []) { if (!lot || !Array.isArray(lot.evenements)) continue;
    for (const e of lot.evenements) {
      if (!e || typeof e !== 'object' || typeof e.biome !== 'string' || !types.has(e.biome) || !(typeof e.n === 'number' && Number.isFinite(e.n) && e.n > 0 && e.n <= 1e4)) continue;
      const lieu = LIEU.has(e.action), ok = typeof e.parcelle === 'string' && type.get(e.parcelle) === e.biome;
      if (lieu) { ajouter(loc.totauxB, e.biome, '_', null, e.n); if (ok) { ajouter(loc.biomes, e.biome, e.parcelle, null, e.n); n++; } continue; }
      if (!RETRAIT.has(e.action) || typeof e.taxon !== 'string' || !ids.has(e.taxon)) continue;
      ajouter(loc.totaux, e.taxon, e.biome, null, e.n); if (ok) { ajouter(loc.taxons, e.taxon, e.biome, e.parcelle, e.n); n++; }
    } }
  for (const ty in loc.totauxB) loc.totauxB[ty] = loc.totauxB[ty]._;
  return n ? loc : null;
}

const API = { decouper, regrouper, repartir, localiser, estParcellaire, SEP, REGLES_PARCELLES };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvaneParcelles = API;

if (typeof require === 'function' && typeof module !== 'undefined' && require.main === module) {
  const fs = require('fs'), a = process.argv.slice(2), arg = (k, d) => { const i = a.indexOf(k); return i >= 0 && a[i + 1] != null ? a[i + 1] : d; };
  const src = a.find((x, i) => !x.startsWith('--') && !(i > 0 && a[i - 1].startsWith('--')));
  if (!src) { console.log('node moteur/parcelles.js <monde.json> [--par 4] [--graine 1] [--sortie parcelles.json]'); process.exit(1); }
  const I = decouper(JSON.parse(fs.readFileSync(src, 'utf8')), { par: +arg('--par', 4), graine: arg('--graine', null) != null ? +arg('--graine') : undefined });
  const sortie = arg('--sortie', 'parcelles.json'); fs.writeFileSync(sortie, JSON.stringify(I));
  const liens = I.biomes.reduce((s, p) => s + p.voisins.length, 0) / 2;
  console.log(`${I.monde.parcelles.types.length} biomes → ${I.biomes.length} parcelles, ${liens} passages ; ${I.taxons.reduce((s, t) => s + t.populations.length, 0)} populations → ${sortie}`);
}
})(typeof globalThis !== 'undefined' ? globalThis : this);
