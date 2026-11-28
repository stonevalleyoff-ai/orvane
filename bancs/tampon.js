// Orvane — LE BANC DU TAMPON (bancs/tampon.js) : ce qu'un jeu, ou quelqu'un qui s'en fait passer pour un, peut faire au monde
// partagé. L'inscription est libre et le compte d'un joueur se choisit : chaque lot est une donnée, jamais une instruction.
//  1. un lot qui ne se lit pas (null, une liste de travers, __proto__, une exposition mal formée) n'arrête jamais le cycle ;
//  2. des nombres impossibles (1e400, 1e308 deux fois, négatifs, un milliard) sont écartés, et n'effacent pas la chasse des autres ;
//  3. ce qui n'est pas un retrait est plafonné aussi : déplacements, libérations, habitat, milieu ;
//  4. un jeu de 1 500 comptes contre un autre jeu : la part d'un compte, d'un jeu, d'une population ; un petit jeu ne peut pas
//     effacer la chasse d'un grand ;
//  5. les parcelles : une rencontre localisée ne détourne rien, une chasse localisée ne vide pas une parcelle, et ne se perd pas
//     quand la parcelle dite n'a pas la lignée, ou trop peu (ni son contact, quand la lignée n'y est pas) ;
//  6. l'élevage : un allèle inventé (« <img…> ») n'entre pas dans le monde ;
//  7. ce que publie la vue par biome (une infection dans une parcelle sur quatre), ce que les parcelles gardent d'un apport, la Mère
//     d'un monde découpé après son éveil ;
//  8. le jour un : un monde sans lots tourne exactement comme avant ;
//  9. le plafond d'un jeu, même seul (part_max_population_jeu, 5 %) : un jeu qui le baisse, un jeu qui voudrait le relever, ce qu'il
//     rend (qui n'a pas de plafond de jeu), plusieurs jeux, une petite population, et parcelle par parcelle (un jeu ne déplace pas la
//     chasse d'un autre) ;
//  10. les renvois : un lot renvoyé avec le même id n'est compté qu'une fois ;
//  11. les pièges des sections 1 à 5, de nouveau, avec les plafonds du monde d'Orvane tels qu'ils sont.
// (§1 à §8 lisent les lots avec les plafonds d'avant, sans celui d'un jeu, pour vérifier chacun pour lui-même ; §9 à §11, avec ceux
// du monde d'Orvane tels qu'ils sont)
//   node bancs/tampon.js
'use strict';
const fs = require('fs'), path = require('path');
const racine = p => path.join(__dirname, '..', p);
const Orvane = require(racine('moteur/orvane.js')), Tampon = require(racine('tampon/tampon.js')), Parcelles = require(racine('moteur/parcelles.js'));
const lireJ = f => JSON.parse(fs.readFileSync(racine(f), 'utf8'));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const fx = (x, d = 1) => (+x).toLocaleString('fr-FR', { maximumFractionDigits: d }), t0 = Date.now();

