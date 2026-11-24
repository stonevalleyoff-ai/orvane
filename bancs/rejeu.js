// Orvane — LE BANC DU REJEU (bancs/rejeu.js) — docs/59
//  1. le moteur au bit près : un même état, les mêmes pressions et la même durée donnent le même monde, deux fois dans ce processus et
//     dans un autre ; une autre graine en donne un autre ;
//  2. le journal (hebergement/journal.js) : une ligne par cycle, la dernière écrite l'emporte, les 400 dernières gardées ; un monde né à
//     nouveau recommence le sien ; des pressions trop grosses ne gardent que leur empreinte ; les règles ont la même empreinte dans
//     n'importe quel ordre ;
//  3. le cycle hébergé (hebergement/cycle.js) écrit son journal, et un cycle se rejoue au bit près depuis l'état d'avant
//     (outils/rejouer.js) ; un état touché, ou d'autres pressions, ne passent pas ;
//  4. la référence (outils/reference.js) : ce qu'est un monde, mesuré, et son cycle suivant rejoué dans deux processus ;
//  5. le contexte explicite : deux mondes entrelacés, chacun le même que seul ; le cycle ne touche à rien de global.
//   node bancs/rejeu.js [--court]      (sans --court : aussi le monde d'Orvane, d'un processus à l'autre)
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const racine = p => path.join(__dirname, '..', p);
const Orvane = require(racine('moteur/orvane.js')), Tampon = require(racine('tampon/tampon.js')), Parcelles = require(racine('moteur/parcelles.js'));
const Journal = require(racine('hebergement/journal.js')), { rejouer } = require(racine('outils/rejouer.js'));
const lireJ = f => JSON.parse(fs.readFileSync(racine(f), 'utf8')), clone = o => JSON.parse(JSON.stringify(o));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const COURT = process.argv.includes('--court'), t0 = Date.now(), h = o => Journal.empreinte(o).slice(0, 12);

// --- un petit monde : la mer d'Orvane, au cycle 1200 ; un jeu honnête qui y chasse ---
const NE = '2026-11-01T00:00:00.000Z', JOUR = 864e5;
const E0 = clone(lireJ('mondes/marin/amorce.json')); E0.monde.id = '.banc-rejeu'; E0.monde.ne = NE; E0.cycle = { ...E0.cycle, n: 1200, date: '2026-11-10T03:00:00.000Z' };
const P0 = lireJ('mondes/orvane/profil.json'), PROFIL = { orvane: '1.0', monde: { id: '.banc-rejeu', annee: 120, cycle: '24h' }, influence: clone(P0.influence) };
const JEUX = [{ id: 'honnete', nom: 'Le jeu honnête', actif: true, exposition: {} }];
const LOTS = Array.from({ length: 5 }, (_, a) => ({ orvane: '1.0', monde: '.banc-rejeu', id: `hon-${a}`, jeu: 'honnete', source: { jeu: 'honnete', compte: `h:hon-${a}` },
  evenements: [{ taxon: 'orou', biome: 'lac', action: 'rencontre', n: 40 }, { taxon: 'orou', biome: 'lac', action: 'prelevement', n: 20, age: 'adulte' }] }));
const pressionsDe = E => { const r = Tampon.agreger(LOTS, Parcelles.regrouper(E), PROFIL, {}, null, Object.fromEntries(JEUX.map(j => [j.id, j])), {});
  return Parcelles.repartir(r.pressions, E, Parcelles.localiser(LOTS, E)); };
// un cycle dans un autre processus : l'empreinte de ce qu'il rend
const ailleurs = (fEtat, fPressions) => execFileSync(process.execPath, ['-e', `const fs=require('fs'),O=require(${JSON.stringify(racine('moteur/orvane.js'))}),J=require(${JSON.stringify(racine('hebergement/journal.js'))});
  const E=JSON.parse(fs.readFileSync(process.argv[1],'utf8')),P=process.argv[2]?JSON.parse(fs.readFileSync(process.argv[2],'utf8')):{};process.stdout.write(J.empreinte(O.cycle(E,P,{duree_ms:${JOUR}})));`, fEtat, fPressions || ''], { encoding: 'utf8', maxBuffer: 1 << 26 });

