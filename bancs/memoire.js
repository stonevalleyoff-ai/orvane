// Orvane — LE BANC DE LA MÉMOIRE (bancs/memoire.js, docs/50)
//  1. le jour un : un monde sans mémoire tourne exactement comme le moteur sans moteur/memoire.js ; le jour de l'éveil, rien ne
//     bouge ; éveillée, la mémoire ne change pas un effectif ;
//  2. apprendre : les équilibres de docs/50 (nourrie, pillée, proie facile, défense, feu tenu, feu défendu, piège), le corps,
//     l'oubli, la riposte, le pas, l'audace ;
//  3. le tampon : ce qu'il compte, ce qu'il plafonne (par compte, par jeu), ce qu'il laisse dans un monde sans mémoire ;
//  4. l'abus : des comptes qui ne déclarent que des joueurs tombés ;
//  5. ce qui voyage : les migrants, une lignée qui se sépare, les parcelles et leur biome ;
//  6. deux styles de jeu, deux faunes ;
//  7. le contrat, les listes d'actions, le cycle de nuit.
//   node bancs/memoire.js
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm'), { execFileSync } = require('child_process');
const racine = p => path.join(__dirname, '..', p);
const Orvane = require(racine('moteur/orvane.js')), M = require(racine('moteur/memoire.js')), Tampon = require(racine('tampon/tampon.js')), Parcelles = require(racine('moteur/parcelles.js')), Verif = require(racine('outils/verifier.js'));
const lireJ = f => JSON.parse(fs.readFileSync(racine(f), 'utf8')), lireT = f => fs.readFileSync(racine(f), 'utf8');
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const empreinte = I => crypto.createHash('sha256').update(JSON.stringify(I)).digest('hex').slice(0, 16);
const clone = o => JSON.parse(JSON.stringify(o)), fx = (x, d = 2) => (+x).toLocaleString('fr-FR', { maximumFractionDigits: d }), t0 = Date.now();
const S = lireJ('schemas/instantane.schema.json');
const val = (s, v, p) => { if (!s) return []; if (s.$ref) s = S.$defs[s.$ref.split('/').pop()]; const t = Array.isArray(s.type) ? s.type : [s.type], ty = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
  if (s.type && !t.includes(ty === 'number' && t.includes('integer') && Number.isInteger(v) ? 'integer' : ty)) return [p + ': type ' + ty]; if (s.enum && !s.enum.includes(v)) return [p + ': hors enum ' + v]; const e = [];
  if (ty === 'object') { for (const r of s.required || []) if (!(r in v)) e.push(p + ': manque ' + r); for (const k in v) { const ps = s.properties?.[k] || (typeof s.additionalProperties === 'object' ? s.additionalProperties : null); if (ps) e.push(...val(ps, v[k], p + '.' + k)); else if (s.additionalProperties === false) e.push(p + ': en trop ' + k); } }
  if (ty === 'array' && s.items) v.forEach((x, i) => e.push(...val(s.items, x, p + '[' + i + ']'))); return e; };
// deux mondes : sv-1 (30 lignées, 16 biomes, vite) pour la dynamique ; le monde d'Orvane d'avant la mémoire (bancs/monde.js), par parcelles
const I0 = lireJ('mondes/sv-1/etat.json'), W0 = M.eveiller(I0).inst, O0 = require('./monde.js').etat(['memoire']);
const profil = { ...lireJ('mondes/sv-1/profil.json'), influence: lireJ('mondes/orvane/profil.json').influence };   // (les plafonds du monde d'Orvane : la part d'un compte, d'un jeu)
const Tx = (X, id) => X.taxons.find(t => t.id === id), Pop = (X, tid, bid) => Tx(X, tid)?.populations.find(p => p.biome === bid);
const effectifs = I => I.taxons.map(t => [t.id, t.populations.map(p => [p.biome, p.effectif]), t.phenotypes.map(p => [p.id, p.frequence])]);
// l'instantané sans ce que la mémoire y ajoute
const sansMemoire = I => { const X = clone(I); delete X.monde.memoire; if (X.catalogue) delete X.catalogue.memoire; for (const t of X.taxons) for (const p of t.populations || []) { delete p.memoire; delete p.attitude; }
  X.evenements = (X.evenements || []).filter(e => e.type !== 'memoire'); return X; };
const lot = (compte, ev, jeu = 'lisiere', monde = I0.monde.id) => ({ orvane: '1.0', monde, instantane: 0, source: { jeu, compte }, evenements: ev.map(([taxon, biome, action, n, moyen]) => ({ taxon, biome, action, n, ...(moyen ? { moyen } : {}) })) });
// un monde qui joue n cycles avec les lots que rend « lots(k) » : le tampon, puis le moteur
const jouer = (X, n, lots, P = profil) => { let te = {}, dernier = null; for (let k = 0; k < n; k++) { const r = Tampon.agreger(lots ? lots(k) : [], X, P, te); te = r.etat; dernier = r; X = Orvane.cycle(X, r.pressions); } return { X, pressions: dernier?.pressions }; };
const NOUVELLES = Object.keys(Tampon.VECUES);

