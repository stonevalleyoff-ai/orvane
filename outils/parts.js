// Orvane — LA PART D'UN JEU, MESURÉE (outils/parts.js) — docs/50 (« L'abus »), docs/12
// Ce que les bêtes apprennent des joueurs (la mémoire, la méfiance) dépend de PROPORTIONS : la part des contacts qui finissent
// mal, la part des assauts où un joueur tombe. Rogner un grand jeu, comme on le fait pour les retraits, y grossit donc d'autant
// un petit jeu ; et les jeux s'inscrivent librement, comme les comptes. Ce script mesure les deux sens de la menace, sous
// chaque règle qu'on pouvait choisir, et dit laquelle le tampon applique :
//   A. une poignée de comptes hostiles face à des joueurs qui ne font que passer, inscrits sous le même jeu ou sous un jeu à eux ;
//   B. un grand jeu face à un petit jeu de vrais joueurs : ce qu'une part par jeu protégeait.
// Les règles comparées (après l'activité normale de chaque compte, que toutes gardent) :
//   « plancher 200 »   la part d'un jeu (part_max_jeu), un jeu gardant toujours 200 contacts : la règle d'avant ;
//   « 60 × √comptes »  la même, le plancher suivant la racine du nombre de comptes du jeu ;
//   « 30 × comptes »   la même, un jeu gardant toujours la moitié de l'activité normale de ses comptes ;
//   « sans part »      pas de part par jeu : chaque compte pèse ce qu'il a vécu, au plus une activité normale.
// Le monde : mondes/sv-1/etat.json, la mémoire éveillée ; l'influence du monde d'Orvane (exposition_ref 60, part_max_jeu 0,5) ;
// la population traqueur / prairie. Le chemin : Tampon.agreger, puis Orvane.cycle. Une règle candidate se refait ici à partir de
// ce que le tampon retient de chaque compte pris seul (aucune part ne joue alors) : les retraits, eux, restent ceux du tampon.
//   node outils/parts.js              tout (une minute et demie)
//   node outils/parts.js --court      les seuils de la traque cherchés jusqu'à 16 comptes seulement, sans les jeux de mille comptes
// Sortie : 0 ; 1 si le tampon n'applique aucune des règles mesurées (le script ne sait plus ce qu'il compare).
'use strict';
const fs = require('fs'), path = require('path');
const racine = p => path.join(__dirname, '..', p), lireJ = f => JSON.parse(fs.readFileSync(racine(f), 'utf8'));
const Orvane = require(racine('moteur/orvane.js')), M = require(racine('moteur/memoire.js')), Tampon = require(racine('tampon/tampon.js'));
const COURT = process.argv.includes('--court'), t0 = Date.now();
const W0 = M.eveiller(lireJ('mondes/sv-1/etat.json')).inst, profil = { ...lireJ('mondes/sv-1/profil.json'), influence: lireJ('mondes/orvane/profil.json').influence };
const I = profil.influence, NORMALE = I.exposition_ref, PART = I.plafonds.part_max_jeu, t = 'traqueur', b = 'prairie';
const fx = (x, d = 2) => (+x).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
const pop = X => X.taxons.find(x => x.id === t).populations.find(p => p.biome === b);

// --- les joueurs : un lot par compte et par nuit ---
const lot = (compte, jeu, ev) => ({ orvane: '1.0', monde: W0.monde.id, instantane: 0, source: { jeu, compte }, evenements: ev.map(([action, n]) => ({ taxon: t, biome: b, action, n })) });
const comptes = (n, jeu, nom, ev) => Array.from({ length: n }, (_, i) => lot(nom + i, jeu, ev));
const QUI = {
  passant30: [['rencontre', 30]], passant60: [['rencontre', 60]],
  tombeur: [['joueur_tombe', 500], ['pillage', 500]],                                          // un faux compte : le plus de joueurs tombés possible
  braconnier: [['prelevement', 60]],                                                           // 60 prélèvements sans une rencontre : une activité normale, toute hostile
  chasseur: [['rencontre', 60], ['prelevement', 6]],                                           // un vrai chasseur : le régime à 0,42 de docs/12
  defenseur: [['rencontre', 20], ['prelevement', .3], ['blessure', 2], ['attaque', 2]],        // un vrai joueur qui se défend (bancs/memoire.js)
  proie: [['rencontre', 30], ['attaque', 8], ['joueur_tombe', 2]]                              // un vrai joueur qui se laisse prendre
};

