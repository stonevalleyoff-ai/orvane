// Orvane — LE BANC DU TAMPON (bancs/tampon.js) : ce qu'un jeu, ou quelqu'un qui s'en fait passer pour un, peut faire au monde
// partagé. L'inscription est libre et le compte d'un joueur se choisit : chaque lot est une donnée, jamais une instruction.
//  1. un lot qui ne se lit pas (null, une liste de travers, __proto__, une exposition mal formée) n'arrête jamais le cycle ;
//  2. des nombres impossibles (1e400, 1e308 deux fois, négatifs, un milliard) sont écartés, et n'effacent pas la chasse des autres ;
//  3. ce qui n'est pas un retrait est plafonné aussi : déplacements, libérations, habitat, milieu ;
//  4. un jeu de 1 500 comptes contre un autre jeu : la part d'un compte, d'un jeu, d'une population ; un petit jeu ne peut pas
//     effacer la chasse d'un grand ;
//  5. les parcelles : une rencontre localisée ne détourne rien, une chasse localisée ne vide pas une parcelle ;
//  6. l'élevage : un allèle inventé (« <img…> ») n'entre pas dans le monde ;
//  7. ce que publie la vue par biome (une infection dans une parcelle sur quatre), ce que les parcelles gardent d'un apport, la Mère
//     d'un monde découpé après son éveil ;
//  8. le jour un : un monde sans lots tourne exactement comme avant ;
//  9. le contact de la méfiance (docs/12) : un compte ramené à une activité normale sur tous ses contacts (9 000 prélèvements sans
//     une rencontre aussi) ; pas de part par compte ni par jeu, le nom du jeu n'y change rien (la part d'un jeu reste aux retraits) ;
//     un petit jeu hostile face à un grand jeu paisible, un grand jeu face à un petit ; sous l'activité normale, rien ne bouge.
//   node bancs/tampon.js
'use strict';
const fs = require('fs'), path = require('path');
const racine = p => path.join(__dirname, '..', p);
const Orvane = require(racine('moteur/orvane.js')), Tampon = require(racine('tampon/tampon.js')), Parcelles = require(racine('moteur/parcelles.js'));
const lireJ = f => JSON.parse(fs.readFileSync(racine(f), 'utf8'));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const fx = (x, d = 1) => (+x).toLocaleString('fr-FR', { maximumFractionDigits: d }), t0 = Date.now();

const I = lireJ('mondes/orvane/instantane.json'), E = lireJ('mondes/orvane/etat.json'), P0 = lireJ('mondes/orvane/profil.json');
const profil = { ...P0, influence: { ...P0.influence, memoire_cycles: 1 } };   // (sans lissage : on lit ce qu'un cycle reçoit, plafonds compris)
const PL = profil.influence.plafonds, pmax = PL.part_max_population;
const lot = (compte, evenements, jeu = 'stone-valley') => ({ monde: 'orvane', jeu, source: { jeu, compte }, evenements });
const chasse = (taxon, biome, n, o = {}) => ({ taxon, biome, action: 'prelevement', n, ...o });
const agr = (lots, jeux = null, X = I) => Tampon.agreger(lots, X, profil, {}, null, jeux);
const effDe = (tid, bid, X = I) => X.taxons.find(t => t.id === tid).populations.find(p => p.biome === bid).effectif;
const ote = O => Object.values(O?.retrait || {}).reduce((a, x) => a + Math.max(0, x), 0) + (O?.deplacement || []).reduce((a, d) => a + d.n, 0);
const rendu = O => Object.values(O?.retrait || {}).reduce((a, x) => a + Math.max(0, -x), 0);
const fini = o => JSON.stringify(o, (k, v) => typeof v === 'number' && !Number.isFinite(v) ? 'NONFINI' : v).indexOf('NONFINI') < 0;
const proto0 = Object.getOwnPropertyNames(Object.prototype).join();
const effJ = effDe('jagra', 'toundra');

