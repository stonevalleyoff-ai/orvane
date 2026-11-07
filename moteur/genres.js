// Orvane — LES PROFILS DE GENRE (moteur/genres.js) — docs/41
// Le même moteur sert tous les genres : seuls le réglage et le traducteur changent. Un profil de genre est ce réglage, tout prêt :
//  - regles     les règles du moteur qu'il change (monde.regles : elles valent pour ce qui arrive ensuite, docs/13) — la vitesse de
//               l'évolution, la marque des corps, la tolérance aux extinctions, la fréquence des catastrophes et des maladies ;
//  - influence  ce que pèsent les joueurs (le tampon, docs/4) : un genre de survie les fait peser plus ;
//  - solo       le rythme d'un monde solo (moteur/solo.js, docs/19) : un cycle par heure, par dix minutes, en accéléré ;
//  - directeur  ce qu'un jeu de ce genre montre (tampon/directeur.js, docs/40) ;
//  - mecanismes ceux qu'il gagne à éveiller (profil.monde du monde hébergé : la flore, le milieu, les parcelles…).
// Chaque promesse est mesurée par son banc (bancs/genres.js) sur un monde réel, contre le réglage neutre.
//   OrvaneGenres.GENRES                    les profils
//   OrvaneGenres.appliquer(inst, genre)    → un nouvel instantané dont monde.regles porte le genre (et monde.genre son nom)
//   OrvaneGenres.regles(genre, R)          → les règles R d'un monde, celles du genre posées dessus
//   OrvaneGenres.profil(genre, base)       → un profil du tampon (exposition, influence) réglé pour le genre
//   OrvaneGenres.solo(genre, base)         → les options d'OrvaneSolo.creer (periode, acceleration ; session : un cycle par session de
//                                            jeu, que le jeu appelle lui-même, OrvaneSolo.cycles(S, 1) ; profil, si base est donné)
// Rien de tout cela ne tire au hasard. Node (require) ou navigateur (globalThis.OrvaneGenres), sans dépendance.
'use strict';
(function (racine) {
const clone = o => JSON.parse(JSON.stringify(o));
// (les catastrophes du moteur, docs/7 : un genre qui les change donne chacune en entier — une règle se complète d'un seul niveau)
const CATA = { incendie: { chance: .003, capacite: .4, mortalite: .2, detail: 'le feu court dans le couvert' },
  crue: { chance: .0015, capacite: .2, mortalite: .1, detail: 'les eaux montent' },
  secheresse: { chance: .002, capacite: .3, mortalite: .05, detail: 'les points d\'eau tarissent' } };
const cata = (fc, fm = 1) => Object.fromEntries(Object.entries(CATA).map(([k, c]) => [k, { ...c, chance: +(c.chance * fc).toFixed(5), mortalite: +(c.mortalite * fm).toFixed(3) }]));

const GENRES = {
  neutre: { nom: 'neutre', promesse: 'le moteur tel qu\'il est', regles: {}, directeur: 'cozy' },
  horreur: { nom: 'horreur', promesse: 'une évolution rapide, peu de variantes mais très marquées ; des corps qui dérangent ; des maladies',
    regles: { nouveau_trait: .08, max_phenotypes: 8, separation: { chance: .002 }, derive: { corps: 1.8, formes: 2, organes: .3 }, maladie: { chance: .006 } },
    influence: { poids: { rencontre: .2 } }, solo: { periode: '10m' }, directeur: 'horreur', mecanismes: ['formes', 'pathogenes', 'stades'] },
  cozy: { nom: 'cozy', promesse: 'des extinctions rares et lentes, des catastrophes douces, des maladies bénignes ; un monde qui se répare',
    regles: { catastrophes: cata(.25, .5), maladie: { chance: .001, virulence: [.01, .05] }, regain_habitat: .06 },
    influence: { poids: { nourrissage: -.3, liberation: -1.5 } }, solo: { periode: '1h' }, directeur: 'cozy', mecanismes: ['flore', 'esprit', 'collectif'] },
  collection: { nom: 'collection', promesse: 'beaucoup de lignées, une spéciation rapide, des hybrides, des formes rares',
    regles: { separation: { chance: .012, cycles: 20 }, nouveau_trait: .05, derive: { formes: 1.5, organes: .2 } },
    solo: { periode: '1h' }, directeur: 'collection', mecanismes: ['formes', 'castes', 'stades', 'natures'] },
  voxel: { nom: 'voxel', promesse: 'un monde en parcelles que les constructions transforment, une flore qui évolue',
    regles: {}, solo: { periode: '24h', session: 1 }, directeur: 'voxel', mecanismes: ['parcelles', 'milieu', 'flore'] },
  survie: { nom: 'survie', promesse: 'une chasse qui raréfie et rend méfiant ; le joueur, un prédateur parmi d\'autres ; des maladies',
    regles: { mefiance: { demi_vie: 10, sensibilite: 9 }, maladie: { chance: .004 } },
    influence: { poids: { prelevement: 2, capture: 2 }, plafonds: { part_max_population: .5 } }, solo: { periode: '10m' }, directeur: 'survie', mecanismes: ['pathogenes', 'milieu'] },
  strategie: { nom: 'stratégie, gestion', promesse: 'le temps accéléré : le joueur règle le milieu et voit la sélection répondre',
    regles: {}, solo: { periode: '1h', acceleration: 12 }, directeur: 'strategie', mecanismes: ['milieu', 'flore', 'natures'] },
  mmo: { nom: 'monde partagé', promesse: 'un monde pour tous, des événements de serveur : des catastrophes et des épidémies qui se voient',
    regles: { catastrophes: cata(2), maladie: { chance: .005 } },
    influence: { plafonds: { part_max_compte: .05 } }, solo: { periode: '1h' }, directeur: 'mmo', mecanismes: ['pathogenes', 'climat', 'collectif'] }
};

const genreDe = g => { const G = GENRES[g || 'neutre']; if (!G) throw new Error(`genre inconnu : ${g} (${Object.keys(GENRES).join(', ')})`); return G; };
const objet = v => v && typeof v === 'object' && !Array.isArray(v);
// les règles d'un genre posées sur celles d'un monde, d'un niveau (comme le moteur les lit : docs/13) : une règle qui est un objet
// garde ses autres clés ({ separation: { chance } } garde la durée et l'effectif de la séparation)
function regles(g, R0 = {}) {
  const G = genreDe(g), R = clone(R0 || {});
  for (const [k, v] of Object.entries(G.regles)) R[k] = objet(v) && objet(R[k]) ? { ...R[k], ...clone(v) } : clone(v);
  return R;
}
// un instantané de ce genre : ses règles posées sur celles du monde, son nom dans monde.genre
function appliquer(inst, g) {
  const out = clone(inst), R = regles(g, out.monde?.regles);
  out.monde = { ...out.monde, genre: g || 'neutre' }; if (Object.keys(R).length) out.monde.regles = R; else delete out.monde.regles;
  return out;
}
// un profil du tampon pour ce genre : celui qu'on donne (ou un profil neutre), ses poids multipliés ou posés, ses plafonds
function profil(g, base = {}) {
  const G = genreDe(g), P = clone(base), I = P.influence = P.influence || {}, poids = I.poids = I.poids || {};
  for (const [k, v] of Object.entries(G.influence?.poids || {})) poids[k] = k === 'prelevement' || k === 'capture' ? (poids[k] ?? 1) * v : v;
  I.plafonds = { ...(I.plafonds || {}), ...(G.influence?.plafonds || {}) };
  return P;
}
// les options d'un monde solo de ce genre (OrvaneSolo.creer(instantane, OrvaneGenres.solo('horreur')))
function solo(g, base) {
  const G = genreDe(g), S = G.solo || {};
  return { periode: S.periode || '1h', acceleration: S.acceleration || 1, ...(S.session ? { session: S.session } : {}), genre: g || 'neutre', ...(base ? { profil: profil(g, base) } : {}) };
}

const API = { GENRES, appliquer, regles, profil, solo };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvaneGenres = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
