// Orvane — LES ABLATIONS (outils/ablations.js) — docs/59, 03
// Ce que vaut chaque règle du moteur, dans un monde : on la retire seule (la valeur qui éteint ce qu'elle fait, etalon/ablations.json), sur
// une copie du monde, et l'on fait tourner autant de cycles, sur les mêmes graines, que le témoin (le monde tel qu'il est). Une constante de
// structure, sans valeur qui l'éteigne, s'essaie à deux autres valeurs. Chaque essai tourne dans son processus.
// Ce qu'on mesure à la fin : les lignées animales vivantes et les carnivores, la biomasse, la diversité (Shannon), la part des lignées
// stables, les extinctions, les lignées nées ; et la durée d'un cycle. Une mesure bouge quand l'écart au témoin passe le double de l'écart
// entre les graines du témoin, et un seuil (la lecture du plan) : une indication, pas un verdict — la matrice est une décision de l'auteur.
//   node outils/ablations.js <etat.json> [--cycles 30] [--graines 3] [--regles a,b,c] [--natures mecanisme,constante,comptable]
//     [--jobs 4] [--plan etalon/ablations.json] [--sortie rapport.json] [--notes rapport.md]
// Sortie : 0 si chaque essai a tourné, 1 sinon. Node, sans dépendance.
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto'), { spawn } = require('child_process');
const racine = path.join(__dirname, '..'), Orvane = require(path.join(racine, 'moteur/orvane.js')), Journal = require(path.join(racine, 'hebergement/journal.js'));
const lireJ = f => JSON.parse(fs.readFileSync(f, 'utf8')), somme = L => L.reduce((s, x) => s + x, 0), r = (x, d = 4) => x == null || !Number.isFinite(x) ? null : +x.toFixed(d);
const objet = v => v && typeof v === 'object' && !Array.isArray(v);
// (une valeur de règle complétée en profondeur : celle du monde, et ce qu'on y change)
const fusion = (a, b) => objet(a) && objet(b) ? Object.fromEntries([...new Set([...Object.keys(a), ...Object.keys(b)])].map(k => [k, k in b ? fusion(a[k], b[k]) : a[k]])) : b;
const pareil = (a, b) => JSON.stringify(Journal.stable(a ?? null)) === JSON.stringify(Journal.stable(b ?? null));

// --- ce qu'est un monde, à un moment : ses lignées animales vivantes, et ce qu'on en mesure ---
const animal = t => t.plan?.regime !== 'vegetal' && t.plan?.regime !== 'synthetique';
const effectif = t => somme((t.populations || []).map(p => p.effectif || 0));
const vivantes = I => I.taxons.filter(t => !t.eteint && animal(t) && effectif(t) > 0);
function mesurer(I0, I, secondes) {
  const V = vivantes(I), m = t => t.plan?.masse_kg || 1, depart = new Map(vivantes(I0).map(t => [t.id, effectif(t)])), fin = new Map(V.map(t => [t.id, effectif(t)]));
  const L = new Map(); for (const t of V) for (const p of t.populations) if (p.effectif > 0) (L.get(p.biome) || L.set(p.biome, []).get(p.biome)).push(p.effectif * m(t));
  let H = 0; for (const B of L.values()) { const S = somme(B); for (const b of B) { const q = b / S; if (q > 0) H -= q * Math.log(q); } }
  let stables = 0, eteintes = 0; for (const [id, x] of depart) { const y = fin.get(id) || 0; if (y <= 0) eteintes++; else if (Math.max(x / y, y / x) <= 2) stables++; }
  return { lignees: V.length, predateurs: V.filter(t => t.plan?.regime === 'carnivore').length, biomasse_t: r(somme(V.map(t => effectif(t) * m(t))) / 1000, 3),
    shannon: L.size ? r(H / L.size) : null, stables: depart.size ? r(stables / depart.size) : null, eteintes, nees: V.filter(t => t.apparu > I0.cycle.n).length, duree_s: r(secondes, 2) };
}

