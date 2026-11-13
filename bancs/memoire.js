// Orvane — LE BANC DE LA MÉMOIRE (bancs/memoire.js, docs/50)
//  1. le jour un : un monde sans mémoire tourne exactement comme le moteur sans moteur/memoire.js ; le jour de l'éveil, rien ne
//     bouge ; éveillée, la mémoire ne change pas un effectif ;
//  2. apprendre : les équilibres de docs/50 (nourrie, pillée, proie facile, défense, feu tenu, feu défendu, piège), le corps,
//     l'oubli, la riposte, le pas, l'audace ;
//  3. le tampon : ce qu'il compte, ce qu'il plafonne (par compte, par jeu), ce qu'il laisse dans un monde sans mémoire ; le
//     contact de la méfiance (docs/12) a les mêmes plafonds ;
//  4. l'abus : un compte seul, une minorité, une nuit ; ce qui tient et ce qui ne tient pas ;
//  5. ce qui voyage : les migrants, une lignée qui se sépare ; la nuit d'un monde par parcelles, et la vue par biome ;
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
  // (le cas qui trompait : un compte qui ne déclare qu'une action nouvelle entrait dans le partage des retraits des autres)
  const chasse = () => Array.from({ length: 7 }, (_, i) => lot('c' + i, [[car, bid, 'rencontre', 20], [car, bid, 'prelevement', 4, 'melee']], 'jeu-a')), temoins = () => [lot('x', [[car, bid, 'attaque', 1]], 'jeu-b'), lot('y', [[car, bid, 'effarouchement', 1, 'feu']], 'jeu-a')];
  const pA = Tampon.agreger(chasse(), I0, profil).pressions, pB = Tampon.agreger([...chasse(), ...temoins()], W0, profil).pressions, nu = p => { const x = clone(p); delete x.nombre; for (const T of Object.values(x.taxons)) for (const O of Object.values(T)) delete O.vecu; return x; };
  verif(JSON.stringify(nu(pB)) === JSON.stringify(nu(pA)) && pB.taxons[car][bid].vecu?.comptes === 9 && empreinte(effectifs(jouer(W0, 5, () => [...chasse(), ...temoins()]).X)) === empreinte(effectifs(jouer(I0, 5, chasse).X)),
    'sept comptes chassent ; deux autres ne déclarent qu\'un assaut et qu\'un feu tenu : les retraits des chasseurs ne bougent pas (le tampon tient la mémoire à part), et cinq cycles plus tard les effectifs sont ceux d\'un monde sans mémoire');
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
  verif(R.L1.o < .2 && R.L1b.o > .4 && R.L5.o > .85 && R.P6.o > .9,
    `un feu qui arrête sans jamais faire mal, on s'y accoutume (néophobie ${fx(R.L1.o)}) ; défendu par des joueurs qui frappent, il reste craint (${fx(R.L1b.o)}) ; un piège qui tue apprend à tout craindre (${fx(R.L5.o)})`);
  verif(R.P6.m < R.P2.m && R.P6.o > .9, `prise au piège plutôt qu'à la main, une population craint les pièges (${fx(R.P6.o)}) plus que les joueurs (méfiance ${fx(R.P6.m)})`);
  const c = k => M.corpsDe(plans[k], Orvane.appetence);
  verif(c('loup') === 1 && c('ours') === 1 && Math.abs(c('renard') - M.REGLES.traque.petits) < 1e-9 && c('cerf') === 0 && c('bison') === 0 && R.L7.t > .3 && R.L7.t <= M.REGLES.traque.petits && R.P8.t === 0 && R.P8.att === 'defensive',
    `le corps : une meute de loups ou un ours peuvent faire d'un joueur une proie (1), un renard à moitié (${fx(c('renard'))} : traque ${fx(R.L7.t)} au même régime), un herbivore jamais (un bison qui fait tomber des joueurs est « défensive », traque ${fx(R.P8.t)})`);
  const geant = M.corpsDe({ regime: 'carnivore', masse_kg: 4000, sociabilite: 0 }, Orvane.appetence), meute = M.corpsDe({ regime: 'carnivore', masse_kg: 200, sociabilite: .8, taille_m: 2, vitesse_rel: 5 }, Orvane.appetence), seul = M.corpsDe({ regime: 'carnivore', masse_kg: 200, sociabilite: 0, taille_m: 2, vitesse_rel: 5 }, Orvane.appetence);
  const herite = M.apprendre({ a: 0, t: .7, o: .5 }, null, { plan: plans.cerf, corps: 0 }), petit = M.apprendre({ a: 0, t: .9, o: .5 }, null, { plan: plans.renard, corps: c('renard') });
  verif(Math.abs(geant - M.REGLES.traque.petits) < 1e-9 && meute >= seul && herite.t === 0 && petit.t <= c('renard'),
    `le corps borne aussi ce qu'on hérite : une lignée devenue herbivore ne garde pas la traque de sa mère (0,7 → ${fx(herite.t)}), un renard ne passe pas ${fx(c('renard'))} ; vivre en meute n'ôte rien (${fx(meute)} pour ${fx(seul)} seul), et pour un géant de quatre tonnes un joueur n'est pas une proie à sa taille (${fx(geant)})`);
  // l'oubli, la riposte
  const o5 = regime(plans.loup, null, 5, R.L2), o15 = regime(plans.loup, null, 15, R.L2), o30 = regime(plans.loup, null, 30, R.L2);
  verif(o5.att === 'traqueuse' && o15.t < M.REGLES.attitudes.seuil && o30.t < .15 && Math.abs(o30.o - .5) < .15 && Math.abs(regime(plans.loup, null, 10, R.L2).t / R.L2.t - .5) < .01,
    `l'oubli : les joueurs partis, la traque retombe de moitié en dix cycles (${fx(R.L2.t)}, puis ${fx(o5.t)} à 5 cycles, ${fx(o15.t)} à 15, ${fx(o30.t)} à 30) ; la néophobie revient vers 0,5 (${fx(o30.o)})`);
  const r1 = regime(plans.loup, { rencontres: 40, prises: 5, blessures: 4, attaques: 5, tombes: 1 }, 1, R.L2), r2 = regime(plans.loup, { rencontres: 40, prises: 5, blessures: 4, attaques: 5, tombes: 1 }, 2, R.L2);
  verif(r1.att === 'rodeuse' && r2.att === 'fuyante' && r2.t < r1.t, `la riposte : des traqueuses qu'on se met à chasser sont « rôdeuse » au premier cycle (traque ${fx(r1.t)}, méfiance ${fx(r1.m)}), « fuyante » au deuxième`);
  const gros = Object.fromEntries(Object.entries({ rencontres: 30, attaques: 8, tombes: 6, pillages: 4, prises: 3, dispositif: 3, effarouchements: 30 }).map(([k, v]) => [k, v * 1000]));
  verif(Object.values(R).every(r => r.pas <= M.REGLES.pas + 1e-9) && regime(plans.loup, gros).pas <= M.REGLES.pas + 1e-9, `rien ne bascule en une nuit : aucune disposition ne bouge de plus de ${M.REGLES.pas} par cycle, même avec mille fois plus de comptes`);
  // l'oubli a une fin ; des comptes insensés n'effacent rien ; les règles d'un monde ne cassent pas le moteur
  const tard = regime(plans.loup, null, 200, { M: { a: .5, t: .8, o: .1 }, m: 0, h: 0 }), fou = M.apprendre({ a: .3, t: .4, o: .2 }, { blessures: Infinity, tombes: NaN, attaques: -5, rencontres: 'x' }, { plan: plans.loup, corps: 1 }), calme = M.apprendre({ a: .3, t: .4, o: .2 }, null, { plan: plans.loup, corps: 1 });
  verif(M.ecrire(tard.M) === null && JSON.stringify(fou) === JSON.stringify(calme), 'deux cents cycles sans joueurs : la population ne publie plus rien (l\'oubli a une fin) ; des comptes infinis ou qui ne sont pas des nombres ne comptent pas, et n\'effacent rien');
  const avantR = JSON.stringify(M.REGLES); let casse = null;
  for (const o of [JSON.parse('{"__proto__":{"pollue":1},"constructor":5,"toString":7}'), { attitudes: null }, { attitudes: { alerte: 5 } }, { pas: 'x' }, { traque: { demi_vie: 'dix', inconnue: 3 } }, [1, 2], 'x']) { try { const rendre = M.regler(o); if (JSON.stringify(M.REGLES) !== avantR || M.REGLES.pollue !== undefined) casse = JSON.stringify(o); rendre(); } catch (e) { casse = String(e); } }
  const rr = M.regler({ traque: { demi_vie: 40 }, attitudes: { alerte: [.2, .8] }, pas: .2 }), prises = M.REGLES.traque.demi_vie === 40 && M.REGLES.attitudes.alerte[0] === .2 && M.REGLES.pas === .2 && M.REGLES.traque.preuve === 6; rr();
  verif(casse === null && prises && JSON.stringify(M.REGLES) === avantR && Object.getPrototypeOf(M.REGLES) === Object.prototype, 'les règles d\'un monde (regles.memoire) : seules celles que la mémoire connaît, et de la bonne forme, sont prises, puis rendues ; le reste (un nom réservé, un mot pour un nombre, une liste de travers) est ignoré sans casser le cycle' + (casse ? ' ; cassé par ' + casse : ''));
  // le journal ne manque pas une bascule qui tombe pile sur le seuil : on cherche le feu qui publie exactement 0,25
  { const ME = M.preparer({ appetence: Orvane.appetence }), T = { id: 'loup', plan: plans.loup }, une = E => { const p = {}, ev = []; ME.publier(T, 'b', { M: { a: 0, t: 0, o: .3 }, Mp: { a: 0, t: 0, o: .3 } }, p, { rencontres: 10, effarouchements: E }, 0, ev); return [p, ev]; };
    let lo = 0, hi = 200, pile = null; for (let i = 0; i < 60 && pile == null; i++) { const E = (lo + hi) / 2, o = une(E)[0].memoire?.neophobie; if (o === .25) pile = E; else if (o > .25) lo = E; else hi = E; }
    const [p1, e1] = pile == null ? [{}, []] : une(pile), ev2 = [], p2 = {}; if (pile != null) ME.publier(T, 'b', { M: M.lire(p1.memoire), Mp: M.lire(p1.memoire) }, p2, { rencontres: 10, effarouchements: 40 }, 0, ev2);
    verif(pile != null && e1.filter(e => /ne craignent plus/.test(e.detail)).length === 1 && p2.memoire.neophobie < .25 && !ev2.length, 'une néophobie qui tombe pile sur le seuil (0,25 publié) est notée au journal ce cycle-là, une fois, et pas au suivant'); }
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
  // un compte n'a pas d'autre plafond que son activité : peu nombreux, des comptes égaux ne sont pas rabotés (ce qui grossirait
  // d'autant un compte léger) ; sans activité de référence au profil, celle du tampon
  const six = V(P(Array.from({ length: 6 }, (_, i) => lot('h' + i, [[t, b, 'rencontre', 60], [t, b, 'blessure', 2, 'melee']])))), sansRef = Tampon.agreger([lot('a', [[t, b, 'blessure', 10000], [t, b, 'effarouchement', 20000, 'feu'], [t, b, 'attaque', 9000]])], W0, { ...profil, influence: { ...profil.influence, exposition_ref: undefined } }).pressions.taxons[t][b].vecu;
  verif(six.rencontres === 360 && six.blessures === 12 && six.comptes === 6 && sansRef.blessures + sansRef.effarouchements + sansRef.attaques <= Tampon.VECU.activite + .1,
    `six comptes égaux gardent tout ce qu'ils ont vécu (${fx(six.rencontres, 0)} rencontres, ${fx(six.blessures, 0)} blessures) ; un profil sans activité de référence prend celle du tampon (${Tampon.VECU.activite} contacts : ${fx(sansRef.blessures + sansRef.effarouchements + sansRef.attaques, 0)} retenus sur 39 000)`);
  // la part d'un jeu
  const gros = Array.from({ length: 20 }, (_, i) => lot('g' + i, [[t, b, 'attaque', 60]], 'jeu-a')), petit = n => Array.from({ length: n }, (_, i) => lot('p' + i, [[t, b, 'rencontre', 60]], 'jeu-b'));
  const j1 = V(P([...gros, ...petit(1)])), j5 = V(P([...gros, ...petit(5)]));
  verif(j1.jeux === 2 && Math.abs(j1.attaques - Tampon.VECU.plancher_jeu) < 1 && Math.abs(j5.attaques - j5.rencontres) < 1,
    `un jeu de vingt comptes face à un jeu d'un seul garde ${fx(j1.attaques, 0)} contacts sur 1 200 (son plancher) ; face à un jeu de cinq comptes, autant que lui (${fx(j5.attaques, 0)} et ${fx(j5.rencontres, 0)}) : aucun jeu ne fait seul l'histoire d'une population que d'autres montrent`);
  // (docs/12) le contact de la méfiance a les mêmes protections, dans un monde éveillé ou non : sur des lots d'avant, il dit ce
  // que dit le vécu — un compte ramené à une activité normale sur tous ses contacts, puis la part d'un jeu
  const K = r => r.pressions.taxons?.[t]?.[b]?.contact, neuf = [lot('a', [[t, b, 'prelevement', 9000]])], chasseurs = Array.from({ length: 20 }, (_, i) => lot('c' + i, [[t, b, 'rencontre', 60], [t, b, 'prelevement', 6]], 'jeu-a'));
  const d1 = P(neuf), d0 = P(neuf, I0), d2 = P([...chasseurs, ...petit(1)]), d20 = P([...chasseurs, ...petit(1)], I0);
  verif(K(d1).danger <= profil.influence.exposition_ref && K(d1).danger === V(d1).prises && JSON.stringify(K(d0)) === JSON.stringify(K(d1)),
    `le contact de la méfiance est plafonné de même : 9 000 prélèvements d'un seul compte, sans une rencontre, font ${fx(K(d1).danger, 0)} contacts qui finissent mal (${fx(V(d1).prises, 0)} prises au vécu), dans un monde éveillé comme dans un monde sans mémoire`);
  verif(Math.abs(K(d2).rencontres - (Tampon.VECU.plancher_jeu + 60)) < .01 && K(d2).rencontres === V(d2).rencontres && K(d2).danger === V(d2).prises && JSON.stringify(K(d20)) === JSON.stringify(K(d2)),
    `deux jeux inégaux : vingt chasseurs d'un jeu (1 200 rencontres, 120 prises) face à un passant d'un autre ; le contact garde ${fx(K(d2).rencontres - 60, 0)} rencontres et ${fx(K(d2).danger, 0)} prises du grand jeu, ce que garde le vécu (${fx(V(d2).rencontres - 60, 0)} et ${fx(V(d2).prises, 0)})`);
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
{ const t = 'traqueur', b = 'prairie', tr = X => Pop(X, t, b)?.memoire?.traque || 0, ne = X => Pop(X, t, b)?.memoire?.neophobie ?? .5, at = X => Pop(X, t, b)?.attitude || 'neutre';
  const paisibles = Array.from({ length: 10 }, (_, i) => lot('p' + i, [[t, b, 'rencontre', 30]])), defenseurs = Array.from({ length: 10 }, (_, i) => lot('h' + i, [[t, b, 'rencontre', 20], [t, b, 'prelevement', .3, 'melee'], [t, b, 'blessure', 2, 'melee'], [t, b, 'attaque', 2]]));
  const tombes = n => Array.from({ length: n }, (_, i) => lot('m' + i, [[t, b, 'joueur_tombe', 500], [t, b, 'pillage', 500]])), feu = lot('f', [[t, b, 'effarouchement', 60, 'feu']]);
  // un compte seul, face à dix joueurs paisibles
  const seul = jouer(W0, 20, () => [...paisibles, ...tombes(1)]).X, feu5 = jouer(W0, 5, () => [...paisibles, feu]).X;
  verif(tr(seul) < .3 && at(seul) !== 'traqueuse' && ne(feu5) > .3, `un compte seul ne fait pas une traqueuse : dix joueurs paisibles et un compte qui déclare 500 joueurs tombés par nuit, vingt cycles, traque ${fx(tr(seul))}, « ${at(seul)} » ; un seul compte à son feu soixante fois par nuit n'accoutume pas la population en cinq nuits (néophobie ${fx(ne(feu5))})`);
  // combien il en faut : les faux comptes valent autant de joueurs malchanceux au possible, pas davantage
  let seuil = null; for (let n = 1; n <= 10 && seuil == null; n++) if (at(jouer(W0, 20, () => [...paisibles, ...tombes(n)]).X) === 'traqueuse') seuil = n;
  verif(seuil >= 3, `face à dix joueurs qui ne font que passer, il faut ${seuil ?? 'plus de dix'} comptes qui déclarent chacun le plus de joueurs tombés possible, chaque nuit, pour faire une traqueuse : une minorité décidée y arrive, comme autant de vrais joueurs qui se laisseraient prendre`);
  const sain = jouer(W0, 20, () => defenseurs).X, cinq = jouer(W0, 20, () => [...defenseurs, ...tombes(5)]).X;
  verif(tr(sain) < .05 && at(sain) === 'fuyante' && tr(cinq) < M.REGLES.attitudes.seuil && at(cinq) === 'fuyante', `mais dès que les autres se défendent, non : dix comptes qui blessent et prennent des bêtes (« ${at(sain)} », traque ${fx(tr(sain))}), plus cinq faux comptes : traque ${fx(tr(cinq))}, toujours « ${at(cinq)} »`);
  // (docs/12) la méfiance a les mêmes plafonds : un compte seul ne fait pas fuir les bêtes de dix passants, ni n'en retire une de plus
  const braco = k => [...paisibles, lot('x', [[t, b, 'prelevement', 9000]])], honnete = k => [...paisibles, lot('x', [[t, b, 'prelevement', 60]])], n9 = jouer(W0, 1, braco), n60 = jouer(W0, 1, honnete);
  verif(Pop(n9.X, t, b).mefiance < .8 && empreinte(n9.X) === empreinte(n60.X) && n9.pressions.taxons[t][b].contact.danger === profil.influence.exposition_ref,
    `dix joueurs paisibles et un compte qui déclare 9 000 prélèvements, sans une rencontre : après une nuit, méfiance ${fx(Pop(n9.X, t, b).mefiance)} — le monde exact d'un compte qui en déclare 60 (une activité normale), au caractère près`);
  const nuit = jouer(W0, 1, () => [...paisibles, ...tombes(200)]).X;
  verif(tr(nuit) <= M.REGLES.pas + 1e-9 && (Pop(nuit, t, b).memoire?.attrait || 0) <= M.REGLES.pas + 1e-9, `deux cents faux comptes en une nuit : la traque ne dépasse pas ${M.REGLES.pas} (${fx(tr(nuit))}) ; tout retombe quand ils s'en vont`);
  const avec = jouer(W0, 3, () => [...defenseurs, ...tombes(200)]), sansF = jouer(W0, 3, () => defenseurs);
  verif(empreinte(effectifs(avec.X)) === empreinte(effectifs(sansF.X)) && JSON.stringify(avec.pressions.taxons[t][b].retrait) === JSON.stringify(sansF.pressions.taxons[t][b].retrait), 'et ils ne retirent pas une bête au monde, ni ne changent la chasse des autres : les mêmes retraits, les mêmes effectifs, avec ou sans eux');
}

