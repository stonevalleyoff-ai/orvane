// Orvane — LE BANC DU PROTOCOLE (bancs/protocole.js) — docs/59
//  1. le protocole tient (etalon/protocole.json, outils/protocole.js) : son empreinte est celle de sa dernière version, son historique
//     se suit, chaque test a sa nature et ses seuils, aucune validation ne s'appuie sur une donnée qui a réglé le moteur ;
//  2. le moratoire : les règles du moteur sont celles que le protocole a gelées ;
//  3. l'étalon et le protocole se répondent : chaque test du protocole est écrit par l'étalon et chaque test de l'étalon est au protocole ;
//     les bornes du calage sont celles de l'assemblage ; les données d'Isle Royale disent les mêmes seuils que lui ;
//  4. le verrou mord : un seuil changé sans nouvelle version, une règle ajoutée, une validation qui cite une donnée de calage, un test qui
//     a guidé sans dire quoi : refusés ; une nouvelle version en règle : acceptée ; l'étalon refuse de juger avec un protocole qui ne tient
//     pas.
//   node bancs/protocole.js
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), { spawnSync } = require('child_process');
const racine = p => path.join(__dirname, '..', p);
const Protocole = require(racine('outils/protocole.js')), Orvane = require(racine('moteur/orvane.js'));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const clone = o => JSON.parse(JSON.stringify(o)), t0 = Date.now();
const P = Protocole.lire(), REGLES = Object.keys(Orvane.REGLES);

console.log('1. Le protocole tient');
const pb = Protocole.verifier(P, { regles: REGLES });
for (const x of pb) console.log('     ' + x);
verif(!pb.length, `la version ${P.version} du ${P.date} : son empreinte (${String(P.empreinte).slice(0, 12)}…), son historique, la nature et les seuils de ses ${Object.keys(P.tests).length} tests, ses données`);
const N = {}; for (const t of Object.values(P.tests)) N[t.nature] = (N[t.nature] || 0) + 1;
verif(Object.keys(N).every(n => Protocole.NATURES.includes(n)), `chaque test dit ce qu'il prouve : ${Protocole.NATURES.filter(n => N[n]).map(n => `${N[n]} ${n}`).join(', ')}`);

console.log('\n2. Le moratoire');
verif(REGLES.length === P.regles_gelees.regles.length && REGLES.every(k => P.regles_gelees.regles.includes(k)), `les ${REGLES.length} règles du moteur sont celles que le protocole a gelées le ${P.regles_gelees.depuis}`);

console.log("\n3. L'étalon et le protocole se répondent");
const src = fs.readFileSync(racine('outils/etalon.js'), 'utf8');
const ecrits = new Set([...src.matchAll(/\bid: '([a-z0-9-]+)'/g)].map(m => m[1])), lus = new Set([...src.matchAll(/\bSE\('([a-z0-9-]+)'\)/g)].map(m => m[1]));
const absents = Object.keys(P.tests).filter(id => !ecrits.has(id) && !lus.has(id)), inconnus = [...ecrits].filter(id => !P.tests[id]);
verif(!absents.length, `chaque test du protocole est écrit par l'étalon${absents.length ? ` (manquent : ${absents.join(', ')})` : ''}`);
verif(!inconnus.length, `chaque test de l'étalon est au protocole${inconnus.length ? ` (inconnus : ${inconnus.join(', ')})` : ''}`);
verif(!/note\([^)]*,\s*\d/.test(src) && !/<=\s*(1995|2000|2008)\b/.test(src) && !/fac\([^)]*\)\s*<=\s*\d/.test(src), "l'étalon n'a plus de seuil écrit en dur : il les lit au protocole (SE)");
const A = fs.readFileSync(racine('outils/terre/assembler.js'), 'utf8').match(/efficacite: \[([\d.]+), ([\d.]+)\]/), bornes = P.tests['calage-adresse'].seuils.bornes;
verif(A && +A[1] === bornes[0] && +A[2] === bornes[1], `les bornes de l'adresse sont celles de l'assemblage (×${bornes[0]} et ×${bornes[1]})`);
const IR = JSON.parse(fs.readFileSync(racine('mondes/amerique/isle-royale.json'), 'utf8')), Sp = P.tests['ir-predation'].seuils, Sk = P.tests['ir-kill'].seuils;
verif(IR.predation.de === Sp.de && IR.predation.a === Sp.a && IR.kill.moyenne === Sk.cible, "les données d'Isle Royale disent les mêmes seuils que le protocole (6 à 13 %, 0,7 orignal par loup et par mois)");

console.log('\n4. Le verrou mord');
const raisons = Q => Protocole.verifier(Q, { regles: REGLES });
{ const Q = clone(P); Q.tests.stabilite.seuils.part = .8; verif(raisons(Q).some(x => /sans nouvelle version/.test(x)), 'un seuil changé sans nouvelle version (la stabilité à 80 %) : refusé'); }
verif(raisons(P).length === 0 && Protocole.verifier(P, { regles: [...REGLES, 'regle_nouvelle'] }).some(x => /moratoire/.test(x)), 'une règle ajoutée au moteur pendant le moratoire : refusée');
const enRegle = Q => { Q.version = P.version + 1; Q.date = '2099-01-01'; Q.empreinte = Protocole.empreinte(Q); Q.historique = [...Q.historique, { version: Q.version, date: Q.date, empreinte: Q.empreinte, pourquoi: 'un essai' }]; return Q; };
{ const Q = clone(P); Q.tests.chasse.nature = 'validation'; enRegle(Q); verif(raisons(Q).some(x => /se dit une validation/.test(x)), 'une validation qui cite une donnée de calage (la chasse, ses tableaux) : refusée, même en règle'); }
{ const Q = clone(P); delete Q.tests['grands-carnivores'].historique; enRegle(Q); verif(raisons(Q).some(x => /historique doit dire/.test(x)), 'un test qui a guidé des corrections sans dire lesquelles : refusé'); }
{ const Q = clone(P); Q.tests.stabilite.seuils.part = .8; enRegle(Q); verif(raisons(Q).length === 0, 'le même seuil, avec une nouvelle version datée et sa raison : accepté'); }
{ const Q = clone(P); Q.historique = Q.historique.map(v => ({ ...v, pourquoi: '' })); verif(raisons(Q).some(x => /ne dit pas pourquoi/.test(x)), 'une version qui ne dit pas pourquoi : refusée'); }
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'protocole-'));
try {
  const Q = clone(P); Q.tests['ir-loups'].seuils.facteur = 3; const f = path.join(tmp, 'protocole.json'); fs.writeFileSync(f, JSON.stringify(Q));
  const r = spawnSync(process.execPath, [racine('outils/etalon.js'), '--experience', 'isle-royale'], { env: { ...process.env, ORVANE_PROTOCOLE: f }, encoding: 'utf8' });
  verif(r.status === 3 && /le protocole ne tient pas/.test(r.stderr), "l'étalon refuse de juger avec un protocole changé sans nouvelle version (code 3), avant de faire tourner quoi que ce soit");
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }

console.log(`\n${ok ? 'le protocole tient' : 'LE PROTOCOLE NE TIENT PAS'} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
process.exit(ok ? 0 : 1);