// --- un essai, dans son processus : le monde, ses règles changées, une graine, des cycles ---
if (process.argv[2] === '--essai') {
  const E = JSON.parse(process.argv[3]), I0 = lireJ(E.monde); let I = JSON.parse(JSON.stringify(I0));
  I.monde = { ...I.monde, graine: E.graine, regles: { ...(I.monde.regles || {}), ...(E.regles || {}) } };
  const t0 = process.hrtime.bigint();
  for (let k = 0; k < E.cycles; k++) I = Orvane.cycle(I, {}, { duree_ms: 864e5 });
  process.stdout.write(JSON.stringify(mesurer(I0, I, Number(process.hrtime.bigint() - t0) / 1e9 / E.cycles)));
  process.exit(0);
}

const a = process.argv.slice(2), OPTS = ['--cycles', '--graines', '--regles', '--natures', '--jobs', '--plan', '--sortie', '--notes', '--part'];
const arg = (k, d) => { const i = a.indexOf(k); return i >= 0 && a[i + 1] != null ? a[i + 1] : d; };
const fPlan = arg('--plan', path.join(racine, 'etalon/ablations.json')), PLAN = lireJ(fPlan), empreintePlan = crypto.createHash('sha256').update(Journal.stable(PLAN)).digest('hex');
const moy = L => L.length ? somme(L) / L.length : null;

