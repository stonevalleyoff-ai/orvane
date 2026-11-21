// Orvane — PONDRE OU METTRE BAS (moteur/ponte.js) — docs/25
// Une lignée pond des œufs ou met bas des petits (plan.reproduction : ovipare, vivipare).
//  - un pondeur a plus de petits (×1,4), mais ses œufs ont besoin de chaleur (sans couvée, le froid en perd jusqu'à 60 %) et se
//    font piller par les mangeurs d'œufs ; des soins aux petits (le trait soins-parentaux), ou un oiseau qui couve, gardent le nid
//    et le tiennent au chaud ;
//  - un vivipare a moins de petits, mais à l'abri du froid et des pillards : le froid favorise les vivipares ;
//  - les mangeurs d'œufs (oophage, un trait qui n'apparaît que dans un monde où l'on pond) font plus de petits là où l'on pond ;
//  - une lignée qui se sépare peut changer de mode, rarement (plus souvent au froid) ; un oiseau pond toujours.
// Tout se rapporte à ce qu'était chaque lignée à l'éveil : le jour de l'éveil, rien ne change (docs/17, la même règle). Un monde
// sans ponte éveillée n'en voit rien. Déterministe. Node (require) ou navigateur (globalThis.OrvanePonte).
'use strict';
(function (racine) {
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const REGLES = {
  oeufs: 1.4,                                       // un pondeur a 40 % de petits en plus qu'un vivipare
  froid: { seuil: .5, perte: .6 },                  // sous 0,5 de température, des œufs que personne ne couve se perdent, jusqu'à 60 %
  pillage: { max: .5, demi: .1, garde: .5 },        // les mangeurs d'œufs pillent jusqu'à la moitié des nids (à moitié quand ils pèsent 10 % des pondeurs) ; un nid gardé, deux fois moins
  festin: .3,                                        // un mangeur d'œufs fait jusqu'à 30 % de petits en plus
  passage: { vers_vivipare: .03, froid: 3, vers_ovipare: .003 }   // à la séparation : un pondeur devient vivipare (×3 au froid), un vivipare pondeur (bien plus rarement)
};
const TRAITS = {
  oophage: { domaine: 'offense', organe: 'museau fin, flair des nids', cout: .06, effet: 'mange les œufs des pondeurs : plus de petits là où l\'on pond, et des nids pillés',
    conduite: { type: 'perception-proche', presage: 'fouille le sol et les buissons, le nez au ras des nids' } }
};
const estAnimal = t => t.plan?.regime !== 'vegetal' && t.plan?.regime !== 'synthetique' && !t.eteint;
const mange = r => r === 'omnivore' || r === 'carnivore';
// le mode d'une lignée à l'éveil : d'après son corps et sa vie
function modeDe(plan) {
  const c = plan.corps || {}, loco = plan.locomotion || [];
  if (c.forme === 'oiseau' || c.forme === 'serpent' || c.forme === 'hexapode') return 'ovipare';
  if (plan.regime === 'filtreur' || (loco.includes('nage') && !loco.some(l => ['marche', 'course', 'grimpe', 'saut'].includes(l)))) return 'ovipare';   // les poissons
  if ((plan.masse_kg || 1) < .02) return 'ovipare';                                                                                                   // les insectes
  return (c.carapace || 0) >= .3 || (c.organes || []).some(o => o.type === 'plaques' || o.type === 'carapace') ? 'ovipare' : 'vivipare';   // une bête à carapace ou à plaques, comme une tortue ou un lézard
}
const couve = (plan, traits) => plan.corps?.forme === 'oiseau' || (traits || []).includes('soins-parentaux');
// ce que donne un mode, dans un lieu : les œufs perdus au froid, et ceux que pillent les mangeurs d'œufs
function rendement(mode, plan, traits, b, pillage) {
  if (mode !== 'ovipare') return 1;
  const T = b?.axes?.temperature ?? .5, garde = couve(plan, traits), froid = garde ? 0 : REGLES.froid.perte * clamp((REGLES.froid.seuil - T) / REGLES.froid.seuil);
  return REGLES.oeufs * (1 - froid) * (1 - pillage * (garde ? REGLES.pillage.garde : 1));
}

// l'éveil : chaque lignée reçoit son mode, qui devient aussi sa référence (reproduction0)
function eveiller(inst) {
  const out = JSON.parse(JSON.stringify(inst)); if (out.monde?.ponte) return { inst: out, evenements: [] };
  let o = 0, v = 0;
  for (const t of out.taxons) if (estAnimal(t)) { const m = t.plan.reproduction || modeDe(t.plan); t.plan.reproduction = m; t.plan.reproduction0 ??= m; m === 'ovipare' ? o++ : v++; }
  out.monde = { ...out.monde, ponte: { depuis: out.cycle?.n ?? 0 } };
  return { inst: out, evenements: [{ type: 'eveil', taxon: out.taxons.find(estAnimal)?.id, detail: `les lignées pondent ou mettent bas : ${o} pondeuses, ${v} vivipares ; des mangeurs d'œufs peuvent naître` }] };
}

// un cycle : ce que pèsent, dans chaque lieu, les pondeurs et les mangeurs d'œufs ; le pillage qui s'ensuit
function preparer(ctx) {
  const { taxons, biomes } = ctx, P = {};
  for (const t of taxons) { if (!estAnimal(t)) continue; const m = t.plan.masse_kg || 1, ovi = t.plan.reproduction === 'ovipare', oo = mange(t.plan.regime) ? t.phenotypes.filter(p => p.traits?.includes('oophage')) : [];
    for (const p of t.populations) { const X = P[p.biome] ??= { ovi: 0, oo: 0 }, B = p.effectif * m; if (ovi) X.ovi += B; for (const f of oo) X.oo += B * (f.frequence_par_biome?.[p.biome] ?? f.frequence ?? 0); } }
  const pillage = {}; for (const [bid, X] of Object.entries(P)) pillage[bid] = X.oo > 0 && X.ovi > 0 ? REGLES.pillage.max * X.oo / (X.oo + REGLES.pillage.demi * X.ovi) : 0;
  return {
    // le facteur des naissances d'un phénotype : ce que son mode lui donne ici, rapporté à ce qu'y donnait le mode de sa lignée à
    // l'éveil (sans pillage) ; et pour un mangeur d'œufs, le festin
    naissances(t, bid, i) {
      const plan = t.plan, traits = t.phenotypes[i]?.traits || [], b = biomes[bid]; if (!plan.reproduction) return 1;
      let f = rendement(plan.reproduction, plan, traits, b, pillage[bid] || 0) / rendement(plan.reproduction0 || plan.reproduction, plan, traits, b, 0);
      if (traits.includes('oophage') && mange(plan.regime)) { const X = P[bid]; if (X?.ovi > 0) f *= 1 + REGLES.festin * X.ovi / (X.ovi + 10 * X.oo); }
      return f;
    },
    pillage: bid => pillage[bid] || 0
  };
}

// à la séparation : la lignée fille change parfois de mode (un hasard à elle, tiré de son nom et du cycle : celui du cycle ne bouge pas)
function separer(parent, plan, b, nid, n) {
  if (!parent.reproduction) return null;
  plan.reproduction = parent.reproduction; plan.reproduction0 = parent.reproduction0 || parent.reproduction;
  let g = 2166136261; for (const ch of nid + '|' + n) { g ^= ch.charCodeAt(0); g = Math.imul(g, 16777619); } g >>>= 0;
  const u = ((Math.imul(g, 1664525) + 1013904223) >>> 0) / 4294967296, T = b?.axes?.temperature ?? .5, Pa = REGLES.passage;
  if (plan.corps?.forme === 'oiseau') return null;                                     // un oiseau pond toujours
  if (plan.reproduction === 'ovipare' && u < Pa.vers_vivipare * (T < .3 ? Pa.froid : 1)) { plan.reproduction = 'vivipare'; return 'devenue vivipare'; }
  if (plan.reproduction === 'vivipare' && u < Pa.vers_ovipare) { plan.reproduction = 'ovipare'; return 'devenue pondeuse'; }
  return null;
}

const API = { REGLES, TRAITS, modeDe, rendement, eveiller, preparer, separer };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvanePonte = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
