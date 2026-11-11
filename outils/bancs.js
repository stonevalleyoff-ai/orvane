// Orvane — TOUS LES BANCS D'UN COUP (outils/bancs.js)
// Fait tourner les bancs (bancs/*.js) en parallèle, chacun dans son processus, avec un délai, et dit lesquels passent.
//   node outils/bancs.js                  tous les bancs, chacun dans sa version courte (--court) quand il en a une : à chaque PR
//   node outils/bancs.js --longs          les bancs qui ont une version courte, dans leur version entière : la nuit
//   node outils/bancs.js --tous           les deux
//   node outils/bancs.js corps tampon     ceux-là seulement (version courte)
//   [--jobs 4] [--delai 1200]             combien à la fois (le nombre de cœurs par défaut) ; le délai d'un banc, en secondes
//   [--liste]                             ce qui tournerait, sans rien lancer
//   [--part 2/4]                          la deuxième part sur quatre, à durées à peu près égales (quatre machines à la fois :
//                                         .github/workflows/verifications.yml)
// Sortie : 0 si tout passe, 1 sinon. Sur GitHub, le bilan s'écrit aussi dans le résumé de l'action ($GITHUB_STEP_SUMMARY).
// Un banc nouveau est pris tout seul : il suffit qu'il finisse par process.exit (0 s'il passe). Un fichier de bancs/ qui ne sort pas
// ainsi (bancs/monde.js, qu'on charge) n'est pas un banc.
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), { spawn } = require('child_process');
const racine = path.join(__dirname, '..'), dossier = path.join(racine, 'bancs');
const a = process.argv.slice(2), arg = (k, d) => { const i = a.indexOf(k); return i >= 0 && a[i + 1] != null ? a[i + 1] : d; };
const JOBS = +arg('--jobs', Math.max(1, os.cpus().length)), DELAI = +arg('--delai', 1200) * 1000;
const noms = a.filter((x, i) => !x.startsWith('--') && !(i > 0 && ['--jobs', '--delai', '--part'].includes(a[i - 1])));
// ce que dure chaque banc, en secondes, dans sa version courte, quatre à la fois sur quatre cœurs (mesuré le 6 novembre) : de quoi
// faire des parts égales ; un banc qu'on ne connaît pas compte pour deux minutes
const DUREES = { esprit: 1096, parcelles: 756, dietes: 717, formes: 612, climat: 564, stades: 564, corps: 461, invention: 340, pathogenes: 318,
  derives: 262, flore: 245, meteo: 140, phenologie: 300, succession: 250, diversite: 300, ponte: 232, stabilite: 227, temps: 215, grammaire: 213, synthetique: 208, ponts: 206, milieu: 154, fusion: 114,
  catalogues: 108, natures: 72, chronique: 33, morceaux: 11, individus: 7, collectif: 3, lisiere: 1, tampon: 1 };