// --- la lecture : par essai, la moyenne de chaque mesure sur les graines, contre le témoin et l'écart entre ses graines ---
// bruts : [{ essai, regle, nature, fait, quand, regles, par_graine: { graine: mesures | null }, erreurs, temoin_duree_s }] ; T : le témoin, par graine
function lire(bruts, T, cycles) {
  const CLES = Object.keys(PLAN.mesures).filter(k => k !== 'duree_s'), S = PLAN.lecture.seuils, REL = new Set(PLAN.lecture.relatives || []);
  const Tm = Object.values(T).filter(Boolean), temoin = { par_graine: T, moyenne: {}, ecart: {} };
  for (const k of [...CLES, 'duree_s']) { const v = Tm.map(m => m[k]).filter(x => x != null); temoin.moyenne[k] = r(moy(v)); temoin.ecart[k] = v.length ? r(Math.max(...v) - Math.min(...v)) : null; }
  const BRUIT_DUREE = temoin.moyenne.duree_s > 0 ? (temoin.ecart.duree_s || 0) / temoin.moyenne.duree_s : 0;
  const essais = bruts.map(e => {
    const base = { essai: e.essai, regle: e.regle, nature: e.nature, fait: e.fait, quand: e.quand, regles: e.regles, temoin_duree_s: e.temoin_duree_s }, M = Object.values(e.par_graine).filter(Boolean);
    if (e.erreurs?.length) return { ...base, par_graine: e.par_graine, erreurs: e.erreurs, lecture: 'investiguer : le monde ne tourne plus sans elle' };
    const mesures = {}, ecarts = {}, bouge = [];
    for (const k of [...CLES, 'duree_s']) { const v = M.map(m => m[k]).filter(x => x != null); mesures[k] = r(moy(v)); ecarts[k] = mesures[k] != null && temoin.moyenne[k] != null ? r(mesures[k] - temoin.moyenne[k]) : null; }
    for (const k of CLES) { const d = ecarts[k], t = temoin.moyenne[k]; if (d == null) continue;
      const bruit = 2 * (temoin.ecart[k] || 0), seuil = REL.has(k) ? S[k] * Math.abs(t || 0) : S[k]; if (Math.abs(d) > Math.max(bruit, seuil ?? 0)) bouge.push(k); }
    // (ce que la règle coûte : la part du cycle qu'on gagne sans elle, contre le témoin de la même machine ; lue seulement au-delà du bruit
    //  des durées, que dit l'écart entre les graines du témoin, et de 10 % : plusieurs essais à la fois se disputent la machine)
    const td = e.temoin_duree_s ?? temoin.moyenne.duree_s, cout = td > 0 && mesures.duree_s != null ? r((td - mesures.duree_s) / td, 3) : null;
    const cout_lu = cout != null && Math.abs(cout) > Math.max(.1, 2 * BRUIT_DUREE) ? cout : null;
    const v = bouge.join(', '), pl = bouge.length > 1 ? 'nt' : '';
    const lecture = e.nature === 'comptable' ? (bouge.length ? `investiguer : une règle qui ne fait que compter change le monde (${v})` : 'rien ne change aux bêtes, comme attendu')
      : e.nature === 'constante' ? (bouge.length ? `elle compte : à cette valeur, ${v} bouge${pl}` : `rien de mesurable à cette valeur en ${cycles} cycles`)
      : bouge.length ? `elle tient : sans elle, ${v} bouge${pl}` : `rien de mesurable en ${cycles} cycles (${e.quand})`;
    return { ...base, mesures, ecarts, bouge, cout, cout_lu, par_graine: e.par_graine, lecture };
  });
  return { temoin, essais };
}
const ecrire = R0 => {
  const { temoin, essais: rapport, laisses } = R0, NG = R0.graines.length;
  const fx = (x, d = 2) => x == null ? '–' : (x > 0 ? '+' : '') + (+x).toLocaleString('fr-FR', { maximumFractionDigits: d }), nb = (x, d) => x == null ? '–' : (+x).toLocaleString('fr-FR', { maximumFractionDigits: d });
  const notes = [`## Les ablations : ${R0.monde.id}, cycle ${R0.monde.cycle} (${R0.cycles} cycles, ${NG} graine${NG > 1 ? 's' : ''})`, '',
    `Le témoin : ${nb(temoin.moyenne.lignees, 1)} lignées animales (écart entre graines ${nb(temoin.ecart.lignees, 1)}), ${nb(temoin.moyenne.predateurs, 1)} carnivores, ${nb(temoin.moyenne.biomasse_t, 0)} t, Shannon ${nb(temoin.moyenne.shannon, 3)}, ${nb(100 * (temoin.moyenne.stables ?? 0), 0)} % de lignées stables, ${nb(temoin.moyenne.eteintes, 1)} éteintes, ${nb(temoin.moyenne.nees, 1)} nées ; un cycle en ${nb(temoin.moyenne.duree_s, 2)} s. Plan ${R0.plan.version} (${R0.plan.empreinte.slice(0, 12)}…).`, '',
    '| essai | nature | lignées | carnivores | biomasse | Shannon | stables | éteintes | nées | coût | lecture |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rapport.map(x => x.erreurs ? `| ${x.essai} | ${x.nature} | | | | | | | | | ${x.lecture} |`
      : `| ${x.essai} | ${x.nature} | ${fx(x.ecarts.lignees, 1)} | ${fx(x.ecarts.predateurs, 1)} | ${temoin.moyenne.biomasse_t ? fx(100 * x.ecarts.biomasse_t / temoin.moyenne.biomasse_t, 1) + ' %' : '–'} | ${fx(x.ecarts.shannon, 3)} | ${fx(x.ecarts.stables, 3)} | ${fx(x.ecarts.eteintes, 1)} | ${fx(x.ecarts.nees, 1)} | ${x.cout_lu == null ? '≈' : fx(100 * x.cout_lu, 0) + ' %'} | ${x.lecture} |`),
    '', `Les écarts sont ceux de l'essai au témoin, en moyenne sur les graines (la biomasse, en part de celle du témoin). Le coût : la part d'un cycle qu'on gagne sans la règle, au-delà du bruit des durées (≈ : dans ce bruit).`,
    ...(laisses.length ? ['', `Non essayées : ${laisses.map(x => `${x.essai || x.regle} (${x.pourquoi})`).join(' ; ')}.`] : [])].join('\n');
  const so = arg('--sortie'), sn = arg('--notes');
  if (so) { fs.mkdirSync(path.dirname(path.resolve(so)), { recursive: true }); fs.writeFileSync(so, JSON.stringify(R0, null, 1) + '\n'); }
  if (sn) { fs.mkdirSync(path.dirname(path.resolve(sn)), { recursive: true }); fs.writeFileSync(sn, notes + '\n'); } else console.log(notes);
};

