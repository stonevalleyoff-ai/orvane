// Orvane — LE MILIEU TRANSFORMÉ (moteur/milieu.js) — docs/22
// Le milieu n'est plus un décor : ses bêtes et ses joueurs le changent, et ce qu'il devient change qui y vit.
//  - le pâturage : les brouteurs (d'un kilo et plus) tiennent le couvert bas ; moins nombreux, le couvert se referme ;
//  - les terriers : les fouisseurs ameublissent le sol, la capacité du lieu monte avec eux ;
//  - les barrages : les bâtisseurs (un trait, qui n'apparaît que dans un monde au milieu éveillé) rendent plus humides les lieux
//    d'eau et leurs rives ; leur hutte les protège des prédateurs ;
//  - le jeu : défricher, reboiser, assécher, irriguer, construire, ou transformer un axe quelconque (transformation : axe, sens).
//    Ce que le jeu a fait s'efface lentement (une clairière abandonnée se referme), ce que font les bêtes suit les bêtes.
// Chaque lieu garde ses axes de base (biomes[].transforme.base) ; ses axes (biomes[].axes) sont ceux d'aujourd'hui, et tout le moteur
// les lit : la niche, la flore (la place de chaque forme suit le milieu), les saisons. Un monde sans milieu éveillé n'en voit rien.
// Déterministe. Node (require) ou navigateur (globalThis.OrvaneMilieu).
'use strict';
(function (racine) {
const FLO = (typeof require === 'function' ? require('./flore.js') : racine.OrvaneFlore) || null;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const r3 = v => +v.toFixed(3);
const REGLES = {
  vitesse: .1,                          // le milieu suit ses bêtes avec retard : 10 % de l'écart à sa cible par cycle
  retour: .02,                          // ce que le jeu a fait s'efface de 2 % par cycle (la succession)
  paturage: { masse: 1, effet: .5 },    // les brouteurs d'un kilo et plus : le couvert baisse de 0,05 quand leur biomasse gagne 10 % de la capacité du lieu (et monte d'autant quand elle la perd)
  terriers: { effet: .1, plancher: .002 },   // la capacité monte de 10 % quand la biomasse des fouisseurs double (comptée au moins à 0,2 % de la capacité)
  barrages: { effet: .25, demi: .02 },  // l'humidité monte jusqu'à 0,25 ; à moitié quand les bâtisseurs pèsent 2 % de la capacité du lieu
  jeu: { unite: 5, max: .05 },          // une unité d'action d'un jeu transforme 5 unités de capacité ; au plus 5 % du lieu par cycle et par axe
  signal: .05                           // un événement quand un axe a bougé de 0,05 depuis le dernier
};
const TRAITS = {
  batisseur: { domaine: 'morphologie', organe: 'incisives puissantes, queue plate', cout: .1, vulnerabilite: .75,
    effet: 'bâtit barrages et huttes : les lieux d\'eau et leurs rives deviennent plus humides, et la hutte protège des prédateurs',
    conduite: { type: 'protection', presage: 'traîne des branches vers l\'eau' } }
};
// les actions des jeux sur le milieu (schemas/pression.schema.json) : l'axe et le sens
const ACTIONS = { defrichage: ['couvert', -1], reboisement: ['couvert', 1], assechement: ['humidite', -1], irrigation: ['humidite', 1], construction: ['couvert', -1] };
const MOTS = { couvert: 'le couvert', humidite: 'l\'humidité' };
const estAnimal = t => t.plan?.regime !== 'vegetal' && t.plan?.regime !== 'synthetique' && !t.eteint;
const eau = (b, B) => b.milieu === 'aquatique' || b.milieu === 'amphibie' || (b.milieu === 'terrestre' && (b.voisins || []).some(v => B[v] && (B[v].milieu === 'aquatique' || B[v].milieu === 'amphibie')));

// ce que les bêtes pèsent dans chaque lieu : toutes, les grands brouteurs, les fouisseurs, les bâtisseurs
function indices(taxons) {
  const I = {};
  for (const t of taxons) { if (!estAnimal(t)) continue;
    const m = t.plan.masse_kg || 1, grand = t.plan.regime === 'herbivore' && m >= REGLES.paturage.masse, fou = (t.plan.locomotion || []).includes('fouissage');
    const bat = t.phenotypes.filter(p => p.traits?.includes('batisseur'));
    for (const p of t.populations) { const X = I[p.biome] ??= { bio: 0, pat: 0, fou: 0, bat: 0 }, B = p.effectif * m; X.bio += B; if (grand) X.pat += B; if (fou) X.fou += B;
      for (const f of bat) X.bat += B * (f.frequence_par_biome?.[p.biome] ?? f.frequence ?? 0); } }
  return I;
}
const parts = b => Object.fromEntries(FLO ? FLO.compositionDe(b) : []);

// l'éveil : chaque lieu prend ses axes d'aujourd'hui pour base, et ce que ses bêtes y pèsent pour référence
function eveiller(inst) {
  const out = JSON.parse(JSON.stringify(inst)); if (out.monde?.milieu) return { inst: out, evenements: [] };
  const n = out.cycle?.n ?? 0, I = indices(out.taxons), B = Object.fromEntries(out.biomes.map(b => [b.id, b]));
  for (const b of out.biomes) { const X = I[b.id] || { bio: 0, pat: 0, fou: 0, bat: 0 };
    const cap = Math.max(b.capacite || 0, 1); b.transforme = { base: { ...b.axes }, etat: { ...b.axes }, jeu: {}, ref: { pat: X.pat / cap, fou: X.fou / cap }, signale: { ...b.axes } }; }
  for (const t of out.taxons) if (t.plan?.regime === 'vegetal') for (const p of t.populations) { const b = B[p.biome]; if (b && p.potentiel != null) p.reference = { ...(p.reference || {}), potentiel: p.potentiel, capacite: b.capacite }; }
  out.monde = { ...out.monde, milieu: { depuis: n } };
  return { inst: out, evenements: [{ type: 'eveil', taxon: out.biomes[0]?.id, detail: 'le milieu s\'éveille : les brouteurs, les fouisseurs, les bâtisseurs et les joueurs le transforment désormais' }] };
}

// un cycle : le milieu de chaque lieu suit ses bêtes et ce que les jeux y ont fait ; la place des plantes suit le milieu
function preparer(ctx) {
  const { biomes, taxons, prB = {}, n } = ctx, B = biomes, I = indices(taxons), ev = [], fert = {};
  for (const b of Object.values(B)) { const M = b.transforme; if (!M) continue;
    const X = I[b.id] || { bio: 0, pat: 0, fou: 0, bat: 0 }, r = M.ref, base = M.base, T = { ...base }, K = Math.max(b.capacite || 0, 1), dc = ctx.climat?.decalage(b);   // (docs/31) le climat déplace la cible
    if (dc && base.temperature != null) T.temperature = clamp(base.temperature + dc.temperature);
    const ep = X.pat / K - r.pat, ef = clamp((X.fou / K - r.fou) / Math.max(r.fou, REGLES.terriers.plancher), -1, 2);   // (les parts de la capacité du lieu)
    if (b.milieu !== 'marin' && b.milieu !== 'aquatique' && base.couvert != null) T.couvert = clamp(base.couvert - REGLES.paturage.effet * ep);
    const hum = eau(b, B) && X.bat > 0 ? REGLES.barrages.effet * X.bat / (X.bat + REGLES.barrages.demi * K) : 0;
    if (base.humidite != null) T.humidite = clamp(base.humidite + hum + (dc?.humidite || 0));
    for (const k in T) M.etat[k] = r3((M.etat[k] ?? base[k]) + (T[k] - (M.etat[k] ?? base[k])) * REGLES.vitesse);
    fert[b.id] = 1 + REGLES.terriers.effet * ef;
    // ce que les jeux ont fait ce cycle : une part du lieu, vers l'extrême de l'axe ; puis tout ce qu'ils ont fait s'efface un peu
    const J = prB[b.id]?.milieu || {}, cap = Math.max(b.capacite || 0, 1);
    for (const [k, u] of Object.entries(J)) { if (!u) continue; const part = Math.min(REGLES.jeu.max, Math.abs(u) * REGLES.jeu.unite / cap), x = clamp((M.etat[k] ?? b.axes[k] ?? .5) + (M.jeu[k] || 0));
      M.jeu[k] = r3((M.jeu[k] || 0) + (u > 0 ? part * (1 - x) : -part * x)); }
    for (const k in M.jeu) { M.jeu[k] = r3(M.jeu[k] * (1 - REGLES.retour)); if (Math.abs(M.jeu[k]) < .001) delete M.jeu[k]; }
    // les axes d'aujourd'hui
    for (const k of new Set([...Object.keys(M.etat), ...Object.keys(M.jeu)])) b.axes[k] = r3(clamp((M.etat[k] ?? base[k] ?? .5) + (M.jeu[k] || 0)));
    // ce qui a changé assez pour se dire
    for (const k of Object.keys(b.axes)) { const avant = M.signale[k] ?? base[k]; if (avant == null || Math.abs(b.axes[k] - avant) < REGLES.signal) continue;
      const dj = Math.abs(M.jeu[k] || 0), de = Math.abs((M.etat[k] ?? base[k]) - base[k]), monte = b.axes[k] > avant;
      const cause = dj >= de ? 'ce qu\'y font les joueurs' : k === 'temperature' ? 'le climat' : k === 'couvert' ? (monte ? 'moins de grands brouteurs' : 'les grands brouteurs') : k === 'humidite' ? 'les barrages des bâtisseurs' : 'ses bêtes';
      ev.push({ type: 'transformation', taxon: b.id, biome: b.id, detail: `${b.nom || b.id} : ${MOTS[k] || k} ${monte ? 'monte' : 'baisse'} de ${String(avant).replace('.', ',')} à ${String(b.axes[k]).replace('.', ',')} (${cause})` });
      M.signale[k] = b.axes[k]; }
  }
  // la place des plantes suit le milieu : la capacité du lieu, et la part que le milieu fait à leur forme
  const pc = new Map();
  for (const t of taxons) if (t.plan?.regime === 'vegetal') for (const p of t.populations) { const b = B[p.biome], R = p.reference; if (!b?.transforme || R?.potentiel == null) continue;
    if (!pc.has(b.id)) pc.set(b.id, { maint: parts(b), base: parts({ ...b, axes: { ...b.axes, ...b.transforme.base } }) });
    const { maint, base } = pc.get(b.id), w0 = base[t.plan.forme] || 0, w = maint[t.plan.forme] || 0;
    p.potentiel = r3(R.potentiel * (R.capacite > 0 ? b.capacite / R.capacite : 1) * (w0 > 0 ? w / w0 : 1)); }
  return { fertilite: id => fert[id] ?? 1, evenements: ev };
}

const API = { REGLES, TRAITS, ACTIONS, eveiller, preparer, indices };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvaneMilieu = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