console.log('1. Un lot qui ne se lit pas');
{ const pires = [null, 'x', [], { monde: 'orvane', evenements: [null] }, lot('a', [null, 7, 'x', [], { action: 'prelevement' }]), lot('b', 'pas une liste'),
    lot('c', [{ taxon: '__proto__', biome: 'maladie', action: 'prelevement', n: 1 }, { taxon: 'constructor', biome: 'toundra', action: 'prelevement', n: 1 }, { taxon: 'jagra', biome: '__proto__', action: 'prelevement', n: 1 }]),
    lot('d', [{ taxon: 'jagra', biome: 'toundra', action: 'deplacement', vers: 'toString', n: 5 }, { taxon: 'jagra', biome: 'toundra', action: 'prelevement', n: 2, phenotype: '__proto__' }]),
    lot('e', [{ taxon: 'jagra', biome: 'toundra', action: 'prelevement', n: 3, phenotype: 'nanisme' }], 'malin'), { ...lot('__proto__', [chasse('jagra', 'toundra', 1)]), jeu: '__proto__' }];
  let r = null, erreur = null; try { r = agr(pires, { malin: { exposition: { traits_rendus: 1, compression: 'x', familles: 'animale' } } }); } catch (e) { erreur = e; }
  verif(!erreur && r && r.rejetes.evenements >= 10 && r.rejetes.lots >= 4, `${pires.length} lots piégés : le tampon ne plante pas (${r?.rejetes.lots} lots et ${r?.rejetes.evenements} événements écartés)${erreur ? ' — ' + erreur.message : ''}`);
  verif(Object.getOwnPropertyNames(Object.prototype).join() === proto0 && ({}).maladie === undefined && ({}).toundra === undefined, 'rien ne touche Object.prototype (__proto__, constructor, prototype comme lignée, lieu, phénotype, compte ou jeu)');
  const v = agr([lot('e', [{ taxon: 'jagra', biome: 'toundra', action: 'prelevement', n: 3, phenotype: 'base' }], 'malin')], { malin: { exposition: { traits_rendus: 1, compression: 'x' } } });
  verif(Math.abs(ote(v.pressions.taxons.jagra?.toundra) - 3) < .1 && v.rejetes.evenements === 0, 'une exposition mal formée (traits_rendus : 1, compression : « x ») est oubliée : le lot se lit avec l\'exposition neutre (3 bêtes, réparties selon les fréquences réelles)');
  let err2 = null; try { const loc = Parcelles.localiser(pires, E), rp = Parcelles.repartir(r.pressions, E, loc); Parcelles.repartir({ taxons: { jagra: { toundra: { retrait: { base: 1 }, q: { taille: 'x' }, note: 'chaîne', deplacement: [{ vers: 'toString', n: 1 }] } } } }, E, null); void rp; } catch (e) { err2 = e; }
  verif(!err2, `les parcelles non plus : localiser et répartir lisent ces lots sans planter${err2 ? ' — ' + err2.message : ''}`);
  const W = lireJ('mondes/sv-1/etat.json'), lots = [null, lot('x', [{ taxon: '__proto__', biome: 'maladie', action: 'prelevement', n: 1 }])].map(l => l && { ...l, monde: W.monde.id });
  let err3 = null; try { Orvane.cycle(W, Tampon.agreger(lots, W, profil, {}).pressions); } catch (e) { err3 = e; }
  verif(!err3, `et le moteur tourne sur ce qui en reste (un cycle de ${W.monde.id})${err3 ? ' — ' + err3.message : ''}`); }