const tous = fs.readdirSync(dossier).filter(f => f.endsWith('.js')).sort().map(f => ({ nom: f.slice(0, -3), src: fs.readFileSync(path.join(dossier, f), 'utf8') }))
  .filter(b => /process\.exit\(/.test(b.src));
const court = b => /['"]--court['"]/.test(b.src);
let liste;
if (noms.length) { liste = noms.map(n => { const b = tous.find(x => x.nom === n.replace(/\.js$/, '').replace(/^bancs\//, '')); if (!b) { console.error(`pas de banc « ${n} » (${tous.map(x => x.nom).join(', ')})`); process.exit(2); } return { ...b, args: court(b) ? ['--court'] : [] }; }); }
else {
  const rapides = tous.map(b => ({ ...b, args: court(b) ? ['--court'] : [] }));
  const longs = tous.filter(court).map(b => ({ ...b, args: [] }));
  liste = a.includes('--tous') ? [...rapides, ...longs] : a.includes('--longs') ? longs : rapides;
}
// une part sur n : les plus longs d'abord, chacun dans la part la moins chargée
const part = arg('--part', null);
if (part) { const [k, n] = part.split('/').map(Number); if (!(k >= 1 && k <= n)) { console.error(`--part ${part} : il faut k/n, 1 ≤ k ≤ n`); process.exit(2); }
  const parts = Array.from({ length: n }, () => ({ s: 0, L: [] }));
  for (const b of liste.slice().sort((x, y) => (DUREES[y.nom] ?? 120) - (DUREES[x.nom] ?? 120) || (x.nom < y.nom ? -1 : 1))) { const p = parts.reduce((m, q) => q.s < m.s ? q : m); p.L.push(b); p.s += DUREES[b.nom] ?? 120; }
  liste = parts[k - 1].L; }

if (a.includes('--liste')) { for (const b of liste) console.log(`${b.nom}${b.args.length ? ' ' + b.args.join(' ') : ''}\t~${DUREES[b.nom] ?? 120} s`); process.exit(0); }   // (ce qui tournerait, sans rien lancer)
const journaux = fs.mkdtempSync(path.join(os.tmpdir(), 'orvane-bancs-'));
const lancer = b => new Promise(fin => {
  const t0 = Date.now(), f = path.join(journaux, b.nom + '.log'), out = fs.openSync(f, 'w');
  const p = spawn(process.execPath, [path.join(dossier, b.nom + '.js'), ...b.args], { cwd: racine, stdio: ['ignore', out, out] });
  const minuteur = setTimeout(() => { p.kill('SIGKILL'); }, DELAI);
  p.on('close', (code, signal) => { clearTimeout(minuteur); fs.closeSync(out);
    const texte = fs.readFileSync(f, 'utf8'), lignes = texte.trim().split('\n'), echecs = lignes.filter(l => /^\s*✗/.test(l)), connus = lignes.filter(l => /^\s*⚠/.test(l));
    const r = { ...b, code, s: (Date.now() - t0) / 1000, delai: signal === 'SIGKILL', echecs, connus, fin: lignes.slice(-1)[0] || '', texte };
    r.ok = code === 0 && !r.delai;
    console.log(`${r.ok ? '✓' : '✗'} ${b.nom}${b.args.length ? ' ' + b.args.join(' ') : ''} — ${r.s.toFixed(0)} s${r.delai ? ' (délai dépassé)' : r.ok ? '' : ` (code ${code})`}${connus.length ? ` · ${connus.length} vérification${connus.length > 1 ? 's' : ''} connue${connus.length > 1 ? 's' : ''} pour échouer (⚠)` : ''}`);
    fin(r); });
});
(async () => {
  console.log(`${liste.length} bancs, ${JOBS} à la fois, ${DELAI / 1000} s au plus chacun\n`);
  const t0 = Date.now(), R = [], file = liste.slice();
  await Promise.all(Array.from({ length: Math.min(JOBS, file.length) }, async () => { while (file.length) R.push(await lancer(file.shift())); }));
  R.sort((x, y) => (x.ok - y.ok) || (x.nom < y.nom ? -1 : 1));
  const rates = R.filter(r => !r.ok);
  for (const r of rates) { console.log(`\n——— ${r.nom} ${r.delai ? `: le délai de ${DELAI / 1000} s est dépassé` : `: code ${r.code}`} ———`);
    console.log((r.echecs.length ? r.echecs : r.texte.trim().split('\n').slice(-30)).join('\n')); }
  const total = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(`\n${rates.length ? `ÉCHEC : ${rates.length} banc${rates.length > 1 ? 's' : ''} sur ${R.length} (${rates.map(r => r.nom).join(', ')})` : `tout passe : ${R.length} bancs`} en ${total} s`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const md = [`### Les bancs : ${rates.length ? `✗ ${rates.length} en échec sur ${R.length}` : `✓ ${R.length} passent`} (${total} s)`, '', '| banc | | durée | ce qu\'il dit à la fin |', '| --- | --- | --- | --- |',
      ...R.map(r => `| ${r.nom}${r.args.length ? ' ' + r.args.join(' ') : ''} | ${r.ok ? (r.connus.length ? '✓ ⚠' : '✓') : '✗'} | ${r.s.toFixed(0)} s | ${(r.delai ? 'délai dépassé' : r.ok ? (r.connus[0] || r.fin) : (r.echecs[0] || r.fin)).replace(/\|/g, '\\|').slice(0, 160)} |`)];
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md.join('\n') + '\n');
  }
  process.exit(rates.length ? 1 : 0);
})();
