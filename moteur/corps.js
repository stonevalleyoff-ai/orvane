// Orvane — LE CORPS (moteur/corps.js)
// À quoi ressemble une lignée. Le plan dit ce qu'elle pèse et comment elle vit ; le corps dit sa silhouette, pour que
// deux lignées se distinguent à l'œil et qu'un jeu puisse dessiner une créature qu'il n'a jamais vue.
// Rien ici n'est une statistique : ce sont des proportions (0 à 1) et des couleurs, que chaque traducteur rend à sa façon.
//
//   forme    quadrupede · hexapode · bipede · oiseau · serpent   le plan d'ensemble
//   pattes   0, 2, 4, 6 ou 8                                     (serpent : 0 ; bipède et oiseau : 2)
//   long     le tronc : 0 trapu, 1 très allongé                  haut     les pattes : 0 rase le sol, 1 échassier
//   cou · tete · museau · oreilles · queue   de 0 (absent) à 1 (marqué)
//   organes  une liste ouverte (docs/11) : [{ type, taille 0..1, nombre, place, forme }] — cornes, défenses, crête,
//            collerette, antennes, trompe, ailes, nageoires, carapace, plaques, épines, massue, aiguillon, panache, pinces
//            (ORGANES_CAT : où ils vont, combien, de quelle forme, à quoi ils servent, la conduite qu'ils prêtent à un jeu) ;
//            cornes · crete · ailes · carapace · antennes restent lisibles en proportions (0 à 1), pour les traducteurs d'avant
//   posture  0 à quatre pattes, 0,5 se dresse, 1 debout (docs/24) ; les mains (un organe) naissent de la vie dans les arbres
//   motif    uni · rayures · taches · bandes · masque
//   couleurs { robe, sombre, ventre, oeil } en [r, v, b]
//
// À chaque séparation, le corps dérive (deriver) : un peu au hasard, et surtout vers ce que le biome favorise —
// le froid raccourcit oreilles et queue, le couvert allonge la queue, la plaine grandit le cou, l'ombre fait pousser
// les antennes, et la robe glisse vers la teinte du sol. Un mode de déplacement gagné laisse sa marque (le vol
// donne des ailes, le fouissage un museau, la nage une queue) ; un organe neuf naît rarement (plutôt des armes chez un
// chasseur, des défenses chez une proie, des nageoires dans l'eau, une parade en terrain ouvert) ; très rarement, le plan
// d'ensemble change.
// Node (require) ou navigateur (globalThis.OrvaneCorps). Zéro dépendance.
(function (racine) {
'use strict';
const FORMES = ['quadrupede', 'hexapode', 'bipede', 'oiseau', 'serpent'];
const MOTIFS = ['uni', 'rayures', 'taches', 'bandes', 'masque'];
const NUM = ['long', 'haut', 'cou', 'tete', 'museau', 'oreilles', 'queue', 'cornes', 'crete', 'ailes', 'carapace', 'antennes'];
const PATTES = { quadrupede: 4, hexapode: 6, bipede: 2, oiseau: 2, serpent: 0 };
const ORGANES = ['cornes', 'crete', 'ailes', 'carapace', 'antennes'];   // ceux qui se lisent aussi en proportions (les traducteurs d'avant)
// Les organes : où ils vont, combien, sous quelle forme, à quoi ils servent ; la conduite qu'ils prêtent à un jeu (docs/7 :
// le même vocabulaire que le catalogue des traits) et ce qu'un joueur voit avant.
const ORGANES_CAT = {
  cornes:     { places: ['tete'], nombre: [1, 4], defaut: 2, formes: ['recourbees', 'droites', 'ramifiees'], fonction: 'combat', mot: ['corne', 'cornes'], fem: 1,
                conduite: { type: 'charge', force: 1.2, nom: 'à cornes', presage: 'baisse la tête, cornes en avant' } },
  defenses:   { places: ['tete'], nombre: [2, 2], defaut: 2, formes: ['recourbees', 'droites'], fonction: 'combat', mot: ['défense', 'défenses'], fem: 1,
                conduite: { type: 'charge', force: 1.25, nom: 'aux défenses', presage: 'relève ses défenses' } },
  crete:      { places: ['tete', 'dos'], nombre: [1, 1], defaut: 1, formes: ['lisse', 'dentelee'], fonction: 'parade', mot: ['crête', 'crêtes'], fem: 1 },
  collerette: { places: ['tete'], nombre: [1, 1], defaut: 1, formes: ['lisse', 'frangee'], fonction: 'avertissement', mot: ['collerette', 'collerettes'], fem: 1,
                conduite: { type: 'avertissement', nom: 'à collerette', presage: 'déploie sa collerette' } },
  antennes:   { places: ['tete'], nombre: [2, 2], defaut: 2, formes: ['fines', 'plumeuses'], fonction: 'perception', mot: ['antenne', 'antennes'], fem: 1,
                conduite: { type: 'perception-proche', force: 1.1, nom: 'aux antennes', presage: 'les antennes qui palpent l\'air' } },
  trompe:     { places: ['tete'], nombre: [1, 1], defaut: 1, formes: ['courte', 'longue'], fonction: 'recolte', mot: ['trompe', 'trompes'], fem: 1 },
  ailes:      { places: ['flancs'], nombre: [2, 4], defaut: 2, formes: ['plumes', 'membranes'], fonction: 'vol', mot: ['aile', 'ailes'], fem: 1 },
  nageoires:  { places: ['flancs', 'dos'], nombre: [1, 2], defaut: 2, formes: ['courtes', 'voiles'], fonction: 'nage', mot: ['nageoire', 'nageoires'], fem: 1 },
  carapace:   { places: ['dos'], nombre: [1, 1], defaut: 1, formes: ['bombee', 'segmentee'], fonction: 'protection', mot: ['carapace', 'carapaces'], fem: 1,
                conduite: { type: 'repli', force: 1.4, nom: 'à carapace', presage: 'des plaques bombées sur le dos' } },
  plaques:    { places: ['dos'], nombre: [3, 9], defaut: 5, formes: ['triangles', 'rondes'], fonction: 'protection', mot: ['plaque', 'plaques'], fem: 1,
                conduite: { type: 'protection', force: 1.2, nom: 'à plaques', presage: 'une rangée de plaques le long du dos' } },
  epines:     { places: ['dos', 'queue'], nombre: [4, 12], defaut: 7, formes: ['fines', 'massives'], fonction: 'defense', mot: ['épine', 'épines'], fem: 1,
                conduite: { type: 'protection', force: 1.15, nom: 'à épines', presage: 'hérisse ses épines' } },
  massue:     { places: ['queue'], nombre: [1, 1], defaut: 1, formes: ['ronde', 'cloutee'], fonction: 'combat', mot: ['massue', 'massues'], fem: 1,
                conduite: { type: 'charge', force: 1.3, nom: 'à massue', presage: 'balance sa queue lourde' } },
  aiguillon:  { places: ['queue'], nombre: [1, 1], defaut: 1, formes: ['droit', 'courbe'], fonction: 'venin', mot: ['aiguillon', 'aiguillons'], fem: 0,
                conduite: { type: 'riposte-contact', effet: 'venin', nom: 'à aiguillon', presage: 'la queue recourbée au-dessus du dos' } },
  panache:    { places: ['queue'], nombre: [1, 1], defaut: 1, formes: ['touffe', 'eventail'], fonction: 'parade', mot: ['panache', 'panaches'], fem: 0 },
  pinces:     { places: ['avant'], nombre: [2, 2], defaut: 2, formes: ['fines', 'massives'], fonction: 'saisie', mot: ['pince', 'pinces'], fem: 1,
                conduite: { type: 'morsure', force: 1.2, nom: 'à pinces', presage: 'ouvre et ferme ses pinces' } },
  // (docs/24) les mains : elles ne naissent pas au hasard, mais de la vie dans les arbres (deriver) ; elles atteignent les fruits
  mains:      { places: ['avant'], nombre: [2, 2], defaut: 2, formes: ['agiles', 'puissantes'], fonction: 'saisie', mot: ['main', 'mains'], fem: 1,
                conduite: { type: 'escalade', nom: 'à mains', presage: 'saisit une branche des deux mains' } },
};
const PLACE_MOT = { tete: 'sur la tête', dos: 'sur le dos', queue: 'au bout de la queue', flancs: 'sur les flancs', avant: 'à l\'avant' };
// la forme dite d'un organe : [féminin, masculin] au singulier ; l'accord se fait en nombre (accord)
const FORME_MOT = { recourbees: ['recourbée', 'recourbé'], droites: ['droite', 'droit'], ramifiees: ['ramifiée', 'ramifié'], dentelee: ['dentelée', 'dentelé'],
  frangee: ['frangée', 'frangé'], plumeuses: ['plumeuse', 'plumeux'], longue: ['longue', 'long'], membranes: ['membraneuse', 'membraneux'], voiles: ['en voile'],
  segmentee: ['segmentée', 'segmenté'], triangles: ['triangulaire', 'triangulaire'], massives: ['massive', 'massif'], cloutee: ['cloutée', 'clouté'],
  courbe: ['courbe', 'courbe'], eventail: ['en éventail'], rondes: ['ronde', 'rond'], agiles: ['agile', 'agile'], puissantes: ['puissante', 'puissant'] };
const accord = (forme, fem, plur) => { const m = FORME_MOT[forme]; if (!m) return ''; const f = m[fem || m.length < 2 ? 0 : 1];
  return !plur || f.startsWith('en ') || /[sx]$/.test(f) ? f : f + 's'; };
// un organe propre, quoi qu'on lui donne (null : un type inconnu)
// (docs/20) le catalogue propre d'un monde (catalogue.monde) : ses organes et ses formes de corps s'ajoutent à ceux-ci, sans les
// remplacer. Le moteur l'étend le temps d'un cycle ; un traducteur l'étend une fois, à la lecture de l'instantané
// (OrvaneCorps.etendre(inst.catalogue.monde)). Un organe du monde : { places, nombre, formes, fonction, mot, fem, conduite,
// poids (sa chance d'apparaître, 0,8 par défaut) } ; une forme : { nom, pattes, depuis (les formes dont elle peut naître), chance }.
let EXT = null, OCAT = ORGANES_CAT, FX = {};
function etendre(M) { const avant = EXT; EXT = M && (M.organes || M.formes) ? M : null; FX = EXT?.formes || {}; OCAT = ORGANES_CAT;
  if (EXT?.organes) { OCAT = {}; for (const [k, T] of Object.entries(EXT.organes)) if (!ORGANES_CAT[k]) OCAT[k] = { places: ['dos'], nombre: [1, 1], formes: ['simple'], fonction: 'parade', mot: [k, k + 's'], fem: 0, ...T };
    for (const k in OCAT) OCAT[k].defaut ??= OCAT[k].nombre[0]; OCAT = { ...ORGANES_CAT, ...OCAT }; }
  return avant; }
function organe(o) {
  const T = OCAT[o?.type]; if (!T) return null;
  const nb = Number.isFinite(o.nombre) ? Math.round(o.nombre) : T.defaut;
  return { type: o.type, taille: r2(clamp(Number.isFinite(o.taille) ? o.taille : .5, .05, 1)), nombre: Math.max(T.nombre[0], Math.min(T.nombre[1], nb)),
    place: T.places.includes(o.place) ? o.place : T.places[0], forme: T.formes.includes(o.forme) ? o.forme : T.formes[0] };
}
// les proportions d'avant (cornes, crête, ailes, carapace, antennes) d'après la liste : la taille du plus grand de chaque type
function synchroniser(n) { for (const k of ORGANES) n[k] = r2(Math.max(0, ...n.organes.filter(o => o.type === k).map(o => o.taille))); return n; }
function poser(n, type, taille, R, place) {   // un organe de ce type, à cette taille (le crée s'il manque)
  const o = n.organes.find(x => x.type === type && (!place || x.place === place));
  if (o) o.taille = r2(clamp(taille, .05, 1));
  else { const T = OCAT[type], u = R ? R() : 0; n.organes.push(organe({ type, taille, place: place || T.places[0], nombre: T.nombre[0] + Math.floor(u * (T.nombre[1] - T.nombre[0] + 1)), forme: T.formes[Math.floor((R ? R() : 0) * T.formes.length)] })); }
}
const DEFAUT = { forme: 'quadrupede', pattes: 4, long: .5, haut: .45, cou: .3, tete: .45, museau: .4, oreilles: .3, queue: .4, cornes: 0, crete: 0,
  ailes: 0, carapace: 0, antennes: 0, motif: 'uni', couleurs: { robe: [150, 130, 100], sombre: [100, 86, 66], ventre: [190, 176, 150], oeil: [40, 34, 30] } };
const MAX_ORGANES = 16;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const r2 = v => Math.round(v * 100) / 100;
const generateurDe = s => { let g = 2166136261; for (let i = 0; i < s.length; i++) { g ^= s.charCodeAt(i); g = Math.imul(g, 16777619); } g >>>= 0; return () => { g = (Math.imul(g, 1664525) + 1013904223) >>> 0; return g / 4294967296; }; };
const mix = (a, b, k) => a.map((v, i) => Math.round(clamp(v + (b[i] - v) * k, 0, 255)));

// un corps complet et propre, quoi qu'on lui donne (champs manquants : ceux du défaut)
function normaliser(c) {
  c = c || {};
  // (une forme que ce catalogue ne connaît pas : son repli si elle le dit, sinon le serpent, comme le veut docs/33 — pas un quadrupède)
  const n = { forme: FORMES.includes(c.forme) || FX[c.forme] ? c.forme : c.forme && typeof c.forme === 'string' ? (FORMES.includes(c.repli) ? c.repli : 'serpent') : DEFAUT.forme };
  n.pattes = FX[n.forme] ? (Number.isFinite(c.pattes) ? Math.max(0, Math.min(FX[n.forme].pattes > 12 ? 60 : 12, Math.round(c.pattes))) : FX[n.forme].pattes ?? 4)   // (docs/33 : un corps segmenté porte jusqu'à soixante pattes)
    : Number.isFinite(c.pattes) && c.forme === n.forme ? Math.max(0, Math.min(8, Math.round(c.pattes / 2) * 2)) : PATTES[n.forme];   // (une forme repliée prend les pattes de son repli)
  // (docs/24) la posture : 0 à quatre pattes (ou au ras du sol), 0,5 se dresse, 1 debout ; un bipède, un oiseau sont debout
  n.posture = Number.isFinite(c.posture) ? r2(clamp(c.posture)) : n.forme === 'bipede' || n.forme === 'oiseau' ? 1 : 0;
  for (const k of NUM) n[k] = r2(clamp(Number.isFinite(c[k]) ? c[k] : DEFAUT[k]));
  n.motif = MOTIFS.includes(c.motif) ? c.motif : 'uni';
  // les organes : la liste si elle est là ; sinon, ceux qu'un corps d'avant marque en proportions (au-delà de 0,2)
  const liste = Array.isArray(c.organes) ? c.organes : ORGANES.filter(k => Number.isFinite(c[k]) && c[k] >= .2).map(k => ({ type: k, taille: c[k] }));
  const vus = new Set(); n.organes = [];
  for (const o of liste.map(organe).filter(Boolean)) { const k = o.type + '@' + o.place; if (!vus.has(k)) { vus.add(k); n.organes.push(o); } }
  if (n.organes.length > MAX_ORGANES) n.organes = n.organes.sort((a, b) => b.taille - a.taille).slice(0, MAX_ORGANES);   // les plus grands
  n.organes.sort((a, b) => a.type < b.type ? -1 : a.type > b.type ? 1 : a.place < b.place ? -1 : 1);
  synchroniser(n);
  const C = c.couleurs || {}, D = DEFAUT.couleurs, ok = v => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
  n.couleurs = {};
  for (const k of ['robe', 'sombre', 'ventre', 'oeil']) n.couleurs[k] = ok(C[k]) ? C[k].map(v => Math.round(clamp(v, 0, 255))) : D[k].slice();
  return n;
}

// la teinte vers laquelle un sol tire les robes : un mélange pondéré par ce que le biome a d'extrême
function teinteBiome(ax) {
  const a = k => ax?.[k] ?? .5;
  const P = [
    [[150, 130, 100], .6],                                                        // la terre ordinaire
    [[226, 228, 234], clamp((.3 - a('temperature')) * 4)],                        // le froid : pâle
    [[204, 122, 62], clamp((a('temperature') - .7) * 3) * clamp((.35 - a('humidite')) * 3)],   // le chaud et sec : ocre, rouille
    [[84, 104, 62], clamp((a('humidite') - .7) * 3)],                             // l'humide : olive
    [[66, 78, 48], clamp((a('couvert') - .65) * 3)],                              // le couvert : vert sombre, écorce
    [[92, 80, 116], clamp((.35 - a('lumiere')) * 3)],                             // l'ombre : violacé, sourd
    [[132, 134, 144], clamp((a('altitude') - .6) * 2.5)],                         // la roche : gris
  ];
  let z = 0; const s = [0, 0, 0];
  for (const [c, w] of P) { z += w; for (let i = 0; i < 3; i++) s[i] += c[i] * w; }
  return s.map(v => Math.round(v / z));
}
// tourner une teinte (en degrés), en gardant sa clarté
function tourner(c, deg) {
  const [r, g, b] = c.map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (d < 1e-6) return c.slice();
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + deg + 360) % 360;
  const C = (1 - Math.abs(2 * l - 1)) * s, X = C * (1 - Math.abs((h / 60) % 2 - 1)), m = l - C / 2;
  const [r1, g1, b1] = h < 60 ? [C, X, 0] : h < 120 ? [X, C, 0] : h < 180 ? [0, C, X] : h < 240 ? [0, X, C] : h < 300 ? [X, 0, C] : [C, 0, X];
  return [r1, g1, b1].map(v => Math.round(clamp((v + m) * 255, 0, 255)));
}

// La dérive d'une lignée qui se sépare. c : le corps du parent ; plan : le plan de la lignée (déjà dérivé) ; b : le biome
// où elle naît ; R : le tirage du cycle ; A : l'ampleur (1 dans un monde qui tourne, plus dans la genèse) ; gagnes : les modes
// de déplacement que la lignée vient d'acquérir ; k : le rapport de masse lignée / parent.
// (docs/33) les formes du monde qui peuvent naître d'un corps de cette forme, pour une lignée qui vit ainsi (déplacement, masse)
function formesIci(forme, plan) { const loco = plan?.locomotion || [], m = plan?.masse_kg ?? 1;
  return Object.entries(FX).filter(([id, F]) => id !== forme && (F.depuis || []).includes(forme)
    && (!F.loco || F.loco.some(l => loco.includes(l))) && (F.masse_max == null || m <= F.masse_max) && (F.masse_min == null || m >= F.masse_min)); }
function deriver(c, plan, b, R, A = 1, gagnes = [], k = 1, fx = 0) {
  const n = normaliser(c), ax = b?.axes || {}, j = s => (R() - .5) * 2 * s * A, ajoute = (key, v) => { n[key] = clamp(n[key] + v * A); }, marque = (key, v) => { n[key] = clamp(n[key] + v); };
  // les proportions dérivent un peu (un léger rappel : elles ne filent pas aux extrêmes) ; les organes ne dérivent que s'ils
  // sont là — leur taille, rarement leur nombre ou leur forme — et se perdent en dessous de 0,2 : ils naissent par
  // innovation (plus bas), pas par accumulation de hasards
  for (const key of NUM) if (!ORGANES.includes(key)) n[key] = clamp(n[key] + j(.07) + (DEFAUT[key] - n[key]) * .04 * A);
  for (const o of n.organes) { const T = OCAT[o.type];
    o.taille = clamp(o.taille + j(.08));
    if (R() < .1 * A && T.nombre[1] > T.nombre[0]) o.nombre = Math.max(T.nombre[0], Math.min(T.nombre[1], o.nombre + (R() < .5 ? -1 : 1) * Math.max(1, Math.round((T.nombre[1] - T.nombre[0]) / 4))));
    if (R() < .05 * A && T.formes.length > 1) o.forme = T.formes[Math.floor(R() * T.formes.length)]; }
  n.organes = n.organes.filter(o => o.taille >= .2);
  // un organe neuf : plutôt des armes chez un chasseur, des défenses chez une proie, des nageoires dans l'eau, une parade
  // en terrain ouvert, des antennes dans l'ombre ; un organe perdu, plus rarement
  const ax0 = b?.axes || {}, reg = plan?.regime, poids = {
    cornes: reg === 'carnivore' ? 1.5 : 1, defenses: reg === 'herbivore' || reg === 'omnivore' ? 1 : .4, crete: (ax0.couvert ?? .5) < .35 ? 1.5 : .8, collerette: 1,
    antennes: (ax0.lumiere ?? .5) < .4 ? 2 : .7, trompe: reg === 'herbivore' || reg === 'omnivore' ? .8 : .2, nageoires: b?.milieu === 'aquatique' || b?.milieu === 'amphibie' || (plan?.locomotion || []).includes('nage') ? 2.5 : .1,
    carapace: reg === 'carnivore' ? .5 : 1.3, plaques: reg === 'carnivore' ? .5 : 1.2, epines: reg === 'carnivore' ? .4 : 1.3, massue: .7, aiguillon: n.forme === 'hexapode' ? 1.5 : .6,
    panache: (ax0.couvert ?? .5) < .4 ? 1.2 : .6, pinces: n.forme === 'hexapode' ? 1.8 : .2 };
  if (EXT?.organes) for (const k in EXT.organes) if (!(k in poids) && !ORGANES_CAT[k]) poids[k] = EXT.organes[k].poids ?? .8;   // (docs/20) ceux du monde
  if (R() < .06 * A) {
    const C2 = Object.keys(poids).filter(k => !n.organes.some(o => o.type === k) && !(n.forme === 'serpent' && ['pinces', 'massue', 'panache'].includes(k)));
    const z = C2.reduce((a, k) => a + poids[k], 0); let u = R() * z;
    for (const k of C2) { u -= poids[k]; if (u <= 0) { const T = OCAT[k];
      n.organes.push(organe({ type: k, taille: .3 + .35 * R(), nombre: T.nombre[0] + Math.floor(R() * (T.nombre[1] - T.nombre[0] + 1)), place: T.places[Math.floor(R() * T.places.length)], forme: T.formes[Math.floor(R() * T.formes.length)] })); break; } }
  } else if (R() < .03 * A) { const o = n.organes.filter(x => x.type !== 'ailes'); if (o.length) { const x = o[Math.floor(R() * o.length)]; n.organes = n.organes.filter(y => y !== x); } }
  synchroniser(n);
  const t = ax.temperature ?? .5, h = ax.humidite ?? .5, al = ax.altitude ?? .5, lu = ax.lumiere ?? .5, co = ax.couvert ?? .5;
  if (t < .3) { ajoute('oreilles', -.1); ajoute('queue', -.06); ajoute('long', -.05); }                  // le froid : des extrémités courtes
  if (t > .75 && h < .3) ajoute('oreilles', .1);                                                         // le désert : de grandes oreilles
  if (co > .65) { ajoute('queue', .06); ajoute('haut', -.04); }                                          // le couvert : bas sur pattes, une queue pour l'équilibre
  if (al > .6) { ajoute('haut', -.05); ajoute('cou', -.04); }                                            // la roche : trapu
  if (co < .25 && lu > .8) { ajoute('haut', .05); ajoute('cou', .05); }                                  // la plaine ouverte : on voit venir de loin
  if (lu < .35) for (const o of n.organes) if (o.type === 'antennes') o.taille = clamp(o.taille + .08 * A);   // l'ombre : on tâte, des antennes plus longues
  for (const l of gagnes) {                                                                              // la marque d'un mode de déplacement gagné (une fois)
    if (l === 'vol') { poser(n, 'ailes', Math.max(n.ailes, .55 + .35 * R()), R); if (n.forme === 'bipede') { n.forme = 'oiseau'; n.pattes = 2; } }
    if (l === 'nage') { marque('queue', .12); marque('museau', .04); if (R() < .5) poser(n, 'nageoires', .35 + .3 * R(), R, 'flancs'); }
    if (l === 'fouissage') { marque('museau', .12); marque('haut', -.1); marque('oreilles', -.08); }
    if (l === 'grimpe') { marque('queue', .12); marque('long', .04); }
    if (l === 'saut') marque('haut', .1);
    if (l === 'course') { marque('haut', .06); marque('long', .03); }
  }
  // (docs/24) les corps assemblés : la vie dans les arbres donne des mains, et un porteur de mains se redresse ; debout, il devient
  // bipède. Ces tirages ont leur propre hasard (graine tirée du corps lui-même) : celui du cycle ne bouge pas, et une lignée qui
  // ne vit pas dans les arbres dérive exactement comme avant
  { const loco = plan?.locomotion || [], m = plan?.masse_kg || 1, reg = plan?.regime, co = ax.couvert ?? .5;
    const Rm = generateurDe(JSON.stringify([n.long, n.haut, n.cou, n.queue, n.museau, n.organes.length, b?.id || '', m]));
    const arbre = loco.includes('grimpe') && co >= .5 && (reg === 'herbivore' || reg === 'omnivore') && m >= .1 && m <= 150 && (n.forme === 'quadrupede' || n.forme === 'bipede');
    if (arbre && !n.organes.some(o => o.type === 'mains') && Rm() < .25 * A) poser(n, 'mains', .45 + .3 * Rm(), Rm, 'avant');
    if (n.organes.some(o => o.type === 'mains')) {
      if (loco.includes('grimpe')) n.posture = r2(clamp(n.posture + .12 * A * Rm()));                                   // assis, suspendu : il se redresse
      if ((loco.includes('marche') || loco.includes('course')) && co < .45) n.posture = r2(clamp(n.posture + .25 * A * Rm()));   // descendu des arbres, en terrain ouvert : il se lève
      if (n.forme === 'quadrupede' && n.posture >= .8) { n.forme = 'bipede'; n.pattes = 2; }                             // un simien debout
    } }
  // très rarement, le plan d'ensemble change (ou rien : la plupart des tirages ne changent rien)
  if (R() < .02 * A * A) {
    const loco = plan?.locomotion || [], u = R();
    if (n.forme === 'quadrupede') {
      if ((loco.includes('saut') || loco.includes('course')) && u < .35) { n.forme = loco.includes('vol') ? 'oiseau' : 'bipede'; n.pattes = 2; }
      else if (n.long > .65 && n.haut < .3 && u < .6) { n.forme = 'serpent'; n.pattes = 0; n.long = Math.max(n.long, .85); }
      else if (u < .8) { n.forme = 'hexapode'; n.pattes = 6; }
    } else if (n.forme === 'hexapode') {
      if (u < .35) { n.forme = 'quadrupede'; n.pattes = 4; }
      else if (u < .5) n.pattes = n.pattes === 8 ? 6 : 8;
    } else if (n.forme === 'bipede' && u < .3) { n.forme = 'quadrupede'; n.pattes = 4; }
    else if (n.forme === 'serpent' && u < .35) { n.forme = 'quadrupede'; n.pattes = 4; n.haut = .12; }
    // (docs/20) une forme du monde naît d'une de celles qu'elle nomme (depuis), à sa chance
    const C3 = formesIci(n.forme, plan);
    if (C3.length) { const [id, F] = C3[Math.floor(R() * C3.length)]; if (R() < (F.chance ?? .3)) { n.forme = id; n.pattes = F.pattes ?? n.pattes; } }
  }
  if (n.forme === 'serpent') { n.pattes = 0; n.long = Math.max(n.long, .8); }
  // (docs/33) un corps segmenté gagne ou perd des anneaux ; un corps rayonné, à tentacules, un bras
  if (FX[n.forme]?.repli && R() < .2 * A) { const S = n.forme === 'segmente' ? [10, 40, 2] : n.forme === 'radiaire' ? [4, 8, 1] : [6, 10, 2], d = R() < .5 ? -S[2] : S[2]; n.pattes = Math.max(S[0], Math.min(S[1], (n.pattes || S[0]) + d)); }
  if (n.forme === 'segmente') n.long = Math.max(n.long, .8);
  if (n.forme === 'bipede' || n.forme === 'oiseau') n.posture = Math.max(n.posture, .9); else if (n.forme === 'serpent' || n.forme === 'hexapode' || FX[n.forme]?.repli) n.posture = 0;   // (docs/24)
  // la masse : une lignée plus grande a une tête plus petite, à proportion (et l'inverse)
  if (k > 0 && k !== 1) ajoute('tete', -.12 * Math.log2(k) / A);
  // la robe glisse vers la teinte du sol (le camouflage), tourne un peu ; parfois elle s'avive (la parade, l'avertissement)
  const C = n.couleurs, cible = teinteBiome(ax), g = (.06 + .12 * R()) * Math.sqrt(A), rot = j(18);
  C.robe = tourner(mix(C.robe, cible, g), rot);
  C.sombre = tourner(mix(C.sombre, cible.map(v => v * .62), g * .8), rot);
  if (R() < .08 * A) { const vive = tourner([200, 70, 50], R() * 360), k2 = .35 + .3 * R(); C.robe = mix(C.robe, vive, k2); C.sombre = mix(C.sombre, vive.map(v => v * .55), k2 * .8); }
  C.ventre = tourner(mix(C.ventre, mix(C.robe, [240, 236, 226], .45), .3), rot * .5);
  if (lu < .35) C.oeil = mix(C.oeil, [200, 236, 255], .3);                                             // dans l'ombre, des yeux pâles
  C.oeil = C.oeil.map(v => Math.round(clamp(v + j(10), 0, 255)));
  if (R() < .12 * A) n.motif = MOTIFS[Math.floor(R() * MOTIFS.length)];
  // (docs/33, équilibrage du 5 novembre) les formes du monde naissent aussi hors des grands changements de plan : à la séparation
  // d'une lignée qui vit là où l'une d'elles peut naître, à sa chance × fx (REGLES.derive.formes, 0 par défaut : rien ne change).
  // Tout à la fin, avec un hasard tiré du corps lui-même : la dérive ne tire rien de plus du hasard du cycle
  if (fx > 0) { const C4 = formesIci(n.forme, plan);
    if (C4.length) { const Rf = generateurDe('formes' + JSON.stringify([n.long, n.haut, n.queue, n.museau, n.organes.length, b?.id || '', plan?.masse_kg, plan?.regime]));
      const [id, F] = C4[Math.floor(Rf() * C4.length)];
      if (Rf() < Math.min(1, fx * (F.chance ?? .3))) { n.forme = id; n.pattes = F.pattes ?? n.pattes; if (id === 'segmente') n.long = Math.max(n.long, .8); if (F.repli) n.posture = 0; } } }
  for (const o of n.organes) o.taille = r2(o.taille);
  for (const key of NUM) if (!ORGANES.includes(key)) n[key] = r2(n[key]);
  n.organes.sort((a, b) => a.type < b.type ? -1 : a.type > b.type ? 1 : a.place < b.place ? -1 : 1);
  return synchroniser(n);
}

// l'écart entre deux corps : 0 identiques ; au-delà de ~0,35, l'œil voit une autre bête
function distance(a, b) {
  a = normaliser(a); b = normaliser(b);
  const P = NUM.filter(k => !ORGANES.includes(k)), d = Math.sqrt(P.reduce((s, k) => s + (a[k] - b[k]) ** 2, 0) / NUM.length);
  const dc = Math.hypot(...a.couleurs.robe.map((v, i) => v - b.couleurs.robe[i])) / 441;
  // les organes : un organe que l'un a et pas l'autre se voit ; un organe commun, à proportion de l'écart de taille
  const cle = o => o.type + '@' + o.place, A2 = new Map(a.organes.map(o => [cle(o), o])), B2 = new Map(b.organes.map(o => [cle(o), o]));
  let dO = 0; for (const k of new Set([...A2.keys(), ...B2.keys()])) { const x = A2.get(k), y = B2.get(k); dO += x && y ? Math.abs(x.taille - y.taille) * .5 + (x.forme !== y.forme ? .05 : 0) : (x || y).taille * .45; }
  return r2(d + Math.min(1, dO) + (a.forme !== b.forme ? 1 : 0) + (a.pattes !== b.pattes ? .5 : 0) + (a.motif !== b.motif ? .08 : 0) + dc * .5);
}

// une phrase pour l'observatoire et les fiches : « quadrupède trapu, haut sur pattes, longue queue, cornes »
// (docs/11) un poisson : un corps sans pattes (le plan « serpent ») d'une lignée qui ne vit que dans l'eau — elle nage, et ne
// marche, ne court, ne saute, ne rampe, ne fouit, ne grimpe ni ne vole (docs/25 ; Stone Valley, §221). Ce n'est pas une forme de
// plus : les données disent « serpent », et rien ne change pour la simulation. C'est ainsi qu'on la lit, qu'on la décrit et qu'on
// la dessine : allure(corps, plan) dit « poisson », ou la forme du corps
const TERRESTRES = ['marche', 'course', 'saut', 'reptation', 'fouissage', 'grimpe', 'vol'];
const nageurPur = loco => (loco || []).includes('nage') && !(loco || []).some(l => TERRESTRES.includes(l));
function allure(c, plan) { const f = normaliser(c).forme; return f === 'serpent' && nageurPur(plan?.locomotion) ? 'poisson' : f; }
function decrire(c, plan) {
  c = normaliser(c);
  const F = { quadrupede: 'quadrupède', hexapode: 'hexapode', bipede: 'bipède', oiseau: 'oiseau', serpent: allure(c, plan) === 'poisson' ? 'poisson' : 'serpentiforme' };
  const simien = c.organes.some(o => o.type === 'mains') && (c.forme === 'quadrupede' || c.forme === 'bipede');   // (docs/24)
  const L = [(simien ? (c.forme === 'bipede' ? 'simien debout' : c.posture >= .4 ? 'simien qui se dresse' : 'simien') : F[c.forme] || FX[c.forme]?.nom || c.forme) + (c.forme === 'hexapode' && c.pattes !== 6 || FX[c.forme] && c.pattes ? ` à ${c.pattes} ${c.forme === 'radiaire' || c.forme === 'tentaculaire' ? 'bras' : 'pattes'}` : '') + (c.long > .7 ? ' allongé' : c.long < .3 ? ' trapu' : '')];
  if (c.forme !== 'serpent' && !FX[c.forme]?.repli) L.push(c.haut > .7 ? 'haut sur pattes' : c.haut < .2 ? 'ras du sol' : '');   // (une pieuvre, une méduse n'ont pas de pattes à mesurer)
  const q = (k, mots) => { const v = c[k]; return v >= .7 ? mots[1] : v >= .35 ? mots[0] : ''; };
  L.push(q('cou', ['cou dégagé', 'long cou']), q('queue', ['queue', 'longue queue']), q('oreilles', ['oreilles', 'grandes oreilles']), q('museau', ['museau', 'long museau']));
  const CHIFFRES = ['', 'un', 'deux', 'trois', 'quatre'];
  for (const o of c.organes) { const T = OCAT[o.type], plur = o.nombre > 1, fs = accord(o.forme, T.fem, plur);
    const n = o.nombre > 4 ? 'des' : o.nombre === 1 ? (T.fem ? 'une' : 'un') : CHIFFRES[o.nombre], grand = o.taille >= .7 ? (T.fem ? (plur ? 'grandes ' : 'grande ') : (plur ? 'grands ' : 'grand ')) : '';
    L.push(`${n === 'des' && grand ? 'de' : n} ${grand}${T.mot[plur ? 1 : 0]}${fs ? ' ' + fs : ''}${['dos', 'queue', 'avant'].includes(o.place) && o.type !== 'mains' ? ' ' + (o.type === 'epines' && o.place === 'queue' ? 'sur la queue' : PLACE_MOT[o.place]) : ''}`); }
  if (c.motif !== 'uni') L.push(c.motif === 'masque' ? 'masque sombre' : c.motif);
  return L.filter(Boolean).join(', ');
}

// le catalogue tel qu'il part dans l'instantané (catalogue.organes) : un jeu y lit les places, les formes et les conduites
// des organes sans connaître ce fichier ; un type ajouté ici y paraît sans toucher au schéma
const catalogueOrganes = () => JSON.parse(JSON.stringify(OCAT));
const API = { FORMES, MOTIFS, NUM, PATTES, ORGANES, ORGANES_CAT, DEFAUT, normaliser, deriver, distance, decrire, allure, nageurPur, teinteBiome, tourner, organe, catalogueOrganes, etendre };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvaneCorps = API;
})(globalThis);