// --- les règles : jeu → { w : ses contacts, n : ses comptes } → jeu → le facteur que la règle lui applique ---
const REGLES = { plancher: { nom: 'plancher 200', sol: () => 200 }, racine: { nom: '60 × √comptes', sol: n => Math.max(200, NORMALE * Math.sqrt(n)) },
  moitie: { nom: '30 × comptes', sol: n => Math.max(200, NORMALE * n / 2) }, sans: { nom: 'sans part', sol: null } }, NOMS = Object.keys(REGLES);
function facteurs(J, sol) {
  const f = {}; for (const j in J) f[j] = 1; if (!sol) return f;
  const brut = Tampon.plafondPart(Object.entries(J).map(([j, x]) => [j, x.w]), PART, 0); let c = Infinity;   // c : le plafond de la règle des parts, avant tout plancher
  for (const j in J) if (brut[j] < 1) c = Math.min(c, brut[j] * J[j].w);
  for (const j in J) { const cap = Math.max(c, sol(J[j].n)); if (J[j].w > cap) f[j] = cap / J[j].w; }
  return f;
}
// ce que le tampon retient d'un compte pris seul : son vécu (docs/50) et son contact (docs/12), ramenés à une activité normale
const SEUL = new Map(), CLES = ['rencontres', 'prises', 'blessures', 'dispositif', 'effarouchements', 'nourrissages', 'pillages', 'attaques', 'tombes'];
const seul = l => { const k = JSON.stringify(l.evenements); if (!SEUL.has(k)) { const O = Tampon.agreger([l], W0, profil).pressions.taxons[t]?.[b] || {}; SEUL.set(k, { v: O.vecu || null, c: O.contact || null }); } return SEUL.get(k); };
const poidsV = v => Math.max(v.rencontres, v.prises + v.blessures + v.effarouchements + v.nourrissages + v.pillages + v.attaques + v.tombes), poidsC = c => Math.max(c.rencontres, c.danger + c.aide);
// le vécu et le contact de la population sous une règle
function selon(lots, regle) {
  const L = lots.map(l => ({ jeu: l.source.jeu, ...seul(l) })), somme = (cles, de, poids) => { const J = {};
    for (const x of L) if (de(x)) { const j = J[x.jeu] ??= { w: 0, n: 0 }; j.w += poids(de(x)); j.n++; }
    const f = facteurs(J, REGLES[regle].sol), K = Object.fromEntries(cles.map(k => [k, 0])); let n = 0;
    for (const x of L) if (de(x)) { n++; for (const k of cles) K[k] += de(x)[k] * f[x.jeu]; }
    for (const k of cles) K[k] = +K[k].toFixed(2); return n ? K : null; };
  return { vecu: somme(CLES, x => x.v, poidsV), contact: somme(['rencontres', 'danger', 'aide'], x => x.c, poidsC) };
}
// n nuits : le tampon, puis le moteur. regle : null, le tampon tel qu'il est ; sinon son vécu et son contact sont remplacés par
// ceux de la règle (les retraits et tout le reste viennent du tampon). Ni le vécu ni le contact ne dépendent de l'état du monde :
// deux règles qui retiennent la même chose des mêmes lots font le même monde, et ne se jouent qu'une fois
const VUS = new Map(), cleLots = lots => lots.map(l => l.source.jeu + ':' + JSON.stringify(l.evenements)).join(';');
const duTampon = lots => { const O = Tampon.agreger(lots, W0, profil).pressions.taxons[t]?.[b] || {}, sans = v => { if (!v) return null; const { comptes, jeux, ...x } = v; return x; }; return { vecu: sans(O.vecu), contact: O.contact || null }; };
function jouer(lots, n, regle = null) {
  const S = regle ? selon(lots, regle) : duTampon(lots), cle = n + '|' + JSON.stringify(S) + '|' + cleLots(lots); if (VUS.has(cle)) return VUS.get(cle);
  let X = W0, te = {};
  for (let k = 0; k < n; k++) { const r = Tampon.agreger(lots, X, profil, te); te = r.etat;
    if (regle) { const O = (r.pressions.taxons[t] ??= {})[b] ??= { retrait: {}, deplacement: [] }; for (const c of ['vecu', 'contact']) if (S[c]) O[c] = S[c]; else delete O[c]; }
    X = Orvane.cycle(X, r.pressions); }
  const p = pop(X), o = { traque: p.memoire?.traque || 0, mefiance: p.mefiance || 0, attitude: p.attitude || 'neutre' }; VUS.set(cle, o); return o;
}
// le plus petit nombre de comptes pour lequel « vrai(n) », jusqu'à max (on double, puis on cherche entre les deux)
function seuil(vrai, max) { let lo = 0, hi = 1; while (hi <= max && !vrai(hi)) { lo = hi; hi *= 2; } if (hi > max) { if (lo === max || !vrai(max)) return null; hi = max; }
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (vrai(m)) hi = m; else lo = m; } return hi; }