console.log('2. Des nombres impossibles');
{ const inf = JSON.parse('{"n":1e400}').n, honnete = lot('h', [chasse('jagra', 'toundra', 5)]);
  const a = agr([honnete, lot('x', [chasse('jagra', 'toundra', inf)])]), b = agr([honnete, lot('y', [chasse('jagra', 'toundra', 1e308), chasse('jagra', 'toundra', 1e308)])]);
  verif(fini(a) && fini(b) && Math.abs(ote(a.pressions.taxons.jagra.toundra) - 5) < 1e-6 && Math.abs(ote(b.pressions.taxons.jagra.toundra) - 5) < 1e-6,
    `n = 1e400 (l'infini), ou 1e308 deux fois : écartés ; la chasse honnête (5) reste 5, rien n'est NaN`);
  const c = agr([lot('n', [chasse('jagra', 'toundra', -1000)]), lot('m', [{ taxon: 'jagra', biome: 'toundra', action: 'liberation', n: 1e9 }, { taxon: 'jagra', biome: 'toundra', action: 'deplacement', vers: 'banquise', n: 1e9 }, { biome: 'prairie', action: 'habitat_perdu', n: 1e12 }])]);
  verif(!c.pressions.taxons.jagra && !Object.keys(c.pressions.biomes).length && c.rejetes.evenements === 4, 'un prélèvement négatif (−1 000), une libération, un déplacement d\'un milliard, un habitat de mille milliards : écartés (n au plus 10 000 par événement)'); }

console.log('3. Ce qui n\'est pas un retrait');
{ const N = 1500, dep = agr(Array.from({ length: N }, (_, i) => lot('d' + i, [{ taxon: 'jagra', biome: 'toundra', action: 'deplacement', vers: 'banquise', n: 1e4 }]))).pressions.taxons.jagra.toundra;
  verif(ote(dep) <= pmax * effJ + 1e-6, `${N} comptes emportent chacun 10 000 jagra : ${fx(ote(dep), 0)} partent au plus (${pc(pmax)} des ${fx(effJ, 0)} de la toundra), pas toute la population`);
  const lib = agr(Array.from({ length: N }, (_, i) => lot('l' + i, [{ taxon: 'jagra', biome: 'toundra', action: 'liberation', n: 1e4 }]))).pressions.taxons.jagra.toundra;
  verif(rendu(lib) <= pmax * effJ + 1e-6 && rendu(lib) > 0, `${N} comptes relâchent chacun 10 000 jagra : ${fx(rendu(lib), 0)} arrivent au plus (${pc(pmax)} de la population), pas un doublement à chaque cycle`);
  const cap = I.biomes.find(b => b.id === 'prairie').capacite, hab = agr(Array.from({ length: N }, (_, i) => lot('h' + i, [{ biome: 'prairie', action: 'habitat_perdu', n: 1e4 }, { biome: 'prairie', action: 'defrichage', n: 1e4 }]))).pressions.biomes.prairie;
  verif(Math.abs(hab.habitat) <= .02 * cap + 1e-6 && Math.abs(hab.milieu.couvert) <= N * PL.par_compte_cycle + 1e-6,
    `${N} comptes détruisent chacun 10 000 unités de prairie : la capacité ne perd que ${fx(-hab.habitat, 0)} (2 % de ${fx(cap, 0)}) ce cycle ; chaque compte défriche au plus ${PL.par_compte_cycle} unités (le moteur borne le milieu à 5 % du lieu)`); }

console.log('4. Un jeu de mille comptes');
{ const N = 1500, grand = Array.from({ length: N }, (_, i) => lot('g' + i, [chasse('jagra', 'toundra', 30)], 'jeu-a')), petit = lot('p', [chasse('jagra', 'toundra', 1)], 'jeu-b');
  const r = agr([...grand, petit]).pressions.taxons.jagra.toundra, tot = ote(r);
  verif(tot <= pmax * effJ + 1e-6, `${N} comptes du jeu A prennent 30 jagra chacun (45 000) : il en meurt ${fx(tot, 0)}, au plus ${pc(pmax)} de la population (${fx(pmax * effJ, 0)}) — l'audit en voyait mourir toute la toundra`);
  const seulA = agr(grand).pressions.taxons.jagra.toundra, pj = PL.part_max_jeu;
  verif(ote(r) <= pj * pmax * effJ + 1 + 1e-6, `quand un autre jeu montre aussi la jagra, le jeu A seul n'en ôte plus que ${fx(ote(r) - 1, 0)} (au plus ${pc(pj)} de ce qu'une population peut perdre) ; seul au monde, il irait jusqu'à ${fx(ote(seulA), 0)}`);
  const honnete = agr([lot('a1', [chasse('jagra', 'toundra', 25)], 'jeu-a'), lot('a2', [chasse('jagra', 'toundra', 25)], 'jeu-a'), petit]).pressions.taxons.jagra.toundra;
  verif(Math.abs(ote(honnete) - 51) < 1e-6, `deux joueurs du jeu A en prennent 50, un joueur du jeu B une seule : rien n'est rogné (51) — un petit jeu ne peut pas, par la règle de la part, effacer la chasse d'un grand`);
  const T = Tampon.plafondPart([['a', 1000], ['b', 1]], .5, 0), U = Tampon.plafondPart([['a', 30], ['b', 30], ['c', 30], ['d', 300]], .4, 0);
  verif(Math.abs(T.a - .001) < 1e-9 && T.b === 1 && Math.abs(300 * U.d - .4 * (90 + 300 * U.d)) < 1e-6,
    'sans plancher, la règle tient au sens strict : 1 000 contre 1 à 50 % donne 1 contre 1 ; quatre contributeurs à 40 % : le plus gros fait exactement 40 % du total plafonné'); }

