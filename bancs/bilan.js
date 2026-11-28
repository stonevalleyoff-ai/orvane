// Orvane — LE BANC DU BILAN DE SAISON (bancs/bilan.js, docs/4) : ce que chaque jeu a ôté et rendu à chaque population, saison par
// saison. Sur un petit monde (la mer d'Orvane, mondes/marin/, découpée en parcelles, en plein hiver), deux jeux : l'un honnête, l'autre
// qui demande plus que son plafond (5 % d'une population par cycle), et des lots sans jeu.
//  1. le tampon le dit sans rien changer : les pressions, la mémoire du tampon, le monde sont les mêmes avec ou sans le bilan ;
//  2. les comptes, cycle par cycle, recomptés à part : la somme des jeux est la pression donnée au moteur, chaque jeu y a sa part
//     (pressions.jeux), et les bêtes que le moteur retire, parcelle par parcelle, sont celles que le bilan dit appliquées ;
//  3. la saison : celle que nomme le moteur ; finie, elle sort du cumul, ses sommes sont celles de ses cycles ;
//  4. les plafonds : aucun jeu n'ôte plus de 5 % d'une population en un cycle ; ce qui est raboté apparaît, plafond par plafond ;
//     l'honnête n'est raboté de rien ; ce qui est rendu n'a pas le plafond d'un jeu ;
//  5. un jeu suspendu garde ce qu'il a fait et son nom ; le bilan publié suit son schéma, ses comptes tiennent, et ne porte aucun
//     compte ni aucun pseudonyme ; deux fois les mêmes lots, deux fois le même bilan ;
//  6. le lissage n'ôte rien : sur la durée, la pression lissée rejoint ce que le bilan a compté ;
//  7. le cycle de nuit (hebergement/cycle.js) : un rattrapage qui franchit une fin de saison, un bilan fini qui ne change plus, la
//     saison en cours, l'index, une saison sans jeu, une renaissance ; la publication reprend bilans/ comme ce que le cycle écrit.
//   node bancs/bilan.js
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const racine = p => path.join(__dirname, '..', p);
const Orvane = require(racine('moteur/orvane.js')), Tampon = require(racine('tampon/tampon.js')), Parcelles = require(racine('moteur/parcelles.js'));
const Bilan = require(racine('tampon/bilan.js')), { verifier } = require(racine('outils/verifier.js')), Publication = require(racine('hebergement/publication.js'));
const lireJ = f => JSON.parse(fs.readFileSync(racine(f), 'utf8')), clone = o => JSON.parse(JSON.stringify(o));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const fx = (x, d = 1) => (+x).toLocaleString('fr-FR', { maximumFractionDigits: d }), pc = x => fx(100 * (x || 0), 2) + ' %', t0 = Date.now();
const N = Bilan.ETAPES.length, AP = N - 1;   // (le dernier rang : appliqué)