const I = lireJ('mondes/orvane/instantane.json'), E = lireJ('mondes/orvane/etat.json'), P0 = lireJ('mondes/orvane/profil.json');
const profilJ = { ...P0, influence: { ...P0.influence, memoire_cycles: 1 } };   // (sans lissage : on lit ce qu'un cycle reçoit, plafonds compris)
const { part_max_population_jeu: PJ, ...plafondsAvant } = P0.influence.plafonds, profil = { ...profilJ, influence: { ...profilJ.influence, plafonds: plafondsAvant } };
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
  verif(ote(M['toundra~2']) <= pmax * e2 + 1e-3, `les 200 chasseurs tous en toundra~2 : la parcelle perd au plus ${pc(pmax)} d'elle-même (${fx(ote(M['toundra~2']), 0)} sur ${fx(e2, 0)}), pas 92 %`);
  const somme = R => Object.values(R || {}).reduce((a, x) => a + ote(x), 0), autres = Object.keys(M).filter(k => k !== 'toundra~2');
  verif(Math.abs(somme(M) - somme(sans)) < 1e-2 && autres.length && autres.every(k => ote(M[k]) <= pmax * effDe('jagra', k, E) + 1e-3),
    `ce que toundra~2 ne peut pas perdre est pris dans les ${autres.length} autres parcelles, chacune sous son plafond : ${fx(somme(M), 0)} jagra en tout, comme sans parcelle (${fx(somme(sans), 0)})`);
  // un jeu montre une lignée là où se tient son joueur, et dit cette parcelle ; Orvane ne l'y a pas mise (le monde publié, au cycle 57 :
  // des lignées qui ne vivent que dans les parcelles nées de la genèse 7, chassées en prairie~2). La chasse ne se perd pas : elle est
  // prise dans les parcelles où la lignée vit, selon leurs effectifs, comme si le jeu n'avait rien dit
  const cand = []; for (const t of E.taxons) { if (t.eteint != null) continue; const g = {};
    for (const p of t.populations) { const b = E.biomes.find(x => x.id === p.biome), ty = b?.type; if (ty && p.effectif > 0) (g[ty] ??= []).push(p); }
    for (const [ty, L] of Object.entries(g)) { const Ps = E.biomes.filter(b => b.type === ty), ici = I.taxons.find(x => x.id === t.id)?.populations.find(p => p.biome === ty);
      if (ici && L.length >= 2 && L.length < Ps.length) cand.push({ tid: t.id, ty, vide: Ps.find(b => !L.some(p => p.biome === b.id)).id, k: L.length, W: L.reduce((a, p) => a + p.effectif, 0) }); } }
  const A = cand.sort((x, y) => y.W - x.W || (x.tid < y.tid ? -1 : 1))[0], versA = I.biomes.find(b => b.id === A.ty)?.voisins?.[0] ?? I.biomes.find(b => b.id !== A.ty).id;
  const lotsA = parcelle => Array.from({ length: 200 }, (_, i) => lot('v' + i, [chasse(A.tid, A.ty, 13.11, parcelle ? { parcelle } : {}), { taxon: A.tid, biome: A.ty, action: 'rencontre', n: 3, ...(parcelle ? { parcelle } : {}) }, ...(i % 4 ? [] : [{ taxon: A.tid, biome: A.ty, action: 'deplacement', vers: versA, n: 2, ...(parcelle ? { parcelle } : {}) }])]));
  const RA = l => Parcelles.repartir(agr(l).pressions, E, Parcelles.localiser(l, E)).taxons[A.tid], VA = RA(lotsA(A.vide)), SA = RA(lotsA(null));
  const dep = R => Object.values(R || {}).reduce((a, x) => a + (x.deplacement || []).reduce((s, d) => s + d.n, 0), 0), nP = Object.keys(SA).length;
  const vit = k => JSON.stringify([VA[k]?.contact, VA[k]?.vecu]) === JSON.stringify([SA[k].contact, SA[k].vecu]);
  verif(ote(VA[A.vide]) === 0 && Math.abs(somme(VA) - somme(SA)) < 1e-3 * nP && Math.abs(dep(VA) - dep(SA)) < 1e-3 * nP && dep(SA) > 0 && Object.keys(SA).every(k => Math.abs(ote(VA[k]) - ote(SA[k])) < 1e-3),
    `200 chasseurs disent avoir pris ${A.tid} en ${A.vide}, où la lignée n'est pas : ses ${A.k} parcelles perdent ${fx(somme(VA), 0)} bêtes, dont ${fx(dep(VA), 0)} déplacées, selon leurs effectifs, comme si le jeu n'avait rien dit (${fx(somme(SA), 0)}) — rien ne se perd`);
  verif(Object.values(SA).every(x => x.contact) && Object.keys(SA).every(vit),
    `et ses ${A.k} parcelles vivent chacune le contact entier de ces chasseurs (${fx(SA[Object.keys(SA)[0]].contact.rencontres, 0)} rencontres${SA[Object.keys(SA)[0]].vecu ? ', et leur vécu' : ''}), comme sans parcelle : la lignée apprend à se méfier de qui la chasse`); }

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