// --- la sortie : des tableaux, et l'écart du tampon à chaque règle sur tout ce qui est mesuré ---
const ECART = Object.fromEntries(NOMS.map(r => [r, 0])), noter = (lots, n) => { const vrai = jouer(lots, n); for (const r of NOMS) { const x = jouer(lots, n, r); ECART[r] = Math.max(ECART[r], Math.abs(x.traque - vrai.traque), Math.abs(x.mefiance - vrai.mefiance)); } return vrai; };
const tableau = (titres, lignes) => { const larg = titres.map((x, i) => Math.max(x.length, ...lignes.map(l => String(l[i]).length)));
  const ligne = l => '  ' + l.map((x, i) => i ? String(x).padStart(larg[i]) : String(x).padEnd(larg[i])).join('   '); console.log(ligne(titres)); console.log('  ' + larg.map(n => '-'.repeat(n)).join('   ')); for (const l of lignes) console.log(ligne(l)); console.log(''); };
const TITRES = [...NOMS.map(r => REGLES[r].nom), 'le tampon'];
const colonnes = (lots, n, dire) => [...NOMS.map(r => dire(jouer(lots, n, r))), dire(noter(lots, n))];

console.log(`La part d'un jeu, mesurée : ${W0.monde.id}, la mémoire éveillée ; ${t} / ${b} ; activité normale ${NORMALE} contacts, part d'un jeu ${PART}\n`);

console.log('A. Une poignée de comptes hostiles face à des joueurs qui ne font que passer');
console.log('A1. La traque, vingt nuits : des passants à 30 rencontres ; n faux comptes déclarent chacun 500 joueurs tombés et 500 pillages.');
console.log('    Combien de faux comptes font une « traqueuse » (et la traque avec 3 et 12 faux comptes) :\n');
{ const dire = o => `${fx(o.traque)}${o.attitude === 'traqueuse' ? ' *' : ''}`, MAX = COURT ? 16 : 200, lignes = [];
  for (const np of [10, 100]) for (const [ou, jeu] of [['le même jeu', 'grand'], ['un jeu à eux', 'petit']]) { const lots = n => [...comptes(np, 'grand', 'p', QUI.passant30), ...comptes(n, jeu, 'f', QUI.tombeur)];
    const s = r => { const n = seuil(k => jouer(lots(k), 20, r).attitude === 'traqueuse', MAX); return n == null ? `> ${MAX}` : String(n); };
    lignes.push([`${np} passants, ${ou} : à partir de`, ...NOMS.map(s), s(null)], ['   avec 3 faux comptes', ...colonnes(lots(3), 20, dire)], ['   avec 12 faux comptes', ...colonnes(lots(12), 20, dire)]); }
  tableau(['', ...TITRES], lignes); console.log('    (* : « traqueuse »)\n'); }

console.log('A2. La méfiance, une nuit : des passants à 60 rencontres ; n comptes déclarent chacun 60 prélèvements, sans une rencontre.');
console.log('    Combien de comptes hostiles la portent à 0,5 (et la méfiance avec 1 et 4 comptes hostiles) :\n');
{ const lignes = [], vingt = [], dire = o => fx(o.mefiance, 3);
  for (const np of [10, 100]) for (const [ou, jeu] of [['le même jeu', 'grand'], ['un jeu à eux', 'petit']]) { const lots = n => [...comptes(np, 'grand', 'p', QUI.passant60), ...comptes(n, jeu, 'h', QUI.braconnier)];
    const s = r => { const n = seuil(k => jouer(lots(k), 1, r).mefiance >= .5, 200); return n == null ? '> 200' : String(n); };
    lignes.push([`${np} passants, ${ou} : à partir de`, ...NOMS.map(s), s(null)], ['   avec 1 compte hostile', ...colonnes(lots(1), 1, dire)], ['   avec 4 comptes hostiles', ...colonnes(lots(4), 1, dire)]);
    vingt.push(fx(noter(lots(1), 20).mefiance, 3), fx(noter(lots(4), 20).mefiance, 3)); }
  tableau(['', ...TITRES], lignes); console.log(`    (le tampon, après vingt nuits, avec 1 puis 4 comptes hostiles, dans le même ordre : ${vingt.join(' · ')})\n`); }

