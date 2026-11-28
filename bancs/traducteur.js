// Orvane — LE BANC DU BANC GÉNÉRIQUE (bancs/traducteur.js, docs/39)
// outils/banc-traducteur.js doit laisser passer un traducteur correct, et attraper les fautes qu'un jeu fait d'habitude :
//  1. le traducteur d'exemple (traducteurs/exemple/traducteur.js) passe, sur tous les mondes, Lumen compris ;
//  2. un traducteur qui plante sur une forme qu'il ne connaît pas, qui montre les lignées éteintes, qui oublie celles qu'un joueur a
//     nommées, qui touche au monde qu'on lui donne, qui envoie ses lots à un autre monde ou des bêtes qui n'existent pas : chacun
//     est attrapé, et le banc dit pourquoi.
//   node bancs/traducteur.js
'use strict';
const path = require('path'), racine = p => path.join(__dirname, '..', p);
const { banc } = require(racine('outils/banc-traducteur.js')), X = require(racine('traducteurs/exemple/traducteur.js'));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); }, t0 = Date.now();
const essai = (T, lumen = false) => banc(T, { sessions: 5, lumen });
const attrape = (R, motif) => !R.ok && R.sortie.some(l => l.startsWith('  ✗') && motif.test(l));

console.log('1. Le traducteur d\'exemple');
{ const R = essai(X, true), mondes = R.sortie.filter(l => !l.startsWith('  ')).length;
  verif(R.ok && mondes >= 6 && R.sortie.some(l => /^Lumen/.test(l)), `il passe sur ${mondes} mondes, dont Lumen, un monde imaginaire ; et sur le monde piège (une pieuvre à l'organe inconnu, une lignée sans corps, une lignée éteinte, un lieu que nul jeu ne connaît)`);
}

console.log('2. Les fautes d\'un traducteur');
{ const fautes = [
    ['qui plante sur une forme qu\'il ne connaît pas', { ...X, lire: I => X.lire(I).map(c => { if (!['quadrupede', 'hexapode', 'bipede', 'oiseau', 'serpent', 'inconnue'].includes(c.forme)) throw new Error(`forme ${c.forme}`); return c; }) }, /lève une erreur/],
    ['qui montre les lignées éteintes', { ...X, lire: I => [...X.lire(I), ...I.taxons.filter(t => t.eteint).map(t => ({ taxon: t.id, biome: I.biomes[0].id }))] }, /éteinte/],
    ['qui oublie les lignées qu\'un joueur a nommées', { ...X, lire: I => X.lire(I).filter(c => !I.taxons.find(t => t.id === c.taxon)?.nom_commun) }, /oubliée/],
    ['qui touche au monde qu\'on lui donne', { ...X, lire: I => { I.taxons.sort((a, b) => a.id < b.id ? 1 : -1); return X.lire(I); } }, /modifie le monde/],
    ['qui envoie ses lots à un autre monde', { ...X, jouer: (I, h) => ({ ...X.jouer(I, h), monde: 'sv-1' }) }, /pas pour/],
    ['qui envoie des bêtes qui n\'existent pas', { ...X, jouer: (I, h) => { const l = X.jouer(I, h); l.evenements.push({ taxon: 'licorne', biome: I.biomes[0].id, action: 'rencontre', n: 1 }); return l; } }, /tampon écarte/],
  ];
  for (const [quoi, T, motif] of fautes) { const R = essai(T), l = R.sortie.find(x => x.startsWith('  ✗')) || '';
    verif(attrape(R, motif), `un traducteur ${quoi} : attrapé — « ${l.replace(/^ {2}✗ /, '').slice(0, 110)} »`); }
}
console.log(`\n${ok ? 'tout passe' : 'ÉCHEC'} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(ok ? 0 : 1);
