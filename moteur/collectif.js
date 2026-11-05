// Orvane — LES COMPORTEMENTS COLLECTIFS (moteur/collectif.js) — docs/38
// Le moteur sait déjà ce que vaut la vie en groupe : la sociabilité (un trait continu, docs/8) dilue la prédation et propage les
// maladies, le grégarisme donne l'alerte, la chasse concertée et les routes des saisons s'apprennent (docs/34). Mais un jeu ne
// voyait qu'un chiffre. Ce fichier le lui traduit en conduites qu'il peut montrer, population par population :
//  - le groupe : solitaire, en famille, en troupeau, en bande, en meute, en banc, en volée, en essaim, en colonie ; sa taille
//    (la plus petite, l'habituelle, la plus grande), qui grandit avec la sociabilité, à découvert et sous la prédation ;
//  - la hiérarchie : égalitaire, une dominance, ou despotique ; qui mène (un couple dominant, une vieille femelle, un mâle, une
//    reine) ; des sentinelles ; la chasse en meute ; les troupeaux mêlés (des brouteurs de même taille qui paissent ensemble) ;
//  - les migrations visibles : une population d'un lieu à saisons, mobile, dont l'hiver est rude et dont un lieu voisin est plus
//    doux en hiver, y part à la fin de l'automne et revient au printemps ; la part qui part, l'état du moment (au départ, partie, au retour, au pays),
//    et, sur le lieu d'arrivée, ses visiteurs de l'hiver.
// Rien de tout cela ne touche à la simulation : c'est une lecture de l'état, faite à la publication (hebergement/cycle.js,
// moteur/solo.js), le jour un comme les autres. Un monde qui ne le demande pas (monde.collectif) n'en voit rien.
//   eveiller(inst, opt)       → { inst, evenements }   le monde publie désormais la vie en groupe (opt.vue : Parcelles.regrouper)
//   decrire(inst, opt)        → inst (un nouvel objet) avec populations[].groupe, populations[].migration et biomes[].visiteurs
//   groupeDe(t, p, b, inst)   → le groupe d'une population ;  routeDe(t, p, b, inst) → sa migration, ou null
// Déterministe, sans hasard. Node (require) ou navigateur (globalThis.OrvaneCollectif).
(function (racine) {
'use strict';
const Orvane = typeof module !== 'undefined' && module.exports ? require('./orvane.js') : racine.Orvane;

const REGLES = {
  seuils: { famille: .2, groupe: .45 },          // sociabilité sous laquelle on vit seul ; au-delà de laquelle on vit en groupe
  echelle_sociabilite: .08,                      // ce que vaut un écart-type de sociabilité génétique (catalogue : sociabilite.echelle)
  taille: { meute: 6, troupeau: 30, bande: 14, banc: 200, volee: 40, essaim: 900 },   // la taille habituelle d'un groupe moyen
  migration: { rude: .75, marge: .2, min: .2, part_min: .05, part_max: .85, masse_marcheur: .3, masse_volant: .005 },   // rude : l'hiver vaut moins des trois quarts de l'été
  fenetres: { depart: [.78, .88], partie: [.88, .12], retour: [.12, .22] }   // la phase de l'année (0 : le cœur de l'hiver)
};
const TERRE = ['marche', 'course', 'saut', 'reptation', 'fouissage', 'grimpe'];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const typeDe = id => String(id ?? '').split('~')[0];
const estAnimal = t => t?.plan?.regime !== 'vegetal' && t?.plan?.regime !== 'synthetique';
const part = (t, id) => (t.phenotypes || []).reduce((a, p) => a + ((p.traits || []).includes(id) ? p.frequence || 0 : 0), 0);
const savoir = (p, k) => p?.savoirs?.[k] || 0;
const chair = t => { const D = t.plan?.diete; return D ? (D.viande || 0) + (D.insectes || 0) + (D.sang || 0) : t.plan?.regime === 'carnivore' ? 1 : 0; };
// la sociabilité d'une population : celle du plan, déplacée par sa moyenne génétique, renforcée par le grégarisme
function sociabiliteDe(t, p) {
  const q = p?.quant?.sociabilite?.m || 0, g = part(t, 'gregarisme');
  return clamp((t.plan?.sociabilite ?? 0) + REGLES.echelle_sociabilite * q) * (1 + .6 * g);
}
function formeDe(t, s) {
  const P = t.plan || {}, L = P.locomotion || [], m = P.masse_kg || 1;
  if (P.castes && (P.castes.part || 0) >= .5) return 'colonie';
  if (s < REGLES.seuils.famille) return 'solitaire';
  if (s < REGLES.seuils.groupe) return 'famille';
  if (L.includes('nage') && !L.some(l => TERRE.includes(l)) && !L.includes('vol')) return 'banc';
  if (L.includes('vol')) return m < .05 ? 'essaim' : 'volee';
  if (chair(t) >= .5) return 'meute';
  return m >= 20 ? 'troupeau' : 'bande';
}
const NOMS = { solitaire: 'seul', famille: 'en famille', troupeau: 'en troupeau', bande: 'en bande', meute: 'en meute', banc: 'en banc', volee: 'en volée', essaim: 'en essaim', colonie: 'en colonie' };

// --- le groupe d'une population ---
function groupeDe(t, p, b, inst) {
  const P = t.plan || {}, s = +sociabiliteDe(t, p).toFixed(3), forme = formeDe(t, s), N = Math.max(0, p.effectif || 0);
  const ouvert = 1 - (b?.axes?.couvert ?? .5), pred = p.predation || 0;
  let typ;
  if (forme === 'solitaire') typ = 1;
  else if (forme === 'famille') typ = 2 + Math.round(clamp((s - REGLES.seuils.famille) / (REGLES.seuils.groupe - REGLES.seuils.famille)) * Math.min(4, P.portee || 2));
  else if (forme === 'colonie') typ = Math.round(clamp(20 / Math.sqrt(Math.max(1e-4, P.masse_kg || .01)), 50, 20000));
  else { const base = REGLES.taille[forme], f = .4 + 1.2 * clamp((s - REGLES.seuils.groupe) / (1 - REGLES.seuils.groupe));
    const terrain = ['troupeau', 'bande', 'meute'].includes(forme) ? .6 + .8 * ouvert : 1;   // à découvert, les groupes sont plus grands
    typ = Math.max(2, Math.round(base * f * terrain * (1 + .8 * pred))); }                   // la prédation les resserre (la dilution)
  typ = Math.max(1, Math.min(typ, Math.round(N) || 1));
  const g = { forme, nom: NOMS[forme], sociabilite: s, taille: { min: Math.max(1, Math.round(typ * (typ > 2 ? .4 : 1))), typ, max: Math.max(typ, Math.min(Math.round(N) || 1, Math.round(typ * (typ > 2 ? 2.2 : 1)))) } };
  if (forme === 'solitaire') return g;
  if (forme === 'famille') { g.meneur = 'la mère'; return g; }   // une mère et ses petits : ni rang, ni sentinelles
  // la hiérarchie : plus marquée chez les tempéraments vifs et quand la nourriture manque
  const faim = 1 - clamp(p.satiete ?? p.nourriture ?? .7), h = forme === 'colonie' ? 1 : clamp(.15 + .5 * (P.temperament ?? .3) + .3 * faim - (['banc', 'essaim'].includes(forme) ? .4 : 0));
  g.hierarchie = { niveau: +h.toFixed(2), type: forme === 'colonie' ? 'castes' : h >= .7 ? 'despotique' : h >= .4 ? 'dominance' : 'egalitaire' };
  const orne = part(t, 'robe-doree') + part(t, 'gigantisme') + ((P.corps?.cornes || 0) > .3 ? .5 : 0);
  g.meneur = forme === 'colonie' ? 'une reine' : forme === 'meute' ? 'un couple dominant' : ['banc', 'essaim', 'volee'].includes(forme) ? null
    : savoir(p, 'routes') >= .2 || (P.longevite || 0) >= 20 && orne < .3 ? 'une vieille femelle' : orne >= .3 ? 'un mâle dominant' : null;
  if (part(t, 'gregarisme') >= .3 || savoir(p, 'cris-precis') >= .2) g.sentinelles = true;
  if (forme === 'meute') g.chasse = savoir(p, 'chasse-concertee') >= .2 ? 'encercle' : 'ensemble';
  return g;
}

// --- la migration d'une population ---
const phaseDe = inst => inst?.cycle?.saison?.phase ?? (inst?.monde?.annee ? ((inst.cycle?.n || 0) % inst.monde.annee) / inst.monde.annee : null);
const dans = (x, [a, b]) => a <= b ? x >= a && x < b : x >= a || x < b;
function routeDe(t, p, b, inst, biomes) {
  const P = t.plan || {}, L = P.locomotion || [], M = REGLES.migration, m = P.masse_kg || 1;
  if (!b || b.saisons === false || b.saisons === null || !P.niche || !Orvane) return null;
  const vole = L.includes('vol'), marche = L.some(l => ['marche', 'course'].includes(l)), nage = L.includes('nage');
  if (!(vole && m >= M.masse_volant) && !(marche && m >= M.masse_marcheur) && !(nage && m >= M.masse_marcheur)) return null;
  const hiver = x => ({ ...x, axes: Orvane.axesSaison(x, 0) }), ete = x => ({ ...x, axes: Orvane.axesSaison(x, .5) });
  const ici = Orvane.convenance(P, hiver(b)), iciEte = Orvane.convenance(P, ete(b));
  if (ici >= M.rude * iciEte) return null;   // un hiver doux chez soi : on reste (le bœuf musqué ne quitte pas la toundra)
  let meilleur = null;
  for (const vid of [...new Set(b.voisins || [])].sort()) { const v = biomes.get(vid); if (!v || typeDe(vid) === typeDe(b.id)) continue;   // (par parcelles : une parcelle d'un autre lieu)
    const la = Orvane.convenance(P, hiver(v)); if (la < M.min || la < ici * (1 + M.marge)) continue;
    if (!meilleur || la > meilleur.la) meilleur = { v, la }; }
  if (!meilleur) return null;
  const s = sociabiliteDe(t, p), gain = (meilleur.la - ici) / meilleur.la;
  const q = clamp(gain * (.5 + .5 * s) + .3 * savoir(p, 'routes'), M.part_min, M.part_max), ph = phaseDe(inst), F = REGLES.fenetres;
  const etat = ph == null ? null : dans(ph, F.depart) ? 'au depart' : dans(ph, F.partie) ? 'partie' : dans(ph, F.retour) ? 'au retour' : 'au pays';
  return { vers: meilleur.v.id, vers_nom: meilleur.v.nom || meilleur.v.id, saison: 'hiver', part: +q.toFixed(3), depart: F.depart[0], retour: F.retour[1], ...(etat ? { etat } : {}),
    ...(savoir(p, 'routes') >= .2 ? { guide: 'les plus vieilles mènent, toujours par le même chemin' } : {}) };
}

function eveiller(inst, opt = {}) {
  const out = JSON.parse(JSON.stringify(inst)); if (out.monde?.collectif) return { inst: out, evenements: [] };
  out.monde = { ...out.monde, collectif: { depuis: out.cycle?.n ?? 0 } };
  const d = decrire(opt.vue ? opt.vue(out) : out), F = {}; let migr = 0;   // (opt.vue : la vue par biome d'un monde par parcelles)
  for (const t of d.taxons) for (const p of t.populations || []) { if (p.groupe) F[p.groupe.forme] = (F[p.groupe.forme] || 0) + 1; if (p.migration) migr++; }
  const MOTS = { troupeau: ['troupeau', 'troupeaux'], meute: ['meute', 'meutes'], banc: ['banc', 'bancs'], volee: ['volée', 'volées'], colonie: ['colonie', 'colonies'] };
  const dit = Object.keys(MOTS).filter(k => F[k]).map(k => `${F[k]} ${MOTS[k][F[k] > 1 ? 1 : 0]}`).join(', ');
  return { inst: out, evenements: [{ type: 'eveil', taxon: out.taxons.find(estAnimal)?.id, detail: `la vie en groupe se voit : ${dit || 'des groupes'} ; ${migr} population${migr > 1 ? 's' : ''} migre${migr > 1 ? 'nt' : ''} avec les saisons` }] };
}

// --- ce que lit un jeu : le groupe et la migration de chaque population (la vue par biome), les visiteurs de l'hiver ---
function decrire(inst, opt = {}) {
  if (!inst?.monde?.collectif && !opt.forcer) return inst;
  const biomes = new Map((inst.biomes || []).map(b => [b.id, b])), visiteurs = {};
  const taxons = (inst.taxons || []).map(t => {
    if (!estAnimal(t) || t.eteint) return t;
    const populations = (t.populations || []).map(p => { if (!(p.effectif > 0)) return p; const b = biomes.get(p.biome) || biomes.get(typeDe(p.biome));
      const q = { ...p, groupe: groupeDe(t, p, b, inst) }, r = routeDe(t, p, b, inst, biomes);
      if (r) { q.migration = r; if (r.etat === 'partie') (visiteurs[r.vers] ||= []).push({ taxon: t.id, de: p.biome, effectif: Math.round(p.effectif * r.part), forme: q.groupe.forme }); }
      else delete q.migration;
      return q; });
    return { ...t, populations };
  });
  const out = { ...inst, taxons };
  if (Object.keys(visiteurs).length) out.biomes = (inst.biomes || []).map(b => visiteurs[b.id] ? { ...b, visiteurs: visiteurs[b.id].sort((x, y) => y.effectif - x.effectif || (x.taxon < y.taxon ? -1 : 1)) } : b);
  // les troupeaux mêlés : des brouteurs en groupe, de même taille (à un facteur 3 près) et de même heure, dans un même lieu
  for (const [bid] of biomes) {
    const L = []; for (const t of out.taxons) { if (!estAnimal(t) || t.eteint) continue; const p = t.populations.find(x => x.biome === bid && x.groupe && ['troupeau', 'bande'].includes(x.groupe.forme)); if (p) L.push({ t, p }); }
    for (const a of L) { const avec = L.filter(b => b !== a && b.t.plan.activite === a.t.plan.activite && Math.abs(Math.log10((b.t.plan.masse_kg || 1) / (a.t.plan.masse_kg || 1))) <= Math.log10(3))
      .sort((x, y) => y.p.effectif - x.p.effectif || (x.t.id < y.t.id ? -1 : 1)).slice(0, 2).map(x => x.t.id);
      if (avec.length) a.p.groupe = { ...a.p.groupe, avec }; }
  }
  return out;
}

const API = { REGLES, eveiller, decrire, groupeDe, routeDe, sociabiliteDe, formeDe };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvaneCollectif = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
