// Orvane — LA FLORE RICHE (moteur/diversite.js) — docs/48
// Jusqu'ici, la flore (docs/17) avait huit formes, et une lignée par forme et par lieu : toutes les forêts du monde portaient le
// même arbre. Dans un monde à la diversité éveillée :
//  - quarante-sept formes de plus : le conifère, le palmier, le palétuvier, l'arbre-bouteille, l'arbre géant, la fougère, la liane, la
//    bruyère, le bambou, le cactus géant, le varech, le plancton, le nénuphar, la mousse… Chacune a son port (ce qu'elle est pour la
//    mécanique : un arbre, un buisson, une herbe, un roseau, une algue, un lichen, une succulente, un champignon), sa hauteur, sa
//    repousse, ce qu'elle donne (des feuilles, des fruits, des graines, du nectar) et les lieux où elle pousse ;
//  - douze caractères qu'une lignée porte et transmet : elle aime le feu, a des racines profondes, des fruits charnus, des feuilles
//    coriaces, pousse vite, est géante ou naine… Chacun a son prix ;
//  - l'éveil est une radiation : dans chaque lieu, chaque port donne de deux à sept lignées nouvelles (plus le lieu est chaud et
//    humide, plus il en porte), des formes qui s'y plaisent, ou leurs variantes ;
//    elles prennent une part des pieds et de la place de leur mère (le jour de l'éveil, les brouteurs trouvent le même poids de plantes) ;
//  - puis la flore vit : les lignées d'un même port se disputent la place d'un lieu (celle qui remplit la sienne en gagne, l'autre
//    en perd) ; une lignée en donne parfois une autre, d'une forme voisine ou d'un caractère de plus ; elle gagne un lieu voisin qui
//    lui convient ; une population qui n'a plus de place disparaît, et une lignée sans population s'éteint.
// Un brouteur ne mange pas toutes ces plantes pareil : sa taille devant leur hauteur, son régime devant ce qu'elles donnent (docs/30).
// Le feu, le sec et la crue (docs/47) trient les caractères. Chaque tirage vient du nom de la lignée et du cycle : le hasard du
// cycle ne bouge pas. Un monde qui ne l'a pas éveillée n'en voit rien. Déterministe. Node (require) ou navigateur
// (globalThis.OrvaneDiversite).
'use strict';
(function (racine) {
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const REGLES = {
  eveil: { par_port: [2, 5], max: 7, part: .15, reste: .3, seuil: .35 },   // à l'éveil : de deux à cinq lignées nouvelles par port (du froid ou du sec au chaud et humide) dans un lieu à trois ports, plus s'il en a moins, sept au plus ; chacune 15 % de sa mère, qui en garde 30 % au moins ; il faut qu'une forme s'y plaise à 0,35 au moins
  concurrence: .02,          // par cycle : une lignée gagne ou perd jusqu'à 2 % de sa place, selon qu'elle la remplit mieux ou moins bien que ses sœurs de port
  disparition: .004,         // une population dont la place tombe sous 0,4 % de celle de son port disparaît du lieu
  separation: { chance: .003, part: .25, min: 20, forme: .5 },   // par population et par cycle ; la fille prend un quart ; 20 unités de biomasse au moins ; une fois sur deux, une autre forme du port
  colonisation: { chance: .004, part: .08, graines: .05, seuil: .25 },   // par population et par cycle ; elle prend 8 % de la place de la plus grande lignée de son port chez le voisin, et y arrive en graines
  par_port: 8, par_lieu: 20, monde: 1500,   // les plafonds : lignées d'un port dans un lieu, lignées dans un lieu, lignées vivantes dans le monde
  derive: { hauteur: [.7, 1.4], croissance: [.8, 1.25], caractere: .6 },   // à une séparation : la hauteur et la repousse de la fille ; six fois sur dix, un caractère de plus
  evenements: 6              // au plus, par cycle
};
// où une forme pousse : des fenêtres douces sur les axes d'un lieu (1 au cœur, 0 à 0,1 dehors)
const dans = (v, lo, hi) => clamp((v - lo) / .1 + 1) * clamp((hi - v) / .1 + 1);
const A = b => ({ T: b.axes?.temperature ?? .5, H: b.axes?.humidite ?? .5, alt: b.axes?.altitude ?? .3, L: b.axes?.lumiere ?? .7, C: b.axes?.couvert ?? 0 });
const terre = b => b.milieu === 'terrestre' || b.milieu === 'amphibie' || b.milieu === 'aerien';
// --- les formes : port, nom, féminin, hauteur (m), masse d'un pied (kg), repousse par cycle, où (b → 0 à 1), feuillage, ce qu'elle donne, ses caractères ---
const F = (port, nom, fem, h, m, r, ou, x = {}) => ({ port, nom, fem, h, m, r, ou, ...x });
const FORMES = {
  // des arbres
  conifere: F('arbre', 'conifère', 0, 20, 600, .2, b => dans(A(b).T, 0, .4), { feuillage: 'persistant', rendement: { feuilles: .6, graines: .5 }, car: ['vent'] }),
  palmier: F('arbre', 'palmier', 0, 10, 300, .3, b => dans(A(b).T, .7, 1) * dans(A(b).H, .35, 1), { feuillage: 'persistant', rendement: { feuilles: .5, fruits: .8, nectar: .2 } }),
  paletuvier: F('arbre', 'palétuvier', 0, 6, 200, .25, b => b.milieu === 'amphibie' ? dans(A(b).T, .6, 1) : 0, { feuillage: 'persistant', rendement: { feuilles: 1, fruits: .2 }, car: ['echasses'] }),
  bouteille: F('arbre', 'arbre-bouteille', 0, 15, 2000, .12, b => dans(A(b).T, .65, 1) * dans(A(b).H, 0, .45), { rendement: { feuilles: .7, fruits: .5, nectar: .3 }, car: ['racines_profondes'] }),
  geant: F('arbre', 'arbre géant', 0, 45, 5000, .1, b => dans(A(b).H, .55, 1) * dans(A(b).T, .3, .75) * dans(A(b).C, .5, 1), { rendement: { feuilles: 1, graines: .2 }, car: ['vent'] }),
  fruitier: F('arbre', 'arbre fruitier', 0, 6, 150, .3, b => dans(A(b).T, .4, .8) * dans(A(b).H, .3, .9), { rendement: { feuilles: 1, fruits: 1, nectar: .5 } }),
  pionnier: F('arbre', 'arbre pionnier', 0, 9, 120, .45, b => dans(A(b).T, .2, .6), { feuillage: 'caduc', rendement: { feuilles: 1, graines: .4 }, car: ['vent', 'rapide'] }),
  fougere_arbre: F('arbre', 'fougère arborescente', 1, 5, 80, .3, b => dans(A(b).T, .6, 1) * dans(A(b).H, .7, 1), { feuillage: 'persistant', rendement: { feuilles: 1 } }),
  emergent: F('arbre', 'arbre émergent', 0, 60, 8000, .08, b => dans(A(b).T, .75, 1) * dans(A(b).H, .65, 1), { feuillage: 'persistant', rendement: { feuilles: 1, fruits: .3, graines: .3 } }),
  figuier: F('arbre', 'figuier étrangleur', 0, 25, 1500, .2, b => dans(A(b).T, .7, 1) * dans(A(b).H, .55, 1), { feuillage: 'persistant', rendement: { feuilles: 1, fruits: 1.2, nectar: .1 } }),
  sous_bois: F('arbre', 'arbre du sous-bois', 0, 4, 60, .3, b => dans(A(b).T, .65, 1) * dans(A(b).H, .6, 1) * dans(A(b).C, .6, 1), { feuillage: 'persistant', rendement: { feuilles: 1, fruits: .7, nectar: .6 } }),
  // des buissons
  bruyere: F('buisson', 'bruyère', 1, .5, 1, .3, b => dans(A(b).T, 0, .5) * dans(A(b).H, .3, .85) * dans(A(b).C, 0, .4), { feuillage: 'persistant', rendement: { feuilles: .8, nectar: .8, graines: .2 } }),
  ronce: F('buisson', 'roncier', 0, 1.5, 4, .45, b => dans(A(b).T, .35, .75) * dans(A(b).H, .35, 1), { rendement: { feuilles: 1, fruits: .9, nectar: .4 } }),
  liane: F('buisson', 'liane', 1, 8, 6, .4, b => dans(A(b).T, .55, 1) * dans(A(b).H, .55, 1) * dans(A(b).C, .5, 1), { feuillage: 'persistant', rendement: { feuilles: 1, fruits: .5, nectar: .4 } }),
  baies: F('buisson', 'arbuste à baies', 0, 1.2, 3, .3, b => dans(A(b).T, .1, .5), { rendement: { feuilles: 1, fruits: 1, nectar: .3 } }),
  epine: F('buisson', 'buisson d\'épines', 0, 2, 8, .2, b => dans(A(b).T, .6, 1) * dans(A(b).H, 0, .5), { rendement: { feuilles: 1, fruits: .3, graines: .3 }, car: ['coriace', 'racines_profondes'] }),
  aromatique: F('buisson', 'buisson aromatique', 0, .8, 2, .3, b => dans(A(b).T, .4, .9) * dans(A(b).H, 0, .45), { feuillage: 'persistant', rendement: { feuilles: 1, nectar: .9, graines: .2 }, car: ['coriace'] }),
  // des herbes
  fougere: F('herbe', 'fougère', 1, .8, .3, .35, b => dans(A(b).C, .4, 1) * dans(A(b).H, .5, 1), { rendement: { feuilles: 1 } }),
  fleur: F('herbe', 'fleur des prés', 1, .4, .04, .5, b => dans(A(b).C, 0, .4) * dans(A(b).T, .25, .8), { rendement: { feuilles: .7, nectar: 1, graines: .3 } }),
  cereale: F('herbe', 'graminée à grains', 1, 1, .08, .5, b => dans(A(b).C, 0, .3) * dans(A(b).H, .25, .7), { rendement: { feuilles: .8, graines: 1.2 }, car: ['vent'] }),
  legumineuse: F('herbe', 'légumineuse', 1, .2, .03, .6, b => dans(A(b).T, .3, .7) * dans(A(b).H, .35, 1), { rendement: { feuilles: 1.2, nectar: .5, graines: .3 } }),
  bulbe: F('herbe', 'plante à bulbe', 1, .3, .1, .3, b => dans(A(b).T, .2, .8), { rendement: { feuilles: .6, nectar: .6 }, car: ['bulbe'] }),
  hautes_herbes: F('herbe', 'haute herbe', 1, 2.5, .4, .45, b => dans(A(b).T, .6, 1) * dans(A(b).H, .3, .7) * dans(A(b).C, 0, .4), { rendement: { feuilles: 1, graines: .6 }, car: ['vent', 'pyrophyte'] }),
  coussin: F('herbe', 'plante en coussin', 1, .05, .05, .15, b => Math.max(dans(A(b).alt, .6, 1), dans(A(b).T, 0, .2)), { feuillage: 'persistant', rendement: { feuilles: .8, nectar: .4 }, car: ['coriace'] }),
  mousse: F('herbe', 'mousse', 1, .05, .02, .2, b => Math.max(dans(A(b).C, .5, 1), dans(A(b).H, .7, 1)) * dans(A(b).T, 0, .7), { feuillage: 'persistant', rendement: { feuilles: .7 } }),
  sphaigne: F('herbe', 'sphaigne', 1, .1, .03, .2, b => dans(A(b).H, .8, 1) * dans(A(b).T, 0, .6), { feuillage: 'persistant', rendement: { feuilles: .5 }, car: ['coriace'] }),
  orchidee: F('herbe', 'orchidée', 1, .3, .05, .2, b => dans(A(b).T, .65, 1) * dans(A(b).H, .65, 1), { feuillage: 'persistant', rendement: { feuilles: .5, nectar: 1.5 } }),
  bromelia: F('herbe', 'broméliacée', 1, .5, .5, .25, b => dans(A(b).T, .7, 1) * dans(A(b).H, .6, 1), { feuillage: 'persistant', rendement: { feuilles: .8, nectar: .8, fruits: .3 }, car: ['coriace'] }),
  grande_herbe: F('herbe', 'grande herbe du sous-bois', 1, 3, 2, .45, b => dans(A(b).T, .65, 1) * dans(A(b).H, .6, 1) * dans(A(b).C, .4, 1), { feuillage: 'persistant', rendement: { feuilles: 1, fruits: .4, nectar: .3 } }),
  // des roseaux
  bambou: F('roseau', 'bambou', 0, 8, 5, .5, b => dans(A(b).T, .5, 1) * dans(A(b).H, .55, 1), { rendement: { feuilles: 1, graines: .1 }, car: ['rapide'] }),
  papyrus: F('roseau', 'papyrus', 0, 3, 1, .45, b => dans(A(b).T, .65, 1), { rendement: { feuilles: 1, graines: .3 } }),
  jonc: F('roseau', 'jonc', 0, .8, .1, .4, b => dans(A(b).T, 0, .6), { rendement: { feuilles: 1, graines: .3 } }),
  riz: F('roseau', 'riz sauvage', 0, 1.2, .1, .5, b => dans(A(b).T, .45, 1), { rendement: { feuilles: .8, graines: 1.2 } }),
  // des algues et des plantes d'eau
  varech: F('algue', 'varech', 0, 15, 5, .5, b => b.milieu === 'marin' ? dans(A(b).T, 0, .45) * dans(A(b).L, .3, 1) : 0, { rendement: { feuilles: 1 } }),
  herbier: F('algue', 'herbier marin', 0, .6, .15, .35, b => b.milieu === 'marin' ? dans(A(b).T, .4, 1) * dans(A(b).L, .5, 1) : 0, { rendement: { feuilles: 1, graines: .2 } }),
  plancton: F('algue', 'plancton', 0, .01, .01, .9, b => b.milieu === 'marin' || b.milieu === 'aquatique' ? .8 : 0, { rendement: { feuilles: 1 }, car: ['rapide'] }),
  nenuphar: F('algue', 'nénuphar', 0, .3, .5, .35, b => b.milieu === 'aquatique' || b.milieu === 'amphibie' ? dans(A(b).T, .35, 1) : 0, { rendement: { feuilles: 1, nectar: .6, graines: .3 } }),
  lentille: F('algue', 'lentille d\'eau', 1, .01, .01, .8, b => b.milieu === 'aquatique' || b.milieu === 'amphibie' ? dans(A(b).T, .4, 1) : 0, { rendement: { feuilles: 1 }, car: ['rapide'] }),
  algue_glace: F('algue', 'algue des glaces', 1, .05, .02, .3, b => b.milieu === 'marin' ? dans(A(b).T, 0, .15) : 0, { rendement: { feuilles: 1 } }),
  // des lichens
  lichen_rennes: F('lichen', 'lichen des rennes', 0, .08, .02, .08, b => dans(A(b).T, 0, .25), { rendement: { feuilles: 1.2 } }),
  lichen_croute: F('lichen', 'lichen en croûte', 0, .005, .005, .04, () => .6, { rendement: { feuilles: .6 }, car: ['coriace'] }),
  // des succulentes
  cactus: F('succulente', 'cactus géant', 0, 6, 300, .05, b => dans(A(b).T, .7, 1), { rendement: { feuilles: .6, fruits: .6, nectar: .5 }, car: ['coriace'] }),
  agave: F('succulente', 'agave', 0, 1.5, 20, .08, b => dans(A(b).T, .5, 1), { rendement: { feuilles: .8, nectar: 1 } }),
  caillou: F('succulente', 'plante-caillou', 1, .03, .05, .06, () => .5, { rendement: { feuilles: 1 }, car: ['coriace', 'naine'] }),
  // des champignons
  champignon_geant: F('champignon', 'champignon géant', 0, 2, 10, .25, () => .6, { rendement: { feuilles: 1 } }),
  champignon_lumineux: F('champignon', 'champignon lumineux', 0, .1, .05, .35, () => .5, { rendement: { feuilles: 1 } }),
  moisissure: F('champignon', 'moisissure', 1, .005, .01, .7, () => .5, { rendement: { feuilles: .6 }, car: ['rapide'] })
};
// --- les caractères : ce qu'ils font (cuits dans le plan de la lignée à sa naissance), et ce qu'ils coûtent ---
const CARACTERES = {
  pyrophyte: { nom: 'aime le feu', effet: 'un incendie lui prend trois fois moins de pieds', cout: 'repousse −5 %', sinistres: { incendie: .3 }, croissance: .95, ports: ['arbre', 'buisson', 'herbe', 'roseau', 'succulente'] },
  racines_profondes: { nom: 'racines profondes', effet: 'la sécheresse lui prend trois fois moins de pieds', cout: 'repousse −10 %', sinistres: { secheresse: .3 }, croissance: .9, ports: ['arbre', 'buisson', 'herbe', 'succulente'] },
  bulbe: { nom: 'à bulbe', effet: 'le feu et la sécheresse lui prennent moitié moins de pieds : elle attend sous terre', cout: 'repousse −10 %', sinistres: { incendie: .5, secheresse: .5 }, croissance: .9, ports: ['herbe'] },
  echasses: { nom: 'racines échasses', effet: 'une crue ne lui prend presque rien', cout: 'repousse −5 %', sinistres: { crue: .2 }, croissance: .95, ports: ['arbre', 'buisson', 'roseau'] },
  mellifere: { nom: 'mellifère', effet: 'deux fois plus de nectar', cout: 'repousse −8 %', rendement: { nectar: 2 }, min: { nectar: .4 }, croissance: .92, ports: ['arbre', 'buisson', 'herbe', 'succulente'] },
  fruits_charnus: { nom: 'fruits charnus', effet: 'presque deux fois plus de fruits', cout: 'repousse −8 %', rendement: { fruits: 1.8 }, min: { fruits: .3 }, croissance: .92, ports: ['arbre', 'buisson', 'succulente'] },
  graines_abondantes: { nom: 'graines abondantes', effet: 'presque deux fois plus de graines', cout: 'repousse −6 %', rendement: { graines: 1.8 }, min: { graines: .3 }, croissance: .94, ports: ['herbe', 'roseau', 'arbre', 'buisson'] },
  coriace: { nom: 'feuilles coriaces', effet: 'tous les brouteurs en mangent un quart de moins', cout: 'repousse −10 %', appetence: .75, croissance: .9 },
  rapide: { nom: 'pousse vite', effet: 'repousse +35 %', cout: 'le feu, la crue et la sécheresse lui prennent 20 % de pieds en plus', croissance: 1.35, sinistres: { incendie: 1.2, crue: 1.2, secheresse: 1.2 } },
  geante: { nom: 'géante', effet: 'hauteur × 1,6 : moins de brouteurs l\'atteignent', cout: 'repousse −20 %', hauteur: 1.6, masse: 2, croissance: .8, ports: ['arbre', 'buisson', 'roseau', 'succulente', 'champignon'] },
  naine: { nom: 'naine', effet: 'repousse +15 %', cout: 'hauteur × 0,5 : tous les brouteurs l\'atteignent', hauteur: .5, masse: .4, croissance: 1.15, ports: ['arbre', 'buisson', 'roseau', 'succulente'] },
  vent: { nom: 'fécondée par le vent', effet: 'sa repousse ne dépend pas des butineurs', cout: 'pas de nectar', rendement: { nectar: 0 }, vent: true, ports: ['arbre', 'buisson', 'herbe', 'roseau'] }
};
const INCOMPATIBLES = [['geante', 'naine'], ['vent', 'mellifere']];
const RENDEMENT = {   // (celui des ports : moteur/dietes.js, recopié pour un monde sans régimes en spectre)
  herbe: { feuilles: 1, graines: .5, nectar: .2 }, buisson: { feuilles: 1, fruits: .5, graines: .2, nectar: .3 }, arbre: { feuilles: 1, fruits: .4, graines: .2, nectar: .2 },
  roseau: { feuilles: 1, graines: .3 }, algue: { feuilles: 1 }, lichen: { feuilles: 1 }, succulente: { feuilles: 1, fruits: .3, nectar: .3 }, champignon: { feuilles: 1 }
};
const SYL = ['ver', 'al', 'mi', 'sa', 'lune', 'ro', 'fe', 'ni', 'ar', 'bel', 'ul', 'sor', 'ta', 'li', 'gra', 'dé', 'on', 'ys', 'mor', 'cal', 'eth', 'ou', 'vin'];
const estPlante = t => t?.plan?.regime === 'vegetal', portDe = plan => plan.port || plan.forme, typeDe = b => b.type || b.id;
const hacher = (s, n, sel) => { let h = (2166136261 ^ sel) >>> 0; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return (Math.imul(h ^ (n + 1), 2654435761) >>> 0) || 1; };
const generateur = g => () => { g = (Math.imul(g, 1664525) + 1013904223) >>> 0; return g / 4294967296; };
const r2 = (v, m) => +(+v).toFixed((m || 1) >= 1 ? 4 : 2), r3 = v => +(+v).toFixed(3);
const poids = (t, p) => p.effectif * (t.plan.masse_kg || 1);

// --- le plan d'une lignée de la flore riche : sa forme, ses caractères, cuits ---
// base : { h, m, r, rendement, feuillage } et, pour une mère, ce que ses caractères ont déjà cuit (appetence, sinistres, vent) ;
// neufs : les caractères à cuire ; tous : ceux que la lignée dit porter (neufs, par défaut)
function planDe(mere, forme, base, neufs, niche, tous = neufs) {
  const port = FORMES[forme]?.port || portDe(mere), R = { ...(base.rendement || RENDEMENT[port] || { feuilles: 1 }) }, S = { ...(base.sinistres || {}) }, car = tous; let h = base.h, m = base.m, r = base.r, ap = base.appetence ?? 1, vent = !!base.vent;
  for (const c of neufs) { const K = CARACTERES[c]; if (!K) continue; h *= K.hauteur || 1; m *= K.masse || 1; r *= K.croissance || 1; ap *= K.appetence || 1; vent = vent || !!K.vent;
    for (const [k, v] of Object.entries(K.rendement || {})) R[k] = v === 0 ? 0 : Math.max((R[k] || 0) * v, K.min?.[k] || 0);
    for (const [k, v] of Object.entries(K.sinistres || {})) S[k] = (S[k] ?? 1) * v; }
  for (const k of Object.keys(R)) { R[k] = r3(R[k]); if (!(R[k] > 0)) delete R[k]; }
  const { rendement, sinistres, appetence, vent: v0, feuillage, caracteres, cle, port: p0, feminin, ...reste } = mere;
  const plan = { ...reste, forme, port, hauteur_m: r3(h), taille_m: r3(h), masse_kg: +m.toPrecision(3), croissance: r3(r), rendement: R, ...(niche ? { niche: { ...niche } } : {}) };
  if (base.feuillage) plan.feuillage = base.feuillage; if (car.length) plan.caracteres = car.slice().sort(); if (Object.keys(S).length) plan.sinistres = Object.fromEntries(Object.entries(S).map(([k, v]) => [k, r3(v)]));
  if (ap !== 1) plan.appetence = r3(ap); if (vent) plan.vent = true; if (FORMES[forme] ? FORMES[forme].fem : mere.feminin) plan.feminin = true;
  // la clé : ce qui la distingue devant un brouteur (moteur/flore.js) — son port, sa hauteur, ce qu'elle donne, ce qu'elle rebute
  plan.cle = [port, plan.hauteur_m, plan.appetence ?? 1, ...Object.keys(R).sort().map(k => k[0] + k[1] + R[k])].join('|');
  return plan;
}
// la base d'une forme du catalogue ; celle d'une mère (ce qu'elle serait sans ses caractères ne se retrouve pas : on part d'elle, telle quelle)
const baseForme = f => ({ h: FORMES[f].h, m: FORMES[f].m, r: FORMES[f].r, rendement: FORMES[f].rendement, feuillage: FORMES[f].feuillage });
const peut = (c, port, car) => CARACTERES[c] && (!CARACTERES[c].ports || CARACTERES[c].ports.includes(port)) && !car.includes(c) && !INCOMPATIBLES.some(([a, b]) => (a === c && car.includes(b)) || (b === c && car.includes(a)));
// ce qu'une forme vaut dans un lieu (0 : elle n'y pousse pas) ; une des huit formes d'origine pousse partout où son port a sa place
const convient = (plan, b) => FORMES[plan.forme] ? FORMES[plan.forme].ou(b) : 1;
// la richesse d'un lieu : plus il est chaud et humide (ou, pour une eau, chaud et éclairé), plus il porte de formes
const richesse = b => { const a = A(b), [lo, hi] = REGLES.eveil.par_port; return Math.round(lo + (hi - lo) * clamp(1.6 * a.T * (terre(b) ? a.H : a.L))); };
const nommer = (R, forme, lieu, car) => { const nom = (SYL[Math.floor(R() * SYL.length)] + SYL[Math.floor(R() * SYL.length)]).replace(/^./, c => c.toUpperCase()); return `${nom} ${FORMES[forme]?.nom || forme}${lieu ? ` (${lieu})` : ''}`; };

// --- partager une population entre une mère et sa fille : les pieds (au poids), la place, et leurs références ---
// (tout ce qui mesure une place se partage, comme à une séparation des dérives, docs/29 : le milieu recalcule le potentiel d'après
//  reference.potentiel ; les effectifs passent au poids, la fille n'ayant pas la masse de sa mère)
function partager(p, q, mm, mf, n) {
  const rm = mm / mf, part = (o, x, k) => { if (!o) return o; const r = { ...o }; for (const c of ['effectif', 'succession']) if (Number.isFinite(o[c])) r[c] = r2(o[c] * x * k, k === 1 ? mm : mf); if (Number.isFinite(o.potentiel)) r.potentiel = +(o.potentiel * x).toFixed(2); return r; };
  const { parcelles, graines, sinistre, stade, feuillage, ...reste } = p;
  const pf = { ...JSON.parse(JSON.stringify(reste)), effectif: r2(p.effectif * q * rm, mf), tendance: 0, depuis: n, potentiel: +((p.potentiel || 0) * q).toFixed(2) };
  if (p.reference) pf.reference = part(p.reference, q, rm); if (p.reference_diete) pf.reference_diete = part(p.reference_diete, q, rm);
  p.effectif = r2(p.effectif * (1 - q), mm); p.potentiel = +((p.potentiel || 0) * (1 - q)).toFixed(2);
  if (p.reference) p.reference = part(p.reference, 1 - q, 1); if (p.reference_diete) p.reference_diete = part(p.reference_diete, 1 - q, 1);
  return pf;
}
const lignee = (mere, id, nom, plan, n, pops) => ({ ...JSON.parse(JSON.stringify({ ...mere, populations: [], plan: null })), id, nom, parent: mere.id, apparu: n, eteint: null, statut: 'croissance', plan, populations: pops });

// --- l'éveil : la radiation ---
function eveiller(inst) {
  const out = JSON.parse(JSON.stringify(inst)); if (out.monde?.diversite) return { inst: out, evenements: [] };
  const n = out.cycle?.n ?? 0, types = out.monde?.parcelles?.types || out.biomes, ids = new Set(out.taxons.map(t => t.id)), E = REGLES.eveil, graine = (out.monde?.graine ?? 1) >>> 0;
  const lieux = new Map(out.biomes.map(b => [b.id, typeDe(b)])), neuves = [], formes = new Set();
  for (const B of types) {
    // les mères : dans ce type de lieu, la lignée la plus lourde de chaque port
    const M = {}; for (const t of out.taxons) { if (!estPlante(t) || t.eteint) continue; const w = t.populations.filter(p => lieux.get(p.biome) === B.id).reduce((s, p) => s + poids(t, p), 0); if (w > 0 && (!M[portDe(t.plan)] || w > M[portDe(t.plan)].w)) M[portDe(t.plan)] = { t, w }; }
    const cible = Math.min(E.max, Math.max(1, Math.round(richesse(B) * 3 / Math.max(1, Object.keys(M).length)))), q0 = Math.min(E.part, (1 - E.reste) / cible);   // (un lieu qui n'a qu'un ou deux ports en porte plus de chacun)
    for (const port of Object.keys(M).sort()) { const mere = M[port].t, R = generateur(hacher(B.id + '|' + port, 0, graine ^ 0xd1e));
      const cands = Object.keys(FORMES).filter(f => FORMES[f].port === port && f !== mere.plan.forme).map(f => [f, FORMES[f].ou(B) * (.85 + .3 * R())]).filter(x => x[1] >= E.seuil).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, cible);
      // (un lieu riche où les formes de ce port manquent : des variantes des meilleures, qui portent un caractère de plus)
      for (let k = 0, nf = cands.length; nf && cands.length < cible && k < 2 * nf; k++) cands.push([cands[k % nf][0], 0, true]);
      cands.forEach(([forme, , variante], i) => { const car = (FORMES[forme].car || []).slice();
        if (variante) { const L = Object.keys(CARACTERES).filter(c => peut(c, port, car)).sort(); if (L.length) car.push(L[Math.floor(R() * L.length)]); }
        // un ou deux caractères de plus, une fois sur deux
        for (let k = 0; k < 2; k++) if (R() < .5) { const L = Object.keys(CARACTERES).filter(c => peut(c, port, car)); if (L.length) car.push(L[Math.floor(R() * L.length)]); }
        let id = `flore-${B.id}-${forme.replace(/_/g, '-')}`, j = 2; while (ids.has(id)) id = `flore-${B.id}-${forme.replace(/_/g, '-')}-${j++}`; ids.add(id);
        const plan = planDe(mere.plan, forme, baseForme(forme), car, B.axes), q = q0 / (1 - q0 * i);   // (la i-ième part se prend sur ce qui reste : la même part de la mère d'origine chacune)
        const pops = mere.populations.filter(p => lieux.get(p.biome) === B.id && p.effectif > 0).map(p => partager(p, q, mere.plan.masse_kg || 1, plan.masse_kg, n));
        if (pops.length) { neuves.push(lignee(mere, id, nommer(R, forme, B.nom || B.id), plan, n, pops)); formes.add(forme); } }); }
  }
  out.taxons.push(...neuves);
  const vivantes = out.taxons.filter(t => estPlante(t) && !t.eteint).length;
  out.monde = { ...out.monde, diversite: { depuis: n, lignees: vivantes, nees: neuves.length, eteintes: 0 } };
  return { inst: out, evenements: [{ type: 'eveil', taxon: neuves[0]?.id || out.taxons.find(estPlante)?.id || out.taxons[0]?.id, detail: `la flore se diversifie : ${neuves.length} lignées nouvelles, de ${formes.size} formes (${[...formes].slice(0, 6).map(f => FORMES[f].nom).join(', ')}…) ; ${vivantes} lignées de plantes en tout, qui se disputeront la place, se sépareront, gagneront les lieux voisins et s'éteindront` }] };
}

// --- un cycle : après la pousse. ctx : { n, biomes, monde, ids, noms } ; plantes : toutes les lignées de plantes (on y ajoute les neuves) ---
function vivre(plantes, ctx) {
  const { n, biomes, monde } = ctx, ev = [], neuves = [], ids = ctx.ids || new Set(plantes.map(t => t.id)), nom = id => ctx.noms?.[id] || biomes[id]?.nom || id, graine = (monde.graine ?? 1) >>> 0;
  let nees = 0, eteintes = 0;
  const parLieu = () => { const L = {}; for (const t of plantes) if (!t.eteint) for (const p of t.populations) ((L[p.biome] ??= {})[portDe(t.plan)] ??= []).push({ t, p }); return L; };
  const echelle = (p, f) => { p.potentiel = +((p.potentiel || 0) * f).toFixed(2); if (p.reference && Number.isFinite(p.reference.potentiel)) p.reference.potentiel = +(p.reference.potentiel * f).toFixed(2); };
  // 1. la concurrence pour la place, entre les lignées d'un même port dans un lieu ; 2. une population sans place disparaît
  let L = parLieu();
  for (const bid of Object.keys(L).sort()) for (const port of Object.keys(L[bid]).sort()) { const G = L[bid][port].filter(x => x.p.potentiel > 0); if (G.length < 2) continue;
    const K = G.reduce((s, x) => s + x.p.potentiel, 0), rempl = G.map(x => Math.min(2, poids(x.t, x.p) / x.p.potentiel)), moy = G.reduce((s, x, i) => s + rempl[i] * x.p.potentiel, 0) / K;
    const f = G.map((x, i) => 1 + REGLES.concurrence * clamp(rempl[i] - moy, -1, 1)), K2 = G.reduce((s, x, i) => s + x.p.potentiel * f[i], 0);
    G.forEach((x, i) => echelle(x.p, f[i] * K / K2));
    for (const x of G) { if (x.p.potentiel >= REGLES.disparition * K) continue; const h = G.filter(y => y !== x && y.p.potentiel > 0).sort((a, b) => b.p.potentiel - a.p.potentiel || (a.t.id < b.t.id ? -1 : 1))[0]; if (!h) continue;
      // ce qui lui restait de place va à la plus grande de ses sœurs ; ses derniers pieds meurent
      const fh = (h.p.potentiel + x.p.potentiel) / h.p.potentiel; echelle(h.p, fh); x.p.potentiel = 0; x.t.populations = x.t.populations.filter(q => q !== x.p);
      if (!x.t.populations.length) { x.t.eteint = n; x.t.statut = 'eteint'; eteintes++; ev.push([3, { type: 'extinction', taxon: x.t.id, biome: bid, detail: `${x.t.nom} s'éteint : ${h.t.nom} a pris sa place` }]); } } }
  // 3. la séparation et 4. la colonisation : rares, tirées du nom de la lignée, du lieu et du cycle
  L = parLieu(); const vivantes = () => plantes.filter(t => !t.eteint).length + neuves.length;
  const compte = bid => Object.values(L[bid] || {}).reduce((s, G) => s + G.length, 0);
  for (const t of plantes.slice()) { if (t.eteint) continue; const port = portDe(t.plan);
    for (const p of t.populations.slice()) { const b = biomes[p.biome]; if (!b || !(p.potentiel > 0)) continue; const R = generateur(hacher(t.id + '|' + p.biome, n, graine ^ 0xf10e)), x = R(), S = REGLES.separation, C = REGLES.colonisation;
      if (x < S.chance) { if (poids(t, p) < S.min || vivantes() >= REGLES.monde || (L[p.biome][port] || []).length >= REGLES.par_port || compte(p.biome) >= REGLES.par_lieu) continue;
        // la fille : une autre forme de son port qui se plaît ici, ou la même ; sa hauteur et sa repousse dérivent ; un caractère de plus ou de moins
        let forme = t.plan.forme; const autres = Object.keys(FORMES).filter(f => FORMES[f].port === port && f !== forme && FORMES[f].ou(b) >= REGLES.eveil.seuil).sort();
        const change = autres.length && R() < S.forme; if (change) forme = autres[Math.floor(R() * autres.length)];
        // (si elle change de forme, elle prend les caractères de sa forme ; sinon elle garde ceux de sa mère, déjà cuits dans son plan)
        const car = change ? (FORMES[forme].car || []).slice() : (t.plan.caracteres || []).slice(), neufs = change ? car.slice() : []; let dit = change ? `une autre forme, ${FORMES[forme].nom}` : '';
        if (R() < REGLES.derive.caractere) { const plus = Object.keys(CARACTERES).filter(c => peut(c, port, car)).sort(); if (plus.length) { const c = plus[Math.floor(R() * plus.length)]; car.push(c); neufs.push(c); dit += `${dit ? ', ' : ''}elle est « ${CARACTERES[c].nom} »`; } }
        const D = REGLES.derive, dh = D.hauteur[0] + (D.hauteur[1] - D.hauteur[0]) * R(), dr = D.croissance[0] + (D.croissance[1] - D.croissance[0]) * R();
        const base = change ? baseForme(forme) : { h: t.plan.hauteur_m, m: t.plan.masse_kg, r: t.plan.croissance, rendement: t.plan.rendement || RENDEMENT[port], feuillage: t.plan.feuillage, appetence: t.plan.appetence, sinistres: t.plan.sinistres, vent: t.plan.vent };
        const plan = planDe(t.plan, forme, { ...base, h: base.h * dh, m: base.m * Math.pow(dh, 2), r: base.r * dr }, neufs, b.axes, car);
        let id = `${t.id}-${forme === t.plan.forme ? 'v' : forme.replace(/_/g, '-')}`, j = 2; while (ids.has(id)) id = `${t.id}-${forme === t.plan.forme ? 'v' : forme.replace(/_/g, '-')}-${j++}`; ids.add(id);
        const pf = partager(p, S.part, t.plan.masse_kg || 1, plan.masse_kg, n), fille = lignee(t, id, nommer(R, forme, nom(p.biome)), plan, n, [pf]);
        neuves.push(fille); nees++; (L[p.biome][port] ??= []).push({ t: fille, p: pf });
        ev.push([2, { type: 'separation', taxon: id, biome: p.biome, detail: `lignée de plantes issue de ${t.id} : ${fille.nom}${dit ? ` (${dit})` : ''}, ${String(plan.hauteur_m).replace('.', ',')} m` }]);
        continue; }
      if (x < S.chance + C.chance) { const V = (b.voisins || []).filter(v => biomes[v] && !t.populations.some(q => q.biome === v)).sort(); if (!V.length) continue;
        const v = V[Math.floor(R() * V.length)], bv = biomes[v], G = (L[v]?.[port] || []).filter(y => y.p.potentiel > 0);
        if (!G.length || G.length >= REGLES.par_port || compte(v) >= REGLES.par_lieu || convient(t.plan, bv) < C.seuil) continue;
        const h = G.slice().sort((a, c) => c.p.potentiel - a.p.potentiel || (a.t.id < c.t.id ? -1 : 1))[0], Kn = h.p.potentiel * C.part, m = t.plan.masse_kg || 1, ef = r2(Kn * C.graines / m, m), fr = (p.frequences || [1]).slice();
        const np = { biome: v, effectif: ef, tendance: 0, depuis: n, potentiel: +Kn.toFixed(2), frequences: fr,
          ...(h.p.reference ? { reference: { ...(Number.isFinite(h.p.reference.potentiel) ? { potentiel: +(h.p.reference.potentiel * C.part).toFixed(2) } : {}), ...(h.p.reference.capacite != null ? { capacite: h.p.reference.capacite } : {}), ...(h.p.reference.part != null ? { part: h.p.reference.part } : {}), effectif: ef, frequences: fr.slice(), ...(h.p.reference.succession != null ? { succession: ef } : {}) } } : {}),
          ...(h.p.reference_diete ? { reference_diete: { effectif: ef, frequences: fr.slice() } } : {}) };
        echelle(h.p, 1 - C.part); t.populations.push(np); (L[v][port] ??= []).push({ t, p: np });
        ev.push([1, { type: 'migration', taxon: t.id, biome: v, detail: `${t.nom} gagne ${nom(v)}, depuis ${nom(p.biome)} : ses graines y prennent pied` }]); } } }
  plantes.push(...neuves);
  const D = { ...monde.diversite, lignees: plantes.filter(t => !t.eteint).length, nees: (monde.diversite.nees || 0) + nees, eteintes: (monde.diversite.eteintes || 0) + eteintes };
  return { evenements: ev.sort((a, b) => b[0] - a[0]).slice(0, REGLES.evenements).map(x => x[1]), monde: m => ({ ...m, diversite: D }) };
}
// ce qu'un jeu lit des formes et des caractères (catalogue.formes_flore, catalogue.caracteres_flore)
const catalogue = () => ({ formes: Object.fromEntries(Object.entries(FORMES).map(([k, f]) => [k, { nom: f.nom, port: f.port, hauteur_m: f.h, croissance: f.r, ...(f.feuillage ? { feuillage: f.feuillage } : {}), ...(f.rendement ? { rendement: f.rendement } : {}), ...(f.car ? { caracteres: f.car } : {}) }])),
  caracteres: Object.fromEntries(Object.entries(CARACTERES).map(([k, c]) => [k, { nom: c.nom, effet: c.effet, cout: c.cout }])) });

const API = { REGLES, FORMES, CARACTERES, eveiller, vivre, planDe, convient, catalogue, portDe };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvaneDiversite = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
