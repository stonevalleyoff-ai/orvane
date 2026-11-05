// Orvane — LA SIMULATION EN DIRECT, son noyau (simulation/noyau.js)
// Le monde solo d'Orvane (moteur/solo.js, docs/19) qu'on règle de bout en bout : chaque règle de chaque module du moteur
// (REGLES de moteur/orvane.js, du climat, de la flore, des souches, de la Mère…), les catalogues du vivant (les traits, les traits
// continus, les formes des plantes…), le profil du tampon (influence et exposition), le monde (sa graine, son année), ses biomes
// (capacité, axes, saisons) et ses mécanismes, qu'on éveille ou qu'on endort. Rien n'en part vers le monde partagé.
//   const S = Noyau.creer(instantane, { flore, reglages })   // un monde solo, parti de l'instantané publié
//   Noyau.regler(S, reglages)                                // tous les réglages d'un coup (idempotent : les défauts, puis eux)
//   Noyau.noter(S, evenement)                                // ce que fait le joueur (le format des lots, docs/4)
//   const r = Noyau.cycle(S)                                 // un cycle : { evenements, entrees (la chronique), duree }
//   Noyau.vue(S)                                             // ce que la page dessine : l'instantané, et la flore de chaque biome
//   Noyau.defauts() / Noyau.valeurs(S)                       // les valeurs d'origine de chaque réglage, et celles du moment
//   Noyau.sauver(S) / Noyau.charger(json, reglages)
// Réglages : { [groupe]: { 'chemin.vers.la.valeur': valeur } }, et reglages.mecanismes = { climat: false, … } (endormi).
// Node (require) ou navigateur, Web Worker compris (globalThis.OrvaneNoyau, après les modules du moteur). Déterministe.
'use strict';
(function (racine) {
const R = n => { if (typeof require !== 'function') return null; try { return require(n); } catch (e) { return null; } };
const G = (fichier, nom) => R(fichier) || racine[nom] || null;
const Orvane = G('../moteur/orvane.js', 'Orvane'), Solo = G('../moteur/solo.js', 'OrvaneSolo'), Catalogue = G('../moteur/catalogue.js', 'OrvaneCatalogue');
const Tampon = G('../tampon/tampon.js', 'OrvaneTampon'), Parcelles = G('../moteur/parcelles.js', 'OrvaneParcelles'), Chronique = G('../moteur/chronique.js', 'OrvaneChronique');
const M = {
  climat: G('../moteur/climat.js', 'OrvaneClimat'), flore: G('../moteur/flore.js', 'OrvaneFlore'), pathogenes: G('../moteur/pathogenes.js', 'OrvanePathogenes'),
  milieu: G('../moteur/milieu.js', 'OrvaneMilieu'), synthetique: G('../moteur/synthetique.js', 'OrvaneSynthetique'), ponte: G('../moteur/ponte.js', 'OrvanePonte'),
  stades: G('../moteur/stades.js', 'OrvaneStades'), invention: G('../moteur/invention.js', 'OrvaneInvention'), natures: G('../moteur/natures.js', 'OrvaneNatures'),
  derives: G('../moteur/derives.js', 'OrvaneDerives'), dietes: G('../moteur/dietes.js', 'OrvaneDietes'), grammaire: G('../moteur/grammaire.js', 'OrvaneGrammaire'),
  castes: G('../moteur/castes.js', 'OrvaneCastes'), formes: G('../moteur/formes.js', 'OrvaneFormes'), esprit: G('../moteur/esprit.js', 'OrvaneEsprit'),
  collectif: G('../moteur/collectif.js', 'OrvaneCollectif')
};
const clone = o => o === undefined ? undefined : JSON.parse(JSON.stringify(o, (k, v) => v === Infinity ? '∞' : v), (k, v) => v === '∞' ? Infinity : v);
const estObj = v => v && typeof v === 'object' && !Array.isArray(v);
const INTERDITS = new Set(['__proto__', 'constructor', 'prototype']);

// --- les groupes de réglages : où vit chaque valeur. Ceux du moteur sont des objets des modules (on les change en place) ---
const OBJETS = {
  orvane: () => Orvane.REGLES,
  quant: () => Catalogue?.QUANT, traits: () => Catalogue?.TRAITS,
  climat: () => M.climat?.REGLES, flore: () => M.flore?.REGLES, 'flore-formes': () => M.flore?.FORMES, 'flore-traits': () => M.flore?.TRAITS,
  pathogenes: () => M.pathogenes?.REGLES, milieu: () => M.milieu?.REGLES, 'milieu-traits': () => M.milieu?.TRAITS,
  synthetique: () => M.synthetique?.REGLES, 'synthetique-modules': () => M.synthetique?.MODULES,
  ponte: () => M.ponte?.REGLES, 'ponte-traits': () => M.ponte?.TRAITS, stades: () => M.stades?.REGLES, 'stades-traits': () => M.stades?.TRAITS,
  invention: () => M.invention?.REGLES, natures: () => M.natures?.REGLES, derives: () => M.derives?.REGLES,
  dietes: () => M.dietes?.REGLES, 'dietes-rendement': () => M.dietes?.RENDEMENT, 'dietes-defense': () => M.dietes?.DEFENSE, 'dietes-perte': () => M.dietes?.PERTE,
  grammaire: () => M.grammaire?.REGLES, castes: () => M.castes?.REGLES, 'castes-traits': () => M.castes?.TRAITS,
  esprit: () => M.esprit?.REGLES, 'esprit-traits': () => M.esprit?.TRAITS, 'esprit-savoirs': () => M.esprit?.SAVOIRS,
  collectif: () => M.collectif?.REGLES, chronique: () => Chronique?.REGLES, parcelles: () => Parcelles?.REGLES_PARCELLES
};
// les mécanismes qu'un monde éveille (profil.monde.<cle>, hebergement/cycle.js) : la clé de monde, le module, comment l'éveiller
// (dans l'ordre de hebergement/cycle.js : les natures après le milieu, les régimes après la flore)
const MECANISMES = ['synthetique', 'flore', 'invention', 'stades', 'ponte', 'milieu', 'natures', 'derives', 'dietes', 'climat', 'grammaire', 'castes', 'formes', 'esprit', 'collectif', 'pathogenes'];
const CLE_MONDE = { synthetique: 'mere' };
// la flore une fois éveillée tourne tant qu'il y a des plantes (moteur/orvane.js) : on ne l'endort pas
const ENDORMABLES = new Set(MECANISMES.filter(k => k !== 'flore'));

// les valeurs d'origine, prises au chargement, avant tout réglage : de quoi revenir en arrière et dire ce qui a changé
const DEFAUTS = {}; for (const [g, f] of Object.entries(OBJETS)) { const o = f(); if (o) DEFAUTS[g] = clone(o); }
function defauts() { return clone({ ...DEFAUTS, profil: Solo.PROFIL }); }

// un chemin 'a.b.0.c' dans un objet
const segments = c => String(c).split('.').filter(s => s !== '' && !INTERDITS.has(s));
function lire(o, chemin) { for (const s of segments(chemin)) { if (o == null) return undefined; o = o[s]; } return o; }
function ecrire(o, chemin, v) { const S = segments(chemin); if (!S.length || o == null) return false;
  for (let i = 0; i < S.length - 1; i++) { if (o[S[i]] == null || typeof o[S[i]] !== 'object') o[S[i]] = /^\d+$/.test(S[i + 1]) ? [] : {}; o = o[S[i]]; }
  o[S[S.length - 1]] = v; return true; }
// remettre un objet d'un module à ses valeurs d'origine, en place (les modules gardent leur référence)
function restaurer(o, d) {
  if (!o || !d) return;
  for (const k of Object.keys(d)) { if (INTERDITS.has(k)) continue; const v = d[k];
    if (v && typeof v === 'object' && o[k] && typeof o[k] === 'object' && Array.isArray(v) === Array.isArray(o[k])) restaurer(o[k], v); else o[k] = clone(v); }
  if (Array.isArray(o) && Array.isArray(d)) o.length = d.length;
}
const fusion = (a, b) => { if (!estObj(a) || !estObj(b)) return b === undefined ? clone(a) : clone(b); const o = clone(a); for (const k of Object.keys(b)) if (!INTERDITS.has(k)) o[k] = estObj(o[k]) && estObj(b[k]) ? fusion(o[k], b[k]) : clone(b[k]); return o; };

// --- créer le monde ---
function creer(source, opt = {}) {
  const S = Solo.creer(source, { flore: opt.flore, graine: opt.graine, id: opt.id, nom: opt.nom, periode: opt.periode || '1h', maintenant: opt.maintenant, rattrapage: opt.rattrapage });
  S.direct = { regles0: clone(S.etat.monde.regles || {}), endormis: {}, biomes0: Object.fromEntries(S.etat.biomes.map(b => [b.id, { capacite_base: b.capacite_base ?? b.capacite, axes: clone(b.axes), saisons: clone(b.saisons) }])),
    monde0: { graine: S.etat.monde.graine, annee: S.etat.monde.annee ?? 0 }, chronique: null, cycles: 0 };
  // la vie en groupe n'est qu'une lecture de l'état (moteur/collectif.js) : la simulation l'éveille d'office, pour montrer les troupeaux
  if (M.collectif && !S.etat.monde.collectif) eveiller(S, 'collectif');
  S.direct.chronique = Chronique ? Chronique.noter(Chronique.vide(S.etat), S.etat, S.etat).etat : null;   // ce qui est déjà là ne fait pas d'entrée
  regler(S, opt.reglages || {});
  return S;
}

// --- tous les réglages d'un coup : les défauts, puis ceux qu'on a changés ---
let DERNIER = null;   // le monde dont les modules portent les réglages (ils sont partagés par tous les mondes d'une même page)
function regler(S, reglages = {}) {
  const D = S.direct, E = []; DERNIER = S; D.reglages = clone(reglages);
  // 1. les modules du moteur (un objet partagé par tous les mondes de cette page : ils reçoivent les réglages du dernier réglé)
  for (const [g, f] of Object.entries(OBJETS)) { if (g === 'orvane') continue; const o = f(); if (!o) continue; restaurer(o, DEFAUTS[g]);
    for (const [c, v] of Object.entries(reglages[g] || {})) ecrire(o, c, v); }
  // 2. les règles du moteur : elles passent par monde.regles (le moteur les pose le temps du cycle, sur celles du monde) ; une
  //    règle qui est un objet y va entière, sans quoi le moteur, qui ne complète que d'un niveau, perdrait ses voisines profondes
  restaurer(Orvane.REGLES, DEFAUTS.orvane);
  const R0 = D.regles0, propres = {};
  for (const [c, v] of Object.entries(reglages.orvane || {})) { const [k] = segments(c); if (!k) continue;
    if (!(k in propres)) propres[k] = estObj(Orvane.REGLES[k]) ? fusion(Orvane.REGLES[k], R0[k] || {}) : (R0[k] !== undefined ? clone(R0[k]) : clone(Orvane.REGLES[k]));
    if (segments(c).length === 1) propres[k] = v; else ecrire(propres[k], segments(c).slice(1).join('.'), v); }
  S.etat.monde.regles = { ...clone(R0), ...propres };
  if (!Object.keys(S.etat.monde.regles).length) delete S.etat.monde.regles;
  // 3. le profil du tampon : celui d'un monde solo (moteur/solo.js), puis les changements
  let P = clone(Solo.PROFIL); for (const [c, v] of Object.entries(reglages.profil || {})) ecrire(P, c, v); S.profil = P;
  // 4. le monde : sa graine (un autre hasard pour la suite), son année (0 : pas de saisons)
  const W = reglages.monde || {};
  S.etat.monde.graine = W.graine ?? D.monde0.graine; S.etat.monde.annee = W.annee ?? D.monde0.annee;
  // 5. les biomes : leur capacité de base, leurs axes, leurs saisons. Le monde les fait bouger de lui-même (le climat, le milieu
  //    transformé, les natures) : un réglage y pose un écart (un facteur pour la capacité), et l'enlever retire cet écart, pas
  //    ce que le monde en a fait depuis
  const avant = D.biomesAppliques || {}, apres = reglages.biomes || {}, B = new Map(S.etat.biomes.map(b => [b.id, b]));
  for (const c of new Set([...Object.keys(avant), ...Object.keys(apres)])) {
    const [id, ...reste] = segments(c), b = B.get(id), b0 = D.biomes0[id], sous = reste.join('.'); if (!b || !b0 || !sous) continue;
    const base = sous === 'capacite_base' ? b0.capacite_base : sous.startsWith('axes.') ? b0.axes?.[reste[1]] : sous.startsWith('saisons.') ? (lire(b0.saisons, reste.slice(1).join('.')) ?? Orvane.REGLES.saisons?.[reste[1]]) : undefined;
    if (typeof base !== 'number') continue;
    const v0 = c in avant ? avant[c] : base, v1 = c in apres ? apres[c] : base; if (v0 === v1 || !Number.isFinite(v1)) continue;
    if (sous === 'capacite_base') { const f = v1 / Math.max(1e-9, v0); b.capacite_base = (b.capacite_base ?? b.capacite) * f; b.capacite = (b.capacite ?? b.capacite_base) * f; }
    else if (reste[0] === 'axes') { const k = reste[1], d = v1 - v0; b.axes[k] = +((b.axes[k] ?? base) + d).toFixed(6); if (b.transforme?.base && k in b.transforme.base) b.transforme.base[k] = +(b.transforme.base[k] + d).toFixed(6); }
    else { if (b.saisons === false || b.saisons === null) continue; if (!estObj(b.saisons)) b.saisons = {}; ecrire(b.saisons, reste.slice(1).join('.'), v1); }
  }
  D.biomesAppliques = clone(apres);
  // 6. les mécanismes : éveiller ce qui ne l'est pas, endormir (mettre de côté) ce qu'on ne veut plus voir tourner
  const voulu = reglages.mecanismes || {};
  for (const k of MECANISMES) {
    if (voulu[k] === true) E.push(...eveiller(S, k));
    else if (voulu[k] === false && ENDORMABLES.has(k)) endormir(S, k);
    if (voulu[k] !== false && D.endormis[k] !== undefined) reveiller(S, k);
  }
  return E;
}
function eveiller(S, k) {
  const cle = CLE_MONDE[k] || k, Mo = M[k]; if (S.etat.monde[cle] || S.direct.endormis[k] !== undefined || !Mo?.eveiller) return [];
  const r = k === 'collectif' ? Mo.eveiller(S.etat, { vue: Parcelles.regrouper }) : Mo.eveiller(S.etat, k === 'synthetique' || k === 'flore' ? {} : undefined);
  if (!r?.inst) return []; S.etat = r.inst; return r.evenements || [];
}
function endormir(S, k) { const cle = CLE_MONDE[k] || k; if (S.etat.monde[cle] === undefined || S.direct.endormis[k] !== undefined) return; S.direct.endormis[k] = S.etat.monde[cle]; delete S.etat.monde[cle]; }
function reveiller(S, k) { const cle = CLE_MONDE[k] || k; S.etat.monde[cle] = S.direct.endormis[k]; delete S.direct.endormis[k]; }
const mecanismes = S => Object.fromEntries(MECANISMES.map(k => [k, S.direct.endormis[k] !== undefined ? 'endormi' : S.etat.monde[CLE_MONDE[k] || k] ? 'eveille' : 'absent']));

// --- ce que fait le joueur, puis un cycle ---
const noter = (S, e) => Solo.noter(S, e);
function cycle(S) {
  if (DERNIER !== S) regler(S, S.direct.reglages || {});   // deux mondes dans la même page : chacun tourne avec ses réglages
  const t0 = Date.now(), avant = S.etat, notes = S.notes.length;
  const evenements = Solo.cycles(S, 1); S.direct.cycles++;
  let entrees = [];
  if (Chronique && S.direct.chronique) { try { const r = Chronique.noter(S.direct.chronique, avant, S.etat); S.direct.chronique = r.etat; entrees = r.entrees; } catch (e) { entrees = []; } }
  return { evenements, entrees, notes, duree: Date.now() - t0, n: S.etat.cycle.n };
}

// --- ce que la page dessine : la vue du monde solo (les bêtes et les machines, la vie en groupe) et ses plantes, biome par biome ---
function vue(S) {
  const V = Solo.vue(S), flore = {}, cap = Object.fromEntries(S.etat.biomes.map(b => [b.id, b.capacite || 1])), FO = M.flore?.FORMES || {};
  // (la biomasse d'une plante, en unités de capacité : ses pieds × la masse de sa forme ; sa part, rapportée à la capacité du lieu)
  for (const t of S.etat.taxons) { if (t.plan?.regime !== 'vegetal' || t.eteint) continue; const m = FO[t.plan.forme]?.m ?? t.plan.masse_kg ?? 1;
    for (const p of t.populations || []) { (flore[p.biome] ||= []).push({ id: t.id, nom: t.nom, forme: t.plan.forme || 'herbe', hauteur: t.plan.hauteur_m, effectif: p.effectif,
      part: +(p.effectif * m / cap[p.biome]).toFixed(4), tendance: p.tendance || 0, frequences: p.frequences || null }); } }
  V.flore = flore; V.mecanismes = mecanismes(S); V.direct = { cycles: S.direct.cycles, notes: S.notes.length };
  return V;
}
// les valeurs du moment, groupe par groupe (les règles du moteur : celles du monde par-dessus celles du module)
function valeurs(S) {
  const V = {}; for (const [g, f] of Object.entries(OBJETS)) { const o = f(); if (o) V[g] = clone(o); }
  V.orvane = fusion(V.orvane, S.etat.monde.regles || {});
  V.profil = clone(S.profil); V.monde = { graine: S.etat.monde.graine, annee: S.etat.monde.annee ?? 0 };
  V.biomes = Object.fromEntries(S.etat.biomes.map(b => [b.id, { capacite_base: b.capacite_base ?? b.capacite, axes: clone(b.axes), ...(b.saisons ? { saisons: clone(b.saisons) } : {}) }]));
  V.biomes0 = clone(S.direct.biomes0); V.regles0 = clone(S.direct.regles0); V.monde0 = clone(S.direct.monde0);
  return V;
}
const sauver = S => JSON.stringify(S, (k, v) => v === Infinity ? '∞' : v);
function charger(j, reglages) {
  const S = typeof j === 'string' ? JSON.parse(j, (k, v) => v === '∞' ? Infinity : v) : clone(j);
  if (S?.orvane_solo !== 1 || !S.direct) throw new Error('pas une partie de la simulation en direct');
  regler(S, reglages || S.direct.reglages || {});   // les réglages donnés, sinon ceux que la partie gardait
  return S;
}

const API = { creer, regler, noter, cycle, vue, valeurs, defauts, sauver, charger, mecanismes, lire, ecrire, MECANISMES, ENDORMABLES: [...ENDORMABLES], OBJETS: Object.keys(OBJETS) };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvaneNoyau = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
