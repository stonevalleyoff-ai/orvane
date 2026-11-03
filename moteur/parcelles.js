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
  for (const b of types) for (const v of b.voisins || []) {
    if (!(v in de) || b.id > v) continue;
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
  // les règles des parcelles (moteur/orvane.js) : une dispersion continue entre parcelles d'un même biome, et la fuite d'une
  // parcelle qui a perdu sa place ; celles que le monde a déjà sont gardées
  out.monde.regles = { dispersion: REGLES_PARCELLES.dispersion, fuite: REGLES_PARCELLES.fuite, ...(out.monde.regles || {}) };
  return out;
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
      if (L[0].ressources) { const S = L.map(p => p.ressources?.surface || 1), r = moyenne(L.map(p => p.ressources), S);   // (docs/16) les stocks s'additionnent
        for (const k of ['surface', 'minerai', 'minerai_max', 'ferraille']) r[k] = +L.reduce((s, p) => s + (p.ressources?.[k] || 0), 0).toFixed(1); x.ressources = r; } }
    return x; });
  out.taxons = inst.taxons.map(t => {
    const groupes = new Map();
    for (const p of t.populations) { const ty = typeDe(parId.get(p.biome) || { id: p.biome }); if (!groupes.has(ty)) groupes.set(ty, []); groupes.get(ty).push(p); }
    const populations = [...groupes].map(([ty, L]) => {
      if (L.length === 1 && L[0].biome === ty) return L[0];
      const eff = L.map(p => p.effectif), m = moyenne(L.map(p => { const { biome, effectif, depuis, parcelles, ...r } = p; return r; }), eff.map(e => Math.max(e, 1e-9)));
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
  out.parcelles = inst.biomes.map(p => ({ id: p.id, type: typeDe(p), nom: p.nom, capacite: Math.round(p.capacite || 0), voisins: p.voisins || [] }));
  return out;
}

// --- repartir : les pressions par biome (celles du tampon) réparties entre les parcelles ---
// Un retrait, une rencontre se répartissent selon l'effectif du taxon dans chaque parcelle ; un déplacement va à la plus
// grande parcelle du biome d'arrivée ; une perte d'habitat, selon la capacité des parcelles. Quand le jeu a dit où ses
// joueurs étaient (« parcelle » sur ses événements : localiser), la pression va là, au prorata de ce qui y a été compté.
function repartir(pressions, inst, loc) {
  if (!estParcellaire(inst) || !pressions) return pressions;
  const parType = {}; for (const p of inst.biomes) (parType[typeDe(p)] ??= []).push(p);
  const plusGrande = ty => (parType[ty] || []).slice().sort((a, b) => (b.capacite || 0) - (a.capacite || 0))[0]?.id || ty;
  const fois = (o, f) => { if (o == null) return o; if (typeof o === 'number') return +(o * f).toFixed(4); if (Array.isArray(o)) return o.map(x => fois(x, f)); const r = {}; for (const k in o) r[k] = k === 'vers' ? o[k] : fois(o[k], f); return r; };
  const taxons = {};
  for (const [tid, Bs] of Object.entries(pressions.taxons || {})) {
    const t = inst.taxons.find(x => x.id === tid); if (!t) continue;
    for (const [ty, O] of Object.entries(Bs)) {
      const ici = loc?.taxons?.[tid]?.[ty];                        // (§222 du jeu) le jeu a dit les parcelles : on suit ses comptes
      const L = ici ? Object.entries(ici) : (parType[ty] || []).map(p => [p.id, t.populations.find(q => q.biome === p.id)?.effectif || 0]), W = L.reduce((s, [, e]) => s + e, 0);
      const cibles = W > 0 ? L.filter(([, e]) => e > 0) : (parType[ty] ? [[plusGrande(ty), 1]] : [[ty, 1]]);
      for (const [pid, e] of cibles) { const f = W > 0 ? e / W : 1, x = {};
        for (const [k, v] of Object.entries(O)) x[k] = k === 'q' ? v : k === 'deplacement' ? (v || []).map(d => ({ ...d, vers: parType[d.vers] ? plusGrande(d.vers) : d.vers, n: +(d.n * f).toFixed(4) })) : fois(v, f);
        (taxons[tid] ??= {})[pid] = x; }
    }
  }
  const biomes = {};
  for (const [ty, O] of Object.entries(pressions.biomes || {})) {
    const L = parType[ty]; if (!L) { biomes[ty] = O; continue; }
    const ici = loc?.biomes?.[ty]; if (ici) { const W = Object.values(ici).reduce((s, x) => s + x, 0) || 1; for (const [pid, w] of Object.entries(ici)) biomes[pid] = fois(O, w / W); continue; }
    const W = L.reduce((s, p) => s + (p.capacite || 0), 0) || 1; for (const p of L) biomes[p.id] = fois(O, (p.capacite || 0) / W);
  }
  return { ...pressions, taxons, biomes };
}

// --- localiser : ce que les lots des jeux disent des parcelles (un événement peut porter « parcelle », une parcelle du biome de
// l'événement) : par taxon et par biome, combien a été compté dans chaque parcelle ; de même pour l'habitat ---
function localiser(lots, inst) {
  if (!estParcellaire(inst)) return null;
  const type = new Map(inst.biomes.map(b => [b.id, typeDe(b)])), loc = { taxons: {}, biomes: {} }; let n = 0;
  for (const lot of lots || []) for (const e of lot.evenements || []) {
    if (!e.parcelle || type.get(e.parcelle) !== e.biome || !(e.n > 0)) continue; n++;
    if (e.action === 'habitat_perdu' || e.action === 'habitat_gagne') { const B = loc.biomes[e.biome] ??= {}; B[e.parcelle] = (B[e.parcelle] || 0) + e.n; }
    else { const B = (loc.taxons[e.taxon] ??= {})[e.biome] ??= {}; B[e.parcelle] = (B[e.parcelle] || 0) + e.n; }
  }
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