console.log('5. Ce qui voyage');
{ // les migrants : la moitié de l'écart de leur population, à proportion de leur nombre
  const a = M.meler({ a: 0, t: 0, o: .5 }, 300, { a: .4, t: .8, o: .1 }, 100), neuve = M.meler(undefined, 0, { a: .4, t: .8, o: .1 }, 50), rien = M.meler({ a: .2, t: .6, o: .3 }, 100, null, 100);
  verif(Math.abs(a.t - .1) < 1e-9 && Math.abs(a.o - .45) < 1e-9 && Math.abs(neuve.t - .4) < 1e-9 && Math.abs(neuve.o - .3) < 1e-9 && Math.abs(rien.t - .3) < 1e-9 && Math.abs(rien.o - .4) < 1e-9,
    `des migrants emportent la moitié de ce qu'a appris leur population : cent traqueuses (0,8) parmi trois cents naïves font ${fx(a.t)} ; une population qu'elles fondent, ${fx(neuve.t)} ; des naïves diluent la mémoire du lieu (0,6 → ${fx(rien.t)})`);
  // l'ordre des arrivées ne compte pas : dix traqueuses, cent migrants naïfs, et cent hivernants qui ne portent ni ne diluent rien
  const arrivees = ordre => { const D = { N: [50], M: { a: 0, t: .2, o: .5 }, n0: 50 }; for (const k of ordre) { if (k === 'T') M.recevoir(D, { a: 0, t: .8, o: .5 }, 10); if (k === 'N') M.recevoir(D, null, 100); D.N[0] += k === 'T' ? 10 : 100; } M.installer(D); return D.M.t; };
  const o1 = arrivees(['T', 'N', 'H']), o2 = arrivees(['H', 'N', 'T']), o3 = arrivees(['N', 'H', 'T']);
  verif(o1 === o2 && o2 === o3 && Math.abs(o1 - (50 * .2 + 10 * .4) / 160) < 1e-12, `le même lieu reçoit la même nuit des traqueuses, des migrants naïfs et des hivernants : quel que soit l'ordre, la même mémoire (${fx(o1, 4)})`);
  // dans le moteur : des joueurs déplacent cent traqueuses de la prairie au bois, où personne n'a rien appris
  const Wd = clone(W0), prairie = Tx(Wd, 'traqueur').populations.find(p => p.biome === 'prairie'), bois0 = Pop(W0, 'traqueur', 'bois').effectif; prairie.memoire = { traque: .8 };
  const Yd = Orvane.cycle(Wd, { taxons: { traqueur: { prairie: { deplacement: [{ vers: 'bois', n: 100 }] } } } }), bd = Pop(Yd, 'traqueur', 'bois');
  verif(bd.memoire?.traque > .15 && bd.memoire.traque < .4 * 2 ** (-1 / 10) + .001 && Pop(Yd, 'traqueur', 'prairie').memoire.traque > bd.memoire.traque, `cent traqueuses (0,8) emportées au bois, parmi ${fx(bois0, 0)} naïves : le bois apprend la traque d'elles (${fx(bd.memoire?.traque)}), moins que la prairie n'en garde (${fx(Pop(Yd, 'traqueur', 'prairie').memoire.traque)})`);
  // rien ne bascule en une nuit, migrants compris : le pas se compte depuis ce que la population publiait
  const Wb = clone(W0), pb = Tx(Wb, 'traqueur').populations.find(p => p.biome === 'prairie'); pb.memoire = { traque: 1, attrait: 1, neophobie: 0 };
  const Yb = Orvane.cycle(Wb, { taxons: { traqueur: { prairie: { deplacement: [{ vers: 'bois', n: 340 }] }, bois: { vecu: { rencontres: 10, attaques: 8, tombes: 6, nourrissages: 30, effarouchements: 50 } } } } }), bb = Pop(Yb, 'traqueur', 'bois');
  verif(bb.memoire.traque <= M.REGLES.pas + 1e-9 && bb.memoire.attrait <= M.REGLES.pas + 1e-9 && bb.memoire.neophobie >= .5 - M.REGLES.pas - 1e-9 && bb.memoire.traque > .3,
    `trois cent quarante traqueuses accomplies arrivent au bois la nuit où des joueurs y tombent : la population du bois ne bouge pas de plus de ${M.REGLES.pas} (traque ${fx(bb.memoire.traque)}, attrait ${fx(bb.memoire.attrait)}, néophobie ${fx(bb.memoire.neophobie)})`);
  // une lignée qui se sépare emporte ce que sa population avait appris
  const Wm = clone(W0), src = Tx(Wm, 'traqueur').populations.slice().sort((x, y) => y.effectif - x.effectif)[0]; src.memoire = { traque: .7, neophobie: .2 };
  Wm.monde.regles = { ...(Wm.monde.regles || {}), separation: { cycles: 0, effectif: 1, distance: 0, divergence: 0, chance: 1, flux: 1 } };
  const Y = Orvane.cycle(Wm, {}), fille = Y.taxons.find(x => x.parent === 'traqueur' && x.apparu === Y.cycle.n && x.populations.some(p => p.biome === src.biome));
  verif(fille && Math.abs(fille.populations[0].memoire?.traque - .7 * 2 ** (-1 / 10)) < .002 && fille.populations[0].memoire?.neophobie < .25, fille ? `une lignée qui se sépare (${fille.id}) emporte la mémoire de sa population : traque ${fx(fille.populations[0].memoire?.traque)}, néophobie ${fx(fille.populations[0].memoire?.neophobie)}` : 'aucune lignée ne s\'est séparée : le banc ne peut pas vérifier ce qu\'elle emporte');

  // la nuit d'un monde par parcelles, par le chemin du cycle hébergé : le tampon sur la vue par biome, les pressions réparties
  // entre les parcelles, le moteur. Ce que les joueurs font dans un biome, toutes ses parcelles le vivent (comme la méfiance,
  // docs/15) : la mémoire se tient par biome, la parcelle que dit un lot n'y change encore rien
  const E0 = M.eveiller(O0).inst, PO = lireJ('mondes/orvane/profil.json'), type = b => b.type || b.id, typeDe = new Map(E0.biomes.map(b => [b.id, type(b)]));
  const cand = E0.taxons.filter(t => !t.eteint && t.plan.regime === 'carnivore' && M.corpsDe(t.plan, Orvane.appetence) > 0).map(t => { const g = {}; for (const p of t.populations) if (p.effectif >= 30) (g[typeDe.get(p.biome)] ??= []).push(p);
    const best = Object.entries(g).filter(([ty, L]) => L.length >= 3 && L.every(p => p.biome !== ty)).sort((x, y) => y[1].length - x[1].length)[0]; return best ? [t, best[0], best[1]] : null; }).filter(Boolean).sort((x, y) => y[2].length - x[2].length)[0];
  if (!cand) verif(false, 'aucun carnivore du monde d\'Orvane ne vit dans trois parcelles d\'un même biome : le banc ne peut pas vérifier la nuit par parcelles');
  else { const [t, ty, L] = cand, ici = L[0].biome, lots = () => ['a', 'b', 'c'].map(c => ({ orvane: '1.0', monde: E0.monde.id, instantane: 0, source: { jeu: 'lisiere', compte: c }, evenements: [['rencontre', 30], ['attaque', 6], ['joueur_tombe', 2]].map(([action, n]) => ({ taxon: t.id, biome: ty, parcelle: ici, action, n })) }));
    let X = E0, B = O0, te = {}; for (let k = 0; k < 4; k++) { const r = Tampon.agreger(lots(), Parcelles.regrouper(X), PO, te); te = r.etat; X = Orvane.cycle(X, Parcelles.repartir(r.pressions, X, Parcelles.localiser(lots(), X))); B = Orvane.cycle(B, {}); }
    const P = Tx(X, t.id).populations.filter(p => typeDe.get(p.biome) === ty && p.effectif >= 20), T = P.map(p => p.memoire?.traque || 0), ailleurs = Tx(X, t.id).populations.filter(p => typeDe.get(p.biome) !== ty).map(p => p.memoire?.traque || 0);
    verif(P.length >= 3 && Math.min(...T) > .15 && Math.max(...T) < 1.5 * Math.min(...T) && ailleurs.every(x => x < Math.min(...T) / 3),
      `${t.nom || t.id}, ${ty} : des joueurs tombent quatre nuits de suite ; les ${P.length} parcelles du biome apprennent la traque ensemble (de ${fx(Math.min(...T))} à ${fx(Math.max(...T))}), les ${ailleurs.length} populations des autres biomes presque rien (au plus ${fx(Math.max(0, ...ailleurs), 3)})`);
    verif(empreinte(effectifs(X)) === empreinte(effectifs(B)), 'quatre nuits par parcelles, la mémoire éveillée et nourrie ou non : les mêmes effectifs, au caractère près');
    const G = Parcelles.regrouper(X), e = val(S, Tampon.filtrer(G, { familles: ['animale', 'synthetique'] }), '$'); verif(!e.length && Pop(G, t.id, ty)?.memoire?.traque > .15, 'l\'instantané publié d\'un monde qui se souvient respecte le schéma, et porte la mémoire du biome' + (e.length ? ' : ' + e.slice(0, 3).join(' ; ') : ''));
    // la vue par biome : deux parcelles, l'une traqueuse et sans méfiance, l'autre méfiante et sans mémoire
    const Z = clone(E0), [p1, p2] = Tx(Z, t.id).populations.filter(p => typeDe.get(p.biome) === ty).slice(0, 2), reste = new Set(Tx(Z, t.id).populations.filter(p => typeDe.get(p.biome) === ty).slice(2).map(p => p.biome));
    Tx(Z, t.id).populations = Tx(Z, t.id).populations.filter(p => !reste.has(p.biome)); p1.memoire = { traque: 1 }; delete p1.mefiance; p2.mefiance = .5; delete p2.memoire;
    const n1 = p1.effectif, n2 = p2.effectif, pz = Pop(Parcelles.regrouper(Z), t.id, ty), tAtt = n1 / (n1 + n2), mAtt = .5 * n2 / (n1 + n2), mot = M.attitude({ mefiance: mAtt, memoire: { traque: tAtt } }, t.plan) || undefined;
    verif(Math.abs((pz.memoire?.traque || 0) - tAtt) < 1e-3 && Math.abs((pz.mefiance || 0) - mAtt) < 1e-3 && pz.attitude === mot,
      `vue par biome, une parcelle qui n'a rien appris compte pour neutre, pour la mémoire comme pour la méfiance : ${fx(n1, 0)} traqueuses sans méfiance et ${fx(n2, 0)} méfiantes sans mémoire font traque ${fx(pz.memoire?.traque || 0)}, méfiance ${fx(pz.mefiance || 0)}, « ${pz.attitude || 'neutre'} »`);
    // … et l'attitude du biome suit les règles que le monde s'est choisies
    const Zr = clone(Z); for (const p of Tx(Zr, t.id).populations) if (typeDe.get(p.biome) === ty) { p.memoire = { traque: .3 }; delete p.mefiance; delete p.habituation; } const sansR = Pop(Parcelles.regrouper(Zr), t.id, ty).attitude;
    Zr.monde.regles = { ...(Zr.monde.regles || {}), memoire: { attitudes: { seuil: .2 } } }; const avecR = Pop(Parcelles.regrouper(Zr), t.id, ty).attitude;
    verif(sansR === undefined && avecR === 'traqueuse' && M.REGLES.attitudes.seuil === .4, 'la vue par biome lit l\'attitude avec les règles du monde (regles.memoire) : à 0,3 de traque, rien de marqué au seuil du moteur (0,4), « traqueuse » dans un monde qui a mis le sien à 0,2');
  }
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