console.log('1. Le jour un');
{ const src = lireT('moteur/orvane.js'), mod = { exports: {} };
  vm.runInNewContext(src, { module: mod, require: p => p === './memoire.js' ? null : require(racine('moteur/' + p.replace('./', ''))), console });
  let A = O0, C = O0; for (let k = 0; k < 2; k++) { A = Orvane.cycle(A, {}); C = mod.exports.cycle(C, {}); }
  verif(empreinte(A) === empreinte(C), 'un monde sans mémoire tourne exactement comme le moteur sans moteur/memoire.js (le monde d\'Orvane, deux cycles)');
  const a = Orvane.cycle(I0, {}), b = Orvane.cycle(W0, {});
  verif(empreinte(sansMemoire(b)) === empreinte(a) && b.monde.memoire && b.catalogue.memoire?.dispositions?.traque && !b.taxons.some(t => t.populations.some(p => p.memoire || p.attitude)),
    'le jour de l\'éveil, rien ne bouge : le même monde, plus monde.memoire et catalogue.memoire ; aucune population n\'a encore rien appris');
  // des lots d'avant (aucune action nouvelle) : la mémoire éveillée laisse tout le reste au caractère près, méfiance comprise
  const car = 'traqueur', bid = 'prairie', anciens = k => ['a', 'b', 'c'].map(c => lot(c + k % 2, [[car, bid, 'rencontre', 30], [car, bid, 'prelevement', 2, 'melee'], ['brouteur', 'prairie', 'rencontre', 20], ['brouteur', 'prairie', 'nourrissage', 6]]));
  const sA = jouer(I0, 5, anciens), sB = jouer(W0, 5, anciens);
  verif(empreinte(sansMemoire(sB.X)) === empreinte(sA.X), 'des lots sans action nouvelle, cinq cycles : la mémoire éveillée ou non, le même monde (effectifs, gènes, méfiance) au caractère près');
  verif(Pop(sB.X, 'brouteur', 'prairie')?.memoire?.attrait > 0 && !Pop(sA.X, 'brouteur', 'prairie')?.memoire, `et pourtant elle apprend déjà de ces lots : le brouteur qu'on nourrit prend de l'attrait (${fx(Pop(sB.X, 'brouteur', 'prairie')?.memoire?.attrait)})`);
  // des lots d'aujourd'hui : un monde sans mémoire laisse les actions nouvelles ; éveillée, elle ne change pas un effectif
  const neufs = k => ['a', 'b', 'c'].map(c => lot(c, [[car, bid, 'rencontre', 30], [car, bid, 'prelevement', 2, 'melee'], [car, bid, 'blessure', 3, 'melee'], [car, bid, 'attaque', 6], [car, bid, 'joueur_tombe', 1], [car, bid, 'effarouchement', 8, 'feu']]));
  const nA = jouer(I0, 5, neufs), nB = jouer(W0, 5, neufs), nC = jouer(I0, 5, k => neufs(k).map(l => ({ ...l, evenements: l.evenements.filter(e => !NOUVELLES.includes(e.action)) })));
  verif(empreinte(nA.X) === empreinte(nC.X), 'un monde sans mémoire laisse les cinq actions nouvelles : le même monde que si les jeux ne les envoyaient pas');
  verif(empreinte(effectifs(nB.X)) === empreinte(effectifs(nA.X)) && Pop(nB.X, car, bid)?.memoire, 'éveillée, la mémoire ne change pas un effectif ni une fréquence : elle ne fait que retenir');
  verif(Pop(nB.X, car, bid).mefiance > Pop(nA.X, car, bid).mefiance + .05, `une bête blessée qui survit apprend aussi : la méfiance passe de ${fx(Pop(nA.X, car, bid).mefiance)} à ${fx(Pop(nB.X, car, bid).mefiance)} (docs/12 ne comptait que les bêtes prises)`);
}

console.log('2. Apprendre');
const plans = { loup: { regime: 'carnivore', masse_kg: 40, sociabilite: .8, perception: .7, taille_m: 1.2, vitesse_rel: 6 }, renard: { regime: 'carnivore', masse_kg: 8, sociabilite: .2, perception: .7, taille_m: .7, vitesse_rel: 6 },
  ours: { regime: 'omnivore', masse_kg: 250, sociabilite: .1, perception: .6, taille_m: 2, vitesse_rel: 4 }, cerf: { regime: 'herbivore', masse_kg: 90, sociabilite: .7, perception: .6, taille_m: 1.6, vitesse_rel: 7 },
  bison: { regime: 'herbivore', masse_kg: 600, sociabilite: .7, perception: .5, taille_m: 2.5, vitesse_rel: 5 } };
// une population au même régime pendant n cycles : sa mémoire, et sa méfiance comme le moteur la tient (docs/12)
const regime = (plan, v, n = 20, d = { M: M.lire(null), m: 0, h: 0 }, za = 0) => { const corps = M.corpsDe(plan, Orvane.appetence); let { M: X, m, h } = d; const pas = [];
  for (let k = 0; k < n; k++) { const c = { rencontres: v?.rencontres || 0, danger: (v?.prises || 0) + M.REGLES.blessure * (v?.blessures || 0), aide: v?.nourrissages || 0 }, Y = M.apprendre(X, v, { plan, za, corps });
    pas.push(Math.max(Math.abs(Y.a - X.a), Math.abs(Y.t - X.t), Math.abs(Y.o - X.o))); [m, h] = Orvane.apprendre(m, h, c, za); X = Y; }
  return { M: X, a: X.a, t: X.t, o: X.o, m, h, pas: Math.max(0, ...pas), att: M.attitude({ mefiance: m, habituation: h, memoire: M.ecrire(X) || {} }, plan) || 'neutre' }; };
