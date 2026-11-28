// Orvane — LA RÉFÉRENCE (outils/reference.js) — docs/59
// Ce qu'est chaque monde à un moment donné, mesuré toujours de la même façon : de quoi comparer deux versions du moteur, ou deux époques
// d'un monde (la phase 0 du plan : l'état de référence). Pour chaque monde d'un dossier (<dossier>/mondes/<id>/etat.json) :
//  - son identité : son cycle, sa date, sa naissance, sa graine, son contrat, l'empreinte de son état (hebergement/journal.js) ;
//  - sa taille : ses lignées vivantes, ses bêtes et leur biomasse, ses plantes, ses lieux ;
//  - sa diversité : l'entropie de Shannon des parts de biomasse de ses bêtes dans chaque lieu (en moyenne sur les lieux, comme l'étalon),
//    ses phénotypes présents, la part de ses lignées nées d'une autre dans le monde ;
//  - sa stabilité : d'après son historique, la part des lignées vivantes il y a 30 cycles qui sont à moins d'un facteur 2 de leur effectif
//    d'alors, et celles qui se sont éteintes depuis ;
//  - sa performance et sa reproductibilité (sauf --sans-cycle) : le cycle suivant, sans joueurs, deux fois, chacun dans son processus :
//    la durée, la mémoire, et la même empreinte les deux fois.
//   node outils/reference.js <dossier qui contient mondes/> [--mondes orvane,europe] [--sortie reference.json] [--notes notes.md] [--sans-cycle]
//     [--source "d'où vient cet état"]
// Lancé chaque mois avec les archives (.github/workflows/archives.yml). Node, sans dépendance.
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const racine = path.join(__dirname, '..'), Journal = require(path.join(racine, 'hebergement/journal.js')), { periodeDe } = require(path.join(racine, 'hebergement/rythme.js'));
const a = process.argv.slice(2), OPTS = ['--sortie', '--notes', '--mondes', '--source'], arg = (k, d) => { const i = a.indexOf(k); return i >= 0 && a[i + 1] != null ? a[i + 1] : d; };
const somme = L => L.reduce((s, x) => s + x, 0), r = (x, d = 3) => x == null || !isFinite(x) ? null : +Number(x).toFixed(d);
const lireJ = f => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
const FENETRE = 30;

// le même cycle, dans un processus à lui : l'empreinte de ce qu'il rend, sa durée, la mémoire du processus
const SONDE = `const fs=require('fs'),O=require(process.argv[1]),J=require(process.argv[2]);const E=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));
const t=process.hrtime.bigint(),S=O.cycle(E,{},{duree_ms:+process.argv[4]}),s=Number(process.hrtime.bigint()-t)/1e9;
process.stdout.write(JSON.stringify({h:J.empreinte(S),s,mo:Math.round(process.resourceUsage().maxRSS/1024)}));`;
const cycler = (fEtat, duree) => JSON.parse(execFileSync(process.execPath, ['--max-old-space-size=6000', '-e', SONDE, path.join(racine, 'moteur/orvane.js'),
  path.join(racine, 'hebergement/journal.js'), fEtat, String(duree)], { encoding: 'utf8', maxBuffer: 1 << 26 }));

function mesurer(D, avecCycle) {
  const fE = path.join(D, 'etat.json'), E = lireJ(fE), profil = lireJ(path.join(D, 'profil.json')) || {}, H = lireJ(path.join(D, 'historique.json')) || [];
  const journal = lireJ(path.join(D, 'journal.json')) || [];
  const vivants = E.taxons.filter(t => !t.eteint && somme(t.populations.map(p => p.effectif || 0)) > 0);
  const betes = vivants.filter(t => t.plan?.regime !== 'vegetal'), plantes = vivants.filter(t => t.plan?.regime === 'vegetal');
  const N = t => somme(t.populations.map(p => p.effectif || 0)), m = t => t.plan?.masse_kg || 1;
  // la diversité de chaque lieu : −Σ p ln p des parts de biomasse de ses bêtes, en moyenne sur les lieux (outils/etalon.js)
  const L = new Map(); for (const t of betes) for (const p of t.populations) if (p.effectif > 0) (L.get(p.biome) || L.set(p.biome, []).get(p.biome)).push(p.effectif * m(t));
  let Hs = 0; for (const B of L.values()) { const S = somme(B); for (const b of B) { const q = b / S; if (q > 0) Hs -= q * Math.log(q); } }
  // la stabilité, sur l'historique : l'effectif de chaque lignée il y a FENETRE cycles, et aujourd'hui
  let stabilite = null;
  if (H.length >= 2) { const fin = H[H.length - 1], debut = H.find(h => h.cycle.n >= fin.cycle.n - FENETRE) || H[0];
    const tot = h => new Map(h.taxons.map(t => [t.id, t.eteint != null ? 0 : somme((t.populations || []).map(p => p.effectif || 0))]));
    const A = tot(debut), B = tot(fin); let dans = 0, n = 0; const eteintes = [];
    for (const [id, x] of A) { if (!(x > 0)) continue; n++; const y = B.get(id) || 0; if (y <= 0) { eteintes.push(id); continue; } if (Math.max(x / y, y / x) <= 2) dans++; }
    stabilite = { de: debut.cycle.n, a: fin.cycle.n, lignees: n, part_a_moins_de_x2: n ? r(dans / n) : null, eteintes: eteintes.length, ...(eteintes.length ? { lesquelles: eteintes.slice(0, 20) } : {}) }; }
  const M = { cycle: E.cycle?.n ?? null, date: E.cycle?.date ?? null, ne: E.monde?.ne ?? null, graine: E.monde?.graine ?? null, contrat: E.orvane ?? null,
    empreinte: Journal.empreinte(E), regles: Journal.empreinte(Journal.stable(E.monde?.regles ?? {})),
    taille: { lignees_vivantes: betes.length, betes: Math.round(somme(betes.map(N))), biomasse_t: r(somme(betes.map(t => N(t) * m(t))) / 1000, 1), plantes: plantes.length, lieux: E.biomes?.length ?? null },
    diversite: { shannon: L.size ? r(Hs / L.size) : null, phenotypes: somme(betes.map(t => (t.phenotypes || []).filter(p => (p.frequence ?? 1) > 0).length)),
      nees_dans_le_monde: betes.length ? r(betes.filter(t => t.parent != null).length / betes.length) : null },
    stabilite, journal: journal.length ? { cycles: journal.length, dernier: journal[journal.length - 1].n, moteur: journal[journal.length - 1].moteur ?? null } : null };
  if (avecCycle) { const duree = periodeDe(profil.monde?.cycle); const c1 = cycler(fE, duree), c2 = cycler(fE, duree);
    M.cycle_suivant = { duree_s: r(Math.min(c1.s, c2.s), 1), memoire_mo: Math.max(c1.mo, c2.mo), empreinte: c1.h, rejeu: c1.h === c2.h ? 'identique' : 'different' }; }
  return M;
}