// --- le monde : la mer d'Orvane, en deux parcelles par biome, au cycle 1200 (le plein hiver de l'an 10) ---
const NE = '2026-11-01T00:00:00.000Z';
let E0 = clone(lireJ('mondes/marin/amorce.json')); E0.monde.id = 'banc-bilan'; E0.monde.ne = NE; E0 = Parcelles.decouper(E0, { par: 2 });
const P0 = lireJ('mondes/orvane/profil.json'), profilDe = mem => ({ orvane: '1.0', monde: { id: 'banc-bilan', annee: 120 }, influence: { ...clone(P0.influence), memoire_cycles: mem } });
const PL = P0.influence.plafonds, PJ = PL.part_max_population_jeu;
const JEUX = [{ id: 'honnete', nom: 'Le jeu honnête', actif: true, exposition: {} }];   // (« vorace » n'est pas dans jeux.json : il n'a pas de nom public)
// les lots d'un cycle : l'honnête (dix joueurs, sous tous les plafonds), le vorace (quarante joueurs, et quelques comptes qui forcent),
// un lot sans jeu ; k : le rang du cycle (l'honnête est suspendu au septième : ses lots cessent, il n'est plus dans jeux.json)
const COMPTES = [];
const lot = (jeu, compte, id, ev) => { COMPTES.push(compte); return { orvane: '1.0', monde: 'banc-bilan', id, ...(jeu ? { jeu } : {}), source: { ...(jeu ? { jeu } : {}), compte }, evenements: ev }; };
function lotsDe(k) {
  const L = [];
  if (k < 7) for (let a = 0; a < 10; a++) L.push(lot('honnete', `h:hon-${a}`, `hon-${k}-${a}`, [
    { taxon: 'orou', biome: 'lac', action: 'rencontre', n: 40 }, { taxon: 'orou', biome: 'lac', action: 'prelevement', n: 20, age: 'adulte', ...(a < 3 ? { parcelle: 'lac~1' } : {}) },
    { taxon: 'sotorki', biome: 'cote', action: 'nourrissage', n: 25 }, ...(a === 0 ? [{ taxon: 'sotorki', biome: 'cote', action: 'liberation', n: 4, genome: { alleles: {}, a: {} } }] : []),
    ...(a === 1 ? [{ taxon: 'elmu', biome: 'lac', action: 'deplacement', vers: 'riviere', n: 6 }] : [])]));
  for (let a = 0; a < 40; a++) L.push(lot('vorace', `h:vor-${a}`, `vor-${k}-${a}`, [
    { taxon: 'orou', biome: 'lac', action: 'prelevement', n: 25 },
    { taxon: 'elsil', biome: 'recif', action: 'rencontre', n: a === 0 ? 200 : 30 }, { taxon: 'elsil', biome: 'recif', action: 'prelevement', n: 25 },
    { taxon: 'umeor', biome: 'large', action: 'liberation', n: 10 },
    ...(a === 1 ? [{ taxon: 'belnou', biome: 'marais', action: 'prelevement', n: 50 }] : [])]));
  L.push(L[L.length - 1]);                                                         // (un lot renvoyé : compté une fois)
  L.push(lot(null, 'h:main', `main-${k}`, [{ taxon: 'firvi', biome: 'cote', action: 'prelevement', n: 3 }]));   // (un lot sans jeu, déposé à la main)
  return L;
}
const oteDe = O => Object.values(O?.retrait || {}).reduce((a, x) => a + Math.max(0, x), 0) + (O?.deplacement || []).reduce((a, d) => a + d.n, 0);
const renduDe = O => Object.values(O?.retrait || {}).reduce((a, x) => a + Math.max(0, -x), 0) + (O?.apport?.n || 0);
const typeDe = id => String(id).split(Parcelles.SEP)[0];

// --- la chaîne d'un cycle de nuit, en mémoire : le tampon (avec ou sans le bilan), les parcelles, le moteur ; et le bilan cumulé ---
function jouer(nCycles, { mem = 1, avecBilan = true, lots = lotsDe } = {}) {
  let E = clone(E0), te = {}, cumul = null; const finies = [], cycles = [];
  for (let k = 1; k <= nCycles; k++) {
    const L = lots(k), V = Parcelles.regrouper(E), r = Tampon.agreger(L, V, profilDe(mem), te, null, Object.fromEntries((k < 7 ? JEUX : []).map(j => [j.id, j])), avecBilan ? { bilan: true } : {});
    const pr = Parcelles.repartir(r.pressions, E, Parcelles.localiser(L, E)), morts = {};
    const S = Orvane.cycle(E, pr, { duree_ms: 864e5, trace: x => { if (x.mortsExt > 0) { const b = typeDe(x.biome); ((morts[x.taxon] ??= {})[b] = (morts[x.taxon][b] || 0) + x.mortsExt); } } });
    if (avecBilan) { const rb = Bilan.noter(cumul, { orvane: Orvane.CONTRAT, monde: { id: E.monde.id, ne: E.monde.ne }, n: S.cycle.n, date: S.cycle.date, annee: E.monde.annee, bilan: r.bilan,
      jeux: k < 7 ? JEUX : [], noms: Object.fromEntries(V.taxons.map(t => [t.id, t.nom])), plafonds: PL, memoire_cycles: mem }); cumul = rb.cumul; finies.push(...rb.finies); }
    cycles.push({ n: S.cycle.n, saison: S.cycle.saison?.nom, r, pr, morts, V }); te = r.etat; E = S;
  }
  return { E, te, cumul, finies, cycles };
}