const R = {
  P1: regime(plans.cerf, { rencontres: 60 }), P2: regime(plans.cerf, { rencontres: 30, prises: 6 }), P4: regime(plans.cerf, { rencontres: 60, nourrissages: 20 }),
  P5: regime(plans.cerf, { rencontres: 30, prises: 3, blessures: 6 }), P6: regime(plans.cerf, { rencontres: 40, prises: 3, dispositif: 3 }), P7: regime(plans.cerf, { rencontres: 60, pillages: 10, effarouchements: 20 }),
  P8: regime(plans.bison, { rencontres: 30, blessures: 6, attaques: 4, tombes: 2 }),
  L1: regime(plans.loup, { rencontres: 40, effarouchements: 30 }), L1b: regime(plans.loup, { rencontres: 40, effarouchements: 30, prises: 2, blessures: 2 }),
  L2: regime(plans.loup, { rencontres: 30, attaques: 8, tombes: 6, pillages: 4 }), L3: regime(plans.loup, { rencontres: 40, prises: 5, blessures: 4, attaques: 5, tombes: 1 }),
  L4: regime(plans.loup, { rencontres: 30, pillages: 8, blessures: 3 }), L5: regime(plans.loup, { rencontres: 40, effarouchements: 30, prises: 4, dispositif: 4 }),
  L6: regime(plans.loup, { rencontres: 40, nourrissages: 15 }), L7: regime(plans.renard, { rencontres: 30, attaques: 8, tombes: 6, pillages: 4 }) };
{ verif(Math.abs(R.P1.h - .92) < .01 && R.P1.att === 'familiere' && Math.abs(R.P2.m - .62) < .01 && R.P2.att === 'fuyante' && R.P1.a === 0 && R.P1.t === 0 && R.P1.o === .5,
    `sans action nouvelle, la méfiance et l'habituation sont celles de docs/12 (habituation ${fx(R.P1.h)}, méfiance ${fx(R.P2.m)}), et la mémoire reste neutre`);
  verif(R.P4.att === 'quemandeuse' && R.P4.a > .5 && R.L6.att === 'quemandeuse' && R.L6.a > .5 && R.L6.t === 0,
    `nourrie, une population prend de l'attrait (le cerf ${fx(R.P4.a)}, le loup ${fx(R.L6.a)} : « quémandeuse ») ; nourrir un loup n'en fait jamais un traqueur (traque ${fx(R.L6.t)})`);
  verif(R.P7.att === 'quemandeuse' && R.P7.a > .35 && R.P7.o < .1 && R.L4.att === 'rodeuse' && R.L4.a > .4 && R.L4.m > .5,
    `pillé sans défense, le camp attire et n'effraie plus (attrait ${fx(R.P7.a)}, néophobie ${fx(R.P7.o)}) ; pillé et défendu, il fait des rôdeuses (attrait ${fx(R.L4.a)}, méfiance ${fx(R.L4.m)})`);
  verif(R.L2.att === 'traqueuse' && R.L2.t > .7 && R.L3.att === 'fuyante' && R.L3.t < .1 && R.L3.m > .7,
    `proie facile (des joueurs tombent, personne ne riposte) : traque ${fx(R.L2.t)}, « traqueuse » ; défense (des bêtes prises, blessées) : traque ${fx(R.L3.t)}, méfiance ${fx(R.L3.m)}, « fuyante »`);
  verif(R.L1.o < .1 && R.L1b.o > .4 && R.L5.o > .85 && R.P6.o > .9,
    `un feu qui arrête sans jamais faire mal, on s'y accoutume (néophobie ${fx(R.L1.o)}) ; défendu par des joueurs qui frappent, il reste craint (${fx(R.L1b.o)}) ; un piège qui tue apprend à tout craindre (${fx(R.L5.o)})`);
  verif(R.P6.m < R.P2.m && R.P6.o > .9, `prise au piège plutôt qu'à la main, une population craint les pièges (${fx(R.P6.o)}) plus que les joueurs (méfiance ${fx(R.P6.m)})`);
  const c = k => M.corpsDe(plans[k], Orvane.appetence);
  verif(c('loup') === 1 && c('ours') === 1 && Math.abs(c('renard') - M.REGLES.traque.petits) < 1e-9 && c('cerf') === 0 && c('bison') === 0 && R.L7.t > .3 && R.L7.t <= M.REGLES.traque.petits && R.P8.t === 0 && R.P8.att === 'defensive',
    `le corps : une meute de loups ou un ours peuvent faire d'un joueur une proie (1), un renard à moitié (${fx(c('renard'))} : traque ${fx(R.L7.t)} au même régime), un herbivore jamais (un bison qui fait tomber des joueurs est « défensive », traque ${fx(R.P8.t)})`);
  // l'oubli, la riposte
  const o5 = regime(plans.loup, null, 5, R.L2), o15 = regime(plans.loup, null, 15, R.L2), o30 = regime(plans.loup, null, 30, R.L2);
  verif(o5.att === 'traqueuse' && o15.t < M.REGLES.attitudes.seuil && o30.t < .15 && Math.abs(o30.o - .5) < .15 && Math.abs(regime(plans.loup, null, 10, R.L2).t / R.L2.t - .5) < .01,
    `l'oubli : les joueurs partis, la traque retombe de moitié en dix cycles (${fx(R.L2.t)}, puis ${fx(o5.t)} à 5 cycles, ${fx(o15.t)} à 15, ${fx(o30.t)} à 30) ; la néophobie revient vers 0,5 (${fx(o30.o)})`);
  const r1 = regime(plans.loup, { rencontres: 40, prises: 5, blessures: 4, attaques: 5, tombes: 1 }, 1, R.L2), r2 = regime(plans.loup, { rencontres: 40, prises: 5, blessures: 4, attaques: 5, tombes: 1 }, 2, R.L2);
  verif(r1.att === 'rodeuse' && r2.att === 'fuyante' && r2.t < r1.t, `la riposte : des traqueuses qu'on se met à chasser sont « rôdeuse » au premier cycle (traque ${fx(r1.t)}, méfiance ${fx(r1.m)}), « fuyante » au deuxième`);
  const gros = Object.fromEntries(Object.entries({ rencontres: 30, attaques: 8, tombes: 6, pillages: 4, prises: 3, dispositif: 3, effarouchements: 30 }).map(([k, v]) => [k, v * 1000]));
  verif(Object.values(R).every(r => r.pas <= M.REGLES.pas + 1e-9) && regime(plans.loup, gros).pas <= M.REGLES.pas + 1e-9, `rien ne bascule en une nuit : aucune disposition ne bouge de plus de ${M.REGLES.pas} par cycle, même avec mille fois plus de comptes`);
  const timide = regime(plans.loup, { rencontres: 40, effarouchements: 30 }, 5, undefined, -1.5), hardi = regime(plans.loup, { rencontres: 40, effarouchements: 30 }, 5, undefined, 1.5);
  verif(hardi.o < timide.o - .1, `l'audace, elle, est dans les gènes (docs/8) : au même feu, une population audacieuse s'accoutume plus vite (néophobie ${fx(hardi.o)} en cinq cycles, contre ${fx(timide.o)} chez une timide)`);
}