console.log('9. Le plafond d\'un jeu, même seul');
{ const agrJ = (lots, jeux = null, X = I) => Tampon.agreger(lots, X, profilJ, {}, null, jeux), J = r => r.pressions.taxons.jagra?.toundra;
  const chasseurs = (n, jeu = 'stone-valley', o = {}, action = 'prelevement') => Array.from({ length: n }, (_, i) => lot(jeu + ':' + i, [{ taxon: 'jagra', biome: 'toundra', action, n: 13.11, ...o }], jeu));
  const seul = J(agrJ(chasseurs(200))), avant = J(agr(chasseurs(200))), lim = PJ * effJ;
  verif(PJ === .05 && Math.abs(ote(seul) - lim) < 1e-6 && ote(avant) > 3 * lim,
    `un jeu seul, 200 chasseurs qui prennent 2 622 jagra : il en meurt ${fx(ote(seul), 0)}, ${pc(PJ)} des ${fx(effJ, 0)} de la toundra (sans ce plafond, ${fx(ote(avant), 0)} : la règle des parts ne mord pas sous deux jeux)`);
  const expo = x => ({ 'stone-valley': { exposition: { compression: { defaut: 1 }, propagation_cycles: 1, part_max_population_jeu: x } } });
  const bas = J(agrJ(chasseurs(200), expo(.02))), haut = J(agrJ(chasseurs(200), expo(.5))), faux = [-1, 2, 'x', null, 1e400 * 0].map(x => ote(J(agrJ(chasseurs(200), expo(x)))));
  verif(Math.abs(ote(bas) - .02 * effJ) < 1e-6 && Math.abs(ote(haut) - lim) < 1e-6 && faux.every(x => Math.abs(x - lim) < 1e-6) && Tampon.plafondJeu({ part_max_population_jeu: .05 }, { part_max_population_jeu: .3 }) === .05 && Tampon.plafondJeu({}, { part_max_population_jeu: .3 }) === .3,
    `un jeu qui le baisse (2 %, dans son exposition) n'en prend que ${fx(ote(bas), 0)} ; qui voudrait le relever (50 %), ou dit n'importe quoi (−1, 2, « x »), reste à ${fx(ote(haut), 0)}`);
  // ce qu'un jeu rend n'a pas de plafond de jeu : une réintroduction, un jeu qui soigne ne perdent rien (seul part_max_population borne)
  const rend = J(agrJ(chasseurs(200, 'stone-valley', {}, 'liberation'))), elev = J(agrJ(Array.from({ length: 200 }, (_, i) => lot('e' + i, [{ taxon: 'jagra', biome: 'toundra', action: 'liberation', n: 10, genome: { n: 10, alleles: { albinisme: 1 }, a: {} } }]))));
  const lesDeux = J(agrJ([...chasseurs(200), ...chasseurs(200, 'stone-valley', {}, 'liberation').map((l, i) => ({ ...l, source: { ...l.source, compte: 'r' + i } }))]));
  verif(Math.abs(rendu(rend) - 2622) < 1e-6 && Math.abs(elev.apport.n - 2000) < 1e-2 && Math.abs(lesDeux.retrait['*'] - (lim - 2622)) < 1e-6,
    `ce qu'il rend n'a pas de plafond de jeu : 200 joueurs relâchent 2 622 jagra, ${fx(rendu(rend), 0)} arrivent ; 2 000 bêtes d'élevage, ${fx(elev.apport.n, 0)} entrent (au plus ${pc(pmax)} de la population, comme avant) ; un jeu qui en chasse 2 622 et en relâche autant : sa chasse est ramenée à ${fx(lim, 0)}, pas ce qu'il relâche (${fx(-lesDeux.retrait['*'], 0)} bêtes de plus, net)`);
  const deux = J(agrJ([...chasseurs(200, 'jeu-a'), ...chasseurs(200, 'jeu-b')])), dix = J(agrJ(Array.from({ length: 10 }, (_, k) => chasseurs(60, 'jeu-' + k)).flat()));
  verif(Math.abs(ote(deux) - 2 * lim) < 1e-6 && ote(dix) <= pmax * effJ + 1e-6 && ote(dix) > .9 * pmax * effJ,
    `deux jeux qui chassent autant : ${pc(PJ)} chacun (${fx(ote(deux), 0)} en tout) ; dix jeux : ${fx(ote(dix), 0)}, jamais plus que ${pc(pmax)} de la population, tous jeux confondus`);
  const rare = I.taxons.filter(t => !t.eteint).flatMap(t => t.populations.filter(p => p.effectif >= 4 && p.effectif < 20).map(p => [t.id, p.biome, p.effectif])).sort((x, y) => x[2] - y[2] || (x[0] < y[0] ? -1 : 1))[0];
  const une = Tampon.agreger([lot('h1', [chasse(rare[0], rare[1], 1)])], I, profilJ, {}).pressions.taxons[rare[0]]?.[rare[1]];
  verif(Math.abs(ote(une) - PJ * rare[2]) < 1e-6, `une petite population (${rare[0]} en ${rare[1]}, ${fx(rare[2], 0)} bêtes) : un jeu qui en prend une ne lui ôte que ${fx(ote(une), 2)} par cycle`);
  // parcelle par parcelle : le plafond d'un jeu tient aussi là où ses lots disent qu'il chasse
  const ici = chasseurs(200, 'stone-valley', { parcelle: 'toundra~2' }), rI = agrJ(ici), MI = Parcelles.repartir(rI.pressions, E, Parcelles.localiser(ici, E)).taxons.jagra;
  const parts = Object.entries(MI), effP = k => effDe('jagra', k, E), somme = R => Object.values(R).reduce((a, x) => a + ote(x), 0);
  verif(rI.pressions.jeux?.jagra?.toundra?.['stone-valley']?.plafond === PJ && parts.length === 4 && parts.every(([k, x]) => ote(x) <= PJ * effP(k) + 1e-3) && Math.abs(ote(MI['toundra~2']) - PJ * effP('toundra~2')) < 1e-3 && Math.abs(somme(MI) - lim) < 1e-2,
    `les 200 chasseurs d'un jeu seul, tous en toundra~2 : elle perd ${pc(PJ)} d'elle-même (${fx(ote(MI['toundra~2']), 0)} sur ${fx(effP('toundra~2'), 0)}), le reste est pris aux autres parcelles, chacune sous ${pc(PJ)} : ${fx(somme(MI), 0)} en tout, rien ne se perd`);
  const A = Array.from({ length: 50 }, (_, i) => lot('a' + i, [chasse('jagra', 'toundra', 5, { parcelle: 'toundra~2' })], 'jeu-a')), B = Array.from({ length: 50 }, (_, i) => lot('b' + i, [chasse('jagra', 'toundra', 5)], 'jeu-b'));
  const rAB = agrJ([...A, ...B]), loc = Parcelles.localiser([...A, ...B], E), MAB = Parcelles.repartir(rAB.pressions, E, loc).taxons.jagra, { jeux: _j, ...sansJeux } = rAB.pressions, Mvieux = Parcelles.repartir(sansJeux, E, loc).taxons.jagra;
  const W = parts.reduce((a, [k]) => a + effP(k), 0), partB = 250 * effP('toundra~2') / W;
  verif(Math.abs(ote(MAB['toundra~2']) - (PJ * effP('toundra~2') + partB)) < 1e-2 && Math.abs(somme(MAB) - 500) < 1e-2 && ote(Mvieux['toundra~2']) > ote(MAB['toundra~2']) + 50,
    `deux jeux, 250 jagra chacun ; A dit toundra~2, B ne dit rien : toundra~2 perd ${fx(ote(MAB['toundra~2']), 0)} (${pc(PJ)} d'elle-même venus de A, et la part de B selon les effectifs) — la chasse de B ne suit plus celle de A (avant : ${fx(ote(Mvieux['toundra~2']), 0)})`);
  const sansPlafond = agr(ici).pressions, MS = Parcelles.repartir(sansPlafond, E, Parcelles.localiser(ici, E)).taxons.jagra;
  verif(!sansPlafond.jeux && Math.abs(ote(MS['toundra~2']) - pmax * effP('toundra~2')) < 1e-3, `un monde qui ne dit pas de plafond par jeu : les pressions n'en portent pas, et se partagent comme avant (toundra~2 perd ${pc(pmax)} d'elle-même)`); }

