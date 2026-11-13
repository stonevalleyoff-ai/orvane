// Orvane — LE TAMPON (tampon/tampon.js) — v0
// Entre le moteur et un jeu, dans les deux sens, réglé par le profil du jeu (schemas/profil.schema.json).
//  - exposer(taxon, profil, cat, biome, ref) : Orvane → jeu. Les fréquences réelles des phénotypes deviennent les
//                                   fréquences que le jeu montre. Deux modes (profil.exposition.mode) :
//                                   « compression » (20 % → 2 %, traits non rendus fondus dans le phénotype de base) ;
//                                   « relatif » : les taux propres du jeu, multipliés par l'écart depuis la génération 0
//                                   (ref) — le jour un, rien ne change. (Le lissage entre deux instantanés est du côté du
//                                   traducteur : il interpole ce que lui renvoie exposer() sur propagation_cycles.)
//  - agreger(lots, inst, profil, etat, gen0, jeux) : jeu → Orvane. Des lots de pressions bruts (schemas/pression.schema.json),
//                                   venus de tous les jeux branchés sur le monde, deviennent les pressions du moteur. Chaque lot
//                                   est lu avec l'exposition de SON jeu (jeux : { id: { exposition } }, hebergement/LISEZ-MOI.md) :
//      1. rapporter l'activité d'un compte à une activité normale (exposition_ref rencontres par cycle) ;
//         ce que les bêtes ont vécu de lui (contact, docs/12 ; vecu, docs/50) aussi, mesuré sur tous ses contacts, et rien de
//         plus : ce qu'une population apprend dépend de proportions, et n'a de part ni par compte ni par jeu (plus bas) ;
//      2. dénormaliser : les prélèvements par phénotype sont redistribués selon les fréquences RÉELLES, à taux
//         par tête constant (une variante montrée à 2 % mais réelle à 20 % voit ses pertes ×10) ;
//      3. plafonner : par compte, part maximale d'un seul compte, d'un seul jeu, part maximale d'une population ;
//         ce qui n'est pas un retrait est plafonné aussi : déplacements, libérations, habitat, milieu (voir plus bas) ;
//      4. lisser sur memoire_cycles (moyenne mobile exponentielle, gardée dans « etat »).
//      Les traits continus (docs/8) : le z moyen des bêtes retirées (événements « q »), pondéré et lissé de même.
//      Un lot est une donnée, jamais une instruction : chaque événement est vérifié à l'entrée (une action connue, un n fini,
//      positif et borné, une lignée et des lieux du monde) ; ce qui ne l'est pas est écarté et compté (rejetes), et un lot qui ne
//      se lit pas n'arrête jamais le cycle.
//  - quantDe(taxon, biomes, ref) : Orvane → jeu, la loi d'où tirer chaque bête pour les traits continus.
//  - sachantMere(e, dom, montre), exprimer(porte, cat) : l'hérédité côté jeu (docs/9), un petit qui ressemble à sa mère.
(function (racine) {
'use strict';
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// facteur de compression d'un phénotype : le plus sévère de ses traits, sinon de leurs domaines, sinon le défaut
function compression(p, profil, cat) {
  const c = profil.exposition.compression, r = profil.exposition.traits_rendus;
  if (r && p.traits.some(id => !r.includes(id))) return 0;
  let k = c.defaut;
  for (const id of p.traits) { if (c.par_trait?.[id] != null) k = Math.min(k, c.par_trait[id]);
    else if (cat?.[id] && c.par_domaine?.[cat[id].domaine] != null) k = Math.min(k, c.par_domaine[cat[id].domaine]); }
  return k;
}
// Orvane → jeu : { [phenotype]: fréquence exposée }, somme 1, le premier phénotype (base) absorbe le reste.
// La compression porte sur la COTE (f / (1 − f)), pas sur la fréquence : une variante rare reste rare
// (20 % → 2,4 % avec k = 0,1), mais une variante devenue majoritaire le reste dans le jeu (99 % → 91 %).
function exposer(taxon, profil, cat, biome, ref) {
  if (profil.exposition.mode === 'relatif') return exposerRelatif(taxon, profil, ref);
  const e = {}; let reste = 1;
  const kb = biome && profil.exposition.compression.par_biome?.[biome];
  taxon.phenotypes.forEach((p, i) => { if (i === 0) return;
    const f = (biome && p.frequence_par_biome?.[biome]) ?? p.frequence, k = compression(p, profil, cat) * (kb ?? 1);
    const v = f >= 1 ? 1 : +(f * k / (f * k + 1 - f)).toFixed(5); e[p.id] = v; reste -= v; });
  if (reste < 0) { const s = 1 - reste; for (const k in e) e[k] = +(e[k] / s).toFixed(5); reste = 0; }   // plusieurs variantes majoritaires : on renormalise
  e[taxon.phenotypes[0].id] = +Math.max(0, reste).toFixed(5);
  return e;
}

// Orvane → jeu, mode « relatif » : le jeu garde ses taux d'avant Orvane (profil.exposition.taux_jeu, par trait rendu) et
// ne suit que l'ÉCART du monde depuis la génération 0 (ref : le même taxon à la génération 0, ou son plus proche ancêtre).
// Sur la cote : cote(jeu) = cote(taux du jeu) × cote(fréquence aujourd'hui) / cote(fréquence à la génération 0).
// Le jour un, le jeu est donc exactement ce qu'il était ; une variante deux fois plus répandue l'est deux fois plus
// dans le jeu ; une variante devenue majoritaire le devient aussi (de 1 % à 99 % : ×9801 sur la cote).
// Les phénotypes sont regroupés par leurs traits RENDUS (un nain aux crocs longs se montre nain) ; une combinaison
// absente de la génération 0 garde le taux du jeu, jusqu'à ce qu'Orvane l'installe au-delà de reference_min. Une clé
// « ~trait » est une variante tirée sans phénotype Orvane derrière (le jeu la connaissait, le monde ne l'a pas).
function signature(p, X) {
  const T = X.taux_jeu || {}, R = X.traits_rendus || Object.keys(T);
  return p.traits.filter(t => R.includes(t) && T[t] != null).sort().join('+');
}
// Les deux tirages du mode relatif : G, la chance de chaque signature RENDUE dans le jeu (les taux du jeu × l'écart depuis
// la génération 0) ; M, la part réelle de chaque ensemble de traits NON rendus (ce que le jeu peut faire agir, docs/7).
// Une bête qui naît tire l'un puis l'autre, indépendamment : sa robe rare reste rare, ses conduites ont leur fréquence réelle.
// phen : (signature|non rendus) → l'identifiant du phénotype Orvane qui porte exactement cette combinaison.
const nonRendus = (p, X) => { const T = X.taux_jeu || {}, R = X.traits_rendus || Object.keys(T); return p.traits.filter(t => !(R.includes(t) && T[t] != null)).sort().join('+'); };
function partsRelatif(taxon, profil, ref) {
  const X = profil.exposition, T = X.taux_jeu || {}, R = X.traits_rendus || Object.keys(T), fmin = X.reference_min ?? .01, cote = f => f / Math.max(1e-9, 1 - f);
  const now = {}, avant = {};
  taxon.phenotypes.forEach((p, i) => { const s = i ? signature(p, X) : ''; if (s) now[s] = (now[s] || 0) + p.frequence; });
  if (ref) ref.phenotypes.forEach((p, i) => { const s = i ? signature(p, X) : ''; if (s) avant[s] = (avant[s] || 0) + p.frequence; });
  // les signatures : celles que porte le monde, et chaque trait rendu seul (le jeu les tirait avant Orvane)
  const sigs = new Set([...Object.keys(now), ...Object.keys(T).filter(t => R.includes(t))]), G = { '': 1 };
  for (const s of sigs) {
    const r0 = s.split('+').reduce((a, t) => a * T[t], 1), fn = Math.min(.999999, now[s] || 0), fa = avant[s] || 0;
    // présente à la génération 0 : on suit son écart (éteinte dans Orvane, elle disparaît du jeu) ;
    // absente : le jeu garde son propre taux, jusqu'à ce qu'Orvane l'installe au-delà de reference_min
    const o = fa > 0 ? cote(r0) * cote(fn) / cote(fa) : cote(r0) * Math.max(1, cote(fn) / cote(fmin));
    G[s] = o / (1 + o); G[''] -= G[s];
  }
  if (G[''] < 0) { const z = 1 - G['']; for (const k in G) if (k) G[k] /= z; G[''] = 0; }
  const M = {}, phen = {};
  taxon.phenotypes.forEach((p, i) => { const s = i ? signature(p, X) : '', A = i ? nonRendus(p, X) : ''; M[A] = (M[A] || 0) + p.frequence; phen[s + '|' + A] = p.id; });
  return { G, M, phen };
}
function exposerRelatif(taxon, profil, ref) {
  const X = profil.exposition, { G, M, phen } = partsRelatif(taxon, profil, ref);
  if (X.non_rendus === 'base') {   // les traits non rendus fondus dans le plan de base : seule la signature compte
    const now = {}; taxon.phenotypes.forEach((p, i) => { const s = i ? signature(p, X) : ''; if (s) now[s] = (now[s] || 0) + p.frequence; });
    const e = {}; let reste = 1;
    taxon.phenotypes.forEach((p, i) => { if (!i) return; const s = signature(p, X), v = s && now[s] > 0 ? G[s] * p.frequence / now[s] : 0; e[p.id] = +v.toFixed(7); reste -= v; });
    for (const s in G) if (s && !(now[s] > 0) && G[s] > 0) { e['~' + s] = +G[s].toFixed(7); reste -= G[s]; }
    e[taxon.phenotypes[0].id] = +Math.max(0, reste).toFixed(7);
    return e;
  }
  // 'reel' : la chance de montrer EXACTEMENT ce phénotype = G(sa signature) × M(ses traits non rendus) ; « ~signature » :
  // une robe que le jeu tire sans phénotype Orvane derrière. Le total peut rester sous 1 : ce sont les combinaisons
  // (une robe × des conduites) qu'Orvane ne porte pas ; le jeu les montre quand même, et les rapporte au plus proche.
  const e = {};
  taxon.phenotypes.forEach((p, i) => { const s = i ? signature(p, X) : '', A = i ? nonRendus(p, X) : ''; e[p.id] = +((G[s] || 0) * (M[A] || 0)).toFixed(7); });
  for (const s in G) if (s && !phen[s + '|'] && G[s] > 0) e['~' + s] = +(G[s] * (M[''] || 0)).toFixed(7);
  return e;
}
// le taxon de référence d'un taxon à la génération 0 : lui-même, ou son plus proche ancêtre qui y était
function referenceDe(tid, inst, gen0) {
  if (!gen0) return null;
  const G = new Map(gen0.taxons.map(t => [t.id, t])), I = new Map(inst.taxons.map(t => [t.id, t])), vus = new Set();
  let id = tid; while (id && !vus.has(id)) { vus.add(id); if (G.has(id)) return G.get(id); id = (I.get(id) || G.get(id))?.parent || (id.includes('.') ? id.slice(0, id.lastIndexOf('.')) : null); }
  return null;
}

// Orvane → jeu, les traits continus (docs/8) : sur les populations de ces biomes (toutes, si aucune n'y vit), pondérées
// par leur effectif, la loi d'où tirer chaque bête — moyenne m, variance v — et l'écart d de la moyenne depuis la
// génération 0 (ref : le même taxon à la génération 0 ; une lignée née depuis part de 0, son plan porte ce qu'elle avait
// acquis). Le jeu montre d + variation × (z − m) (profil.quantitatifs.variation) et rapporte z, la valeur tirée.
function quantDe(taxon, biomes, ref) {
  const dans = !biomes ? () => true : typeof biomes.has === 'function' ? b => biomes.has(b) : b => biomes.includes(b);   // un tableau ou un Set
  const melange = t => { if (!t) return null; let pops = t.populations.filter(p => p.quant && dans(p.biome));
    if (!pops.length) pops = t.populations.filter(p => p.quant); if (!pops.length) return null;
    const W = pops.reduce((a, p) => a + Math.max(1, p.effectif), 0), o = {};
    for (const k of Object.keys(pops[0].quant)) { let m = 0, m2 = 0;
      for (const p of pops) { const x = p.quant[k] || { m: 0, v: 1 }, w = Math.max(1, p.effectif) / W; m += w * x.m; m2 += w * (x.v + x.m * x.m); }
      o[k] = { m, v: Math.max(1e-4, m2 - m * m), g: pops.reduce((a, p) => a + Math.max(1, p.effectif) / W * (p.quant[k]?.g ?? .4), 0) }; }
    return o; };
  const Q = melange(taxon); if (!Q) return null;
  const Q0 = ref && ref.id === taxon.id ? melange(ref) : null;
  for (const k in Q) Q[k].d = Q[k].m - (Q0?.[k]?.m ?? 0);
  return Q;
}

// L'hérédité côté jeu (docs/9) : la part des petits d'une mère qui montrent un trait, sachant si elle le montre, le père
// tiré au hasard dans une population où la part e le montre (Hardy-Weinberg). Sur toutes les mères, on retrouve e : les
// taux d'ensemble ne bougent pas, seuls les petits ressemblent à leur mère.
function sachantMere(e, dom, montre) {
  e = clamp(e, 0, .999999); if (e <= 0) return 0;
  if (dom) { const p = 1 - Math.sqrt(1 - e); return montre ? 1 - (1 - p) * (1 - p) / (2 - p) : p; }
  const q = Math.sqrt(e); return montre ? q : q * q / (1 + q);
}
// ce qui se voit d'un jeu de traits portés : dans l'ordre du catalogue de l'instantané, un trait reste si ce qu'il exige
// est là et si rien de gardé ne l'exclut (l'albinisme efface les autres robes, un jet sans glande ne se voit pas)
function exprimer(porte, cat) {
  const ordre = Object.keys(cat || {}), rang = id => { const i = ordre.indexOf(id); return i < 0 ? 999 : i; }, garde = [];
  for (const id of [...porte].sort((a, b) => rang(a) - rang(b) || (a < b ? -1 : 1))) { const t = cat?.[id] || {};
    if ((t.exige || []).some(x => !garde.includes(x))) continue;
    if ((t.exclut || []).some(x => garde.includes(x)) || garde.some(x => (cat?.[x]?.exclut || []).includes(id))) continue;
    garde.push(id); }
  return garde.sort();
}

// le régime de fait d'une lignée : celui de son plan, sauf si la moitié d'elle au moins porte un trait qui en impose un autre
// (estomac-large : un carnivore qui digère aussi les plantes est un omnivore). C'est lui que les jeux montrent.
function regimeDe(t, cat) {
  const c = {}; for (const p of t?.phenotypes || []) for (const id of p.traits || []) c[id] = (c[id] || 0) + (p.frequence || 0);
  let r = t?.plan?.regime; for (const [id, f] of Object.entries(c)) if (f >= .5 && cat?.[id]?.fixe?.regime) r = cat[id].fixe.regime; return r;
}
// La famille d'une lignée : animale, synthétique (une machine, docs/16) ou végétale (une plante, docs/17). Un jeu dit les familles
// qu'il sait jouer (exposition.familles, ou lot.familles dans ses lots ; animale seule par défaut) : il ne reçoit pas les autres
// (filtrer), et le tampon ne lit pas ses événements sur elles. Une nouveauté du monde n'arrive ainsi chez un jeu que s'il la demande.
const FAMILLES = ['animale', 'synthetique', 'vegetale'];
const familleDe = t => t?.plan?.regime === 'synthetique' ? 'synthetique' : t?.plan?.regime === 'vegetal' ? 'vegetale' : t?.plan?.famille || 'animale';
const famillesDe = X => Array.isArray(X?.familles) && X.familles.length ? X.familles : ['animale'];
// la vue d'un jeu : l'instantané sans les lignées des familles qu'il ne joue pas (ni, s'il en donne la liste, des biomes où il ne va
// pas) ; les événements qui les concernent tombent aussi. opt : { familles, biomes } (son exposition, ou ce que son traducteur sait jouer)
function filtrer(inst, opt = {}) {
  if (!inst?.taxons) return inst;
  const F = new Set(famillesDe(opt)), B = Array.isArray(opt.biomes) && opt.biomes.length ? new Set(opt.biomes) : null;
  const garde = t => F.has(familleDe(t)), dans = p => !B || B.has(p.biome);
  const taxons = inst.taxons.filter(garde).map(t => B ? { ...t, populations: t.populations.filter(dans) } : t), ids = new Set(taxons.map(t => t.id));
  return { ...inst, taxons, evenements: (inst.evenements || []).filter(e => e.type === 'eveil' || !e.taxon || ids.has(e.taxon) || inst.biomes?.some(b => b.id === e.taxon)) };   // (un éveil, de la Mère ou de la flore, regarde tout le monde)
}
// Chaque jeu montre le monde à sa façon : le tampon lit ses lots avec SON exposition (orvane_regler_jeu, hebergement/LISEZ-MOI.md). Un lot
// sans jeu connu prend celle du profil du monde, sinon l'exposition neutre : tout est montré tel quel, rien n'est redressé.
const NEUTRE = { mode: 'compression', compression: { defaut: 1 }, propagation_cycles: 1 };
// l'exposition d'un jeu vient de lui (orvane_regler_jeu) : on n'en garde que ce qui a la bonne forme (des listes de chaînes, des
// dictionnaires de nombres finis) ; le reste est oublié, comme si le jeu ne l'avait pas dit
const estObjet = x => x != null && typeof x === 'object' && !Array.isArray(x);
const nombres = o => { const r = {}; if (estObjet(o)) for (const [k, v] of Object.entries(o)) if (!INTERDITS.has(k) && typeof v === 'number' && Number.isFinite(v) && v >= 0) r[k] = v; return r; };
function assainir(X) {
  if (!estObjet(X)) return null; const E = { ...X };
  for (const k of ['traits_rendus', 'familles']) if (E[k] != null) { if (Array.isArray(E[k])) E[k] = E[k].filter(x => typeof x === 'string'); else delete E[k]; }
  if (E.compression != null) { if (!estObjet(E.compression)) delete E.compression;
    else { const c = E.compression, d = typeof c.defaut === 'number' && Number.isFinite(c.defaut) && c.defaut >= 0 ? c.defaut : 1;
      E.compression = { ...c, defaut: d, ...(c.par_trait != null ? { par_trait: nombres(c.par_trait) } : {}), ...(c.par_domaine != null ? { par_domaine: nombres(c.par_domaine) } : {}), ...(c.par_biome != null ? { par_biome: nombres(c.par_biome) } : {}) }; } }
  if (E.taux_jeu != null) E.taux_jeu = Object.fromEntries(Object.entries(nombres(E.taux_jeu)).filter(([, v]) => v <= 1));
  for (const k of ['mode', 'non_rendus']) if (E[k] != null && typeof E[k] !== 'string') delete E[k];
  for (const k of ['reference_min', 'propagation_cycles']) if (E[k] != null && !(typeof E[k] === 'number' && Number.isFinite(E[k]))) delete E[k];
  return E;
}
function vueJeu(profil, jeux, jeu) {
  const X = typeof jeu === 'string' && jeux && Object.prototype.hasOwnProperty.call(jeux, jeu) ? assainir(jeux[jeu]?.exposition) : null, E = X && Object.keys(X).length ? X : profil.exposition || NEUTRE;
  return { ...profil, exposition: E.mode === 'relatif' || E.compression ? E : { ...E, compression: NEUTRE.compression } };
}
// jeu → Orvane (gen0 : la génération 0 du monde, pour le mode relatif ; jeux : l'exposition de chaque jeu)
const MILIEU = { defrichage: ['couvert', -1], reboisement: ['couvert', 1], assechement: ['humidite', -1], irrigation: ['humidite', 1], construction: ['couvert', -1] };   // (docs/22)

// --- la garde à l'entrée : ce qu'un événement doit être pour compter (schemas/pression.schema.json) ---
const ACTIONS = new Set(['rencontre', 'prelevement', 'capture', 'liberation', 'nourrissage', 'reproduction', 'deplacement', 'habitat_perdu', 'habitat_gagne',
  'defrichage', 'reboisement', 'assechement', 'irrigation', 'construction', 'transformation',
  'blessure', 'effarouchement', 'pillage', 'attaque', 'joueur_tombe']);
const LIEUX = new Set(['habitat_perdu', 'habitat_gagne', 'defrichage', 'reboisement', 'assechement', 'irrigation', 'construction', 'transformation']);
const AGES = new Set(['oeuf', 'jeune', 'adulte', 'vieux']);
// (docs/50) la mémoire : ce que les bêtes vivent des joueurs sans qu'aucune ne soit retirée. Ces actions ne comptent que dans un
// monde à la mémoire éveillée ; ailleurs, le tampon les laisse. Le moyen dit comment : de la main du joueur, ou par un dispositif
const VECUES = { blessure: 'blessures', effarouchement: 'effarouchements', pillage: 'pillages', attaque: 'attaques', joueur_tombe: 'tombes' };
const MOYENS = new Set(['melee', 'distance', 'piege', 'feu', 'lumiere', 'bruit']), DISPOSITIFS = new Set(['piege', 'feu', 'lumiere', 'bruit']);
// par compte, par population et par cycle : au plus tant de joueurs tombés et de pillages (ce qui fait une traqueuse ou une
// quémandeuse ne se déclare pas par centaines) ; activite : l'activité normale d'un compte, en contacts, si le profil ne la dit
// pas (influence.exposition_ref). Celle-ci sert aussi au contact de la méfiance (docs/12), dans tous les mondes
const VECU = { tombes: 2, pillages: 5, activite: 60 };
const CLES_VECU = ['rencontres', 'prises', 'blessures', 'dispositif', 'effarouchements', 'nourrissages', 'pillages', 'attaques', 'tombes'];
const N_MAX = 1e4;                                         // un événement compte au plus dix mille bêtes ou unités
const INTERDITS = new Set(['__proto__', 'constructor', 'prototype']);
const QUANT_DEFAUT = { taille: 1, vitesse: 1, audace: 1, sociabilite: 1 };
const dico = () => Object.create(null);                  // un dictionnaire indexé par ce qu'envoient les jeux : sans prototype
const propre = (o, k) => typeof k === 'string' && !INTERDITS.has(k) && o != null && Object.prototype.hasOwnProperty.call(o, k);
const chaine = (x, max = 200) => typeof x === 'string' && x.length > 0 && x.length <= max && !INTERDITS.has(x);
const fini = (x, a, b) => typeof x === 'number' && Number.isFinite(x) && x >= a && x <= b;
// un événement tel qu'il compte, ou null : il ne garde que des champs vérifiés
function valider(e, X) {
  if (!estObjet(e) || !ACTIONS.has(e.action) || !fini(e.n, 0, N_MAX) || !propre(X.biomes, e.biome)) return null;
  const o = { action: e.action, n: e.n, biome: e.biome };
  if (e.parcelle != null) { if (!chaine(e.parcelle, 120)) return null; o.parcelle = e.parcelle; }
  if (LIEUX.has(e.action)) {
    if (e.action === 'transformation') { if (!chaine(e.axe, 60) || !fini(e.sens, -1e9, 1e9) || !Math.sign(e.sens)) return null;
      if (!propre(X.biomes[e.biome].axes, e.axe) && !propre(X.axes, e.axe)) return null; o.axe = e.axe; o.sens = Math.sign(e.sens); }
    return o;
  }
  if (!propre(X.taxons, e.taxon)) return null; o.taxon = e.taxon;
  if (e.action === 'deplacement') { if (!propre(X.biomes, e.vers)) return null; o.vers = e.vers; }
  if (e.phenotype != null) { if (!chaine(e.phenotype)) return null; o.phenotype = e.phenotype; }
  if (AGES.has(e.age)) o.age = e.age;
  if (MOYENS.has(e.moyen)) o.moyen = e.moyen;
  if (estObjet(e.q)) { const q = {}; for (const [k, z] of Object.entries(e.q)) if (propre(X.quant, k) && fini(z, -10, 10) && Math.abs(z) < 10) q[k] = z; if (Object.keys(q).length) o.q = q; }
  // (docs/36) le génome d'une bête relâchée : seulement des allèles de traits que le monde connaît, et ses traits continus
  if (e.action === 'liberation' && estObjet(e.genome)) { const A = {}, a = {};
    if (estObjet(e.genome.alleles)) for (const [k, p] of Object.entries(e.genome.alleles)) if (propre(X.cat, k) && typeof p === 'number' && Number.isFinite(p)) A[k] = clamp(p, 0, 1);
    if (estObjet(e.genome.a)) for (const [k, v] of Object.entries(e.genome.a)) if (propre(X.quant, k) && fini(v, -10, 10) && Math.abs(v) < 10) a[k] = v;
    o.genome = { alleles: A, a }; }
  return o;
}
// les plafonds de part : c = p · Σ min(v_j, c) (un contributeur ne pèse jamais plus que p du total, plafonds compris) — tant que
// les contributeurs sont assez nombreux pour que ce soit possible (n · p ≥ 1) ; sinon, comme avant, p fois le total brut. Un
// contributeur garde toujours au moins « plancher » (p fois ce qu'une population peut perdre en un cycle) : un jeu qui ne prend
// qu'une bête ne peut pas, par la règle de la part, effacer la chasse d'un autre — le plafond ne mord que sur ce qui pèse vraiment.
// v : [[clé, valeur ≥ 0]] → clé → facteur (1 : rien ne change)
function plafondPart(v, p, plancher = 0) {
  const f = dico(); for (const [c] of v) f[c] = 1;
  const n = v.length; if (p == null || n < 2) return f;
  const tri = v.map(x => x[1]).sort((a, b) => a - b), S0 = tri.reduce((a, x) => a + x, 0); let c = p * S0;
  if (n * p >= 1) { let S = 0; for (let k = 0; k <= n; k++) { const den = 1 - p * (n - k);   // les k plus petits ne sont pas plafonnés
      if (den > 0) { const ck = p * S / den, lo = k > 0 ? tri[k - 1] : 0, hi = k < n ? tri[k] : Infinity; if (ck >= lo - 1e-9 && ck <= hi + 1e-9) { c = ck; break; } }
      if (k < n) S += tri[k]; } }
  const cap = Math.max(c, plancher);
  for (const [k, x] of v) if (x > cap && x > 0) f[k] = cap / x;
  return f;
}
function agreger(lots, inst, profil, etat = {}, gen0 = null, jeux = null) {
  const I = profil.influence || {}, PL = I.plafonds || {}, poids = I.poids || {}, cat = inst.catalogue?.traits || {};
  const taxons = dico(); for (const t of inst.taxons || []) taxons[t.id] = t;
  const lieux = dico(); for (const b of inst.biomes || []) lieux[b.id] = b;
  const X = { taxons, biomes: lieux, cat: { ...(inst.catalogue?.monde?.traits || {}), ...cat }, quant: inst.catalogue?.quantitatifs || QUANT_DEFAUT, axes: inst.catalogue?.monde?.axes || {} };
  const effDe = (tid, bid) => taxons[tid]?.populations?.find(p => p.biome === bid)?.effectif || 0;
  const parCompte = dico(), jeuDe = dico(), vues = dico();   // jeuDe : compte → son jeu ; vues : jeu → le profil vu par ce jeu
  const MEMO = !!inst.monde?.memoire;   // (docs/50) la mémoire du monde est éveillée : ce que les bêtes vivent des joueurs se compte aussi
  // parCompte : compte → { t: taxon → biome → { retrait: {pheno|'*': n}, deplacement: [], rencontres, danger, aide, contact }, b: biome → { habitat, milieu },
  //   v: taxon → biome → ce que la population a vécu de ce compte (docs/50 : tenu à part, pour ne rien changer au reste) }
  const Q = {};                // taxon → biome → trait → { s: Σ poids × z, w: Σ poids } : la valeur des bêtes retirées
  let nombre = 0; const rejetes = { lots: 0, evenements: 0 };
  for (const lot of Array.isArray(lots) ? lots : []) {
    try {
      if (!estObjet(lot)) { rejetes.lots++; continue; }
      if (lot.monde !== inst.monde?.id) continue;                                   // un lot d'un autre monde : pas pour celui-ci
      const compte = typeof lot.source?.compte === 'number' && Number.isFinite(lot.source.compte) ? String(lot.source.compte) : lot.source?.compte;
      if (!chaine(compte, 300) || !Array.isArray(lot.evenements)) { rejetes.lots++; continue; }
      // d'abord tout vérifier, puis compter : un lot ne s'applique jamais à moitié
      const E = []; for (const e of lot.evenements) { const v = valider(e, X); if (v) E.push(v); else rejetes.evenements++; }
      const jeu = chaine(lot.jeu, 120) ? lot.jeu : chaine(lot.source?.jeu, 120) ? lot.source.jeu : null;
      const C = parCompte[compte] ??= { t: dico(), b: dico(), v: dico() }; if (!(compte in jeuDe)) jeuDe[compte] = jeu;
      // les familles que ce jeu joue : son exposition, et ce que dit le lot (lot.familles) ; animale seule sinon
      const vj = jeuDe[compte] ?? '', fams = new Set([...famillesDe((vues[vj] ??= vueJeu(profil, jeux, jeuDe[compte])).exposition), ...(Array.isArray(lot.familles) ? lot.familles.filter(f => FAMILLES.includes(f)) : [])]);
      for (const e of E) {
        if (VECUES[e.action] && !MEMO) continue;   // (docs/50) un monde sans mémoire ne connaît pas ces actions : il les laisse
        nombre++;
        if (e.action === 'habitat_perdu' || e.action === 'habitat_gagne') { (C.b[e.biome] ??= { habitat: 0, milieu: {} }).habitat += e.n * (poids[e.action] ?? (e.action === 'habitat_perdu' ? 5 : -5)) * -1; continue; }
        // (docs/22) ce que le jeu fait au milieu : défricher, reboiser, assécher, irriguer, construire (qui retire aussi de l'habitat),
        // ou transformer un axe quelconque (transformation : axe, sens) ; le moteur le lit dans un monde au milieu éveillé
        const AM = MILIEU[e.action] || (e.action === 'transformation' ? [e.axe, e.sens] : null);
        if (AM) { const B = C.b[e.biome] ??= { habitat: 0, milieu: {} }; B.milieu[AM[0]] = (B.milieu[AM[0]] || 0) + AM[1] * e.n;
          if (e.action === 'construction') B.habitat -= e.n * (poids.habitat_perdu ?? 5); continue; }
        if (!fams.has(familleDe(taxons[e.taxon]))) continue;   // une famille que ce jeu ne joue pas (filtrer)
        // (docs/50) la mémoire : ce que la population vit des joueurs, compté à part, sans toucher à ce qui suit — les retraits,
        // le contact, la part de chacun restent ceux d'un monde sans mémoire qui recevrait les mêmes lots. Les cinq actions
        // nouvelles ; et, de ce que le tampon comptait déjà, les rencontres, les prises (une capture pour moitié), les
        // nourrissages et le mal fait par un dispositif (un piège, le feu : sans la main du joueur)
        if (MEMO) { const a = e.action, cle = VECUES[a] || (a === 'rencontre' ? 'rencontres' : a === 'prelevement' || a === 'capture' ? 'prises' : a === 'nourrissage' ? 'nourrissages' : null);
          if (cle) { const V = (C.v[e.taxon] ??= dico())[e.biome] ??= Object.fromEntries(CLES_VECU.map(k => [k, 0])), n = a === 'capture' ? .5 * e.n : e.n;
            V[cle] += n; if (DISPOSITIFS.has(e.moyen) && (cle === 'prises' || cle === 'blessures')) V.dispositif += n; }
          if (VECUES[a]) continue; }
        const T = (C.t[e.taxon] ??= {})[e.biome] ??= { retrait: {}, brut: {}, deplacement: [], rencontres: 0, danger: 0, aide: 0 };
        if (e.action === 'rencontre') { T.rencontres += e.n; continue; }
        // ce que les bêtes vivent des joueurs (docs/12) : une mort ou une capture finit mal (la capture moitié moins : la bête
        // est emmenée, pas tuée sous les yeux des autres) ; nourrir, relâcher, aide
        if (e.action === 'prelevement') T.danger += e.n; else if (e.action === 'capture') T.danger += .5 * e.n;
        else if (e.action === 'nourrissage' || e.action === 'liberation') T.aide += e.n;
        if (e.action === 'deplacement') { T.deplacement.push({ vers: e.vers, n: e.n * Math.max(0, poids.deplacement ?? 1) }); continue; }
        // (docs/36) des bêtes nées en élevage, relâchées avec leur génome : elles s'ajoutent à la population avec leurs gènes
        if (e.action === 'liberation' && e.genome) { const G = T.apport ??= { n: 0, N: {}, A: {}, a: {}, na: {} }, k = e.phenotype || 'base';
          G.n += e.n; G.N[k] = (G.N[k] || 0) + e.n;
          for (const [id, p] of Object.entries(e.genome.alleles)) G.A[id] = (G.A[id] || 0) + e.n * p;
          for (const [q, v] of Object.entries(e.genome.a)) { G.a[q] = (G.a[q] || 0) + e.n * v; G.na[q] = (G.na[q] || 0) + e.n; }
          continue; }
        const w = poids[e.action]; if (w == null || !w || !Number.isFinite(w)) continue;
        const k = e.phenotype || '*'; T.brut[k] = (T.brut[k] || 0) + e.n * w * (e.age === 'adulte' ? 1.2 : e.age === 'jeune' ? .8 : e.age === 'oeuf' ? .3 : 1);
        if (w > 0 && e.q) for (const [tr, z] of Object.entries(e.q)) { const A = ((Q[e.taxon] ??= {})[e.biome] ??= {})[tr] ??= { s: 0, w: 0 }; A.s += e.n * w * z; A.w += e.n * w; }
      }
    } catch (err) { rejetes.lots++; }   // (rien ne devrait plus arriver ici : un lot qui ne se lit pas est écarté, le cycle continue)
  }
  // par compte : activité, dénormalisation, plafond par compte (et par lignée : ce qu'il ôte, ce qu'il rend, chacun au plus
  // par_compte_cycle ; un déplacement ôte des bêtes, une libération ou un nourrissage en rend)
  const cap = PL.par_compte_cycle, somme = o => Object.values(o).reduce((a, x) => a + x, 0);
  const normale = I.exposition_ref > 0 ? I.exposition_ref : VECU.activite;   // l'activité normale d'un compte auprès d'une population, en contacts
  for (const compte in parCompte) for (const [tid, Bs] of Object.entries(parCompte[compte].t)) {
    const t = taxons[tid], P = vues[jeuDe[compte] ?? ''] ??= vueJeu(profil, jeux, jeuDe[compte]), relatif = P.exposition.mode === 'relatif'; let ote = 0, rendu = 0;
    for (const [bid, T] of Object.entries(Bs)) {
      const act = I.exposition_ref && T.rencontres > I.exposition_ref ? I.exposition_ref / T.rencontres : 1;
      const brut = T.brut, parPheno = Object.keys(brut).filter(k => k !== '*');
      if (I.denormaliser !== false && parPheno.length) {
        const expo = relatif ? exposer(t, P, cat, null, referenceDe(tid, inst, gen0)) : exposer(t, P, cat, bid), total = parPheno.reduce((a, k) => a + brut[k], 0), L = I.pseudo_comptes ?? 20;
        const w = {}; let z = 0;                       // taux par tête observé (lissé par L prélèvements fictifs) × fréquence réelle
        for (const p of t.phenotypes) { const fr = (relatif ? null : p.frequence_par_biome?.[bid]) ?? p.frequence, ex = expo[p.id] || 0;
          const taux = ex > 0 ? ((brut[p.id] || 0) + L * ex) / (ex * (total + L)) : (brut[p.id] ? 1 : 0); w[p.id] = taux * fr; z += w[p.id]; }
        for (const p of t.phenotypes) if (z > 0 && w[p.id]) T.retrait[p.id] = total * w[p.id] / z * act;
      } else for (const k of parPheno) T.retrait[k] = brut[k] * act;
      if (brut['*']) T.retrait['*'] = brut['*'] * act;
      for (const k in T.retrait) if (!Number.isFinite(T.retrait[k])) delete T.retrait[k];
      // (docs/12) ce que les bêtes ont vécu de ce compte : son activité se mesure sur TOUS ses contacts — celui qui ne déclare que des
      // prélèvements, sans une rencontre, aussi — et se ramène à une activité normale, ses proportions gardées : un compte qui court
      // partout, ou qui déclare 9 000 prises, ne pèse pas plus qu'un autre. (Les retraits gardent leurs propres plafonds.)
      const vu = Math.max(T.rencontres, T.danger + T.aide), ac = vu > normale ? normale / vu : 1;
      T.contact = { rencontres: T.rencontres * ac, danger: T.danger * ac, aide: T.aide * ac };
      ote += Object.values(T.retrait).reduce((a, x) => a + Math.max(0, x), 0) + T.deplacement.reduce((a, d) => a + d.n, 0);
      rendu += Object.values(T.retrait).reduce((a, x) => a + Math.max(0, -x), 0);
    }
    if (cap != null && ote > cap) for (const T of Object.values(Bs)) { for (const k in T.retrait) if (T.retrait[k] > 0) T.retrait[k] *= cap / ote; for (const d of T.deplacement) d.n *= cap / ote; }
    if (cap != null && rendu > cap) for (const T of Object.values(Bs)) for (const k in T.retrait) if (T.retrait[k] < 0) T.retrait[k] *= cap / rendu;
  }
  // somme des comptes, population par population, avec la part maximale d'un seul compte puis d'un seul jeu (plafondPart) : un
  // compte, un jeu de mille joueurs ne font pas seuls l'histoire d'une population que d'autres montrent
  const out = {}, pmax = PL.part_max_population, poidsDe = T => Object.values(T.retrait).reduce((a, x) => a + Math.abs(x), 0) + T.deplacement.reduce((a, d) => a + d.n, 0);
  const paires = new Map(); for (const compte in parCompte) for (const [tid, Bs] of Object.entries(parCompte[compte].t)) for (const bid of Object.keys(Bs)) { const k = tid + '\u0000' + bid; if (!paires.has(k)) paires.set(k, [tid, bid]); }
  for (const [tid, bid] of paires.values()) {
    const contrib = []; for (const compte in parCompte) { const T = parCompte[compte].t[tid]?.[bid]; if (T) contrib.push([compte, T]); }
    const eff = effDe(tid, bid), bas = p => p != null && pmax != null ? p * pmax * eff : 0;
    const fact = plafondPart(contrib.map(([c, T]) => [c, poidsDe(T)]), PL.part_max_compte, bas(PL.part_max_compte));
    if (PL.part_max_jeu != null) { const parJeu = dico(); for (const [c, T] of contrib) { const j = jeuDe[c] ?? ''; parJeu[j] = (parJeu[j] || 0) + poidsDe(T) * fact[c]; }
      const fj = plafondPart(Object.entries(parJeu), PL.part_max_jeu, bas(PL.part_max_jeu)); for (const [c] of contrib) fact[c] *= fj[jeuDe[c] ?? '']; }
    // (docs/12) le contact : la somme de ce que la population a vécu de chaque compte, chacun ramené à une activité normale, et
    // rien de plus. Ni part par compte, ni part par jeu : la méfiance s'apprend d'une PROPORTION (la part des contacts qui finissent
    // mal), et rogner les uns y grossit d'autant les autres. Une part par compte rabotait des comptes égaux au profit d'un compte
    // léger ; une part par jeu ramenait cent passants à 200 contacts, le poids de trois comptes, dès qu'un autre jeu montrait la
    // population — et les jeux s'inscrivent librement. Le nom du jeu ne change donc rien ici (docs/50, « L'abus » ;
    // outils/parts.js le mesure). La part d'un jeu reste aux retraits, juste au-dessus : là, rogner un grand jeu ne fait que
    // retirer moins de bêtes
    const O = (out[tid] ??= {})[bid] ??= { retrait: {}, deplacement: [] };
    for (const [c, T] of contrib) {
      for (const k in T.retrait) O.retrait[k] = (O.retrait[k] || 0) + T.retrait[k] * fact[c];
      for (const d of T.deplacement) if (d.n * fact[c] > 0) O.deplacement.push({ vers: d.vers, n: d.n * fact[c] });
      if (T.apport) { const K = O.apport ??= { n: 0, N: {}, A: {}, a: {}, na: {} }, f = cap != null && T.apport.n > cap ? cap / T.apport.n : 1;
        K.n += T.apport.n * f; for (const [x, v] of Object.entries(T.apport.N)) K.N[x] = (K.N[x] || 0) + v * f; for (const [x, v] of Object.entries(T.apport.A)) K.A[x] = (K.A[x] || 0) + v * f;
        for (const [x, v] of Object.entries(T.apport.a)) { K.a[x] = (K.a[x] || 0) + v * f; K.na[x] = (K.na[x] || 0) + T.apport.na[x] * f; } }
      if (T.contact && (T.contact.rencontres || T.contact.danger || T.contact.aide)) { const K = O.contact ??= { rencontres: 0, danger: 0, aide: 0 }; for (const k in K) K[k] = +(K[k] + T.contact[k]).toFixed(2); }
    }
    if (!O.deplacement.length && !Object.keys(O.retrait).length && !O.apport && !O.contact) { delete out[tid][bid]; if (!Object.keys(out[tid]).length) delete out[tid]; }
  }
  // part maximale d'une population en un cycle : ce qu'on lui ôte (retraits, déplacements) et ce qu'on lui rend (libérations,
  // nourrissage), chacun au plus part_max_population de son effectif
  if (pmax != null) for (const [tid, Bs] of Object.entries(out)) for (const [bid, O] of Object.entries(Bs)) {
    const lim = pmax * effDe(tid, bid), ote = Object.values(O.retrait).reduce((a, x) => a + Math.max(0, x), 0) + O.deplacement.reduce((a, d) => a + d.n, 0);
    const rendu = Object.values(O.retrait).reduce((a, x) => a + Math.max(0, -x), 0);
    if (ote > lim) { const f = ote > 0 ? lim / ote : 0; for (const k in O.retrait) if (O.retrait[k] > 0) O.retrait[k] *= f; for (const d of O.deplacement) d.n *= f; }
    if (rendu > lim) { const f = rendu > 0 ? lim / rendu : 0; for (const k in O.retrait) if (O.retrait[k] < 0) O.retrait[k] *= f; }
  }
  // (docs/36) l'apport de l'élevage, une fois, sans lissage : ses fréquences d'allèles et sa valeur génétique moyenne ; une
  // population n'en reçoit pas plus que part_max_population d'elle-même
  for (const [tid, Bs] of Object.entries(out)) for (const [bid, O] of Object.entries(Bs)) { const K = O.apport; if (!K) continue;
    if (!(K.n > 0)) { delete O.apport; continue; }
    const eff = effDe(tid, bid), f = pmax != null && K.n > Math.max(2, pmax * eff) ? Math.max(2, pmax * eff) / K.n : 1;
    O.apport = { n: +(K.n * f).toFixed(3), N: Object.fromEntries(Object.entries(K.N).map(([x, v]) => [x, +(v * f).toFixed(3)])),
      alleles: Object.fromEntries(Object.entries(K.A).map(([x, v]) => [x, +clamp(v / K.n, 0, 1).toFixed(5)])), a: Object.fromEntries(Object.entries(K.a).filter(([x]) => K.na[x] > 0).map(([x, v]) => [x, +(v / K.na[x]).toFixed(4)])) }; }
  // l'habitat et le milieu : par compte, au plus habitat_par_compte unités d'habitat (par_compte_cycle par défaut) et autant par axe du
  // milieu, par lieu et par cycle ; par lieu, tous jeux confondus, l'habitat ne bouge pas de plus de part_max_habitat de sa capacité
  // (2 % par défaut) en un cycle — le milieu, lui, est borné par le moteur (docs/22 : 5 % du lieu par axe et par cycle)
  const biomes = {}, capH = PL.habitat_par_compte ?? cap, capM = PL.milieu_par_compte ?? cap, borne = (x, c) => c == null ? x : clamp(x, -c, c);
  for (const compte in parCompte) for (const [bid, B] of Object.entries(parCompte[compte].b)) {
    const O = biomes[bid] ??= { habitat: 0 }; O.habitat += borne(B.habitat, capH);
    for (const [k, u] of Object.entries(B.milieu)) { if (!u) continue; (O.milieu ??= {})[k] = (O.milieu[k] || 0) + borne(u, capM); } }
  const pH = PL.part_max_habitat ?? .02;
  for (const [bid, O] of Object.entries(biomes)) { const lim = pH * Math.max(0, lieux[bid]?.capacite || 0); O.habitat = clamp(O.habitat, -lim, lim); if (!O.habitat) O.habitat = 0; }
  // (docs/50) ce que chaque population a vécu des joueurs (« vecu »), à part de tout ce qui précède. Par compte : au plus
  // VECU.tombes joueurs tombés et VECU.pillages pillages, puis toute son activité ramenée à une activité normale (un compte qui ne
  // déclare que des assauts, sans une rencontre, aussi), ses proportions gardées. Puis la somme des comptes, sans part par compte
  // ni par jeu, comme le contact (plus haut) : la mémoire s'apprend de proportions, et un compte y pèse le même poids sous
  // n'importe quel jeu. comptes, jeux : de combien de comptes et de jeux elle vient (pour qui surveille un monde ; le moteur ne
  // les lit pas). Rien n'est lissé : la mémoire a ses demi-vies.
  if (MEMO) { const ref = normale, pop = new Map();
    for (const compte in parCompte) for (const tid in parCompte[compte].v) for (const bid in parCompte[compte].v[tid]) { const V = parCompte[compte].v[tid][bid];
      V.tombes = Math.min(V.tombes, VECU.tombes); V.pillages = Math.min(V.pillages, VECU.pillages); V.dispositif = Math.min(V.dispositif, V.prises + V.blessures);
      const tot = Math.max(V.rencontres, V.prises + V.blessures + V.effarouchements + V.nourrissages + V.pillages + V.attaques + V.tombes); if (!(tot > 0) || !Number.isFinite(tot)) continue;
      const a = tot > ref ? ref / tot : 1, k = tid + '\u0000' + bid; if (!pop.has(k)) pop.set(k, { tid, bid, L: [] });
      pop.get(k).L.push({ jeu: jeuDe[compte] ?? '', a, V }); }
    for (const { tid, bid, L } of pop.values()) { const K = Object.fromEntries(CLES_VECU.map(k => [k, 0]));
      for (const x of L) for (const k of CLES_VECU) K[k] += x.V[k] * x.a;
      for (const k of CLES_VECU) K[k] = +K[k].toFixed(2);
      if (CLES_VECU.some(k => K[k] > 0)) ((out[tid] ??= {})[bid] ??= { retrait: {}, deplacement: [] }).vecu = { ...K, comptes: L.length, jeux: new Set(L.map(x => x.jeu)).size }; } }
  // lissage : moyenne mobile exponentielle sur memoire_cycles
  const mem = I.memoire_cycles || 1, a = 2 / (mem + 1), prev = etat.lisse || {}, lisse = {};
  for (const tid of new Set([...Object.keys(out), ...Object.keys(prev)])) for (const bid of new Set([...Object.keys(out[tid] || {}), ...Object.keys(prev[tid] || {})])) {
    const cur = out[tid]?.[bid]?.retrait || {}, old = prev[tid]?.[bid] || {}, L = {}, vivants = new Set((taxons[tid]?.phenotypes || []).map(p => p.id));
    for (const k of new Set([...Object.keys(cur), ...Object.keys(old)])) {
      if (k !== '*' && !vivants.has(k)) continue;   // un phénotype disparu n'a plus de mémoire
      const v = (old[k] || 0) + ((cur[k] || 0) - (old[k] || 0)) * a; if (Math.abs(v) >= .01) L[k] = +v.toFixed(3);
    }
    if (Object.keys(L).length) { (lisse[tid] ??= {})[bid] = L; ((out[tid] ??= {})[bid] ??= { retrait: {}, deplacement: [] }).retrait = L; }
  }
  // les traits continus : la même moyenne mobile, sur la somme et sur les poids ; le moteur lit le z moyen des retirés
  const prevQ = etat.lisseQ || {}, lisseQ = {};
  for (const tid of new Set([...Object.keys(Q), ...Object.keys(prevQ)])) for (const bid of new Set([...Object.keys(Q[tid] || {}), ...Object.keys(prevQ[tid] || {})])) {
    const cur = Q[tid]?.[bid] || {}, old = prevQ[tid]?.[bid] || {}, L = {}, q = {};
    for (const tr of new Set([...Object.keys(cur), ...Object.keys(old)])) {
      const c = cur[tr] || { s: 0, w: 0 }, o = old[tr] || { s: 0, w: 0 }, s = o.s + (c.s - o.s) * a, w = o.w + (c.w - o.w) * a;
      if (w >= .01) { L[tr] = { s: +s.toFixed(4), w: +w.toFixed(4) }; q[tr] = +(s / w).toFixed(4); }
    }
    if (Object.keys(L).length) { (lisseQ[tid] ??= {})[bid] = L; if (out[tid]?.[bid]) out[tid][bid].q = q; }
  }
  // (part_max_population voyage avec les pressions : moteur/parcelles.js le réapplique par parcelle à ce que les jeux ont localisé)
  return { pressions: { taxons: out, biomes, nombre, ...(pmax != null ? { part_max_population: pmax } : {}) }, etat: { lisse, lisseQ }, rejetes };
}

const API = { regimeDe, vueJeu, assainir, valider, plafondPart, ACTIONS, VECUES, MOYENS, DISPOSITIFS, VECU, N_MAX, NEUTRE, FAMILLES, familleDe, famillesDe, filtrer, exposer, exposerRelatif, partsRelatif, nonRendus, referenceDe, signature, quantDe, sachantMere, exprimer, agreger, compression };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.OrvaneTampon = API;
})(globalThis);
