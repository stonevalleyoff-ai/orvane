// Orvane — LA VITESSE DU MOTEUR (outils/vitesse.js) — docs/44
// Combien de temps prend un cycle, sur un monde réel ; et, contre une autre version du moteur, si une optimisation n'a rien changé
// au monde : l'empreinte de chaque instantané doit être la même, au caractère près.
//   node outils/vitesse.js                                   le monde d'Orvane (mondes/orvane/etat.json), 5 cycles
//   node outils/vitesse.js --monde mondes/genese-7/instantane.json --cycles 10
//   node outils/vitesse.js --contre origin/main              la même chose avec le moteur de main : plus vite ? le même monde ?
// Le monde tourne avec les règles de son profil (mondes/<id>/profil.json, s'il y en a un), comme le cycle hébergé. Sortie : 0 ;
// 1 si, contre une autre version, le monde n'est plus le même.
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto'), { execFileSync, spawnSync } = require('child_process');
const racine = path.join(__dirname, '..');
const a = process.argv.slice(2), arg = (k, d) => { const i = a.indexOf(k); return i >= 0 && a[i + 1] != null ? a[i + 1] : d; };
const monde = path.resolve(racine, arg('--monde', 'mondes/orvane/etat.json')), N = +arg('--cycles', 5), contre = arg('--contre', null);

// --- une mesure : un moteur (un dossier qui contient moteur/), un monde, N cycles ---
if (a.includes('--mesurer')) {
  const Orvane = require(path.join(arg('--moteur', racine), 'moteur/orvane.js'));
  let I = JSON.parse(fs.readFileSync(monde, 'utf8'));
  const pf = path.join(path.dirname(monde), 'profil.json'), profil = fs.existsSync(pf) ? JSON.parse(fs.readFileSync(pf, 'utf8')) : null;
  if (profil?.monde?.regles) { const R = { ...(I.monde.regles || {}) };   // (comme hebergement/cycle.js : d'un niveau)
    for (const [k, v] of Object.entries(profil.monde.regles)) R[k] = v && typeof v === 'object' && !Array.isArray(v) && R[k] && typeof R[k] === 'object' ? { ...R[k], ...v } : v;
    I.monde.regles = R; }
  const T = [], E = [];
  for (let k = 0; k < N; k++) { const t0 = process.hrtime.bigint(); I = Orvane.cycle(I, {}, { duree_ms: 864e5 }); T.push(Number(process.hrtime.bigint() - t0) / 1e6);
    E.push(crypto.createHash('sha256').update(JSON.stringify(I)).digest('hex').slice(0, 16)); }
  process.stdout.write(JSON.stringify({ T, E, taxons: I.taxons.length, biomes: I.biomes.length, cycle: I.cycle.n }));
  process.exit(0);
}

const mesurer = dir => { const r = spawnSync(process.execPath, [__filename, '--mesurer', '--moteur', dir, '--monde', monde, '--cycles', String(N)], { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) { console.error(r.stderr); process.exit(2); } return JSON.parse(r.stdout); };
const moy = T => T.reduce((s, x) => s + x, 0) / T.length, s = ms => (ms / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' s';
// (le premier cycle compte le temps que le moteur met à se mettre en route : la moyenne se prend sans lui quand il y en a d'autres)
const regime = T => T.length > 1 ? moy(T.slice(1)) : T[0];

console.log(`${path.relative(racine, monde)}, ${N} cycle${N > 1 ? 's' : ''}${contre ? `, ici contre ${contre}` : ''}\n`);
const ici = mesurer(racine);
console.log(`ici : ${s(regime(ici.T))} par cycle (${ici.T.map(t => Math.round(t)).join(', ')} ms) · ${ici.taxons} lignées, ${ici.biomes} lieux`);
if (!contre) process.exit(0);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orvane-vitesse-'));
try { const tar = execFileSync('git', ['archive', contre, 'moteur'], { cwd: racine, maxBuffer: 1 << 28 }); execFileSync('tar', ['-x', '-C', tmp], { input: tar }); }
catch (e) { console.error(`pas de moteur à ${contre} : ${e.message}`); process.exit(2); }
const lui = mesurer(tmp); fs.rmSync(tmp, { recursive: true, force: true });
const gain = 1 - regime(ici.T) / regime(lui.T), memes = JSON.stringify(ici.E) === JSON.stringify(lui.E);
const k = ici.E.findIndex((e, i) => e !== lui.E[i]);
console.log(`${contre} : ${s(regime(lui.T))} par cycle (${lui.T.map(t => Math.round(t)).join(', ')} ms)`);
console.log(`\n${gain >= 0 ? `ici, ${Math.round(gain * 100)} % plus vite` : `ici, ${Math.round(-gain * 100)} % plus lent`} ; ${memes ? `le même monde, au caractère près, sur les ${N} cycles` : `LE MONDE N'EST PLUS LE MÊME, dès le cycle ${k + 1}`}`);
process.exit(memes ? 0 : 1);
