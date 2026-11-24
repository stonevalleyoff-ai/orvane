// Orvane — LE PROTOCOLE DE L'ÉTALON (outils/protocole.js) — docs/59
// etalon/protocole.json dit, avant qu'on lance l'étalon, ce que mesure chaque test, sa cible, sa tolérance, d'où viennent ses données et
// ce qu'il prouve (sa nature : validation, guide, réglage, garde-fou, calage). L'étalon (outils/etalon.js) y lit ses seuils, et rien
// d'autre. Le protocole est verrouillé : son empreinte (le SHA-256 de tout ce qu'il dit, sauf son empreinte et son historique) doit être
// celle de sa dernière version. Changer une cible, une tolérance, une nature ou une donnée, c'est écrire une version de plus, datée,
// avec sa raison ; bancs/protocole.js refuse un protocole changé sans elle.
//   node outils/protocole.js                                 ce que dit le protocole, et s'il tient
//   node outils/protocole.js --nouvelle-version "pourquoi"   la version suivante, datée du jour, avec sa raison et son empreinte
'use strict';
const fs = require('fs'), path = require('path');
const Journal = require('../hebergement/journal.js');

// (ORVANE_PROTOCOLE : un autre fichier, pour un essai ; le rapport de l'étalon dit toujours la version et l'empreinte qu'il a suivies)
const FICHIER = process.env.ORVANE_PROTOCOLE ? path.resolve(process.env.ORVANE_PROTOCOLE) : path.join(__dirname, '..', 'etalon', 'protocole.json');
const NATURES = ['validation', 'guide', 'reglage', 'garde-fou', 'calage'], ROLES = ['entree', 'calage', 'reglage', 'validation'];
const lire = (f = FICHIER) => JSON.parse(fs.readFileSync(f, 'utf8'));
const empreinte = P => { const { empreinte: _e, historique: _h, ...reste } = P; return Journal.empreinte(Journal.stable(reste)); };
// les seuils d'un test : l'étalon n'en a pas d'autres
const seuils = (P, id) => { const t = P.tests?.[id]; if (!t?.seuils) throw new Error(`le protocole n'a pas de seuils pour le test ${id}`); return t.seuils; };

// ce qui ne tient pas : une liste de phrases (vide si tout tient)
function verifier(P, { regles } = {}) {
  const pb = [], H = P.historique || [], der = H[H.length - 1];
  if (empreinte(P) !== P.empreinte) pb.push(`le protocole a changé sans nouvelle version (son empreinte est ${empreinte(P).slice(0, 12)}…, sa version ${P.version} dit ${String(P.empreinte).slice(0, 12)}…) : node outils/protocole.js --nouvelle-version "pourquoi"`);
  if (!der || der.version !== P.version || der.empreinte !== P.empreinte || der.date !== P.date) pb.push('la dernière version de l\'historique n\'est pas celle du protocole (version, date, empreinte)');
  H.forEach((v, i) => { if (!v.pourquoi) pb.push(`la version ${v.version} ne dit pas pourquoi`); if (i && (v.version !== H[i - 1].version + 1 || v.date < H[i - 1].date)) pb.push(`l'historique saute de la version ${H[i - 1].version} à la ${v.version}, ou recule dans le temps`); });
  for (const [id, d] of Object.entries(P.donnees || {})) if (!ROLES.includes(d.role)) pb.push(`la donnée ${id} a un rôle inconnu (${d.role})`);
  for (const [id, t] of Object.entries(P.tests || {})) {
    if (!NATURES.includes(t.nature)) pb.push(`le test ${id} a une nature inconnue (${t.nature})`);
    if (!t.seuils || typeof t.seuils !== 'object') pb.push(`le test ${id} n'a pas de seuils`);
    for (const d of t.donnees || []) { const D = P.donnees?.[d]; if (!D) { pb.push(`le test ${id} cite une donnée inconnue (${d})`); continue; }
      if (t.nature === 'validation' && (D.role === 'calage' || D.role === 'reglage')) pb.push(`le test ${id} se dit une validation, mais la donnée ${d} a servi à régler le moteur (${D.role})`); }
    if (t.nature === 'guide' && !(t.historique || []).length) pb.push(`le test ${id} a guidé des corrections : son historique doit dire lesquelles`); }
  for (const r of P.reserves || []) if (!r.id || !r.critere || !r.donnees) pb.push(`un test réservé n'a pas d'id, de critère ou de données (${r.id || '?'})`);
  if (regles) { const G = new Set(P.regles_gelees?.regles || []), R = new Set(regles), plus = [...R].filter(k => !G.has(k)), moins = [...G].filter(k => !R.has(k));
    if (plus.length || moins.length) pb.push(`le moratoire : ${plus.length ? `des règles nouvelles (${plus.join(', ')})` : ''}${plus.length && moins.length ? ', ' : ''}${moins.length ? `des règles retirées (${moins.join(', ')})` : ''} ; une règle ne s'ajoute ou ne se retire qu'avec une version du protocole qui le dit (docs/59)`); }
  return pb;
}

if (require.main === module) {
  const a = process.argv.slice(2), i = a.indexOf('--nouvelle-version');
  const P = lire();
  if (i >= 0) { const pourquoi = (a[i + 1] || '').trim(); if (!pourquoi) { console.error('--nouvelle-version "pourquoi" : il faut dire pourquoi'); process.exit(2); }
    P.version = (P.historique || []).reduce((m, v) => Math.max(m, v.version), 0) + 1; P.date = new Date().toISOString().slice(0, 10); P.empreinte = empreinte(P);
    P.historique = [...(P.historique || []), { version: P.version, date: P.date, empreinte: P.empreinte, pourquoi }];
    fs.writeFileSync(FICHIER, JSON.stringify(P, null, 1) + '\n'); console.log(`le protocole, version ${P.version} (${P.date}) : ${P.empreinte.slice(0, 16)}…`); process.exit(0); }
  const N = {}; for (const [id, t] of Object.entries(P.tests)) (N[t.nature] ||= []).push(id);
  console.log(`${P.protocole}, version ${P.version} du ${P.date} (${String(P.empreinte).slice(0, 16)}…) : ${Object.keys(P.tests).length} tests, ${(P.reserves || []).length} réservés, ${(P.regles_gelees?.regles || []).length} règles gelées`);
  for (const n of NATURES) if (N[n]) console.log(`  ${n} (${N[n].length}) : ${N[n].join(', ')}`);
  const pb = verifier(P, { regles: Object.keys(require('../moteur/orvane.js').REGLES) });
  for (const x of pb) console.log('  ✗ ' + x); if (!pb.length) console.log('  ✓ il tient'); process.exit(pb.length ? 1 : 0);
}

module.exports = { FICHIER, NATURES, ROLES, lire, empreinte, seuils, verifier };