console.log('3. Le tampon');
{ const t = 'traqueur', b = 'prairie', P = (lots, X = W0) => Tampon.agreger(lots, X, profil), V = r => r.pressions.taxons?.[t]?.[b]?.vecu;
  const riche = [[t, b, 'rencontre', 30], [t, b, 'attaque', 8], [t, b, 'joueur_tombe', 5], [t, b, 'pillage', 30], [t, b, 'blessure', 4, 'piege'], [t, b, 'prelevement', 3, 'feu'], [t, b, 'capture', 2, 'piege'], [t, b, 'nourrissage', 5], [t, b, 'effarouchement', 12, 'laser']];
  const r = P([lot('a', riche)]), v = V(r);
  verif(v && v.rencontres === 30 && v.attaques === 8 && v.blessures === 4 && v.nourrissages === 5 && v.tombes === Tampon.VECU.tombes && v.pillages === Tampon.VECU.pillages && v.comptes === 1 && v.jeux === 1,
    `ce qu'une population a vécu d'un compte, compté tel quel ; mais pas des joueurs tombés ni des pillages par dizaines : ${Tampon.VECU.tombes} et ${Tampon.VECU.pillages} au plus par population et par cycle (5 et 30 déclarés)`);
  verif(v && v.dispositif === 4 + 3 + 1 && v.prises === 3 + 1 && v.effarouchements === 12 && r.rejetes.evenements === 0,
    'le moyen : une blessure, une prise au piège ou par le feu comptent au dispositif (une capture pour moitié) ; un moyen inconnu est ignoré, l\'événement gardé');
  const actif = V(P([lot('a', riche.map(e => [e[0], e[1], e[2], e[3] * 10, e[4]]))])), somme = actif.prises + actif.blessures + actif.effarouchements + actif.nourrissages + actif.pillages + actif.attaques + actif.tombes;
  verif(Math.max(actif.rencontres, somme) <= profil.influence.exposition_ref + .1 && Math.abs(actif.attaques / actif.rencontres - 8 / 30) < .01, `un compte dix fois plus actif est ramené à une activité normale sur tous ses contacts (${fx(Math.max(actif.rencontres, somme), 0)} pour ${profil.influence.exposition_ref}), ses proportions gardées`);
  const fou = V(P([lot('a', [[t, b, 'attaque', 9000], [t, b, 'joueur_tombe', 9000]])]));
  verif(fou.attaques <= profil.influence.exposition_ref && fou.tombes <= Tampon.VECU.tombes, `sans une rencontre, 9 000 assauts et 9 000 joueurs tombés d'un seul compte : ${fx(fou.attaques, 0)} assauts et ${fx(fou.tombes, 1)} joueurs tombés retenus`);
  // la part d'un compte, puis d'un jeu
  const dix = Array.from({ length: 10 }, (_, i) => lot('h' + i, [[t, b, 'rencontre', 30]])), seul = V(P([...dix, lot('x', [[t, b, 'attaque', 60]])]));
  verif(seul.attaques / (seul.attaques + seul.rencontres) <= profil.influence.plafonds.part_max_compte + .005, `un compte parmi onze ne pèse pas plus que sa part (${fx(100 * seul.attaques / (seul.attaques + seul.rencontres), 1)} % des contacts, pour ${profil.influence.plafonds.part_max_compte * 100} % au plus)`);
  const gros = Array.from({ length: 20 }, (_, i) => lot('g' + i, [[t, b, 'attaque', 60]], 'jeu-a')), petit = n => Array.from({ length: n }, (_, i) => lot('p' + i, [[t, b, 'rencontre', 60]], 'jeu-b'));
  const j1 = V(P([...gros, ...petit(1)])), j5 = V(P([...gros, ...petit(5)]));
  verif(j1.jeux === 2 && Math.abs(j1.attaques - Tampon.VECU.plancher_jeu) < 1 && Math.abs(j5.attaques - j5.rencontres) < 1,
    `un jeu de vingt comptes face à un jeu d'un seul garde ${fx(j1.attaques, 0)} contacts sur 1 200 (son plancher) ; face à un jeu de cinq comptes, autant que lui (${fx(j5.attaques, 0)} et ${fx(j5.rencontres, 0)}) : aucun jeu ne fait seul l'histoire d'une population que d'autres montrent`);
  // un monde sans mémoire ; des lots d'avant
  const sans = P([lot('a', riche)], I0), sansN = P([lot('a', riche.filter(e => !NOUVELLES.includes(e[2])))], I0);
  verif(!V(sans) && JSON.stringify(sans.pressions) === JSON.stringify(sansN.pressions), 'dans un monde sans mémoire, le tampon laisse les actions nouvelles : mêmes pressions, même compte d\'événements reçus');
  const anciens = [lot('a', riche.filter(e => !NOUVELLES.includes(e[2]))), lot('b', [[t, b, 'rencontre', 12], ['brouteur', 'prairie', 'prelevement', 2]])], a0 = P(anciens, I0), a1 = P(anciens, W0);
  const sansVecu = p => { const x = clone(p); for (const T of Object.values(x.taxons)) for (const O of Object.values(T)) delete O.vecu; return x; };
  verif(JSON.stringify(sansVecu(a1.pressions)) === JSON.stringify(a0.pressions) && V(a1), 'des lots d\'avant, dans un monde éveillé : les mêmes retraits et le même contact, plus « vecu »');
  verif(Tampon.valider({ taxon: t, biome: b, action: 'attaque', n: 1, moyen: 'feu' }, { taxons: { [t]: 1 }, biomes: { [b]: {} }, quant: {}, cat: {}, axes: {} })?.moyen === 'feu' && Tampon.valider({ taxon: t, biome: b, action: 'morsure', n: 1 }, { taxons: { [t]: 1 }, biomes: { [b]: {} }, quant: {}, cat: {}, axes: {} }) === null,
    'la garde à l\'entrée garde le moyen s\'il est connu, et écarte toujours une action inconnue');
}

