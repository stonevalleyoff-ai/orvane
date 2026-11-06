// Orvane — LE DIRECTEUR DE MISE EN SCÈNE (tampon/directeur.js) — docs/40
// Ce qu'un jeu devrait montrer à ses joueurs, au dernier cycle, selon son genre. Le monde fait mille choses par nuit ; un jeu
// d'horreur veut ses prédateurs qui se multiplient et ses mutations, un jeu cozy ses naissances, ses noms et ses migrations, un jeu
// de collection ses lignées neuves et ses raretés. Le directeur lit l'instantané (son cycle d'avant, `precedent`, et la chronique
// si on la lui donne), trouve les moments, les pèse selon le genre et les rend classés, chacun avec sa raison.
//   OrvaneDirecteur.moments(instantane, { genre, biomes, familles, chronique, deja, max }) → [{ cle, type, taxon, biome, poids, titre, texte }]
//     genre      un des GENRES (« cozy » par défaut) ; biomes : ceux que le jeu joue, par type (« prairie » vaut pour « prairie~1 »)
//     familles   ce qu'il montre (animale, synthetique, vegetale ; les bêtes par défaut) ; chronique : chronique/index.json
//     deja       les clés des moments déjà montrés (le jeu les garde) : ils ne reviennent pas ; max : combien en rendre (la dose du genre)
//   OrvaneDirecteur.GENRES, OrvaneDirecteur.TYPES
// Une lecture : rien ne change dans le monde. Déterministe. Node (require) ou navigateur (globalThis.OrvaneDirecteur), sans dépendance.
'use strict';
(function (racine) {
// les sortes de moments, et ce qu'elles disent
const TYPES = {
  extinction_proche: 'une lignée menacée de disparaître',
  lignee_neuve: 'une lignée née de la dernière séparation',
  rarete: 'une lignée rare, qu\'on voit peu',
  predateurs: 'des chasseurs qui se multiplient',
  epidemie: 'une maladie qui court',
  migration: 'une population qui part ou qui revient avec la saison',
  forme_nouvelle: 'un corps que le monde n\'avait pas encore fait',
  explosion: 'une population qui explose',
  effondrement: 'une population qui s\'effondre',
  catastrophe: 'une catastrophe',
  nom: 'un nom donné par un joueur',
  savoir: 'une bête qui apprend quelque chose',
  invention: 'un trait que le monde invente',
  annonce: 'ce que la chronique dit d\'annoncer'
};
// les genres de la feuille de route : ce que chacun met en avant (poids), et combien de moments par session (dose)
const GENRES = {
  horreur:    { nom: 'horreur', dose: 2, poids: { predateurs: 3, forme_nouvelle: 2.8, epidemie: 2.5, extinction_proche: 2, catastrophe: 2, effondrement: 1.6, explosion: 1.4, lignee_neuve: 1.2, rarete: 1, invention: 1.5, annonce: 1, migration: .4, savoir: .4, nom: .2 } },
  cozy:       { nom: 'cozy', dose: 4, poids: { nom: 3, migration: 2.6, savoir: 2.5, lignee_neuve: 2.2, rarete: 1.6, forme_nouvelle: 1.4, invention: 1.2, explosion: 1, annonce: 1, extinction_proche: .9, effondrement: .4, epidemie: .3, predateurs: .2, catastrophe: .3 } },
  collection: { nom: 'collection', dose: 5, poids: { lignee_neuve: 3, rarete: 3, forme_nouvelle: 3, extinction_proche: 2.2, invention: 2, nom: 1.5, annonce: 1.2, migration: 1, savoir: 1, explosion: .8, effondrement: .6, epidemie: .5, predateurs: .5, catastrophe: .5 } },
  voxel:      { nom: 'voxel', dose: 3, poids: { migration: 2, explosion: 2, effondrement: 2, lignee_neuve: 1.8, savoir: 1.6, nom: 1.5, rarete: 1.2, forme_nouvelle: 1.2, catastrophe: 1.2, annonce: 1, extinction_proche: 1, epidemie: 1, predateurs: 1, invention: 1 } },
  survie:     { nom: 'survie', dose: 3, poids: { predateurs: 3, epidemie: 3, catastrophe: 2.5, effondrement: 2.2, migration: 1.8, explosion: 1.5, extinction_proche: 1.2, forme_nouvelle: 1, annonce: 1, rarete: .8, lignee_neuve: .8, invention: .8, savoir: .6, nom: .3 } },
  strategie:  { nom: 'stratégie, gestion', dose: 4, poids: { explosion: 2.6, effondrement: 2.6, extinction_proche: 2.2, epidemie: 2, migration: 1.6, predateurs: 1.4, catastrophe: 1.4, lignee_neuve: 1.2, annonce: 1.2, rarete: 1, forme_nouvelle: 1, invention: 1, savoir: .8, nom: .5 } },
  mmo:        { nom: 'monde partagé', dose: 3, poids: { catastrophe: 3, epidemie: 2.8, migration: 2.5, explosion: 2, effondrement: 2, annonce: 2, extinction_proche: 1.6, lignee_neuve: 1.4, nom: 1.4, forme_nouvelle: 1.2, predateurs: 1.2, rarete: 1, invention: 1, savoir: .8 } }
};
const FORMES_NOUVELLES = new Set(['segmente', 'radiaire', 'tentaculaire']);
const typeDe = id => String(id ?? '').split('~')[0];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const nb = v => Math.round(v).toLocaleString('fr-FR'), pc = v => `${v > 0 ? '+' : '−'}${Math.round(Math.abs(v) * 100)} %`;
const familleDe = t => t?.plan?.regime === 'synthetique' ? 'synthetique' : t?.plan?.regime === 'vegetal' ? 'vegetale' : 'animale';

function moments(inst, opt = {}) {
  const G = GENRES[opt.genre] || GENRES.cozy, joue = Array.isArray(opt.biomes) && opt.biomes.length ? b => opt.biomes.includes(typeDe(b)) || opt.biomes.includes(b) : () => true;
  const familles = new Set(Array.isArray(opt.familles) && opt.familles.length ? opt.familles : ['animale']), deja = new Set(opt.deja || []);
  const n = inst?.cycle?.n ?? 0, T = new Map((inst?.taxons || []).map(t => [t.id, t])), lieu = new Map((inst?.biomes || []).map(b => [b.id, b.nom || b.id]));
  const nom = t => t?.nom_commun || t?.nom || t?.id || '?', ici = b => lieu.get(b) || b;
  const montre = t => t && !t.eteint && familles.has(familleDe(t));
  const total = t => (t.populations || []).reduce((a, p) => a + (p.effectif || 0), 0);
  const avant = new Map((inst?.precedent?.taxons || []).map(t => [t.id, (t.populations || []).reduce((a, p) => a + (p.effectif || 0), 0)]));
  const M = [], ajouter = (type, taxon, biome, force, titre, texte) => { const cle = `${type}:${taxon || ''}:${biome || ''}`;
    if (deja.has(cle) || !(force > 0) || !G.poids[type]) return; M.push({ cle, type, taxon: taxon || null, biome: biome || null, poids: +(G.poids[type] * clamp(force, 0, 1.5)).toFixed(3), titre, texte }); };
  // où une lignée se montre : son lieu le plus peuplé parmi ceux que le jeu joue
  const lieuDe = t => (t.populations || []).filter(p => p.effectif >= 1 && joue(p.biome)).sort((a, b) => b.effectif - a.effectif)[0];
  for (const t of inst?.taxons || []) {
    if (!montre(t)) continue; const p = lieuDe(t); if (!p) continue;
    const N = total(t), N0 = avant.get(t.id), d = N0 > 0 ? N / N0 - 1 : null;
    // une lignée menacée : d'autant plus qu'elle est petite et qu'elle baisse
    if (t.statut === 'menace' || (t.statut === 'declin' && N < 200)) ajouter('extinction_proche', t.id, p.biome, .5 + .3 * clamp(1 - Math.log10(N + 1) / 4) + .2 * clamp(-(d ?? 0) * 5),
      'Peut-être sa dernière saison', `${nom(t)} n'a plus que ${nb(N)} bêtes${d != null && d < 0 ? ` (${pc(d)} sur le cycle)` : ''}, à ${ici(p.biome)}.`);
    // une lignée neuve (pas une lignée de la genèse, ni une arrivée par une fusion)
    if (t.parent && !t.origine && t.apparu != null && t.apparu >= 0 && n - t.apparu <= 3) ajouter('lignee_neuve', t.id, p.biome, 1 - (n - t.apparu) / 4,
      'Une lignée neuve', `${nom(t)} vient de se séparer${T.get(t.parent) ? ` de ${nom(T.get(t.parent))}` : ''}, à ${ici(p.biome)}.`);
    // une rareté : peu de bêtes en tout
    if (N < 500 && t.statut !== 'menace') ajouter('rarete', t.id, p.biome, .4 + .6 * clamp(1 - Math.log10(N + 1) / 2.7), 'Une rareté', `${nom(t)} : ${nb(N)} bêtes dans le monde entier, ${Math.round(p.effectif) >= Math.round(N) ? 'toutes' : `dont ${nb(p.effectif)}`} à ${ici(p.biome)}.`);
    // des chasseurs qui se multiplient
    if (t.plan?.regime === 'carnivore' && d != null && d > .05) ajouter('predateurs', t.id, p.biome, clamp(d * 4) * (.6 + .4 * clamp(Math.log10((t.plan.masse_kg || 1) * 10) / 3)),
      'Les chasseurs se multiplient', `${nom(t)} : ${pc(d)} sur le cycle, à ${ici(p.biome)}${(t.plan.masse_kg || 0) >= 10 ? ` — ${nb(t.plan.masse_kg)} kg` : ''}.`);
    // une maladie : la plus forte part de malades de ses populations jouées
    for (const q of t.populations || []) { if (!joue(q.biome) || !(q.effectif >= 1)) continue;
      const I = Object.entries(q.infection || {}).sort((a, b) => (b[1].i || 0) - (a[1].i || 0))[0], souche = I && inst.monde?.pathogenes?.souches?.[I[0]];
      if (I && I[1].i >= .05) ajouter('epidemie', t.id, q.biome, clamp(I[1].i * 3) * (.5 + (souche?.virulence ?? .2)), 'Une maladie court', `${souche?.nom || 'Une maladie'} touche ${Math.round(I[1].i * 100)} % de ${nom(t)}, à ${ici(q.biome)}${souche ? ` (virulence ${Math.round(souche.virulence * 100)} % par cycle)` : ''}.`);
      else if (q.maladie) ajouter('epidemie', t.id, q.biome, .3 + q.maladie.virulence, 'Une maladie court', `${nom(t)} est malade à ${ici(q.biome)} (encore ${q.maladie.reste} cycles).`);
      // une migration qui part ou qui revient
      const m = q.migration; if (m && (m.etat === 'au depart' || m.etat === 'au retour')) ajouter('migration', t.id, q.biome, .4 + clamp(m.part || 0), m.etat === 'au depart' ? 'Une migration part' : 'Une migration revient',
        m.etat === 'au depart' ? `${nom(t)} quitte ${ici(q.biome)} pour ${m.vers_nom || ici(m.vers)} : ${Math.round((m.part || 0) * 100)} % de la population, pour l'${m.saison || 'hiver'}.` : `${nom(t)} revient à ${ici(q.biome)}.`); }
    // un corps que le monde n'avait pas encore fait : récent
    if (FORMES_NOUVELLES.has(t.plan?.corps?.forme) && t.apparu != null && n - t.apparu <= 30) ajouter('forme_nouvelle', t.id, p.biome, 1 - (n - t.apparu) / 40,
      'Un corps nouveau', `${nom(t)} : un corps ${({ segmente: 'segmenté', radiaire: 'rayonné', tentaculaire: 'à tentacules' })[t.plan.corps.forme]}, à ${ici(p.biome)}.`);
  }
  // ce que le cycle a vu : explosions, effondrements, catastrophes, savoirs, inventions
  for (const e of inst?.evenements || []) { const t = T.get(e.taxon), b = e.biome || (t && lieuDe(t)?.biome);
    if (e.type === 'catastrophe') { if (!e.biome || joue(e.biome)) ajouter('catastrophe', e.taxon, e.biome, .9, 'Une catastrophe', e.detail || 'une catastrophe'); continue; }
    if (!montre(t) || !b || !joue(b)) continue;
    if (e.type === 'explosion') ajouter('explosion', t.id, b, .7, 'Une population explose', `${nom(t)}, à ${ici(b)} : ${String(e.detail || '').split(' · ')[0]}.`);
    else if (e.type === 'effondrement') ajouter('effondrement', t.id, b, .8, 'Une population s\'effondre', `${nom(t)}, à ${ici(b)} : ${String(e.detail || '').split(' · ')[0]}.`);
    else if (e.type === 'savoir') ajouter('savoir', t.id, b, .7, 'Un savoir', `${String(e.detail || '').split(' · ')[0]}.`);
    else if (e.type === 'invention') ajouter('invention', t.id, b, .9, 'Une invention', `${String(e.detail || '').split(' · ')[0]}.`); }
  // la chronique : les noms donnés et les annonces de ce cycle
  for (const e of opt.chronique?.derniers || []) { if (e.n !== n) continue; const t = T.get(e.taxon); if (e.taxon && !montre(t)) continue; if (e.biome && !joue(e.biome)) continue;
    if (e.type === 'nom') ajouter('nom', e.taxon, e.biome || (t && lieuDe(t)?.biome), 1, 'Un nom donné', e.texte || `${nom(t)} a un nom.`);
    else if (e.importance >= 3) ajouter('annonce', e.taxon, e.biome, 1, e.titre || 'À annoncer', e.texte || ''); }
  // le classement : les plus forts d'abord ; dans la dose, une lignée ne revient pas deux fois, et pas plus de deux moments d'une
  // même sorte (une session n'est pas une liste de raretés) — sauf s'il n'y a rien d'autre à montrer
  M.sort((a, b) => b.poids - a.poids || (a.cle < b.cle ? -1 : 1));
  const max = opt.max ?? G.dose, R = [], vus = new Set(), parType = {};
  for (const m of M) { if (R.length >= max) break; if ((m.taxon && vus.has(m.taxon)) || (parType[m.type] || 0) >= 2) continue; R.push(m); if (m.taxon) vus.add(m.taxon); parType[m.type] = (parType[m.type] || 0) + 1; }
  for (const m of M) { if (R.length >= max) break; if (!R.includes(m) && !(m.taxon && vus.has(m.taxon))) { R.push(m); if (m.taxon) vus.add(m.taxon); } }
  for (const m of M) { if (R.length >= max) break; if (!R.includes(m)) R.push(m); }
  return R.sort((a, b) => b.poids - a.poids || (a.cle < b.cle ? -1 : 1));
}

const API = { moments, GENRES, TYPES };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvaneDirecteur = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