console.log('1. Le bilan ne change rien');
const A = jouer(20), B = jouer(20, { avecBilan: false });
verif(A.cycles.every((c, i) => JSON.stringify(c.r.pressions) === JSON.stringify(B.cycles[i].r.pressions) && JSON.stringify(c.r.etat) === JSON.stringify(B.cycles[i].r.etat)) && JSON.stringify(A.E) === JSON.stringify(B.E),
  `20 cycles, avec et sans le bilan : les mêmes pressions, la même mémoire du tampon, le même monde, au caractère près`);
verif(!B.cycles.some(c => 'bilan' in c.r) && A.cycles.every(c => c.r.bilan), 'sans la demande (7ᵉ argument), le tampon ne rend pas de bilan');

console.log('\n2. Les comptes de chaque cycle, recomptés à part');
let ecartP = 0, ecartJ = 0, ecartM = 0, nP = 0, nM = 0;
for (const c of A.cycles) {
  const T = c.r.pressions.taxons, pops = new Set(); for (const j in c.r.bilan) for (const t in c.r.bilan[j].taxons) for (const b in c.r.bilan[j].taxons[t]) pops.add(t + '|' + b);
  for (const k of pops) { const [t, b] = k.split('|'), parJ = Object.entries(c.r.bilan).filter(([, x]) => x.taxons[t]?.[b]).map(([j, x]) => [j, x.taxons[t][b]]);
    const so = parJ.reduce((s, [, x]) => s + x.ote[AP], 0), sr = parJ.reduce((s, [, x]) => s + x.rendu[AP], 0); nP++;
    ecartP = Math.max(ecartP, Math.abs(so - oteDe(T[t]?.[b])), Math.abs(sr - renduDe(T[t]?.[b])));
    // la part de chaque jeu dans ce qui est ôté, que le tampon publie pour les parcelles (pressions.jeux)
    const PJx = c.r.pressions.jeux?.[t]?.[b]; if (PJx && so > 0) for (const [j, x] of parJ) ecartJ = Math.max(ecartJ, Math.abs(x.ote[AP] - (PJx[j]?.part || 0) * oteDe(T[t][b])));
    // ce que le moteur a retiré, parcelle par parcelle (sa trace) : là où rien n'est déplacé
    if (!(T[t]?.[b]?.deplacement || []).length && so > 0) { nM++; ecartM = Math.max(ecartM, Math.abs(so - (c.morts[t]?.[b] || 0))); } } }
verif(ecartP < 2e-3, `${nP} populations × cycles : la somme des jeux est la pression donnée au moteur, ôté et rendu (écart au plus ${fx(ecartP, 4)} bête, l'arrondi du tampon)`);
verif(ecartJ < 2e-3, `chaque jeu y a la part que le tampon donne aux parcelles (pressions.jeux ; écart au plus ${fx(ecartJ, 4)})`);
verif(nM > 0 && ecartM < 5e-3, `${nM} fois, les bêtes que le moteur a retirées, parcelle par parcelle, sont celles que le bilan dit appliquées (écart au plus ${fx(ecartM, 4)})`);
const c1 = A.cycles[0].r.bilan, h1 = c1.honnete.taxons.orou.lac, v1 = c1.vorace.taxons;
verif(Math.abs(h1.ote[0] - 10 * 20 * 1.2) < 1e-9 && h1.ote.every(x => Math.abs(x - h1.ote[0]) < 1e-9), `l'honnête demande 240 orou (dix joueurs, 20 adultes chacun, un adulte compte 1,2) et les obtient, étape après étape`);
verif(Math.abs(v1.belnou.marais.ote[0] - 50) < 1e-9 && Math.abs(v1.belnou.marais.ote[2] - PL.par_compte_cycle) < 1e-9, `un compte vorace demande 50 belnou : le plafond par compte en laisse ${PL.par_compte_cycle}`);