// --- la fusion : les parts d'un même plan, sur le même monde, en un rapport (le témoin de la première ; chaque essai, le coût de sa part) ---
if (a[0] === '--fusionner') {
  const P = a.slice(1).filter((x, i, L) => !x.startsWith('--') && !OPTS.includes(L[i - 1])).map(lireJ), A = P[0];
  const sansDuree = T => JSON.stringify(Object.fromEntries(Object.entries(T).map(([g, m]) => [g, m && { ...m, duree_s: 0 }])));
  const pb = P.filter(x => x.plan.empreinte !== A.plan.empreinte || x.monde.empreinte !== A.monde.empreinte || x.cycles !== A.cycles || JSON.stringify(x.graines) !== JSON.stringify(A.graines) || sansDuree(x.temoin.par_graine) !== sansDuree(A.temoin.par_graine));
  if (pb.length) { console.error(`les parts ne vont pas ensemble (plan, monde, cycles, graines ou témoin) : ${pb.length} sur ${P.length}`); process.exit(2); }
  const vus = new Set(), bruts = P.flatMap(x => x.essais).filter(e => !vus.has(e.essai) && vus.add(e.essai)), cles = new Set();
  const laisses = P.flatMap(x => x.laisses).filter(l => { const k = l.regle + '|' + (l.essai || ''); return !cles.has(k) && cles.add(k); });
  const ordre = Object.keys(PLAN.regles);
  const L = lire(bruts.sort((x, y) => ordre.indexOf(x.regle) - ordre.indexOf(y.regle) || (x.essai < y.essai ? -1 : 1)), A.temoin.par_graine, A.cycles);
  ecrire({ ...A, part: undefined, parts: P.length, date: new Date().toISOString(), temoin: L.temoin, essais: L.essais, laisses, duree_min: r(somme(P.map(x => x.duree_min || 0)), 1) });
  process.exit(L.essais.some(x => x.erreurs) ? 1 : 0);
}

const fMonde = a.find((x, i) => !x.startsWith('--') && !OPTS.includes(a[i - 1]));
if (!fMonde) { console.error('node outils/ablations.js <etat.json> [--cycles 30] [--graines 3] [--regles a,b] [--natures mecanisme,constante,comptable] [--jobs 4] [--part k/n] [--sortie f.json] [--notes f.md]\n'
  + 'node outils/ablations.js --fusionner part1.json part2.json … [--sortie f.json] [--notes f.md]'); process.exit(2); }
const CYCLES = +arg('--cycles', 30), NG = +arg('--graines', 3), JOBS = +arg('--jobs', Math.max(1, os.cpus().length));
const NATURES = new Set(arg('--natures', 'mecanisme,constante,comptable').split(',')), CHOIX = arg('--regles') ? new Set(arg('--regles').split(',')) : null;
const PART = arg('--part') ? arg('--part').split('/').map(Number) : null;
if (PART && !(PART[0] >= 1 && PART[0] <= PART[1])) { console.error('--part k/n : 1 ≤ k ≤ n'); process.exit(2); }
const I0 = lireJ(fMonde), R = Orvane.contexte(I0).R, graines = Array.from({ length: NG }, (_, k) => ((I0.monde.graine >>> 0) + k) >>> 0);