console.log('5. Les parcelles');
{ const honnetes = Array.from({ length: 200 }, (_, i) => lot('h' + i, [chasse('jagra', 'toundra', 13.11)])), r = agr(honnetes).pressions;
  const sans = Parcelles.repartir(r, E, Parcelles.localiser(honnetes, E)).taxons.jagra, espion = [...honnetes, lot('x', [{ taxon: 'jagra', biome: 'toundra', action: 'rencontre', n: .001, parcelle: 'toundra~2' }])];
  const avec = Parcelles.repartir(agr(espion).pressions, E, Parcelles.localiser(espion, E)).taxons.jagra, e2 = effDe('jagra', 'toundra~2', E);
  verif(Math.abs(ote(avec['toundra~2']) - ote(sans['toundra~2'])) < 1e-3 && ote(avec['toundra~2']) < .3 * ote(r.taxons.jagra.toundra),
    `200 chasseurs prennent ${fx(ote(r.taxons.jagra.toundra), 0)} jagra en toundra ; une seule rencontre localisée en toundra~2 n'y envoie pas tout : ${fx(ote(avec['toundra~2']), 0)} (selon les effectifs), comme sans elle`);
  const un = [...honnetes, lot('y', [chasse('jagra', 'toundra', 1, { parcelle: 'toundra~2' })])], m = Parcelles.repartir(agr(un).pressions, E, Parcelles.localiser(un, E)).taxons.jagra;
  verif(ote(m['toundra~2']) < 1.01 * ote(sans['toundra~2']) + 1, `une chasse localisée d'une bête parmi ${fx(ote(r.taxons.jagra.toundra), 0)} : la parcelle reçoit sa part, plus une bête (${fx(ote(m['toundra~2']), 0)})`);
  const tous = honnetes.map(l => ({ ...l, evenements: l.evenements.map(e => ({ ...e, parcelle: 'toundra~2' })) })), M = Parcelles.repartir(agr(tous).pressions, E, Parcelles.localiser(tous, E)).taxons.jagra;
  verif(ote(M['toundra~2']) <= pmax * e2 + 1e-3, `les 200 chasseurs tous en toundra~2 : la parcelle perd au plus ${pc(pmax)} d'elle-même (${fx(ote(M['toundra~2']), 0)} sur ${fx(e2, 0)}), pas 92 %`); }

console.log('6. L\'élevage');
{ const L = Array.from({ length: 500 }, (_, i) => lot('e' + i, [{ taxon: 'jagra', biome: 'toundra', action: 'liberation', n: 30, genome: { n: 30, alleles: { '<img src=x onerror=alert(1)>': 1, albinisme: 1, __proto__x: 1, constructor: 1 }, a: { taille: 2, inventee: 3, vitesse: 1e9 } } }]));
  const A = agr(L).pressions.taxons.jagra.toundra.apport;
  verif(A && Object.keys(A.alleles).join() === 'albinisme' && Object.keys(A.a).join() === 'taille' && A.n <= Math.max(2, pmax * effJ) + 1e-6,
    `500 comptes relâchent des jagra au génome trafiqué : seul l'albinisme (un trait du monde) entre, à ${pc(A?.alleles.albinisme)} ; seule la taille (un trait continu connu) ; ${fx(A?.n, 0)} bêtes au plus`); }