console.log('4. L\'abus');
{ const t = 'traqueur', b = 'prairie', honnetes = Array.from({ length: 10 }, (_, i) => lot('h' + i, [[t, b, 'rencontre', 20], [t, b, 'prelevement', .3, 'melee'], [t, b, 'blessure', 2, 'melee'], [t, b, 'attaque', 2]]));
  const faux = n => Array.from({ length: n }, (_, i) => lot('m' + i, [[t, b, 'joueur_tombe', 500], [t, b, 'pillage', 500]]));
  const sain = jouer(W0, 20, () => honnetes).X, cinq = jouer(W0, 20, () => [...honnetes, ...faux(5)]).X, un = jouer(W0, 1, () => [...honnetes, ...faux(200)]).X;
  const p0 = Pop(sain, t, b), p5 = Pop(cinq, t, b), p1 = Pop(un, t, b);
  verif((p0.memoire?.traque || 0) < .05 && p0.attitude === 'fuyante', `dix comptes honnêtes qui se défendent, vingt cycles : traque ${fx(p0.memoire?.traque || 0)}, « ${p0.attitude} »`);
  verif((p5.memoire?.traque || 0) < M.REGLES.attitudes.seuil && p5.attitude !== 'traqueuse' && p5.attitude !== 'quemandeuse', `cinq comptes de plus qui ne déclarent que 500 joueurs tombés et 500 pillages chacun : traque ${fx(p5.memoire?.traque || 0)}, attrait ${fx(p5.memoire?.attrait || 0)}, « ${p5.attitude || 'neutre'} » — pas de traqueuse fabriquée`);
  verif((p1.memoire?.traque || 0) <= M.REGLES.pas + 1e-9 && (p1.memoire?.attrait || 0) <= M.REGLES.pas + 1e-9, `deux cents faux comptes en une nuit : la traque ne dépasse pas ${M.REGLES.pas} (${fx(p1.memoire?.traque || 0)}) — une majorité locale gagne une population, pas en une nuit, et tout retombe quand elle s'en va`);
  verif(empreinte(effectifs(jouer(W0, 3, () => [...honnetes, ...faux(200)]).X)) === empreinte(effectifs(jouer(W0, 3, () => honnetes).X)), 'et elle ne retire pas une bête au monde : les mêmes effectifs avec ou sans les faux comptes');
}