console.log('\n3. La saison');
// (sur le petit monde de l'exemple, deux années entières : une année de 120 cycles, une de 30, dont les saisons ne tombent pas juste)
const nomsDe = annee => { let X = clone(lireJ('schemas/exemples/instantane.json')), bon = true; X.monde.annee = annee; X.cycle = { ...X.cycle, n: 0 };
  for (let k = 0; k < 2 * annee + 5; k++) { X = Orvane.cycle(X, {}, { duree_ms: 0 }); bon = bon && Bilan.saison(X.cycle.n, annee).nom === X.cycle.saison?.nom; } return bon; };
verif(A.cycles.every(c => Bilan.saison(c.n, 120).nom === c.saison) && nomsDe(120) && nomsDe(30), 'la saison du bilan est celle que nomme le moteur (cycle.saison.nom), cycle après cycle, sur deux années de 120 cycles et de 30');
const Sh = Bilan.saison(1214, 120), Sp = Bilan.saison(1215, 120), Sz = Bilan.saison(105, 120), Sx = Bilan.saison(95, 0);
verif(Sh.id === 'an-10-hiver' && Sh.de === 1185 && Sh.a === 1214 && Sp.id === 'an-10-printemps' && Sp.de === 1215 && Sp.a === 1244 && Sz.id === 'an-1-hiver' && Sz.de === 105 && Sz.a === 134 && Sx.id === 'tranche-3' && Sx.de === 90 && Sx.a === 119,
  `quatre saisons de 30 cycles ; l'hiver ouvre l'année (an-1-hiver : cycles 105 à 134) ; un monde sans année, des tranches de 30 (tranche-3 : 90 à 119)`);
verif(A.finies.length === 1 && A.finies[0].saison.id === 'an-10-hiver' && A.finies[0].compte.de === 1201 && A.finies[0].compte.a === 1214 && A.finies[0].compte.cycles === 14 && A.cumul.saison.id === 'an-10-printemps' && A.cumul.compte.de === 1215 && A.cumul.compte.cycles === 6,
  `du cycle 1201 au 1220 : l'hiver de l'an 10 s'achève au 1214, fini (14 cycles comptés : le bilan a commencé en cours de saison), le printemps est en cours (6 cycles)`);
const Bh = Bilan.publier(A.finies[0], false), Bp = Bilan.publier(A.cumul, true);
let ecartS = 0; const enHiver = A.cycles.filter(c => c.n <= 1214);
for (const j of Bh.jeux) for (const x of j.lignees) for (const [cote, cl] of [['ote', 'ote'], ['rendu', 'rendu']]) {
  const s = enHiver.reduce((a, c) => a + (c.r.bilan[j.id]?.taxons[x.taxon]?.[x.biome]?.[cl][AP] || 0), 0); ecartS = Math.max(ecartS, Math.abs(s - x[cote].applique)); }
verif(ecartS < 1e-3, `l'hiver fini : ce qui est appliqué, lignée par lignée, est la somme de ses cycles (au millième)`);
const tot = (Bx, j) => Bx.jeux.find(x => x.id === j);
verif(Math.abs(tot(Bh, 'honnete').ote.applique - 6 * (240 + 6)) < 1e-3 && tot(Bh, 'honnete').lots === 60 && tot(Bh, 'vorace').lots === 14 * 40 && tot(Bh, '').lots === 14,
  `l'honnête : ${fx(tot(Bh, 'honnete').ote.applique, 3)} bêtes ôtées en six cycles (240 orou et 6 elmu déplacés par cycle) ; les lots comptés (le renvoi une fois) : ${tot(Bh, 'honnete').lots}, ${tot(Bh, 'vorace').lots}, et ${tot(Bh, '').lots} sans jeu`);

