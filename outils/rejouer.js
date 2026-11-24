// Orvane — REJOUER UN CYCLE (outils/rejouer.js) — docs/59
// Le journal d'un monde (mondes/<id>/journal.json, hebergement/journal.js) dit, pour chaque cycle, l'empreinte de l'état que le moteur
// a reçu, les pressions des jeux, la durée du cycle et l'empreinte de ce que le moteur a rendu. Rejouer un cycle, c'est redonner au
// moteur le même état et les mêmes pressions, et vérifier qu'il rend le même monde, au bit près.
//   node outils/rejouer.js <etat.json d'avant> <journal.json> [--cycle N]
// L'état d'avant vient d'une sauvegarde : l'artefact « etat-mondes » de la passe d'avant (30 jours), ou une archive (docs/59). Sans
// --cycle, la ligne du journal est celle qui part de cet état. Il faut le même code : le journal dit son commit
// (git checkout <commit>, si ce n'est pas celui d'ici).
// Sortie : 0 si le cycle est rejoué au bit près, 1 s'il diffère, 2 s'il ne peut pas être rejoué (aucune ligne ne part de cet état, les
// pressions n'ont pas été gardées).
'use strict';
const fs = require('fs'), path = require('path');
const Journal = require('../hebergement/journal.js');

// rejouer une ligne du journal à partir d'un état (un objet, lu du JSON de la sauvegarde) : 'identique', 'different' ou 'impossible'
function rejouer(etat, ligne, Orvane) {
  if (!ligne) return { etat: 'impossible', pourquoi: 'pas de ligne de journal' };
  if (ligne.avant && Journal.empreinte(etat) !== ligne.avant) return { etat: 'impossible', pourquoi: "cet état n'est pas celui que le moteur a reçu à ce cycle (son empreinte diffère)" };
  if (ligne.pressions == null && ligne.pressions_empreinte) return { etat: 'impossible', pourquoi: 'les pressions de ce cycle étaient trop grosses pour le journal : seule leur empreinte est gardée' };
  const S = Orvane.cycle(etat, ligne.pressions ?? {}, { duree_ms: ligne.duree_ms ?? undefined }), apres = Journal.empreinte(S);
  return { etat: apres === ligne.apres ? 'identique' : 'different', apres, attendu: ligne.apres ?? null, n: S.cycle?.n ?? null };
}

if (require.main === module) {
  const a = process.argv.slice(2), libres = a.filter((x, i) => !x.startsWith('--') && a[i - 1] !== '--cycle'), iC = a.indexOf('--cycle');
  const [fEtat, fJournal] = libres;
  if (!fEtat || !fJournal) { console.error('node outils/rejouer.js <etat.json d\'avant> <journal.json> [--cycle N]'); process.exit(2); }
  const racine = path.join(__dirname, '..'), Orvane = require(path.join(racine, 'moteur/orvane.js'));
  const etat = JSON.parse(fs.readFileSync(fEtat, 'utf8')), journal = JSON.parse(fs.readFileSync(fJournal, 'utf8')), h = Journal.empreinte(etat);
  const ligne = iC >= 0 ? journal.find(x => x.n === +a[iC + 1]) : journal.find(x => x.avant === h);
  if (!ligne) { console.log(iC >= 0 ? `✗ le journal n'a pas de cycle ${a[iC + 1]} (il va du cycle ${journal[0]?.n} au cycle ${journal[journal.length - 1]?.n})`
    : `✗ aucune ligne du journal ne part de cet état (cycle ${etat.cycle?.n}, empreinte ${h.slice(0, 12)}…) : est-ce l'état d'avant, tel que la passe l'a sauvé ?`); process.exit(2); }
  const ici = Journal.moteur(racine);
  console.log(`cycle ${ligne.n} du monde ${etat.monde?.id ?? '?'} : écrit par le commit ${ligne.moteur ?? 'inconnu'}${ligne.modifie ? ' (modifié à la main)' : ''}, rejoué avec ${ici.commit ?? 'un code hors git'}${ici.modifie ? ' (modifié à la main)' : ''}`);
  if (ligne.moteur && ici.commit && ligne.moteur !== ici.commit) console.log(`  ⚠ ce n'est pas le même code : pour rejouer au bit près, git checkout ${ligne.moteur}`);
  const t0 = Date.now(), r = rejouer(etat, ligne, Orvane), s = ((Date.now() - t0) / 1000).toFixed(1);
  if (r.etat === 'identique') { console.log(`✓ rejoué au bit près en ${s} s : ${r.apres.slice(0, 16)}…`); process.exit(0); }
  if (r.etat === 'different') { console.log(`✗ le moteur rend un autre monde (${r.apres.slice(0, 16)}…, le journal dit ${String(r.attendu).slice(0, 16)}…)`); process.exit(1); }
  console.log(`✗ ${r.pourquoi}`); process.exit(2);
}

module.exports = { rejouer };
