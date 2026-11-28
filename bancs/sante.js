// Orvane — LE BANC DE LA SANTÉ DU MOTEUR (bancs/sante.js, docs/51)
//  1. les mesures se calculent sur un monde publié (la genèse 2026), sont les mêmes deux fois, et chaque partie est là ;
//  2. les règles des alertes : un retrait sans mort, un groupe qui recule à chaque cycle, une extinction ;
//  3. le récit déjà écrit est gardé quand on refait les mesures ; l'index met le plus récent d'abord ;
//  4. l'Observatoire charge la vue Santé (monde/sante.js) et la sert depuis sa navigation.
//   node bancs/sante.js
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const racine = p => path.join(__dirname, '..', p);
const Sante = require(racine('outils/sante.js'));
const lireJ = f => JSON.parse(fs.readFileSync(racine(f), 'utf8'));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const clone = o => JSON.parse(JSON.stringify(o));

const D = 'mondes/genese-2026';
const monde = () => ({ I: lireJ(`${D}/instantane.json`), H: lireJ(`${D}/historique.json`), T: lireJ(`${D}/tampon.json`), J: [], P: lireJ(`${D}/profil.json`), C: lireJ(`${D}/chronique/index.json`) });

console.log('1. les mesures d\'un monde publié');
const A = Sante.mesurer(monde()), B = Sante.mesurer(monde());
verif(JSON.stringify(A) === JSON.stringify(B), 'deux fois les mêmes fichiers : deux fois le même rapport');
const M = A.mesures;
verif(['monde', 'effectifs', 'serie', 'groupes', 'pressions', 'memoire', 'souches', 'vivant', 'rythme', 'calendrier', 'climat', 'alertes', 'seuils'].every(k => k in M), 'chaque partie est là');
verif(M.monde.cycle === A.cycle && A.cycle === lireJ(`${D}/instantane.json`).cycle.n, `le cycle du rapport est celui du monde (${A.cycle})`);
verif(M.serie.length >= 2 && M.serie[M.serie.length - 1].n === A.cycle, `la série couvre l'historique et finit au cycle du monde (${M.serie.length} cycles)`);
verif(M.effectifs.lignees_animales > 0 && M.effectifs.betes > 0, `${M.effectifs.lignees_animales} lignées animales, ${M.effectifs.betes.toLocaleString('fr-FR')} bêtes`);
verif(M.groupes.every(g => g.cle === `${g.regime}|${g.origine}` && g.lignees > 0), `${M.groupes.length} groupes (régime × origine)`);
verif(!M.climat || M.climat.courbe.length > 10 && M.climat.reperes.length >= 1, 'le climat : une courbe prévue et ses repères');
verif(A.titre === null && A.constats === null, 'sans récit : les champs du récit sont vides');

console.log('2. les règles des alertes');
{ // un retrait lissé sur une population, et la population n'a pas de mort due aux joueurs
  const W = monde(), t = W.I.taxons.find(x => !x.eteint && x.populations.length && x.plan.regime === 'herbivore'), p = t.populations[0];
  delete p.pression; W.T = { ...W.T, lisse: { [t.id]: { [p.biome]: { '*': 1.5 } } } };
  const R = Sante.mesurer(W).mesures, x = R.pressions.retraits.find(r => r.taxon === t.id);
  verif(x && !x.applique && R.pressions.retrait_perdu === 1.5, 'un retrait sans mort est compté perdu');
  verif(R.alertes.some(a => a.niveau === 'alerte' && a.sujet === 'retraits'), 'et lève une alerte');
  p.pression = .01; const R2 = Sante.mesurer(W).mesures;
  verif(R2.pressions.retrait_perdu === 0 && !R2.alertes.some(a => a.sujet === 'retraits'), 'avec des morts dues aux joueurs : pas d\'alerte');
}
{ // un groupe de cinq lignées qui recule à chaque cycle
  const W = monde(), L = W.I.taxons.filter(x => !x.eteint && x.plan.regime === 'carnivore' && !x.origine).slice(0, 5);
  for (const t of L) t.origine = { monde: 'banc', nom: 'le banc' };
  const ids = new Set(L.map(t => t.id)), n = W.H.length;
  W.H.forEach((h, k) => { for (const t of h.taxons) if (ids.has(t.id)) for (const p of t.populations) p.effectif = Math.round(1000 * Math.pow(.9, k)); });
  for (const t of W.I.taxons) if (ids.has(t.id)) for (const p of t.populations) p.effectif = Math.round(1000 * Math.pow(.9, n));
  const R = Sante.mesurer(W).mesures, g = R.groupes.find(x => x.cle === 'carnivore|le banc');
  verif(L.length === 5 && g && g.variation < -.2, `un groupe de cinq lignées qui perd ${g ? Math.round(-g.variation * 100) : '?'} %`);
  verif(R.alertes.some(a => a.niveau === 'alerte' && a.cle === 'carnivore|le banc'), 'recule à chaque cycle : une alerte');
}
{ // une extinction dans la fenêtre
  const W = monde(), t = W.I.taxons.find(x => !x.eteint && x.populations.length), n = W.I.cycle.n;
  t.eteint = n; t.populations = [];
  W.C = { ...(W.C || {}), derniers: [...(W.C?.derniers || []), { type: 'extinction', taxon: t.id, texte: `${t.nom} s'éteint après 12 cycles : trop peu nombreuse pour tenir` }] };
  const R = Sante.mesurer(W).mesures, e = R.effectifs.eteintes.find(x => x.taxon === t.id);
  verif(e && e.cause === 'trop peu nombreuse pour tenir', 'une extinction de la fenêtre, avec sa cause');
  verif(R.alertes.some(a => a.sujet === 'extinction' && a.niveau === 'info'), 'et sa ligne dans les alertes');
}