console.log('5. Ce qui voyage');
{ // les migrants : la moitié de l'écart de leur population, à proportion de leur nombre
  const a = M.meler({ a: 0, t: 0, o: .5 }, 300, { a: .4, t: .8, o: .1 }, 100), neuve = M.meler(undefined, 0, { a: .4, t: .8, o: .1 }, 50), rien = M.meler({ a: .2, t: .6, o: .3 }, 100, null, 100);
  verif(Math.abs(a.t - .1) < 1e-9 && Math.abs(a.o - .45) < 1e-9 && Math.abs(neuve.t - .4) < 1e-9 && Math.abs(neuve.o - .3) < 1e-9 && Math.abs(rien.t - .3) < 1e-9 && Math.abs(rien.o - .4) < 1e-9,
    `des migrants emportent la moitié de ce qu'a appris leur population : cent traqueuses (0,8) parmi trois cents naïves font ${fx(a.t)} ; une population qu'elles fondent, ${fx(neuve.t)} ; des naïves diluent la mémoire du lieu (0,6 → ${fx(rien.t)})`);
  // dans le moteur, par parcelles : une seule parcelle vit les joueurs, ses voisines l'apprennent par ses migrants
  const E0 = M.eveiller(O0).inst, type = b => b.type || b.id, cand = E0.taxons.filter(t => !t.eteint && t.plan.regime === 'carnivore').map(t => { const g = {}; for (const p of t.populations) { const b = E0.biomes.find(x => x.id === p.biome); if (b?.type) (g[b.type] ??= []).push(p); }
    const best = Object.entries(g).filter(([, L]) => L.length >= 3 && L.every(p => p.effectif >= 30)).sort((x, y) => y[1].length - x[1].length)[0]; return best ? [t, best[0], best[1]] : null; }).filter(Boolean).sort((x, y) => y[2].length - x[2].length)[0];
  if (!cand) verif(false, 'aucun carnivore du monde d\'Orvane ne vit dans trois parcelles d\'un même biome : le banc ne peut pas vérifier le voyage');
  else { const [t, ty, L] = cand, src = L.slice().sort((x, y) => y.effectif - x.effectif)[0].biome, v = { rencontres: 30, attaques: 8, tombes: 6 };
    let X = E0, B = O0; for (let k = 0; k < 6; k++) { X = Orvane.cycle(X, { taxons: { [t.id]: { [src]: { vecu: v } } } }); B = Orvane.cycle(B, {}); }
    const P = Tx(X, t.id).populations.filter(p => type(E0.biomes.find(b => b.id === p.biome) || {}) === ty), ps = P.find(p => p.biome === src), autres = P.filter(p => p.biome !== src), marquees = autres.filter(p => p.memoire?.traque > 0);
    verif(ps?.memoire?.traque > .3 && marquees.length > 0 && autres.every(p => (p.memoire?.traque || 0) < ps.memoire.traque / 4),
      `${t.nom || t.id}, ${ty} : la parcelle où des joueurs tombent apprend la traque (${fx(ps?.memoire?.traque)}) ; ${marquees.length} de ses ${autres.length} voisines en savent un peu par ses migrants (au plus ${fx(Math.max(0, ...autres.map(p => p.memoire?.traque || 0)), 3)}), sans avoir vu un joueur`);
    verif(empreinte(effectifs(X)) === empreinte(effectifs(B)), 'six cycles par parcelles, la mémoire éveillée et nourrie ou non : les mêmes effectifs, au caractère près');
    // la vue par biome : la moyenne par les effectifs, une parcelle qui n'a rien appris comptant pour neutre ; l'attitude relue sur l'ensemble
    const G = Parcelles.regrouper(X), pg = Pop(G, t.id, ty), N = P.reduce((s, p) => s + p.effectif, 0), att = P.reduce((s, p) => s + (p.memoire?.traque || 0) * p.effectif, 0) / N;
    verif(Math.abs((pg.memoire?.traque || 0) - att) < .002 && (pg.memoire?.traque || 0) < ps.memoire.traque && pg.attitude === (M.attitude(pg, t.plan) || undefined),
      `vue par biome, la population vaut la moyenne de ses parcelles (traque ${fx(pg.memoire?.traque || 0, 3)} pour ${fx(ps.memoire.traque)} dans la parcelle marquée) : une parcelle ne fait pas tout le biome`);
    const e = val(S, Tampon.filtrer(G, { familles: ['animale', 'synthetique'] }), '$'); verif(!e.length, 'l\'instantané d\'un monde qui se souvient respecte le schéma' + (e.length ? ' : ' + e.slice(0, 3).join(' ; ') : ''));
  }
  // une lignée qui se sépare emporte ce que sa population avait appris
  const Wm = clone(W0), src = Tx(Wm, 'traqueur').populations.slice().sort((x, y) => y.effectif - x.effectif)[0]; src.memoire = { traque: .7, neophobie: .2 };
  Wm.monde.regles = { ...(Wm.monde.regles || {}), separation: { cycles: 0, effectif: 1, distance: 0, divergence: 0, chance: 1, flux: 1 } };
  const Y = Orvane.cycle(Wm, {}), fille = Y.taxons.find(x => x.parent === 'traqueur' && x.apparu === Y.cycle.n && x.populations.some(p => p.biome === src.biome));
  verif(fille && Math.abs(fille.populations[0].memoire?.traque - .7 * 2 ** (-1 / 10)) < .002 && fille.populations[0].memoire?.neophobie < .25, fille ? `une lignée qui se sépare (${fille.id}) emporte la mémoire de sa population : traque ${fx(fille.populations[0].memoire?.traque)}, néophobie ${fx(fille.populations[0].memoire?.neophobie)}` : 'aucune lignée ne s\'est séparée : le banc ne peut pas vérifier ce qu\'elle emporte');
}