console.log('1. Le moteur au bit près');
const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'rejeu-'));
try {
  const P = pressionsDe(E0), fE = path.join(tmp, 'etat.json'), fP = path.join(tmp, 'pressions.json');
  fs.writeFileSync(fE, JSON.stringify(E0)); fs.writeFileSync(fP, JSON.stringify(P));
  verif(P.nombre > 0, `les pressions du jeu honnête : ${P.nombre} événement(s) après le tampon`);
  const a1 = Journal.empreinte(Orvane.cycle(clone(E0), clone(P), { duree_ms: JOUR })), a2 = Journal.empreinte(Orvane.cycle(clone(E0), clone(P), { duree_ms: JOUR }));
  verif(a1 === a2, `deux fois le même cycle, dans ce processus : le même monde (${a1.slice(0, 12)}…)`);
  const b = ailleurs(fE, fP); verif(b === a1, `le même cycle dans un autre processus : le même monde (${b.slice(0, 12)}…)`);
  const sans = Journal.empreinte(Orvane.cycle(clone(E0), {}, { duree_ms: JOUR }));
  verif(sans !== a1 && ailleurs(fE) === sans, 'sans les pressions, un autre monde, le même dans les deux processus');
  const E2 = clone(E0); E2.monde.graine = (E0.monde.graine + 1) >>> 0;
  verif(Journal.empreinte(Orvane.cycle(E2, clone(P), { duree_ms: JOUR })) !== a1, 'une autre graine : un autre monde (l\'empreinte voit le hasard)');
  if (!COURT) {   // le monde d'Orvane, tel que main le garde : d'un processus à l'autre
    const fO = racine('mondes/orvane/etat.json'), o1 = Journal.empreinte(Orvane.cycle(lireJ('mondes/orvane/etat.json'), {}, { duree_ms: JOUR })), o2 = ailleurs(fO);
    verif(o1 === o2, `le monde d'Orvane (cycle ${lireJ('mondes/orvane/etat.json').cycle.n}), dans ce processus et dans un autre : le même (${o1.slice(0, 12)}…)`);
  }
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }

console.log('\n2. Le journal');
{ const L = Journal.avant({ etat: E0, pressions: { nombre: 0 }, duree_ms: JOUR, code: { commit: 'abc', modifie: true } });
  verif(L.n === 1201 && L.ne === NE && L.moteur === 'abc' && L.modifie === true && L.graine === E0.monde.graine && L.avant === Journal.empreinte(E0) && L.duree_ms === JOUR,
    'une ligne dit le cycle, le monde (sa naissance), le commit et s\'il était modifié, la graine, l\'état reçu et la durée');
  const R1 = { a: 1, b: { c: 2, d: [1, { e: 3, f: 4 }] } }, R2 = { b: { d: [1, { f: 4, e: 3 }], c: 2 }, a: 1 };
  verif(Journal.stable(R1) === Journal.stable(R2) && Journal.stable(R1) !== Journal.stable({ ...R1, a: 2 }), 'les règles ont la même empreinte dans n\'importe quel ordre, une autre si une valeur change');
  const gros = { taxons: { x: 'y'.repeat(Journal.PRESSIONS_MAX) } }, G = Journal.avant({ etat: E0, pressions: gros, duree_ms: JOUR });
  verif(G.pressions === null && G.pressions_empreinte === Journal.empreinte(JSON.stringify(gros)), 'des pressions trop grosses : seule leur empreinte est gardée');
  const ligne = (n, ne = NE) => ({ n, ne, apres: String(n) });
  let J = Journal.noter([], ligne(3), ligne(1), ligne(2)); J = Journal.noter(J, { ...ligne(2), apres: 'bis' });
  verif(J.map(x => x.n).join() === '1,2,3' && J[1].apres === 'bis', 'une ligne par cycle, dans l\'ordre ; la dernière écrite l\'emporte');
  const long = Journal.noter([], ...Array.from({ length: Journal.GARDER + 50 }, (_, i) => ligne(i)));
  verif(long.length === Journal.GARDER && long[0].n === 50, `le journal garde les ${Journal.GARDER} derniers cycles`);
  verif(Journal.noter(J, ligne(1, '2026-12-01T00:00:00.000Z')).map(x => x.n).join() === '1', 'un monde né à nouveau recommence son journal');
  const C = Journal.moteur(racine('.')); verif((C.commit === null || /^[0-9a-f]{40}$/.test(C.commit)) && (C.modifie === null || typeof C.modifie === 'boolean'), `le code qui tourne : ${C.commit ? C.commit.slice(0, 12) + '…' : 'hors git'}`); }