console.log('7. La vue par biome, les parcelles d\'un apport, la Mère');
{ const V = Parcelles.regrouper(E), rom = V.taxons.find(t => t.id === 'romulo').populations.find(p => p.biome === 'marais'), P = E.taxons.find(t => t.id === 'romulo').populations.filter(p => p.biome.startsWith('marais'));
  const W = P.reduce((a, p) => a + p.effectif, 0), vrai = P.reduce((a, p) => a + (p.infection?.['souche-1']?.i || 0) * p.effectif, 0) / W, publie = rom.infection?.['souche-1']?.i ?? 0;
  verif(Math.abs(publie - vrai) < 1e-6, `romulo au marais : une parcelle infectée sur quatre ; la vue publie ${fx(publie * 1e5, 2)} infectés pour 100 000 (le vrai : ${fx(vrai * 1e5, 2)}), plus quatre fois trop`);
  const pr = { taxons: { jagra: { toundra: { retrait: { base: 10 }, apport: { n: 100, N: { base: 100 }, alleles: { albinisme: .8 }, a: { taille: 1.5 } }, contact: { rencontres: 40, danger: 10, aide: 0 }, q: { taille: 1.2 } } } } };
  const R = Parcelles.repartir(pr, E, null).taxons.jagra, parts = Object.values(R);
  verif(parts.length === 4 && parts.every(x => x.apport.alleles.albinisme === .8 && x.apport.a.taille === 1.5 && x.contact.danger === 10 && x.q.taille === 1.2) && Math.abs(parts.reduce((a, x) => a + x.apport.n, 0) - 100) < .01,
    'un apport réparti sur quatre parcelles : les bêtes se partagent (100 en tout), pas leurs allèles (80 %) ni leur taille génétique (1,5) ; chaque parcelle vit le contact entier');
  const B = V.biomes.find(b => b.transforme), D = Parcelles.decouper(V, { par: 4 }), Ps = D.biomes.filter(p => p.type === B.id), mere = D.monde.mere;
  verif(D.biomes.some(p => p.id === mere?.biome) && Ps.every(p => Math.abs(p.transforme.base.couvert - (B.transforme.base.couvert + p.axes.couvert - B.axes.couvert)) < 1e-3),
    `un monde déjà éveillé, découpé : la Mère s'installe en ${mere?.biome} (une parcelle qui existe) ; chaque parcelle de ${B.nom} garde son propre milieu (base, état, signal à l'écart de la parcelle)`); }

console.log('8. Le jour un');
{ const W = lireJ('mondes/sv-1/etat.json'), tamponW = lireJ('mondes/sv-1/tampon.json'), P = lireJ('mondes/sv-1/profil.json');
  let a = W, b = W; const ta = JSON.parse(JSON.stringify(tamponW)), tb = JSON.parse(JSON.stringify(tamponW));
  for (let k = 0; k < 2; k++) { const r1 = Tampon.agreger([], a, P, ta); a = Orvane.cycle(a, r1.pressions); ta.lisse = r1.etat.lisse; const r2 = Tampon.agreger([], b, P, tb); b = Orvane.cycle(b, r2.pressions); tb.lisse = r2.etat.lisse; }
  verif(JSON.stringify(a) === JSON.stringify(b), 'sans lots, le tampon ne rend que la mémoire lissée : même monde au bit près (deux passes, deux cycles de sv-1)'); }