console.log('6. Deux styles de jeu, deux faunes');
{ // le même monde, les mêmes joueurs (trois comptes), quinze cycles ; chez les uns on se terre et on nourrit, chez les autres on chasse
  const pred = 'traqueur', bp = Tx(W0, pred).populations.slice().sort((x, y) => y.effectif - x.effectif)[0].biome, proie = 'brouteur', bq = Tx(W0, proie).populations.slice().sort((x, y) => y.effectif - x.effectif)[0].biome;
  const terres = () => ['a', 'b', 'c'].map(c => lot(c, [[pred, bp, 'rencontre', 30], [pred, bp, 'attaque', 5], [pred, bp, 'joueur_tombe', 2], [pred, bp, 'effarouchement', 20, 'feu'], [proie, bq, 'rencontre', 40], [proie, bq, 'nourrissage', 12]]));
  const chasseurs = () => ['a', 'b', 'c'].map(c => lot(c, [[pred, bp, 'rencontre', 30], [pred, bp, 'attaque', 3], [pred, bp, 'blessure', 3, 'melee'], [pred, bp, 'prelevement', 2, 'melee'], [pred, bp, 'effarouchement', 20, 'feu'], [proie, bq, 'rencontre', 30], [proie, bq, 'prelevement', 4, 'distance'], [proie, bq, 'blessure', 2, 'distance']]));
  const A = jouer(W0, 15, terres).X, B = jouer(W0, 15, chasseurs).X, pa = Pop(A, pred, bp), pb = Pop(B, pred, bp), qa = Pop(A, proie, bq), qb = Pop(B, proie, bq);
  const fuite = p => 2.2 ** (p.mefiance || 0) * .5 ** (p.habituation || 0);   // la distance de fuite, au profil de Stone Valley (docs/12)
  verif(pa.attitude === 'traqueuse' && pb.attitude === 'fuyante' && (pa.memoire?.traque || 0) > (pb.memoire?.traque || 0) + .3,
    `le prédateur (${pred}, ${bp}) : chez ceux qui se terrent, « ${pa.attitude} » (traque ${fx(pa.memoire?.traque || 0)}, néophobie ${fx(pa.memoire?.neophobie ?? .5)}) ; chez ceux qui chassent, « ${pb.attitude} » (traque ${fx(pb.memoire?.traque || 0)}, néophobie ${fx(pb.memoire?.neophobie ?? .5)})`);
  verif((pa.memoire?.neophobie ?? .5) < .2 && (pb.memoire?.neophobie ?? .5) > .35, 'le même feu, vingt fois par nuit : il ne tient plus les bêtes de ceux qui se terrent, il tient encore celles de ceux qui chassent');
  verif(qa.attitude === 'quemandeuse' && qb.attitude === 'fuyante' && fuite(qb) / fuite(qa) >= 2.5,
    `la proie (${proie}, ${bq}) : nourrie, « ${qa.attitude} » (attrait ${fx(qa.memoire?.attrait || 0)}) ; chassée, « ${qb.attitude} » ; elle fuit de ${fx(fuite(qb) / fuite(qa), 1)} fois plus loin`);
  const ev = []; { let X = W0, te = {}; for (let k = 0; k < 8; k++) { const r = Tampon.agreger(terres(), X, profil, te); te = r.etat; X = Orvane.cycle(X, r.pressions); ev.push(...X.evenements.filter(e => e.type === 'memoire').map(e => `cycle ${X.cycle.n} : ${e.detail}`)); } }
  verif(ev.some(e => /proie/.test(e)) && ev.some(e => /nourriture/.test(e)) && ev.some(e => /ne craignent plus le feu/.test(e)), `le journal le dit, une fois par bascule (${ev.length} événements « memoire » en huit cycles) : « ${ev.find(e => /proie/.test(e))} »`);
}

