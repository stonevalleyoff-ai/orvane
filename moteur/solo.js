// Orvane — UN MONDE SOLO (moteur/solo.js) — docs/19
// Un jeu peut faire vivre son propre monde, à son rythme, dans le jeu lui-même : un cycle par heure, par dix minutes, par
// session, ou en accéléré. Il part d'un instantané publié (le monde d'Orvane tel qu'il est ce jour-là) ou d'un monde à lui, et
// rien n'en part vers le monde partagé : c'est une copie qui vit sa vie. Ce que font ses joueurs y pèse, par le même tampon.
//   const S = OrvaneSolo.creer(instantane, { periode: '10m' })   // un monde solo, d'un instantané
//   OrvaneSolo.noter(S, { taxon, biome, action: 'prelevement', n: 1 })   // ce que fait le joueur (le format des lots, docs/4)
//   OrvaneSolo.avancer(S, Date.now())   // les cycles dus depuis la dernière fois (au plus S.rattrapage) : rend leurs événements
//   OrvaneSolo.cycles(S, 5)             // cinq cycles tout de suite (l'accéléré, une session qui commence)
//   OrvaneSolo.sauver(S) / OrvaneSolo.charger(json)   // de quoi le garder (localStorage, un fichier)
//   OrvaneSolo.vue(S)                   // ce que le jeu lit : l'instantané du monde solo, par biome, sans les plantes
// Le moteur, le tampon et les parcelles doivent être chargés (Node : require ; navigateur : leurs balises <script>).
// Déterministe : même monde, mêmes notes, mêmes cycles. Node (require) ou navigateur (globalThis.OrvaneSolo).
'use strict';
(function (racine) {
const R = n => typeof require === 'function' ? require(n) : null;
const Orvane = R('./orvane.js') || racine.Orvane, Tampon = R('../tampon/tampon.js') || racine.OrvaneTampon, Parcelles = R('./parcelles.js') || racine.OrvaneParcelles;
const clone = o => JSON.parse(JSON.stringify(o));
const periodeDe = c => { if (typeof c === 'number') return c; c = String(c || '24h'); const n = parseFloat(c) || 24; return c.endsWith('d') ? n * 864e5 : c.endsWith('min') || c.endsWith('m') ? n * 6e4 : c.endsWith('s') ? n * 1e3 : n * 36e5; };
// le profil d'un monde solo : l'exposition neutre (le jeu voit tout tel quel) et une influence à l'échelle d'un seul joueur
const PROFIL = { exposition: { compression: { defaut: 1 }, propagation_cycles: 1 },
  influence: { poids: { prelevement: 1, capture: 1, liberation: -1, nourrissage: -.1, rencontre: 0, reproduction: -1, deplacement: 1, habitat_perdu: 5, habitat_gagne: -5 },
    denormaliser: false, exposition_ref: 100, plafonds: { par_compte_cycle: null, part_max_compte: null, part_max_population: .3 }, memoire_cycles: 1 } };

function creer(source, opt = {}) {
  const etat = clone(source); delete etat.precedent;
  const id = opt.id || `${source.monde?.id || 'monde'}-solo`, maintenant = opt.maintenant ?? Date.now();
  etat.monde = { ...etat.monde, id, nom: opt.nom || `${source.monde?.nom || id} (solo)`, ne: new Date(maintenant).toISOString(), solo: { depuis: source.monde?.id || null, cycle: source.cycle?.n ?? 0 } };
  if (opt.graine != null) etat.monde.graine = opt.graine;
  // un instantané publié est par biome : ce qu'il garde des parcelles n'est qu'un décompte, que le monde solo n'a pas à porter
  if (!etat.monde.parcelles?.types) { delete etat.monde.parcelles; delete etat.parcelles; if (etat.monde.mere) delete etat.monde.mere.parcelle; etat.taxons.forEach(t => t.populations.forEach(p => delete p.parcelles)); }
  // (docs/17) les plantes sont publiées à part : avec flore.json (opt.flore), le monde solo a sa flore ; sans, il tourne sans elle
  if (opt.flore?.taxons?.length) { const ids = new Set(etat.taxons.map(t => t.id)); etat.taxons.push(...clone(opt.flore.taxons).filter(t => !ids.has(t.id))); etat.catalogue = { ...etat.catalogue, flore: opt.flore.catalogue?.flore || etat.catalogue?.flore }; }
  else if (!etat.taxons.some(t => t.plan?.regime === 'vegetal')) { delete etat.monde.flore; etat.taxons.forEach(t => t.populations.forEach(p => { delete p.nourriture; delete p.recouvrement; })); }
  etat.cycle = { ...(etat.cycle || { n: 0 }), date: new Date(maintenant).toISOString(), pressions_recues: 0 }; etat.evenements = [];
  return { orvane_solo: 1, etat, periode: periodeDe(opt.periode || '1h'), acceleration: opt.acceleration || 1, rattrapage: opt.rattrapage ?? 24,
    dernier: maintenant, notes: [], tampon: {}, profil: clone(opt.profil || PROFIL) };
}
// ce que fait le joueur : un événement au format des lots (taxon, biome, action, n ; phenotype, q, parcelle facultatifs)
function noter(S, e) { if (e && e.taxon && e.biome && e.action && e.n > 0) S.notes.push({ ...e }); return S.notes.length; }
// un cycle : les notes passent au tampon, le moteur avance
function un(S, ms) {
  const lots = S.notes.length ? [{ monde: S.etat.monde.id, source: { jeu: 'solo', compte: 'joueur' }, familles: ['animale', 'synthetique', 'vegetale'], evenements: S.notes }] : [];
  const vue = Parcelles.regrouper(S.etat), r = Tampon.agreger(lots, vue, S.profil, S.tampon);
  S.tampon = r.etat; S.notes = [];
  S.etat = Orvane.cycle(S.etat, Parcelles.repartir(r.pressions, S.etat, Parcelles.localiser(lots, S.etat)), { duree_ms: ms });
  return S.etat.evenements || [];
}
function cycles(S, n) { const ev = []; for (let k = 0; k < Math.max(0, n | 0); k++) ev.push(...un(S, S.periode)); return ev; }
// les cycles dus depuis la dernière fois : le temps écoulé × l'accéléré, rapporté à la période (au plus S.rattrapage d'un coup ; le
// reste est perdu, comme un monde qu'on n'a pas ouvert depuis longtemps et qui ne rattrape que son dernier jour)
function avancer(S, maintenant = Date.now()) {
  const du = Math.floor((maintenant - S.dernier) * S.acceleration / S.periode); if (du < 1) return [];
  const n = Math.min(du, S.rattrapage); S.dernier += du * S.periode / S.acceleration; return cycles(S, n);
}
const vue = S => Tampon.filtrer(Parcelles.regrouper(S.etat), { familles: ['animale', 'synthetique'] });
const sauver = S => JSON.stringify(S);
const charger = j => { const S = typeof j === 'string' ? JSON.parse(j) : clone(j); if (S?.orvane_solo !== 1) throw new Error('pas un monde solo'); return S; };

const API = { creer, noter, avancer, cycles, vue, sauver, charger, periodeDe, PROFIL };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvaneSolo = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
