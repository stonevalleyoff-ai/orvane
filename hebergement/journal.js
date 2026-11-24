// Orvane — LE JOURNAL D'UN MONDE (hebergement/journal.js) — docs/59
// Chaque cycle hébergé laisse une ligne dans mondes/<id>/journal.json : de quoi le rejouer, et de quoi vérifier qu'on l'a rejoué au bit
// près. Même état, mêmes pressions, même durée, même code : le moteur rend le même monde (sa graine et le numéro du cycle sèment tout
// son hasard). Une ligne dit :
//  - n, date : le cycle, et l'heure où il a été daté ;
//  - moteur : le commit du code qui l'a fait tourner (GITHUB_SHA dans l'action, sinon git), et s'il était modifié à la main ;
//  - contrat, graine : la version du contrat et la graine du monde ;
//  - regles : l'empreinte des règles du monde (monde.regles, celles de sa genèse et de son profil) ;
//  - avant : l'empreinte de l'état que le moteur a reçu ;
//  - pressions : ce que les jeux lui ont donné, après le tampon (ou seulement leur empreinte, au-delà de 200 000 caractères) ;
//  - duree_ms : la durée du cycle ;
//  - apres : l'empreinte de ce que le moteur a rendu, avant que l'hébergement n'y touche (la date, les arrivées d'une fusion, un
//    identifiant repris d'une lignée éteinte).
// Les empreintes sont des SHA-256 du JSON, tel que le moteur l'écrit. Le journal garde les 400 derniers cycles.
// Rejouer un cycle : node outils/rejouer.js <l'état d'avant> <journal.json> (docs/59).
'use strict';
const crypto = require('crypto'), { execFileSync } = require('child_process');

const GARDER = 400, PRESSIONS_MAX = 200000;
const empreinte = o => crypto.createHash('sha256').update(typeof o === 'string' ? o : JSON.stringify(o) ?? 'null').digest('hex');
// (un objet de réglages peut arriver dans un autre ordre sans changer : ses clés sont triées avant l'empreinte)
const stable = o => Array.isArray(o) ? `[${o.map(stable).join(',')}]` : o && typeof o === 'object'
  ? `{${Object.keys(o).filter(k => o[k] !== undefined).sort().map(k => `${JSON.stringify(k)}:${stable(o[k])}`).join(',')}}` : JSON.stringify(o) ?? 'null';

// le code qui tourne : le commit, et s'il diffère du commit dans ce que le cycle exécute (le moteur, le tampon, l'hébergement)
function moteur(racine) {
  const git = args => execFileSync('git', ['-C', racine, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  let commit = process.env.GITHUB_SHA || null, modifie = null;
  try { if (!commit) commit = git(['rev-parse', 'HEAD']); modifie = git(['status', '--porcelain', '--untracked-files=no', '--', 'moteur', 'tampon', 'hebergement']) !== ''; }
  catch (e) { /* pas un dépôt git : le journal le dit (null) */ }
  return { commit, modifie };
}

// une ligne : à préparer avant le cycle (ce que le moteur reçoit), à compléter juste après (ce qu'il rend)
function avant({ etat, pressions, duree_ms, code }) {
  const p = JSON.stringify(pressions ?? {});
  return { n: (etat.cycle?.n ?? 0) + 1, date: null, ne: etat.monde?.ne ?? null, moteur: code?.commit ?? null, ...(code?.modifie ? { modifie: true } : {}),
    contrat: etat.orvane ?? null, graine: etat.monde?.graine ?? null, regles: empreinte(stable(etat.monde?.regles ?? {})),
    avant: empreinte(etat), duree_ms: duree_ms ?? null,
    ...(p.length <= PRESSIONS_MAX ? { pressions: JSON.parse(p) } : { pressions: null, pressions_empreinte: empreinte(p) }) };
}
const apres = (ligne, suivant) => ({ ...ligne, n: suivant.cycle?.n ?? ligne.n, apres: empreinte(suivant) });

// le journal garde une ligne par cycle (la dernière écrite l'emporte), dans l'ordre, les GARDER dernières ; un monde né à nouveau
// (un autre monde.ne) recommence son journal
const noter = (journal, ...lignes) => { const ne = lignes.length ? lignes[lignes.length - 1].ne : undefined;
  const J = new Map((Array.isArray(journal) ? journal : []).filter(x => ne === undefined || x.ne === ne).map(x => [x.n, x])); for (const l of lignes) J.set(l.n, l);
  return [...J.values()].sort((x, y) => x.n - y.n).slice(-GARDER); };

module.exports = { GARDER, PRESSIONS_MAX, empreinte, stable, moteur, avant, apres, noter };
