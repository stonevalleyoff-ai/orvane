// Orvane — LA BRANCHE DE PUBLICATION (hebergement/publication.js) — docs/19
// Le site (l'accueil, l'observatoire, les mondes que lisent les jeux) est servi par GitHub Pages depuis la branche `publication`.
// L'action du cycle la réécrit à chaque passe en un seul commit, sans historique : le dépôt ne grossit plus de l'état du monde
// (27 Mo réécrits par cycle quand il vivait dans `main`). `main` garde le code, et ce qu'un auteur écrit de chaque monde.
//
// Dans un dossier de monde (mondes/<id>/), deux sortes de fichiers :
//  - ce qu'on écrit à la main, qui vient toujours de `main` : profil.json, amorce.json, ancetres.json, genese.json, et les lots ou
//    les noms déposés à la main (lots/, noms/) ;
//  - ce que le cycle écrit (etat.json, instantane.json, historique.json, tampon.json, flore.json, jeux.json, generation-0.json,
//    chronique/, museum.json, morceaux/, lots/traites/, noms/traites/) : il vient de la publication, sauf si `main` en porte un plus
//    récent (son etat.json a un cycle plus avancé) ou un monde né à nouveau (un autre monde.ne).
// Pour faire renaître un monde : dans main, supprimer son état (etat.json, generation-0.json, instantane.json, historique.json,
// tampon.json) et poser dans son profil monde.renaitre, une date ("2026-11-06") ; la passe suivante repart de main, une fois. Une
// autre date, une autre renaissance.
// Un lot ou un nom déposé à la main et déjà traité (dans lots/traites/ ou noms/traites/ de la publication) n'est pas relu.
//
//   node hebergement/publication.js reprendre <dossier>   (<dossier> : la branche publication extraite ; il contient mondes/)
'use strict';
const fs = require('fs'), path = require('path');

const ECRITS = new Set(['profil.json', 'amorce.json', 'ancetres.json', 'genese.json']);   // ce qu'un auteur écrit d'un monde
const DEPOTS = ['lots', 'noms'];                                                           // ce qu'on y dépose à la main ; le cycle en range ce qu'il a lu dans <dépôt>/traites/
const lireEtat = d => { try { const E = JSON.parse(fs.readFileSync(path.join(d, 'etat.json'), 'utf8')); return { n: E.cycle?.n ?? null, ne: E.monde?.ne ?? null }; } catch (e) { return null; } };
const copier = (a, b) => fs.cpSync(a, b, { recursive: true, force: true });

// l'état d'un monde, de la publication vers le dossier de travail (une copie de `main`)
const renaitre = d => { try { return JSON.parse(fs.readFileSync(path.join(d, 'profil.json'), 'utf8')).monde?.renaitre ?? null; } catch (e) { return null; } };
function reprendreMonde(pub, ici) {
  const P = lireEtat(pub), M = lireEtat(ici), R = renaitre(ici);
  if (!P) return 'rien à reprendre (pas d\'etat.json publié)';
  if (R != null && R !== renaitre(pub)) return `le profil demande une renaissance (${R}) : on part de main`;
  if (M && M.ne !== P.ne) return `main porte un monde né à nouveau (${M.ne}) : on part de main`;
  if (M && M.n != null && P.n != null && M.n > P.n) return `main porte un état plus récent (cycle ${M.n} contre ${P.n}) : on part de main`;
  // ce que le cycle écrit : celui de la publication remplace celui de main (et ce que main a en plus de ces fichiers est retiré)
  for (const x of fs.readdirSync(ici)) if (!ECRITS.has(x) && !DEPOTS.includes(x)) fs.rmSync(path.join(ici, x), { recursive: true, force: true });
  for (const x of fs.readdirSync(pub)) if (!ECRITS.has(x) && !DEPOTS.includes(x)) copier(path.join(pub, x), path.join(ici, x));
  // les dépôts : ce qui a déjà été traité n'est pas relu
  for (const d of DEPOTS) { const tP = path.join(pub, d, 'traites'); if (!fs.existsSync(tP)) continue;
    copier(tP, path.join(ici, d, 'traites'));
    for (const x of fs.readdirSync(tP)) { const f = path.join(ici, d, x); if (fs.existsSync(f) && fs.statSync(f).isFile()) fs.rmSync(f); } }
  return `repris au cycle ${P.n}`;
}

function reprendre(dossier) {
  const pubM = path.join(dossier, 'mondes'), iciM = path.join(process.cwd(), 'mondes');
  if (!fs.existsSync(pubM)) { console.log('la publication n\'a pas de mondes : on part de main'); return; }
  for (const id of fs.readdirSync(pubM).sort()) { const pub = path.join(pubM, id), ici = path.join(iciM, id);
    if (!fs.statSync(pub).isDirectory()) continue;
    if (!fs.existsSync(ici)) { console.log(`${id} : n'est plus dans main, il n'est plus publié`); continue; }
    console.log(`${id} : ${reprendreMonde(pub, ici)}`); }
}

if (require.main === module) {
  const [cmd, dossier] = process.argv.slice(2);
  if (cmd !== 'reprendre' || !dossier) { console.log('node hebergement/publication.js reprendre <dossier de la branche publication>'); process.exit(2); }
  reprendre(path.resolve(dossier));
}
module.exports = { reprendre, reprendreMonde, ECRITS, DEPOTS };