console.log('\n4. Les plafonds');
const tous = [Bh, Bp].flatMap(Bx => Bx.jeux.flatMap(j => j.lignees.map(x => ({ j, x }))));
const pmc = Math.max(...tous.map(({ x }) => x.ote.part_max_cycle)), Er = tous.find(({ j, x }) => j.id === 'vorace' && x.taxon === 'elsil' && x.biome === 'recif').x;
verif(pmc <= PJ + 1e-6 && tous.every(({ j }) => j.id === '' || j.plafond === PJ), `aucun jeu n'ôte en un cycle plus que son plafond (${pc(PJ)}) : au plus ${pc(pmc)}`);
verif(Math.abs(Er.ote.part_max_cycle - PJ) < 1e-6 && Er.ote.rabote.plafond_jeu > 0 && Er.ote.rabote.activite > 0 && Er.ote.demande > 1.5 * Er.ote.applique,
  `le vorace demande ${fx(Er.ote.demande, 0)} elsil au récif, en obtient ${fx(Er.ote.applique, 0)} (${pc(Er.ote.part_max_cycle)} au plus en un cycle) : raboté de ${fx(Er.ote.rabote.plafond_jeu, 0)} par son plafond, de ${fx(Er.ote.rabote.activite, 1)} par l'activité d'un compte`);
const Bm = Bh.jeux.find(j => j.id === 'vorace').lignees.find(x => x.taxon === 'belnou'), Um = Bh.jeux.find(j => j.id === 'vorace').lignees.find(x => x.taxon === 'umeor');
verif(Bm.ote.rabote.compte > 0 && Um.rendu.rabote.population > 0 && !Um.rendu.rabote.plafond_jeu && Um.rendu.part > PJ,
  `le plafond par compte (${fx(Bm.ote.rabote.compte, 0)} belnou) ; ce qu'il rend n'a pas le plafond d'un jeu, seulement celui d'une population : ${fx(Um.rendu.applique, 0)} umeor relâchés (${pc(Um.rendu.part)} de leur effectif), raboté de ${fx(Um.rendu.rabote.population, 0)}`);
const Hon = Bh.jeux.find(j => j.id === 'honnete');
verif(Hon.lignees.every(x => !Object.keys(x.ote.rabote).length && !Object.keys(x.rendu.rabote).length) && Math.abs(Hon.lignees.find(x => x.taxon === 'sotorki').rendu.applique - 6 * (10 * 25 * .2 + 4)) < 1e-2,
  `l'honnête n'est raboté de rien : ${fx(Hon.ote.applique, 0)} ôtées, ${fx(Hon.rendu.applique, 1)} rendues (nourrissages et bêtes d'élevage)`);
verif(Bh.jeux.find(j => j.id === 'vorace').lignees[0].ote.part >= Bh.jeux.find(j => j.id === 'vorace').lignees.at(-1).ote.part, 'chaque jeu, ses lignées par part de l\'effectif ôtée, la plus forte d\'abord');

console.log('\n5. Le bilan publié');
verif(Hon.nom === 'Le jeu honnête' && Hon.cycles === 6 && !Bp.jeux.some(j => j.id === 'honnete') && Bh.jeux.find(j => j.id === 'vorace').nom === null,
  `l'honnête, suspendu au septième cycle, garde ce qu'il a fait et son nom ; le vorace, absent de jeux.json, n'a pas de nom public`);