console.log('9. Le contact de la méfiance');
{ const ref = profil.influence.exposition_ref, ev = (action, n) => ({ taxon: 'jagra', biome: 'toundra', action, n }), C = (lots, P = profil) => Tampon.agreger(lots, I, P, {}).pressions.taxons.jagra?.toundra?.contact;
  const nuit = c => Orvane.apprendre(0, 0, c, 0)[0], avant = (R, D) => nuit({ rencontres: R, danger: D });   // la méfiance qu'une population sans histoire en tire en une nuit ; avant : avec le contact que le tampon rendait
  const passants = (n, R, jeu) => Array.from({ length: n }, (_, i) => lot('p' + i, [ev('rencontre', R)], jeu));
  // le défaut : un compte, 9 000 prélèvements, pas une rencontre — le contact n'était ramené à une activité normale que par les rencontres
  const fou = agr([lot('x', [ev('prelevement', 9000)])]).pressions.taxons.jagra.toundra, dix = C([lot('x', [ev('prelevement', 9000)]), ...passants(10, 30)]);
  verif(fou.contact.danger <= ref && fou.contact.danger === ref && fou.contact.rencontres === 0 && ote(fou) <= PL.par_compte_cycle + 1e-6,
    `un compte déclare 9 000 prélèvements sans une rencontre : la population n'en a vécu que ${fx(fou.contact.danger, 0)} contacts qui finissent mal (l'activité normale d'un compte : ${ref}), pas 9 000 ; ${fx(ote(fou), 0)} bêtes retirées, comme avant`);
  verif(dix.danger === ref && dix.rencontres === 300 && nuit(dix) < .7 && avant(300, 9000) > .99,
    `face à dix joueurs qui ne font que passer (30 rencontres chacun), ce compte pèse ce que pèse un joueur : la méfiance apprise en une nuit passe de ${fx(avant(300, 9000), 2)} à ${fx(nuit(dix), 2)} ; seul avec une population, il reste tout ce qu'elle connaît des joueurs (${fx(nuit(fou.contact), 2)}, comme d'un chasseur qui prendrait tout ce qu'il croise)`);
  // l'activité se mesure sur tous les contacts, les proportions gardées
  const mixte = C([lot('x', [ev('rencontre', 30), ev('prelevement', 200), ev('nourrissage', 100)])]), coureur = C([lot('x', [ev('rencontre', 600), ev('prelevement', 60), ev('nourrissage', 30)])]);
  const sansRef = C([lot('x', [ev('prelevement', 9000)])], { ...profil, influence: { ...profil.influence, exposition_ref: undefined } });
  verif(mixte.rencontres === 6 && mixte.danger === 40 && mixte.aide === 20 && coureur.rencontres === 60 && coureur.danger === 6 && coureur.aide === 3 && sansRef.danger === Tampon.VECU.activite,
    `l'activité d'un compte se mesure sur tous ses contacts, ses proportions gardées : 30 rencontres, 200 prises et 100 nourrissages en font ${fx(mixte.rencontres, 0)}, ${fx(mixte.danger, 0)} et ${fx(mixte.aide, 0)} ; 600 rencontres et 60 prises, 60 et 6, comme avant ; un profil sans activité de référence prend celle du tampon (${Tampon.VECU.activite})`);
  // sous l'activité normale, rien ne bouge : les régimes du tableau de docs/12 passent tels quels, et donnent les mêmes équilibres
  const regimes = [[60, 0, 0, .92], [60, 1.2, .11, .63], [60, 6, .42, .07], [30, 6, .62, 0]], lus = regimes.map(([R, D]) => { const c = C([lot('a', [ev('rencontre', R), ...(D ? [ev('prelevement', D)] : [])])]); let m = 0, h = 0; for (let k = 0; k < 20; k++) [m, h] = Orvane.apprendre(m, h, c, 0); return { c, m, h }; });
  verif(regimes.every(([R, D, m, h], i) => lus[i].c.rencontres === R && lus[i].c.danger === D && lus[i].c.aide === 0 && Math.abs(lus[i].m - m) < .006 && Math.abs(lus[i].h - h) < .006),
    `sous l'activité normale, rien ne bouge : les quatre régimes du tableau de docs/12 passent le tampon tels quels, et donnent après vingt cycles les mêmes équilibres (méfiance ${lus.map(x => fx(x.m, 2)).join(' · ')} ; habituation ${lus.map(x => fx(x.h, 2)).join(' · ')})`);
  // pas de part par compte (le profil en a une pour les retraits : 15 %) : des comptes égaux ne sont pas rabotés
  const egaux = n => Array.from({ length: n }, (_, i) => lot('e' + i, [ev('rencontre', 60), ev('prelevement', 6)])), six = C(egaux(6)), leger = C([...egaux(5), lot('l', [ev('rencontre', 3)])]);
  verif(PL.part_max_compte > 0 && six.rencontres === 360 && six.danger === 36 && leger.rencontres === 303 && leger.danger === 30,
    `pas de part par compte : six comptes égaux d'un même jeu gardent tout ce que la population a vécu d'eux (${fx(six.rencontres, 0)} rencontres, ${fx(six.danger, 0)} prises) ; cinq et un compte léger aussi (${fx(leger.rencontres, 0)} et ${fx(leger.danger, 0)})`);
  // pas de part par jeu non plus : la méfiance s'apprend d'une proportion, et rogner un grand jeu y grossirait d'autant un petit
  // (docs/12, docs/50 « L'abus » ; outils/parts.js le mesure). Deux jeux inégaux gardent chacun tout ce que la population a vécu d'eux
  const grand = n => Array.from({ length: n }, (_, i) => lot('g' + i, [ev('rencontre', 60), ev('prelevement', 6)], 'jeu-a')), j1 = C([...grand(20), ...passants(1, 60, 'jeu-b')]);
  const mille = C([...Array.from({ length: 1500 }, (_, i) => lot('m' + i, [ev('rencontre', 60)], 'jeu-a')), ...passants(1, 60, 'jeu-b')]);
  verif(PL.part_max_jeu > 0 && j1.rencontres === 1260 && j1.danger === 120 && mille.rencontres === 90060,
    `pas de part par jeu (le profil en a une pour les retraits : ${pc(PL.part_max_jeu)}) : vingt comptes du jeu A (1 200 rencontres, 120 prises) face à un seul du jeu B gardent tout (${fx(j1.rencontres - 60, 0)} et ${fx(j1.danger, 0)}) ; 1 500 comptes d'un jeu face à un compte d'un autre aussi (${fx(mille.rencontres - 60, 0)} rencontres)`);
  // le nom du jeu ne change rien : les mêmes comptes sous un seul jeu, chacun sous un jeu à lui, ou répartis en trois
  const divers = [...grand(7), ...passants(9, 45), lot('x', [ev('prelevement', 9000)]), lot('y', [ev('rencontre', 30), ev('prelevement', 200), ev('nourrissage', 100)]), lot('z', [ev('capture', 7), ev('liberation', 3)])];
  const sous = f => JSON.stringify(C(divers.map((l, i) => ({ ...l, jeu: f(i), source: { ...l.source, jeu: f(i) } })))), unSeul = sous(() => 'jeu-a');
  verif(unSeul === sous(i => 'jeu-' + i) && unSeul === sous(i => 'jeu-' + i % 3) && unSeul === sous(i => i < 16 ? 'jeu-a' : 'jeu-b'),
    `le nom du jeu ne change rien : ${divers.length} comptes de toutes sortes, sous un seul jeu, chacun sous un jeu à lui, répartis en trois, ou les passants d'un côté et les autres de l'autre — le même contact, au caractère près`);
  // … mais la part d'un jeu reste aux retraits : là, rogner un grand jeu ne fait que retirer moins de bêtes
  const deux = agr([...Array.from({ length: 1500 }, (_, i) => lot('r' + i, [ev('rencontre', 60), ev('prelevement', 30)], 'jeu-a')), lot('b', [ev('rencontre', 60), ev('prelevement', 1)], 'jeu-b')]).pressions.taxons.jagra.toundra;
  verif(ote(deux) <= PL.part_max_jeu * pmax * effJ + 1 + 1e-6 && deux.contact.rencontres === 90060 && deux.contact.danger === 45001,
    `la part d'un jeu reste aux retraits : 1 500 comptes du jeu A prennent 30 jagra chacun, un compte du jeu B une seule ; le jeu A n'en ôte que ${fx(ote(deux) - 1, 0)} (sa part), et la population a vécu tous leurs contacts (${fx(deux.contact.rencontres, 0)} rencontres, ${fx(deux.contact.danger, 0)} prises)`);
  // un petit jeu hostile face à un grand jeu paisible : il pèse ses comptes, pas davantage, sous quelque jeu qu'ils s'inscrivent.
  // (Avec une part par jeu, les passants étaient ramenés à 200 rencontres, ou au poids du petit jeu : partJeu)
  const hostiles = (n, jeu) => Array.from({ length: n }, (_, i) => lot('h' + i, [ev('prelevement', 9000)], jeu)), partJeu = n => nuit({ rencontres: Math.max(200, ref * n), danger: ref * n });
  const meme = C([...passants(20, 60, 'jeu-a'), ...hostiles(1, 'jeu-a')]), autre = C([...passants(20, 60, 'jeu-a'), ...hostiles(1, 'jeu-b')]);
  verif(JSON.stringify(meme) === JSON.stringify(autre) && autre.rencontres === 1200 && autre.danger === ref && nuit(autre) < .3 && avant(1200, 9000) > .99 && partJeu(1) > .7,
    `vingt passants d'un jeu, et un compte qui déclare 9 000 prélèvements : du même jeu ou inscrit sous un jeu à lui, le même contact (${fx(autre.rencontres, 0)} rencontres, ${fx(autre.danger, 0)} prises), et la méfiance d'une nuit passe de ${fx(avant(1200, 9000), 2)} à ${fx(nuit(autre), 2)} ; une part par jeu la laissait à ${fx(partJeu(1), 2)} sous un jeu à lui`);
  const cent = n => nuit(C([...passants(100, 60, 'jeu-a'), ...hostiles(n, 'jeu-b')]));
  verif(cent(1) < .1 && cent(4) < .25 && cent(13) < .5 && cent(14) >= .5 && partJeu(1) > .7 && partJeu(4) > .9,
    `le nombre des vrais joueurs protège : face à cent passants (60 rencontres chacun), un compte hostile inscrit sous un jeu à lui fait ${fx(cent(1), 2)} de méfiance en une nuit, quatre ${fx(cent(4), 2)}, et il en faut quatorze pour passer 0,5 (${fx(cent(14), 2)}) ; avec une part par jeu, un seul suffisait (${fx(partJeu(1), 2)} ; ${fx(partJeu(4), 2)} à quatre), aussi nombreux que soient les passants`);
  // … et l'autre sens, ce qu'une part par jeu protégeait : un grand jeu fait la méfiance d'une population qu'un petit jeu montre aussi.
  // Elle protégeait peu : la cible sature vite (1 − e^(−6 × la part des contacts qui finissent mal) : 0,95 dès la moitié)
  const petit = passants(5, 60, 'jeu-b'), chasse = nuit(C([...grand(100), ...petit])), tout = nuit(C([...Array.from({ length: 100 }, (_, i) => lot('t' + i, [ev('prelevement', 60)], 'jeu-a')), ...petit]));
  const chasseAvant = nuit({ rencontres: 300 + 300 * 10 / 11, danger: 300 / 11 }), toutAvant = nuit({ rencontres: 300, danger: 300 });
  verif(chasse > .35 && chasse < .45 && chasseAvant > .2 && chasseAvant < .3 && tout > .99 && toutAvant > .94,
    `un grand jeu face à un petit : cent chasseurs d'un jeu (60 rencontres, 6 prises) et cinq passants d'un autre, la méfiance d'une nuit est celle que font cent chasseurs (${fx(chasse, 2)} ; une part par jeu la tenait à ${fx(chasseAvant, 2)}) ; cent comptes à 60 prélèvements, ${fx(tout, 2)} (une part par jeu : ${fx(toutAvant, 2)} — la cible sature, elle n'y protégeait presque rien)`); }

function pc(x) { return fx(100 * (x || 0), 1) + ' %'; }
console.log(`\n${ok ? 'tout est vérifié' : 'ÉCHEC'} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
process.exit(ok ? 0 : 1);