// --- les essais : le témoin, puis chaque règle retirée (ou chaque valeur d'une constante) ; une part : le témoin et un essai sur n ---
let essais = [{ id: 'temoin', regle: null, nature: 'temoin', regles: {} }], laisses = [];
for (const [k, P] of Object.entries(PLAN.regles)) {
  if (CHOIX && !CHOIX.has(k)) continue;
  if (!NATURES.has(P.nature)) { laisses.push({ regle: k, nature: P.nature, pourquoi: PLAN.natures[P.nature] }); continue; }
  const variantes = P.retirer ? [{ id: k, change: P.retirer }]
    : P.facteurs ? P.facteurs.map(f => ({ id: `${k} ×${f}`, change: { [k]: typeof R[k] === 'number' ? +(R[k] * f).toPrecision(6) : R[k] } }))
    : (P.essais || []).map(e => ({ id: `${k} = ${JSON.stringify(Object.values(e)[0])}`, change: e }));
  for (const v of variantes) {
    const regles = Object.fromEntries(Object.entries(v.change).map(([c, x]) => [c, fusion(R[c], x)]));   // (la valeur entière de chaque règle changée)
    if (Object.entries(regles).every(([c, x]) => pareil(x, R[c]))) { laisses.push({ regle: k, nature: P.nature, essai: v.id, pourquoi: 'déjà retirée dans ce monde : sa valeur est celle qui l\'éteint' }); continue; }
    essais.push({ id: v.id, regle: k, nature: P.nature, regles, fait: P.fait, quand: P.quand });
  }
}
if (PART) essais = [essais[0], ...essais.slice(1).filter((_, i) => i % PART[1] === PART[0] - 1)];
const travaux = essais.flatMap(e => graines.map(g => ({ e, g })));
console.error(`${path.basename(path.dirname(path.resolve(fMonde)))} (cycle ${I0.cycle.n})${PART ? `, part ${PART.join('/')}` : ''} : ${essais.length - 1} essais et le témoin, ${NG} graine${NG > 1 ? 's' : ''}, ${CYCLES} cycles chacun : ${travaux.length} tâches, ${JOBS} à la fois`);

const lancer = ({ e, g }) => new Promise(fin => {
  const p = spawn(process.execPath, ['--max-old-space-size=6000', __filename, '--essai', JSON.stringify({ monde: path.resolve(fMonde), graine: g, cycles: CYCLES, regles: e.regles })], { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '', err = ''; p.stdout.on('data', d => out += d); p.stderr.on('data', d => err += d);
  p.on('close', code => { let m = null; try { m = code === 0 ? JSON.parse(out) : null; } catch (x) { m = null; } fin({ id: e.id, g, m, erreur: m ? null : (err.trim().split('\n').slice(-3).join(' ') || `code ${code}`).slice(0, 300) }); });
});
(async () => {
  const t0 = Date.now(), file = travaux.slice(), res = []; let faits = 0;
  await Promise.all(Array.from({ length: Math.min(JOBS, file.length) }, async () => { while (file.length) { const x = await lancer(file.shift()); res.push(x); faits++;
    if (faits % Math.max(1, Math.round(travaux.length / 20)) === 0 || faits === travaux.length) console.error(`  ${faits}/${travaux.length} (${((Date.now() - t0) / 60000).toFixed(1)} min)`); } }));
  const de = id => graines.map(g => res.find(x => x.id === id && x.g === g)), T = Object.fromEntries(de('temoin').map(x => [x.g, x.m]));
  const td = moy(Object.values(T).filter(Boolean).map(m => m.duree_s));
  const bruts = essais.slice(1).map(e => { const L = de(e.id);
    return { essai: e.id, regle: e.regle, nature: e.nature, fait: e.fait, quand: e.quand, regles: e.regles, temoin_duree_s: r(td, 3), par_graine: Object.fromEntries(L.map(x => [x.g, x.m])),
      erreurs: L.filter(x => !x.m).map(x => ({ graine: x.g, erreur: x.erreur })) }; });
  const L = lire(bruts, T, CYCLES);
  const R0 = { plan: { fichier: path.relative(racine, path.resolve(fPlan)), version: PLAN.version, empreinte: empreintePlan }, date: new Date().toISOString(), moteur: Journal.moteur(racine),
    machine: { processeur: os.cpus()[0]?.model ?? null, coeurs: os.cpus().length, node: process.version }, ...(PART ? { part: PART.join('/') } : {}),
    monde: { id: I0.monde.id, cycle: I0.cycle.n, empreinte: Journal.empreinte(I0), regles: Journal.empreinte(Journal.stable(I0.monde.regles ?? {})) },
    cycles: CYCLES, graines, temoin: L.temoin, essais: L.essais, laisses, duree_min: r((Date.now() - t0) / 60000, 1) };
  ecrire(R0);
  process.exit(L.essais.some(x => x.erreurs) || Object.values(T).some(m => !m) ? 1 : 0);
})();
