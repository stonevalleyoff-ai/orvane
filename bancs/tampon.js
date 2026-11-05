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
//  8. le jour un : un monde sans lots tourne exactement comme avant.
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

function pc(x) { return fx(100 * (x || 0), 1) + ' %'; }
console.log(`\n${ok ? 'tout est vérifié' : 'ÉCHEC'} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
process.exit(ok ? 0 : 1);