console.log('B. Un grand jeu face à un petit jeu de vrais joueurs : ce qu\'une part par jeu protégeait');
const TAILLES = COURT ? [20, 100] : [20, 100, 1000], att = o => `${fx(o.traque)} ${o.attitude}`;
console.log('B1. La traque, vingt nuits. Le petit jeu : dix joueurs qui se défendent (20 rencontres, 2 blessures, 2 assauts, 0,3 prise).');
console.log('    Le grand jeu : N comptes qui déclarent chacun le plus de joueurs tombés possible. À partir de combien la traque passe 0,4 :\n');
{ const lots = N => [...comptes(N, 'grand', 'f', QUI.tombeur), ...comptes(10, 'petit', 'd', QUI.defenseur)], s = r => { const n = seuil(k => jouer(lots(k), 20, r).traque >= M.REGLES.attitudes.seuil, COURT ? 32 : 200); return n == null ? `> ${COURT ? 32 : 200}` : String(n); };
  tableau(['', ...TITRES], [['dix joueurs qui se défendent : à partir de', ...NOMS.map(s), s(null)], ...[5, ...TAILLES].map(N => [`   avec ${N} comptes hostiles`, ...colonnes(lots(N), 20, att)])]); }
console.log('    Le grand jeu : N vrais joueurs qui se laissent prendre (30 rencontres, 8 assauts, 2 joueurs tombés). Le petit : cinq joueurs qui se défendent.\n');
tableau(['', ...TITRES], TAILLES.map(N => [`${N} joueurs qui tombent, cinq qui se défendent`, ...colonnes([...comptes(N, 'grand', 'v', QUI.proie), ...comptes(5, 'petit', 'd', QUI.defenseur)], 20, att)]));
console.log('B2. La traque, vingt nuits. Le petit jeu : cinq vrais joueurs qui se laissent prendre (30 rencontres, 8 assauts, 2 joueurs tombés).');
console.log('    Le grand jeu : N passants (30 rencontres). Ici la part d\'un jeu donne au petit jeu une voix égale à celle du grand.\n');
tableau(['', ...TITRES], TAILLES.map(N => [`${N} passants, cinq joueurs qui tombent`, ...colonnes([...comptes(N, 'grand', 'p', QUI.passant30), ...comptes(5, 'petit', 'v', QUI.proie)], 20, att)]));
console.log('B3. La méfiance, une nuit. La cible sature vite, 1 − e^(−6 × la part des contacts qui finissent mal) : ' + [.05, .1, .25, .5, 1].map(p => `${fx(1 - Math.exp(-6 * p))} à ${fx(100 * p, 0)} %`).join(', ') + '.');
console.log('    Le petit jeu : cinq vrais joueurs (60 rencontres ; chasseurs : 6 prises de plus). Le grand jeu : N comptes.\n');
{ const cas = [['N chasseurs (60 rencontres, 6 prises), cinq passants', 'chasseur', 'passant60'], ['N comptes à 60 prélèvements, cinq passants', 'braconnier', 'passant60'], ['N passants, cinq chasseurs', 'passant60', 'chasseur']];
  tableau(['', ...TITRES], cas.flatMap(([nom, grand, petit]) => TAILLES.map(N => [nom.replace('N', String(N)), ...colonnes([...comptes(N, 'grand', 'g', QUI[grand]), ...comptes(5, 'petit', 'v', QUI[petit])], 1, o => fx(o.mefiance, 3))]))); }

// --- laquelle de ces règles le tampon applique : celle dont il ne s'écarte nulle part ---
const proches = NOMS.filter(r => ECART[r] < 2e-3);
console.log(`L'écart du tampon à chaque règle, sur tout ce qui précède (traque et méfiance) : ${NOMS.map(r => `${REGLES[r].nom} ${fx(ECART[r], 3)}`).join(' ; ')}`);
console.log(proches.length ? `Le tampon applique la règle « ${proches.map(r => REGLES[r].nom).join(' » ou « ')} ». (${((Date.now() - t0) / 1000).toFixed(0)} s)` : `Le tampon n'applique AUCUNE de ces règles : ce script ne mesure plus ce que fait le tampon. (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
process.exit(proches.length ? 0 : 1);