console.log('\n3. Le cycle hébergé, puis rejoué');
const nom = '.banc-rejeu', dossier = racine('mondes/' + nom), f = n => path.join(dossier, n), lire = n => JSON.parse(fs.readFileSync(f(n), 'utf8'));
const cycleJs = n => execFileSync(process.execPath, [racine('hebergement/cycle.js'), nom, '--sans-reseau', '--cycles', String(n), '--maintenant', '2026-11-11T03:05:00Z'], { encoding: 'utf8' });
try {
  fs.rmSync(dossier, { recursive: true, force: true }); fs.mkdirSync(dossier, { recursive: true });
  fs.writeFileSync(f('etat.json'), JSON.stringify(E0)); fs.writeFileSync(f('profil.json'), JSON.stringify(PROFIL));
  fs.writeFileSync(f('jeux.json'), JSON.stringify(JEUX)); fs.writeFileSync(f('tampon.json'), JSON.stringify({ lisse: {}, dernier_id: 0 }));
  cycleJs(1); const J1 = lire('journal.json'), E1 = lire('etat.json');
  verif(J1.length === 1 && J1[0].n === 1201 && J1[0].avant === Journal.empreinte(E0) && J1[0].date === E1.cycle.date && J1[0].regles === Journal.empreinte(Journal.stable(E1.monde.regles ?? {})),
    'un cycle hébergé laisse sa ligne : le cycle 1201, l\'état reçu, sa date, l\'empreinte des règles');
  fs.mkdirSync(f('lots'), { recursive: true }); LOTS.forEach((l, i) => fs.writeFileSync(f(`lots/${i}.json`), JSON.stringify(l)));
  cycleJs(1); const J2 = lire('journal.json'), L2 = J2[J2.length - 1];
  verif(J2.length === 2 && L2.n === 1202 && L2.pressions?.nombre > 0 && L2.avant === Journal.empreinte(E1), `le cycle suivant, avec les lots du jeu honnête : ${L2.pressions?.nombre} événement(s) au journal, et il part de l'état sauvé`);
  const r = rejouer(clone(E1), L2, Orvane);
  verif(r.etat === 'identique', `rejoué depuis l'état d'avant : le même monde, au bit près (${String(r.apres).slice(0, 12)}…)`);
  const touche = clone(E1); touche.taxons[0].populations[0].effectif += 1;
  verif(rejouer(touche, L2, Orvane).etat === 'impossible', 'un état touché (une bête de plus) : ce n\'est pas celui que le moteur a reçu');
  verif(rejouer(clone(E1), { ...L2, pressions: {} }, Orvane).etat === 'different', 'd\'autres pressions : un autre monde');
  const sortie = (() => { try { return { code: 0, out: execFileSync(process.execPath, [racine('outils/rejouer.js'), f('etat-avant.json'), f('journal.json')], { encoding: 'utf8' }) }; } catch (e) { return { code: e.status, out: String(e.stdout) }; } });
  fs.writeFileSync(f('etat-avant.json'), JSON.stringify(E1)); const s = sortie();
  verif(s.code === 0 && /rejoué au bit près/.test(s.out), 'outils/rejouer.js trouve la ligne qui part de cet état, et la rejoue (code 0)');
  cycleJs(2); const J3 = lire('journal.json');
  verif(J3.map(x => x.n).join() === '1201,1202,1203,1204', 'un rattrapage de deux cycles : deux lignes de plus');
  const E4 = lire('etat.json'); E4.monde.ne = '2026-12-01T00:00:00.000Z'; fs.writeFileSync(f('etat.json'), JSON.stringify(E4)); cycleJs(1);
  verif(lire('journal.json').map(x => x.n).join() === '1205', 'un monde né à nouveau (un autre monde.ne) : son journal recommence');
} finally { fs.rmSync(dossier, { recursive: true, force: true }); }