console.log('10. Les renvois');
{ const L = { ...lot('r1', [chasse('jagra', 'toundra', 7), { taxon: 'jagra', biome: 'toundra', action: 'rencontre', n: 20 }]), id: '6f1c2a90d3b84e7f' }, sansId = lot('r2', [chasse('jagra', 'toundra', 7)]);
  const un = Tampon.agreger([L], I, profilJ, {}), deux = Tampon.agreger([L, { ...L }, JSON.parse(JSON.stringify(L))], I, profilJ, {});
  verif(JSON.stringify(deux.pressions) === JSON.stringify(un.pressions) && deux.doublons === 2 && !un.doublons, `un lot renvoyé deux fois avec le même id (${L.id}) n'est compté qu'une fois : les mêmes pressions qu'un seul, et deux doublons écartés`);
  const ailleurs = Tampon.agreger([L, { ...L, jeu: 'autre-jeu', source: { jeu: 'autre-jeu', compte: 'r1' } }], I, profilJ, {}), deuxSans = Tampon.agreger([sansId, { ...sansId }], I, profilJ, {});
  verif(Math.abs(ote(ailleurs.pressions.taxons.jagra.toundra) - 14) < 1e-6 && !ailleurs.doublons && Math.abs(ote(deuxSans.pressions.taxons.jagra.toundra) - 14) < 1e-6,
    'le même id venu d\'un autre jeu est un autre lot ; deux lots sans id comptent deux fois, comme avant');
  const P = l => ({ ...l, evenements: l.evenements.map(e => ({ ...e, parcelle: 'toundra~2' })) }), l1 = Parcelles.localiser([P(L)], E), l2 = Parcelles.localiser([P(L), P(L)], E);
  verif(JSON.stringify(l1) === JSON.stringify(l2), 'les parcelles non plus ne le comptent pas deux fois (localiser)'); }

