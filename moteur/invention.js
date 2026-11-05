// Orvane — LES TRAITS INVENTÉS PAR LE MONDE (moteur/invention.js) — docs/27
// Jusqu'ici, un trait venait d'un catalogue : celui du moteur, ou celui qu'un monde se donne (docs/20). Dans un monde inventif, le
// monde en invente lui-même, comme le vivant le fait avec ses gènes :
//  - la duplication : un trait répandu dans une lignée se double d'un organe qui l'accentue (une glande irritante, puis une glande
//    ardente qui en exige une) ; il en garde le sens et l'accentue, pour un coût de plus ;
//  - la fusion : deux traits portés ensemble depuis longtemps donnent un organe neuf qui les exige tous deux, et les renforce l'un
//    par l'autre (une carapace et une glande : une carapace suintante).
// Un trait inventé a un nom, une définition au vocabulaire commun (domaine, organe, effet, coût, écarts, vulnérabilité, chasse,
// résistance, conduite), et sa naissance (origine) ; il entre au catalogue propre du monde (catalogue.monde.traits), naît chez
// quelques bêtes de la lignée qui l'a inventé, et la sélection fait le reste. Un jeu le montre d'après sa seule description.
// Un monde qui n'est pas inventif n'en voit rien. Le hasard des inventions est le sien : celui du cycle ne bouge pas.
'use strict';
(function (racine) {
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const REGLES = { chance: .05, max: 80, frequence: .3, part: .02, allele: .01, accent: 1.25, fusion: .3 };
// les épithètes, par domaine : ce que l'organe neuf a de plus
const EPI = { morphologie: [['ample', 'ample'], ['lourd', 'lourde'], ['dense', 'dense']], locomotion: [['souple', 'souple'], ['vif', 'vive'], ['ample', 'ample']],
  sens: [['fin', 'fine'], ['aigu', 'aiguë'], ['profond', 'profonde']], offense: [['ardent', 'ardente'], ['acéré', 'acérée'], ['vif', 'vive']],
  defense: [['dentelé', 'dentelée'], ['épais', 'épaisse'], ['double', 'double']], metabolisme: [['lent', 'lente'], ['économe', 'économe'], ['tenace', 'tenace']],
  reproduction: [['fécond', 'féconde'], ['précoce', 'précoce']], social: [['sombre', 'sombre'], ['vif', 'vive']], activite: [['sombre', 'sombre'], ['tenace', 'tenace']] };
const EPITHETES = [...new Map(Object.values(EPI).flat().map(e => [e[0], e])).values()];
// l'épithète d'un organe neuf : d'abord celles de son domaine, puis les autres ; la première dont le nom est libre
function epitheteDe(T, R, libre = () => true) { const L = EPI[T.domaine] || EPITHETES, k = Math.floor(R() * L.length), ordre = [...L.slice(k), ...L.slice(0, k), ...EPITHETES.filter(e => !L.includes(e))];
  return ordre.find(e => libre(e)) || ordre[0]; }
const sansAccent = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// accentuer un multiplicateur : s'éloigner de 1 dans le même sens
const accent = (v, k) => typeof v === 'number' ? +(1 + (v - 1) * k).toFixed(3) : v;
// le genre et le nombre d'un nom, à peu près : « des membranes souples », « un squelette lourd », « des poils fins »
const MASC = new Set(['squelette', 'derme', 'tube', 'repli', 'organe', 'poumon', 'museau', 'pelage', 'plumage', 'cœur', 'foie', 'membre', 'globe', 'muscle', 'mélanocyte', 'chromatophore', 'pigment', 'signal', 'poil']);
const INVAR = new Set(['corps', 'dos', 'nez', 'bras', 'pouls', 'os']);
function accorder(base, [m, f]) { const w = String(base).toLowerCase(), plur = /[sx]$/.test(w) && !INVAR.has(w), sing = plur ? w.replace(/aux$/, 'al').replace(/[sx]$/, '') : w;
  const e = !MASC.has(sing) && /e$|tion$|ure$/.test(sing) ? f : m; return plur && !/[sx]$/.test(e) ? e + 's' : e; }

function generateur(graine) { let g = (graine >>> 0) || 1; return () => { g = (Math.imul(g, 1664525) + 1013904223) >>> 0; return g / 4294967296; }; }

// la duplication d'un trait : un organe qui l'exige et l'accentue
function dupliquer(id, T, R, pris = new Set()) {
  const base = (T.organe || id).split(/[ ,;(]/)[0], epi = accorder(base, epitheteDe(T, R, e => !pris.has(sansAccent(`${base} ${accorder(base, e)}`))));
  const t = { domaine: T.domaine, organe: `${T.organe || id}, ${epi}`, cout: +((T.cout || .05) * .6 + .02).toFixed(3), exige: [id],
    effet: `${base} ${epi} : ce que fait « ${id} », en plus marqué (${T.effet || ''})` };
  if (T.ecarts) t.ecarts = Object.fromEntries(Object.entries(T.ecarts).map(([k, v]) => [k, accent(v, REGLES.accent - 1)]));
  for (const k of ['vulnerabilite', 'chasse', 'resistance', 'attrait']) if (typeof T[k] === 'number' && T[k] !== 1) t[k] = accent(T[k], REGLES.accent - 1);
  if (T.flore) t.flore = Object.fromEntries(Object.entries(T.flore).map(([k, v]) => [k, typeof v === 'number' ? +clamp(v * .3, 0, 1).toFixed(2) : v]));
  if (T.conduite) t.conduite = { ...T.conduite, force: +((T.conduite.force || 1) * 1.15).toFixed(2), presage: `${T.conduite.presage || ''}, en plus marqué`.replace(/^, /, '') };
  return { t, nom: `${base} ${epi}` };
}
// la fusion de deux traits : un organe neuf, qui les exige tous deux et les renforce l'un par l'autre
function fusionner(a, A, b, B, R, pris = new Set()) {
  const base = (A.organe || a).split(/[ ,;(]/)[0], epi = accorder(base, epitheteDe(A, R, e => !pris.has(sansAccent(`${base} ${accorder(base, e)}`))));
  const t = { domaine: A.domaine, organe: `${A.organe || a} et ${B.organe || b}, liés`, cout: +(((A.cout || .05) + (B.cout || .05)) * .35).toFixed(3), exige: [a, b],
    effet: `${base} ${epi} : « ${a} » et « ${b} » ne font plus qu'un organe, chacun renforçant l'autre` };
  const E = {}; for (const T of [A, B]) for (const [k, v] of Object.entries(T.ecarts || {})) E[k] = +((E[k] ?? 1) * accent(v, .3)).toFixed(3); if (Object.keys(E).length) t.ecarts = E;
  for (const k of ['vulnerabilite', 'chasse', 'resistance']) { const v = [A[k], B[k]].filter(x => typeof x === 'number' && x !== 1); if (v.length) t[k] = +v.reduce((x, y) => x * accent(y, .3), 1).toFixed(3); }
  const C = A.conduite || B.conduite; if (C) t.conduite = { ...C, force: +((C.force || 1) * 1.2).toFixed(2), presage: [A.conduite?.presage, B.conduite?.presage].filter(Boolean).join(', puis ') || C.presage };
  return { t, nom: `${base} ${epi}` };
}

// un cycle : parfois, une lignée invente un trait ; il entre au catalogue du monde et naît chez quelques-unes de ses bêtes
function inventer(ctx) {
  const { sortie, cat, n, graine, inventes = {} } = ctx, R = generateur(((graine >>> 0) ^ 0x2545f491) ^ Math.imul(n + 7, 0x9e3779b1)), ev = [], neufs = {};
  if (Object.keys(inventes).length >= REGLES.max || R() >= REGLES.chance) return { traits: neufs, evenements: ev };
  // les couples (lignée, trait répandu chez au moins 30 % de ses bêtes) ; un trait rare dans le monde, et peu repris jusqu'ici, invente plus
  // volontiers : le monde n'invente pas cent fois la même chose
  const cand = [], porteurs = {}, usage = id => Object.values(inventes).filter(x => x.origine?.de?.includes(id)).length;
  for (const t of sortie) { if (t.eteint || t.plan?.regime === 'vegetal' || t.plan?.regime === 'synthetique') continue;
    const f = {}; for (const p of t.phenotypes) for (const id of p.traits) if (cat[id]) f[id] = (f[id] || 0) + (p.frequence || 0);
    const N = t.populations.reduce((a, p) => a + p.effectif, 0); for (const id of Object.keys(f).sort()) if (f[id] >= REGLES.frequence) { cand.push({ t, a: id, N }); porteurs[id] = (porteurs[id] || 0) + 1; } }
  if (!cand.length) return { traits: neufs, evenements: ev };
  const w = cand.map(c => Math.sqrt(c.N) / porteurs[c.a] / (1 + 3 * usage(c.a)));
  let u = R() * w.reduce((x, y) => x + y, 0), c = cand[0]; for (let i = 0; i < cand.length; i++) { u -= w[i]; if (u <= 0) { c = cand[i]; break; } }
  const pris = new Set([...Object.keys(cat), ...Object.keys(inventes)]);
  const paires = []; for (const p of c.t.phenotypes) if ((p.frequence || 0) >= REGLES.frequence / 2 && p.traits.includes(c.a)) for (const b of p.traits) if (b !== c.a && cat[b] && !paires.includes(b)) paires.push(b);
  let id, def, nom, mode;
  if (paires.length && R() < REGLES.fusion) { const [a, b] = [c.a, paires[Math.floor(R() * paires.length)]].sort(); ({ t: def, nom } = fusionner(a, cat[a], b, cat[b], R, pris)); mode = `de « ${a} » et « ${b} »`; }
  else { ({ t: def, nom } = dupliquer(c.a, cat[c.a], R, pris)); mode = `à partir de « ${c.a} »`; }
  id = sansAccent(nom); for (let k = 2; cat[id] || inventes[id]; k++) id = `${sansAccent(nom)}-${k}`;
  def.nom = nom; def.origine = { lignee: c.t.id, cycle: n, de: def.exige.slice() }; neufs[id] = def;
  // il naît chez quelques bêtes de la lignée : celles qui portent déjà ce qu'il exige
  const L = c.t; for (const p of L.phenotypes.slice()) { if (!def.exige.every(x => p.traits.includes(x)) || !(p.frequence > 0)) continue;
    const traits = [...p.traits, id].sort(), k = REGLES.part, q = { id: traits.join('+'), traits, frequence: +(p.frequence * k).toFixed(6), cout_total: +((p.cout_total || 0) + def.cout).toFixed(3) };
    if (p.frequence_par_biome) q.frequence_par_biome = Object.fromEntries(Object.entries(p.frequence_par_biome).map(([b, v]) => [b, +(v * k).toFixed(6)]));
    if (!L.phenotypes.some(x => x.id === q.id)) { L.phenotypes.push(q); p.frequence = +(p.frequence * (1 - k)).toFixed(6); if (p.frequence_par_biome) for (const b in p.frequence_par_biome) p.frequence_par_biome[b] = +(p.frequence_par_biome[b] * (1 - k)).toFixed(6); } }
  for (const p of L.populations) if (p.alleles) p.alleles[id] = REGLES.allele;
  ev.push({ type: 'invention', taxon: L.id, biome: L.populations.slice().sort((a, b) => b.effectif - a.effectif)[0]?.biome, detail: `le monde invente « ${nom} » chez ${L.nom || L.id}, ${mode}` });
  return { traits: neufs, evenements: ev };
}

function eveiller(inst) { const out = JSON.parse(JSON.stringify(inst)); if (out.monde?.invention) return { inst: out, evenements: [] };
  out.monde = { ...out.monde, invention: { depuis: out.cycle?.n ?? 0 } };
  return { inst: out, evenements: [{ type: 'eveil', taxon: out.taxons.find(t => t.plan?.regime !== 'vegetal')?.id, detail: 'le monde devient inventif : ses lignées peuvent inventer des traits que personne n\'a décrits' }] }; }
const API = { REGLES, eveiller, inventer, dupliquer, fusionner, accorder };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvaneInvention = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