console.log('3. le récit gardé, l\'index');
{
  const T = fs.mkdtempSync(path.join(os.tmpdir(), 'sante-')), dossier = path.join(T, 'monde'), sortie = path.join(T, 'sante', 'genese-2026');
  fs.mkdirSync(path.join(dossier, 'chronique'), { recursive: true }); fs.mkdirSync(sortie, { recursive: true });
  for (const f of ['instantane', 'historique', 'tampon', 'profil']) fs.copyFileSync(racine(`${D}/${f}.json`), path.join(dossier, `${f}.json`));
  fs.copyFileSync(racine(`${D}/chronique/index.json`), path.join(dossier, 'chronique', 'index.json'));
  const f1 = path.join(sortie, '2026-11-09.json'), f2 = path.join(sortie, '2026-11-16.json');
  const cli = args => execFileSync(process.execPath, [racine('outils/sante.js'), ...args], { encoding: 'utf8' });
  cli([dossier, '--date', '2026-11-09', '--sortie', f1]);
  const R1 = JSON.parse(fs.readFileSync(f1, 'utf8')); R1.titre = 'Un titre écrit à la main'; R1.constats = [{ niveau: 'info', titre: 'Un constat', texte: 'écrit à la main' }]; fs.writeFileSync(f1, JSON.stringify(R1));
  cli([dossier, '--date', '2026-11-09', '--sortie', f1]);
  const R1b = JSON.parse(fs.readFileSync(f1, 'utf8'));
  verif(R1b.titre === 'Un titre écrit à la main' && R1b.constats.length === 1 && R1b.mesures, 'les mesures refaites, le récit gardé');
  cli([dossier, '--date', '2026-11-16', '--precedent', f1, '--sortie', f2]);
  const R2 = JSON.parse(fs.readFileSync(f2, 'utf8'));
  verif(R2.mesures.comparaison && R2.mesures.comparaison.rapport === '2026-11-09', 'avec --precedent : l\'écart au rapport d\'avant');
  cli(['--indexer', sortie]);
  const X = JSON.parse(fs.readFileSync(path.join(sortie, 'index.json'), 'utf8'));
  verif(X.rapports.length === 2 && X.rapports[0].fichier === '2026-11-16.json' && X.rapports[1].titre === 'Un titre écrit à la main', 'l\'index : deux rapports, le plus récent d\'abord, avec leur titre');
  fs.rmSync(T, { recursive: true, force: true });
}

console.log('4. l\'Observatoire');
{
  const html = fs.readFileSync(racine('monde/index.html'), 'utf8'), js = fs.readFileSync(racine('monde/sante.js'), 'utf8');
  verif(/<script src="sante\.js"><\/script>\s*<script>/.test(html), 'monde/index.html charge monde/sante.js avant son script');
  verif(/data-v="sante"/.test(html) && /sante: typeof vueSante === 'function'/.test(html), 'la vue Santé est dans la navigation');
  verif(/\.\.\/sante\/\$\{encodeURIComponent\(id\)\}\/index\.json/.test(js), 'elle lit sante/<monde>/index.json');
  verif(/les rapports de santé/.test(fs.readFileSync(racine('.github/workflows/cycle.yml'), 'utf8')), 'le cycle publie la branche sante avec le site');
}

console.log(`\n${ok ? 'tout passe' : 'ÉCHEC'}`); process.exit(ok ? 0 : 1);