console.log('\n4. La référence (outils/reference.js)');
{ const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'reference-')), D = path.join(tmp, 'mondes', 'mer');
  try {
    fs.mkdirSync(D, { recursive: true }); fs.writeFileSync(path.join(D, 'etat.json'), JSON.stringify(E0)); fs.writeFileSync(path.join(D, 'profil.json'), JSON.stringify(PROFIL));
    const H = [E0, Orvane.cycle(clone(E0), {}, { duree_ms: JOUR })].map(I => ({ cycle: I.cycle, taxons: I.taxons.map(t => ({ id: t.id, eteint: t.eteint, populations: t.populations.map(p => ({ biome: p.biome, effectif: p.effectif })) })) }));
    fs.writeFileSync(path.join(D, 'historique.json'), JSON.stringify(H));
    const fR = path.join(tmp, 'reference.json'), fN = path.join(tmp, 'notes.md');
    execFileSync(process.execPath, [racine('outils/reference.js'), tmp, '--sortie', fR, '--notes', fN], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const R = JSON.parse(fs.readFileSync(fR, 'utf8')), M = R.mondes.mer, vivantes = E0.taxons.filter(t => !t.eteint && t.plan?.regime !== 'vegetal' && t.populations.some(p => p.effectif > 0)).length;
    verif(M.cycle === 1200 && M.empreinte === Journal.empreinte(E0) && M.taille.lignees_vivantes === vivantes && M.diversite.shannon > 0 && M.stabilite?.lignees > 0,
      `un monde mesuré : son identité, sa taille (${M.taille.lignees_vivantes} lignées animales), sa diversité (Shannon ${M.diversite.shannon}), sa stabilité sur son historique`);
    verif(M.cycle_suivant?.rejeu === 'identique' && M.cycle_suivant.empreinte === Journal.empreinte(Orvane.cycle(clone(E0), {}, { duree_ms: JOUR })),
      `le cycle suivant, deux fois dans deux processus : le même, et le même qu'ici (${M.cycle_suivant?.duree_s} s, ${M.cycle_suivant?.memoire_mo} Mo)`);
    verif(/\| mer \| 1200 \|/.test(fs.readFileSync(fN, 'utf8')), 'ses notes, en un tableau (celles des archives)');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); } }

console.log('\n5. Le contexte explicite (moteur/orvane.js, contexte)');
{ // deux mondes que tout distingue : la mer d'Orvane, et la même au jour, avec un axe à elle (la magie) et la meute de l'Europe
  const B0 = clone(E0); B0.monde.temps = { jours: 1 }; B0.monde.regles = { ...(B0.monde.regles || {}), meute_proie: 2.5 };
  B0.catalogue = { ...(B0.catalogue || {}), monde: { ...(B0.catalogue?.monde || {}), axes: { magie: { nom: 'magie' } } } }; B0.biomes.forEach((b, i) => { b.axes = { ...b.axes, magie: (i % 4) / 3 }; });
  const R0 = JSON.stringify(Orvane.REGLES), seul = X0 => { let X = clone(X0); return [0, 1].map(() => Journal.empreinte(X = Orvane.cycle(X, {}, { duree_ms: JOUR }))); };
  const hA = seul(E0), hB = seul(B0); let A = clone(E0), B = clone(B0); const entre = [];
  for (let k = 0; k < 2; k++) { A = Orvane.cycle(A, {}, { duree_ms: JOUR }); B = Orvane.cycle(B, {}, { duree_ms: JOUR }); entre.push(Journal.empreinte(A), Journal.empreinte(B)); }
  verif(entre.join() === [hA[0], hB[0], hA[1], hB[1]].join() && hA[0] !== hB[0], 'deux mondes aux règles, au pas et aux axes différents, entrelacés : chacun le même que seul');
  verif(JSON.stringify(Orvane.REGLES) === R0, 'les règles du moteur sortent des cycles telles qu\'elles y sont entrées : le cycle ne touche à rien de global');
  const C = Orvane.contexte(B0);
  const sep = B0.monde.regles.separation || {}, D = Orvane.REGLES.separation;
  verif(C.PAS === 1 / 120 && C.JOURS === 1 && C.AX.includes('magie') && C.R.meute_proie === 2.5 && Orvane.REGLES.meute_proie === 1.5 && C.R.hivernage === Orvane.REGLES.hivernage
    && Object.keys(D).every(k => C.R.separation[k] === (k in sep ? sep[k] : D[k])) && D !== C.R.separation,
    'le contexte d\'un monde : son pas (1/120), ses axes, ses règles par-dessus celles du moteur (une règle-objet complétée d\'un niveau), qui ne changent pas');
  const p = { natalite: 2, masse_kg: 1 };
  verif(Orvane.croissance(p) !== Orvane.croissance(p, C) && Orvane.croissance(p, C) === 2 / 365.25, 'hors d\'un cycle, une fonction du moteur prend le contexte qu\'on lui donne (la croissance d\'un monde au jour), sinon celui du moteur');
}

console.log(`\n${ok ? 'le rejeu tient' : 'LE REJEU NE TIENT PAS'} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
process.exit(ok ? 0 : 1);