const eh = verifier(Bh, 'bilan'), ep = verifier(Bp, 'bilan'), ei = verifier(Bilan.indexer([{ bilan: Bh, fichier: 'an-10-hiver.json' }], Bp), 'bilans');
verif(!eh.length && !ep.length && !ei.length, `le bilan fini, celui en cours et l'index suivent leur schéma, et leurs comptes tiennent (outils/verifier.js)${[...eh, ...ep, ...ei].slice(0, 3).map(e => ' — ' + e).join('')}`);
const casse = clone(Bh); casse.jeux[0].lignees[0].ote.applique += 5; casse.jeux[1].lignees[0].ote.part_max_cycle = .2;
verif(verifier(casse, 'bilan').length >= 2, 'un bilan dont les comptes ne tiennent pas est refusé');
const texte = JSON.stringify([Bh, Bp, A.cumul, A.cycles.map(c => c.r.bilan)]), vus = [...new Set(COMPTES)].filter(c => texte.includes(c));
verif(!vus.length && !/"h:/.test(texte) && !/"(comptes|source|zone)"/.test(texte), `aucun des ${new Set(COMPTES).size} pseudonymes, aucun compte, dans le bilan ni dans son cumul${vus.length ? ' — ' + vus.slice(0, 3).join(', ') : ''}`);
const A2 = jouer(20);
verif(JSON.stringify(Bilan.publier(A2.finies[0])) === JSON.stringify(Bh) && JSON.stringify(A2.cumul) === JSON.stringify(A.cumul), 'deux fois les mêmes lots : deux fois le même bilan, au caractère près');
const vide = Bilan.noter(null, { monde: { id: 'x', ne: NE }, n: 5, annee: 120, bilan: {} }).cumul;
verif(Bilan.publier(vide, true).jeux.length === 0 && !verifier(Bilan.publier(vide, true), 'bilan').length, 'un cycle sans aucun jeu : un bilan vide, au contrat');

console.log('\n6. Le lissage n\'ôte rien');
{ const V = Parcelles.regrouper(E0), P5 = profilDe(5); let te = {}, cumul = null; const lisse = {}, saisons = [];
  for (let k = 1; k <= 60; k++) { const L = k <= 10 ? lotsDe(1) : [], r = Tampon.agreger(L, V, P5, te, null, null, { bilan: true }); te = r.etat;
    const rb = Bilan.noter(cumul, { monde: { id: 'x', ne: NE }, n: k, annee: 0, bilan: r.bilan }); cumul = rb.cumul; saisons.push(...rb.finies);
    for (const [t, Bs] of Object.entries(r.pressions.taxons)) for (const [b, O] of Object.entries(Bs)) lisse[t + '|' + b] = (lisse[t + '|' + b] || 0) + oteDe(O); }
  let ecart = 0, total = 0; const parPop = {};
  for (const C of [...saisons, cumul]) for (const J of Object.values(C.jeux)) for (const [t, Bs] of Object.entries(J.taxons)) for (const [b, P] of Object.entries(Bs)) { parPop[t + '|' + b] = (parPop[t + '|' + b] || 0) + P.o[AP]; total += P.o[AP]; }
  for (const k of new Set([...Object.keys(parPop), ...Object.keys(lisse)])) ecart = Math.max(ecart, Math.abs((parPop[k] || 0) - (lisse[k] || 0)));
  verif(ecart < .1, `dix cycles de chasse, lissés sur ${P5.influence.memoire_cycles} cycles, puis cinquante sans : la pression lissée totale rejoint ce que le bilan a compté (${fx(total, 0)} bêtes ; écart au plus ${fx(ecart, 3)} par population)`); }

console.log('\n7. Le cycle de nuit');
const nom = '.banc-bilan', dossier = racine('mondes/' + nom), f = n => path.join(dossier, n), lire = n => JSON.parse(fs.readFileSync(f(n), 'utf8'));
const cycleJs = (n, date) => execFileSync('node', [racine('hebergement/cycle.js'), nom, '--sans-reseau', '--cycles', String(n), '--maintenant', date], { encoding: 'utf8' });
const deposer = (k, quoi) => { fs.mkdirSync(f('lots'), { recursive: true }); lotsDe(k).filter(quoi).forEach((l, i) => fs.writeFileSync(f(`lots/${k}-${String(i).padStart(3, '0')}.json`), JSON.stringify(l))); };
try {
  fs.rmSync(dossier, { recursive: true, force: true }); fs.mkdirSync(dossier, { recursive: true });
  const E1212 = clone(E0); E1212.cycle = { ...E1212.cycle, n: 1212, date: '2026-11-10T03:00:00.000Z' };
  fs.writeFileSync(f('etat.json'), JSON.stringify(E1212)); fs.writeFileSync(f('profil.json'), JSON.stringify({ ...profilDe(5), monde: { id: 'banc-bilan', annee: 120, cycle: '24h' } }));
  fs.writeFileSync(f('jeux.json'), JSON.stringify(JEUX)); fs.writeFileSync(f('tampon.json'), JSON.stringify({ lisse: {}, dernier_id: 0 }));
  deposer(1, () => true);
  const s1 = cycleJs(4, '2026-11-14T03:05:00Z');   // (un rattrapage de quatre cycles, 1213 à 1216 : l'hiver s'achève au 1214)
  const H1 = fs.readFileSync(f('bilans/an-10-hiver.json'), 'utf8'), Bh1 = JSON.parse(H1), C1 = lire('bilans/en-cours.json'), I1 = lire('bilans/index.json'), T1 = lire('tampon.json');
  verif(/bilan de saison : hiver de l'an 10/.test(s1) && !Bh1.en_cours && Bh1.compte.de === 1213 && Bh1.compte.a === 1214 && C1.en_cours && C1.saison.id === 'an-10-printemps' && C1.compte.de === 1215 && C1.compte.a === 1216,
    'un rattrapage de quatre cycles franchit la fin de l\'hiver : son bilan est écrit, fini (cycles 1213 et 1214), le printemps est en cours (1215 et 1216)');
  verif(Bh1.jeux.map(j => j.id).join() === 'honnete,vorace,' && C1.jeux.length === 0 && T1.bilan?.saison?.id === 'an-10-printemps' && !verifier(Bh1, 'bilan').length && !verifier(C1, 'bilan').length,
    `les lots, lus au premier cycle, sont dans l'hiver (deux jeux et des lots sans jeu) ; le printemps n'a encore aucun jeu ; le cumul est gardé dans tampon.json ; tout suit le schéma`);
  verif(I1.saisons.length === 1 && I1.saisons[0].fichier === 'an-10-hiver.json' && I1.en_cours?.fichier === 'en-cours.json' && I1.monde.ne === NE && !verifier(I1, 'bilans').length, 'l\'index : la saison finie, la saison en cours');
  deposer(2, l => l.jeu === 'vorace');
  cycleJs(1, '2026-11-15T03:05:00Z');
  const C2 = lire('bilans/en-cours.json');
  verif(fs.readFileSync(f('bilans/an-10-hiver.json'), 'utf8') === H1 && C2.compte.cycles === 3 && C2.jeux.map(j => j.id).join() === 'vorace' && C2.jeux[0].lots === 40,
    'le cycle suivant : le bilan de l\'hiver ne change plus, au caractère près ; le printemps compte un cycle de plus, et un seul jeu');
  // une renaissance : le même dossier, un monde né à nouveau (un autre monde.ne), le vieux cumul encore dans tampon.json
  const E2 = clone(E0); E2.cycle = { ...E2.cycle, n: 30, date: '2026-11-15T03:00:00.000Z' }; E2.monde.ne = '2026-11-15T00:00:00.000Z';
  fs.writeFileSync(f('etat.json'), JSON.stringify(E2)); deposer(3, l => l.jeu === 'honnete');
  cycleJs(1, '2026-11-16T03:05:00Z');
  const I3 = lire('bilans/index.json'), C3 = lire('bilans/en-cours.json');
  verif(!fs.existsSync(f('bilans/an-10-hiver.json')) && I3.saisons.length === 0 && I3.monde.ne === E2.monde.ne && C3.compte.de === 31 && C3.compte.cycles === 1 && C3.saison.id === 'an-0-printemps' && C3.jeux.map(j => j.id).join() === 'honnete',
    'une renaissance : les bilans de l\'autre monde s\'en vont, le cumul repart (au cycle 31, le printemps de l\'an 0)');
  // la publication (hebergement/publication.js) : bilans/ vient de la publication, comme ce que le cycle écrit
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orvane-bilan-')), pub = path.join(tmp, 'pub'), ici = path.join(tmp, 'ici');
  try { fs.cpSync(dossier, pub, { recursive: true }); fs.mkdirSync(path.join(ici, 'bilans'), { recursive: true });
    fs.copyFileSync(f('profil.json'), path.join(ici, 'profil.json')); fs.writeFileSync(path.join(ici, 'bilans', 'vieux.json'), '{}');
    Publication.reprendreMonde(pub, ici);
    verif(fs.readFileSync(path.join(ici, 'bilans', 'en-cours.json'), 'utf8') === fs.readFileSync(f('bilans/en-cours.json'), 'utf8') && !fs.existsSync(path.join(ici, 'bilans', 'vieux.json')),
      'la publication reprend bilans/ comme ce que le cycle écrit : celui de la branche publication remplace celui de main'); }
  finally { fs.rmSync(tmp, { recursive: true, force: true }); }
} catch (e) { verif(false, `le cycle de nuit : ${e.message.split('\n').slice(0, 3).join(' ')}`); }
finally { fs.rmSync(dossier, { recursive: true, force: true }); }

console.log('\n8. L\'Observatoire (vue Bilans, monde/bilans.js)');
{ const html = fs.readFileSync(racine('monde/index.html'), 'utf8');
  verif(/<script src="bilans\.js"><\/script>/.test(html) && /data-v="bilans"/.test(html) && /bilans: typeof vueBilans === 'function'/.test(html) && /<script src="sante\.js"><\/script>\s*<script>/.test(html),
    'monde/index.html charge monde/bilans.js, et la vue Bilans est dans sa navigation');
  globalThis.ESC = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const { htmlBilan } = require(racine('monde/bilans.js')), X = clone(Bh); X.jeux[0].nom = '<img src=x onerror=alert(1)>';
  const H = htmlBilan(X, Bilan.indexer([{ bilan: Bh, fichier: 'an-10-hiver.json' }], Bp), {}, 'an-10-hiver.json'), V = X.jeux.find(j => j.id === 'vorace');
  const lignes = (H.split('vorace')[1] || '').split('<tr').slice(2).map(r => (/<td>([^<]*)<\/td>/.exec(r) || [])[1]);
  verif(!H.includes('<img') && H.includes('&lt;img') && H.includes("L'hiver de l'an 10") && H.includes('le plafond du jeu') && H.includes('class="rabote"'),
    'elle montre le bilan : chaque jeu (un nom qui vient d\'un jeu est échappé), ce qui est raboté, et par quel plafond');
  verif(lignes.slice(0, V.lignees.length).join() === V.lignees.map(x => x.nom || x.taxon).join(), 'chaque tableau, les lignées par part de l\'effectif ôtée');
  verif(/\.\.\/mondes\/\$\{encodeURIComponent\(id\)\}\/bilans\/index\.json/.test(fs.readFileSync(racine('monde/bilans.js'), 'utf8')), 'elle lit mondes/<monde>/bilans/index.json'); }

console.log(`\n${ok ? 'tout est vérifié' : 'ÉCHEC'} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
process.exit(ok ? 0 : 1);
