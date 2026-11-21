// Orvane — LA VITESSE DU MOTEUR (outils/vitesse.js) — docs/44
// Combien de temps prend un cycle, sur un monde réel ; et, contre une autre version du moteur, si une optimisation n'a rien changé
// au monde : l'empreinte de chaque instantané doit être la même, au caractère près.
//   node outils/vitesse.js                                   le monde d'Orvane (mondes/orvane/etat.json), 5 cycles
//   node outils/vitesse.js --monde mondes/genese-7/instantane.json --cycles 10
//   node outils/vitesse.js --contre origin/main              la même chose avec le moteur de main : plus vite ? le même monde ?
// Le monde tourne avec les règles de son profil (mondes/<id>/profil.json, s'il y en a un), comme le cycle hébergé. Contre une autre
// version (--contre), c'est la chaîne entière d'un cycle de nuit qui tourne, chez l'une et chez l'autre : le tampon (avec le
// tampon.json, le profil, la génération 0 et les jeux du monde), Parcelles.repartir, puis le moteur — sans lots, ou avec ceux d'un
// dossier (--lots <dossier>, lus au premier cycle) ; --profil <fichier> pour un autre profil ; --moteur-seul pour le moteur seul,
// comme avant. L'empreinte compare l'instantané et la mémoire du tampon. À lancer à la main, avant de fusionner : les vérifications
// de GitHub ne récupèrent que la branche (actions/checkout), pas main. Sortie : 0 ; 1 si, contre une autre version, le monde n'est
// plus le même (2 : pas de version à comparer).
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
  if (a.includes('--chaine')) {   // (la chaîne d'un cycle de nuit : hebergement/cycle.js, sans réseau)
    const dir = arg('--moteur', racine), Tampon = require(path.join(dir, 'tampon/tampon.js')), Parcelles = require(path.join(dir, 'moteur/parcelles.js'));
    const lireM = (n, d) => { const x = path.join(path.dirname(monde), n); return fs.existsSync(x) ? JSON.parse(fs.readFileSync(x, 'utf8')) : d; };
    const P = arg('--profil', null) ? JSON.parse(fs.readFileSync(path.resolve(racine, arg('--profil')), 'utf8')) : profil || {}, g0 = lireM('generation-0.json', null);
    const jeux = Object.fromEntries(lireM('jeux.json', []).map(j => [j.id, j])), dl = arg('--lots', null) && path.resolve(racine, arg('--lots'));
    const lots = dl ? fs.readdirSync(dl).filter(n => n.endsWith('.json')).sort().map(n => JSON.parse(fs.readFileSync(path.join(dl, n), 'utf8'))) : [];
    let t = lireM('tampon.json', { lisse: {} });
    for (let k = 0; k < N; k++) { const t0 = process.hrtime.bigint(), L = k === 0 ? lots.map(l => ({ monde: I.monde.id, ...l })) : [];
      const res = Tampon.agreger(L, Parcelles.regrouper(I), P, t, g0, jeux); t = { ...t, lisse: res.etat.lisse, lisseQ: res.etat.lisseQ };
      I = Orvane.cycle(I, Parcelles.repartir(res.pressions, I, Parcelles.localiser(L, I)), { duree_ms: 864e5 }); T.push(Number(process.hrtime.bigint() - t0) / 1e6);
      E.push(crypto.createHash('sha256').update(JSON.stringify(I)).update(JSON.stringify(t)).digest('hex').slice(0, 16)); }
  } else for (let k = 0; k < N; k++) { const t0 = process.hrtime.bigint(); I = Orvane.cycle(I, {}, { duree_ms: 864e5 }); T.push(Number(process.hrtime.bigint() - t0) / 1e6);
    E.push(crypto.createHash('sha256').update(JSON.stringify(I)).digest('hex').slice(0, 16)); }
  process.stdout.write(JSON.stringify({ T, E, taxons: I.taxons.length, biomes: I.biomes.length, cycle: I.cycle.n }));
  process.exit(0);
}

const chaine = !!contre && !a.includes('--moteur-seul'), passe = ['--lots', '--profil'].flatMap(k => arg(k, null) ? [k, arg(k)] : []);
const mesurer = dir => { const r = spawnSync(process.execPath, [__filename, '--mesurer', '--moteur', dir, '--monde', monde, '--cycles', String(N), ...(chaine ? ['--chaine', ...passe] : [])], { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) { console.error(r.stderr); process.exit(2); } return JSON.parse(r.stdout); };
const moy = T => T.reduce((s, x) => s + x, 0) / T.length, s = ms => (ms / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' s';
// (le premier cycle compte le temps que le moteur met à se mettre en route : la moyenne se prend sans lui quand il y en a d'autres)
const regime = T => T.length > 1 ? moy(T.slice(1)) : T[0];

console.log(`${path.relative(racine, monde)}, ${N} cycle${N > 1 ? 's' : ''}${contre ? `, ici contre ${contre}` : ''}${chaine ? ` (la chaîne d'un cycle de nuit : le tampon, les parcelles, le moteur ; ${arg('--lots', null) ? 'les lots de ' + arg('--lots') : 'sans lots'})` : ''}\n`);
const ici = mesurer(racine);
console.log(`ici : ${s(regime(ici.T))} par cycle (${ici.T.map(t => Math.round(t)).join(', ')} ms) · ${ici.taxons} lignées, ${ici.biomes} lieux`);
if (!contre) process.exit(0);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orvane-vitesse-'));
try { const tar = execFileSync('git', ['archive', contre, 'moteur', 'tampon'], { cwd: racine, maxBuffer: 1 << 28 }); execFileSync('tar', ['-x', '-C', tmp], { input: tar }); }
catch (e) { console.error(`pas de moteur à ${contre} : ${e.message}`); process.exit(2); }
const lui = mesurer(tmp); fs.rmSync(tmp, { recursive: true, force: true });
const gain = 1 - regime(ici.T) / regime(lui.T), memes = JSON.stringify(ici.E) === JSON.stringify(lui.E);
const k = ici.E.findIndex((e, i) => e !== lui.E[i]);
console.log(`${contre} : ${s(regime(lui.T))} par cycle (${lui.T.map(t => Math.round(t)).join(', ')} ms)`);
console.log(`\n${gain >= 0 ? `ici, ${Math.round(gain * 100)} % plus vite` : `ici, ${Math.round(-gain * 100)} % plus lent`} ; ${memes ? `le même monde, au caractère près, sur les ${N} cycles` : `LE MONDE N'EST PLUS LE MÊME, dès le cycle ${k + 1}`}`);
process.exit(memes ? 0 : 1);