console.log('7. Le contrat, les listes d\'actions, le cycle de nuit');
{ const SP = lireJ('schemas/pression.schema.json'), actions = SP.properties.evenements.items.properties.action.enum, moyens = SP.properties.evenements.items.properties.moyen.enum;
  const sql = lireT('hebergement/supabase.sql'), verifSrc = lireT('outils/verifier.js'), unity = lireT('kits/unity/Runtime/Contrat.cs'), godot = lireT('kits/godot/addons/orvane/orvane.gd');
  const manque = (nom, src) => actions.filter(a => !new RegExp(`['"]${a}['"]`).test(src)).map(a => `${a} (${nom})`);
  const trous = [...actions.filter(a => !Tampon.ACTIONS.has(a)).map(a => `${a} (tampon)`), ...[...Tampon.ACTIONS].filter(a => !actions.includes(a)).map(a => `${a} (schéma)`), ...manque('supabase.sql', sql), ...manque('verifier.js', verifSrc),
    ...NOUVELLES.filter(a => !new RegExp(`"${a}"`).test(unity)).map(a => `${a} (kit Unity)`), ...NOUVELLES.filter(a => !new RegExp(`"${a}"`).test(godot)).map(a => `${a} (kit Godot)`)];
  verif(!trous.length && NOUVELLES.every(a => actions.includes(a)), `les ${actions.length} actions sont les mêmes partout : le schéma, le tampon, le serveur (supabase.sql), le vérificateur ; les kits connaissent les cinq nouvelles` + (trous.length ? ' ; manque : ' + trous.join(', ') : ''));
  verif(moyens.length === Tampon.MOYENS.size && moyens.every(m => Tampon.MOYENS.has(m)) && /memoire_eveillee/.test(godot), 'les moyens sont ceux du schéma ; le kit Godot ne compte les actions nouvelles que dans un monde qui annonce la mémoire (le serveur d\'avant refusait le lot entier)');
  const L = lot('a', [['traqueur', 'prairie', 'attaque', 2], ['traqueur', 'prairie', 'effarouchement', 3, 'feu'], ['traqueur', 'prairie', 'joueur_tombe', 1], ['traqueur', 'prairie', 'blessure', 1, 'melee'], ['traqueur', 'prairie', 'pillage', 1]]);
  const e = Verif.verifier({ ...L, periode: { debut: '2026-11-13T00:00:00Z', fin: '2026-11-13T01:00:00Z' } }, 'lot'); verif(!e.length, 'un lot qui raconte une nuit (assauts, feu tenu, joueur tombé, bête blessée, pillage) passe le vérificateur' + (e.length ? ' : ' + e.slice(0, 3).join(' ; ') : ''));
  const dossier = racine('mondes/essai-memoire'); fs.rmSync(dossier, { recursive: true, force: true }); fs.mkdirSync(path.join(dossier, 'lots'), { recursive: true });
  try { const Pf = lireJ('mondes/sv-1/profil.json'); fs.writeFileSync(path.join(dossier, 'profil.json'), JSON.stringify({ ...Pf, monde: { ...Pf.monde, id: 'essai-memoire', memoire: true, nocturne: undefined, amorce: undefined, rodage: 0, pressions: undefined, regles: { memoire: { traque: { demi_vie: 40 } } } } }));
    fs.writeFileSync(path.join(dossier, 'etat.json'), JSON.stringify({ ...I0, monde: { ...I0.monde, id: 'essai-memoire' } })); fs.writeFileSync(path.join(dossier, 'instantane.json'), JSON.stringify({ ...I0, monde: { ...I0.monde, id: 'essai-memoire' } }));
    ['a', 'b', 'c'].forEach(c => fs.writeFileSync(path.join(dossier, 'lots', c + '.json'), JSON.stringify(lot(c, [['traqueur', 'prairie', 'rencontre', 30], ['traqueur', 'prairie', 'attaque', 8], ['traqueur', 'prairie', 'joueur_tombe', 2]], 'lisiere', 'essai-memoire'))));
    const sortie = execFileSync('node', [racine('hebergement/cycle.js'), 'essai-memoire', '--sans-reseau', '--cycles', '2'], { encoding: 'utf8' }), Ip = JSON.parse(fs.readFileSync(path.join(dossier, 'instantane.json'), 'utf8')), p = Pop(Ip, 'traqueur', 'prairie');
    verif((sortie.match(/^memoire : /gm) || []).length === 1 && Ip.monde.memoire && Ip.catalogue.memoire, 'le profil demande la mémoire (monde.memoire), elle s\'éveille une fois, et le monde publié l\'annonce');
    verif(p?.memoire?.traque > 0 && !val(S, Ip, '$').length, `la nuit lit les lots du dossier : au matin, la population publie ce qu'elle a appris (traque ${fx(p?.memoire?.traque || 0)})`);
    verif(Ip.monde.regles?.memoire?.traque?.demi_vie === 40, 'les règles de la mémoire que demande le profil (monde.regles.memoire) sont portées par le monde');
  } finally { fs.rmSync(dossier, { recursive: true, force: true }); }
  // les règles de la mémoire se règlent par monde : une traque qui retombe quatre fois moins vite, le temps du cycle de ce monde
  const Wr = clone(W0), pr = Tx(Wr, 'traqueur').populations.find(x => x.biome === 'prairie'); pr.memoire = { traque: .8 }; const Wl = clone(Wr); Wl.monde.regles = { ...(Wl.monde.regles || {}), memoire: { traque: { demi_vie: 40 } } };
  const court = Pop(Orvane.cycle(Wr, {}), 'traqueur', 'prairie').memoire.traque, long = Pop(Orvane.cycle(Wl, {}), 'traqueur', 'prairie').memoire.traque;
  verif(Math.abs(court - .8 * 2 ** (-1 / 10)) < .001 && Math.abs(long - .8 * 2 ** (-1 / 40)) < .001 && M.REGLES.traque.demi_vie === 10, `un monde règle sa mémoire (regles.memoire) : la traque y retombe à ${fx(long, 3)} en un cycle au lieu de ${fx(court, 3)} ; le cycle fini, les règles du moteur sont revenues`);
}
console.log(`\n${ok ? 'tout passe' : 'ÉCHEC'} (${fx((Date.now() - t0) / 1000, 0)} s)`);
process.exit(ok ? 0 : 1);