if (require.main === module) {
  const dossier = a.find((x, i) => !x.startsWith('--') && !OPTS.includes(a[i - 1]));
  if (!dossier) { console.error('node outils/reference.js <dossier qui contient mondes/> [--mondes a,b] [--sortie f.json] [--notes f.md] [--sans-cycle]'); process.exit(2); }
  const base = fs.existsSync(path.join(dossier, 'mondes')) ? path.join(dossier, 'mondes') : dossier, choisis = arg('--mondes') ? arg('--mondes').split(',') : null;
  const ids = fs.readdirSync(base).filter(id => !id.startsWith('.') && fs.existsSync(path.join(base, id, 'etat.json')) && (!choisis || choisis.includes(id))).sort();
  const R = { date: new Date().toISOString(), ...(arg('--source') ? { source: arg('--source') } : {}), moteur: Journal.moteur(racine), machine: { processeur: os.cpus()[0]?.model ?? null, coeurs: os.cpus().length, node: process.version }, fenetre_stabilite: FENETRE, mondes: {} };
  for (const id of ids) { const t0 = Date.now();
    try { R.mondes[id] = mesurer(path.join(base, id), !a.includes('--sans-cycle')); } catch (e) { R.mondes[id] = { erreur: String(e.message || e).slice(0, 300) }; }
    const M = R.mondes[id]; console.error(`${id} : ${M.erreur ? 'erreur : ' + M.erreur : `cycle ${M.cycle}, ${M.taille.lignees_vivantes} lignées${M.cycle_suivant ? `, un cycle en ${M.cycle_suivant.duree_s} s, rejeu ${M.cycle_suivant.rejeu}` : ''}`} (${((Date.now() - t0) / 1000).toFixed(0)} s)`); }
  const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  const fx = (x, d = 0) => x == null ? '–' : Math.abs(x) >= 1e12 ? (() => { const e = Math.floor(Math.log10(Math.abs(x))); return `${(x / 10 ** e).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} × 10${String(e).split('').map(c => SUP[c]).join('')}`; })()
    : (+x).toLocaleString('fr-FR', { maximumFractionDigits: d });
  const stab = S => !S || S.part_a_moins_de_x2 == null ? '–' : `${fx(100 * S.part_a_moins_de_x2, 1)} %${S.a - S.de < FENETRE ? ` (sur ${S.a - S.de} cycles)` : ''}`;
  const notes = [`| monde | cycle | lignées animales | bêtes | biomasse (t) | Shannon | stables à ${FENETRE} cycles | éteintes | un cycle | rejeu |`, '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...Object.entries(R.mondes).map(([id, M]) => M.erreur ? `| ${id} | erreur | | | | | | | | |` : `| ${id} | ${M.cycle} | ${fx(M.taille.lignees_vivantes)} | ${fx(M.taille.betes)} | ${fx(M.taille.biomasse_t)} | ${fx(M.diversite.shannon, 3)} | ${stab(M.stabilite)} | ${M.stabilite ? M.stabilite.eteintes : '–'} | ${M.cycle_suivant ? fx(M.cycle_suivant.duree_s, 1) + ' s, ' + fx(M.cycle_suivant.memoire_mo) + ' Mo' : '–'} | ${M.cycle_suivant ? (M.cycle_suivant.rejeu === 'identique' ? '✓ identique' : '✗ différent') : '–'} |`)].join('\n');
  const so = arg('--sortie'), sn = arg('--notes');
  if (so) { fs.mkdirSync(path.dirname(path.resolve(so)), { recursive: true }); fs.writeFileSync(so, JSON.stringify(R, null, 1) + '\n'); }
  if (sn) fs.writeFileSync(sn, notes + '\n'); else console.log(notes);
  process.exit(Object.values(R.mondes).some(M => M.erreur || M.cycle_suivant?.rejeu === 'different') ? 1 : 0);
}

module.exports = { mesurer };