console.log('11. Les mêmes pièges, avec les plafonds du monde d\'Orvane');
{ const agrJ = (lots, jeux = null, X = I) => Tampon.agreger(lots, X, profilJ, {}, null, jeux), lim = PJ * effJ;
  const pires = [null, 'x', [], { monde: 'orvane', evenements: [null] }, lot('a', [null, 7, { action: 'prelevement' }]), lot('c', [{ taxon: '__proto__', biome: 'maladie', action: 'prelevement', n: 1 }, { taxon: 'jagra', biome: '__proto__', action: 'prelevement', n: 1 }]),
    lot('e', [{ taxon: 'jagra', biome: 'toundra', action: 'prelevement', n: 3, phenotype: 'nanisme' }], 'malin'), { ...lot('__proto__', [chasse('jagra', 'toundra', 1)]), jeu: '__proto__', id: '__proto__' }];
  let r0 = null, err = null; try { r0 = agrJ(pires, { malin: { exposition: { part_max_population_jeu: 'x', compression: 'x' } } }); const loc = Parcelles.localiser(pires, E); Parcelles.repartir(r0.pressions, E, loc); } catch (e) { err = e; }
  verif(!err && r0 && Object.getOwnPropertyNames(Object.prototype).join() === proto0 && ({}).toundra === undefined, `les lots piégés, un plafond de jeu qui n'est pas un nombre : rien ne plante, rien ne touche Object.prototype${err ? ' — ' + err.message : ''}`);
  const a = agrJ([lot('h', [chasse('jagra', 'toundra', 5)]), lot('x', [chasse('jagra', 'toundra', JSON.parse('{"n":1e400}').n)])]);
  verif(fini(a) && Math.abs(ote(a.pressions.taxons.jagra.toundra) - 5) < 1e-6, 'n = 1e400 est écarté, la chasse honnête (5) reste 5');
  const N = 1500, dep = agrJ(Array.from({ length: N }, (_, i) => lot('d' + i, [{ taxon: 'jagra', biome: 'toundra', action: 'deplacement', vers: 'banquise', n: 1e4 }]))).pressions.taxons.jagra.toundra;
  const lib = agrJ(Array.from({ length: N }, (_, i) => lot('l' + i, [{ taxon: 'jagra', biome: 'toundra', action: 'liberation', n: 1e4 }]))).pressions.taxons.jagra.toundra;
  const cap = I.biomes.find(b => b.id === 'prairie').capacite, hab = agrJ(Array.from({ length: N }, (_, i) => lot('b' + i, [{ biome: 'prairie', action: 'habitat_perdu', n: 1e4 }]))).pressions.biomes.prairie;
  verif(Math.abs(ote(dep) - lim) < 1e-6 && rendu(lib) <= pmax * effJ + 1e-6 && rendu(lib) > lim && Math.abs(hab.habitat) <= .02 * cap + 1e-6,
    `${N} comptes d'un jeu : ils emportent ${fx(ote(dep), 0)} jagra (${pc(PJ)}), en relâchent ${fx(rendu(lib), 0)} (${pc(pmax)}, sans plafond de jeu), ôtent ${fx(-hab.habitat, 0)} de capacité à la prairie (2 %)`);
  const grand = Array.from({ length: N }, (_, i) => lot('g' + i, [chasse('jagra', 'toundra', 30)], 'jeu-a')), petit = lot('p', [chasse('jagra', 'toundra', 1)], 'jeu-b');
  const deux = agrJ([...grand, petit]).pressions.taxons.jagra.toundra, honnete = agrJ([lot('a1', [chasse('jagra', 'toundra', 25)], 'jeu-a'), lot('a2', [chasse('jagra', 'toundra', 25)], 'jeu-a'), petit]).pressions.taxons.jagra.toundra;
  verif(Math.abs(ote(deux) - (lim + 1)) < 1e-6 && Math.abs(ote(honnete) - 51) < 1e-6, `un jeu de ${N} comptes face à un petit : ${fx(ote(deux), 0)} jagra (${pc(PJ)} du grand, la bête du petit) ; deux joueurs et un : rien n'est rogné (51)`);
  const tous = Array.from({ length: 200 }, (_, i) => lot('t' + i, [chasse('jagra', 'toundra', 13.11, { parcelle: 'toundra~2' })])), M = Parcelles.repartir(agrJ(tous).pressions, E, Parcelles.localiser(tous, E)).taxons.jagra;
  const somme = Object.values(M).reduce((x, y) => x + ote(y), 0);
  verif(ote(M['toundra~2']) <= PJ * effDe('jagra', 'toundra~2', E) + 1e-3 && Math.abs(somme - lim) < 1e-2, `200 chasseurs tous en toundra~2 : elle perd ${fx(ote(M['toundra~2']), 0)} bêtes (${pc(PJ)} d'elle-même), ${fx(somme, 0)} en tout`); }

function pc(x) { return fx(100 * (x || 0), 1) + ' %'; }
console.log(`\n${ok ? 'tout est vérifié' : 'ÉCHEC'} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
process.exit(ok ? 0 : 1);
