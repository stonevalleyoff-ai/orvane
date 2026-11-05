// Orvane — LE BANC DU COMPAGNON (bancs/compagnon.js, simulation/compagnon.js)
// Une bête d'Orvane à élever, en temps réel. Ce banc vérifie :
//  1. ce qu'elle est décide de ce dont elle a besoin : son régime, son métabolisme, ses heures de sommeil, son habitat ;
//  2. soignée, elle va bien et se fie à vous ; laissée à elle-même, elle meurt de faim ; le mode doux veille pendant l'absence ;
//  3. elle tombe malade plus souvent quand sa lignée a une épidémie, guérit d'un soin ; elle apprend ; elle grandit et vieillit ;
//  4. adulte, elle a des petits (Mendel, une génération de plus) ; un œuf éclot ; la partie se garde, déterministe.
//   node bancs/compagnon.js
'use strict';
const fs = require('fs'), path = require('path');
const racine = p => path.join(__dirname, '..', p);
const C0 = require(racine('simulation/compagnon.js')), Individus = require(racine('tampon/individus.js')), Orvane = require(racine('moteur/orvane.js'));
const lireJ = f => JSON.parse(fs.readFileSync(racine(f), 'utf8'));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const I = lireJ('mondes/orvane/instantane.json'), H = 36e5, T0 = Date.parse('2026-11-05T09:00:00'), cat = I.catalogue.traits;
const fx = (x, d = 1) => (+x).toLocaleString('fr-FR', { maximumFractionDigits: d });
// une bête tirée de la population réelle (un tirage fixe : le banc est déterministe)
const graine = s => { let a = s >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const vivantes = I.taxons.filter(t => !t.eteint && !['vegetal', 'synthetique'].includes(t.plan.regime));
const trouver = f => vivantes.find(t => f(t.plan));
const bete = (t, s = 1, opt = {}) => { const b = t.populations.slice().sort((a, b) => b.effectif - a.effectif)[0].biome, ind = Individus.tirer(I, t.id, b, { r: graine(s), ...opt });
  return C0.adopter(ind, t, { biome: b, maintenant: T0, cat, ...opt.c }); };
const confortDe = (C, bid) => { const b = I.biomes.find(x => x.id === bid); return Orvane.convenance(C.plan, b.axes_saison ? { ...b, axes: b.axes_saison } : b); };
// une journée de soins : chaque demi-heure, ce qu'elle réclame
// (heures : de son temps à lui ; en accéléré, une demi-heure de sa vie passe plus vite que la vôtre)
const soigner = (C, heures, ctx = {}) => { for (let k = 0; k < heures * 2 && !C.mort; k++) { C0.avancer(C, C.dernier + H / 2 / R.vitesse, ctx); const L = C0.lire(C), M = L.menu, pref = Object.entries(M).sort((a, b) => b[1] - a[1])[0][0];
  if (L.reclame === 'nourrir') C0.agir(C, 'nourrir', pref); else if (L.reclame === 'nettoyer') C0.agir(C, 'nettoyer'); else if (L.reclame === 'soigner') C0.agir(C, 'soigner'); else if (L.reclame === 'jouer') C0.agir(C, 'jouer');
  if (!C.dort && k % 4 === 0) C0.agir(C, 'caresser'); } };
const R = C0.REGLES; R.doux = false;

console.log('1. Ce qu\'elle est décide de ce dont elle a besoin');
const herb = trouver(p => p.regime === 'herbivore' && !p.diete?.viande && p.masse_kg > .1), carn = trouver(p => p.regime === 'carnivore' && (p.diete?.viande || 0) > .5);
{ const H1 = bete(herb), K1 = bete(carn);
  verif(!C0.agir(H1, 'nourrir', 'viande').ok && C0.agir(H1, 'nourrir', Object.keys(C0.menu(H1.plan))[0]).ok, `${H1.espece} (herbivore) refuse la viande, mange ${C0.ALIMENTS[Object.keys(C0.menu(H1.plan))[0]][0]}`);
  verif(!C0.agir(K1, 'nourrir', 'feuilles').ok && C0.agir(K1, 'nourrir', 'viande').ok, `${K1.espece} (carnivore) refuse les feuilles, mange la viande`); }
{ const petit = trouver(p => p.masse_kg < .05 && p.regime === 'herbivore'), grand = trouver(p => p.masse_kg > 30 && p.regime === 'herbivore'); const a = bete(petit), b = bete(grand);
  a.faim = b.faim = 100; a.dort = b.dort = false; C0.avancer(a, T0 + 4 * H); C0.avancer(b, T0 + 4 * H);
  verif(a.faim < b.faim, `une petite bête a faim plus vite : ${a.espece} (${fx(a.plan.masse_kg, 3)} kg) à ${fx(a.faim)}, ${b.espece} (${fx(b.plan.masse_kg)} kg) à ${fx(b.faim)} après 4 h`); }
{ const jour = trouver(p => p.activite === 'diurne'), nuit = trouver(p => p.activite === 'nocturne'), A = bete(jour), B = bete(nuit), midi = Date.parse('2026-11-05T12:00:00'), minuit = Date.parse('2026-11-06T00:30:00');
  A.energie = B.energie = 70; C0.avancer(A, midi); C0.avancer(B, midi); const jA = A.dort, jB = B.dort; C0.avancer(A, minuit); C0.avancer(B, minuit);
  verif(!jA && jB && A.dort && !B.dort, `chacun à ses heures : la diurne veille à midi et dort à minuit, la nocturne l\'inverse`); }
{ const t = herb, b = t.populations.slice().sort((a, b) => b.effectif - a.effectif)[0].biome, mauvais = I.biomes.map(x => x.id).sort((x, y) => confortDe({ plan: t.plan }, x) - confortDe({ plan: t.plan }, y))[0];
  const A = bete(t, 3), B = bete(t, 3); soigner(A, 36, { confort: confortDe(A, b) }); soigner(B, 36, { confort: confortDe(B, mauvais) });
  verif(A.sante > B.sante + 10, `son habitat compte (Orvane.convenance) : dans son biome (${b}, confort ${fx(confortDe(A, b), 2)}) santé ${fx(A.sante)} ; au ${mauvais} (confort ${fx(confortDe(B, mauvais), 2)}) santé ${fx(B.sante)}`); }

console.log('2. Soignée, laissée, veillée');
{ const A = bete(herb, 7), conf0 = A.confiance; soigner(A, 48, { confort: 1 });
  verif(!A.mort && A.sante > 70 && A.faim > 30, `soignée deux jours : en vie, santé ${fx(A.sante)}, satiété ${fx(A.faim)}`);
  verif(A.confiance > conf0 + 20, `elle se fie à vous : confiance de ${fx(conf0)} à ${fx(A.confiance)}`);
  const B = bete(herb, 7); C0.avancer(B, T0 + 4 * 24 * H, { confort: 1 }); verif(!!B.mort && /faim/.test(B.mort.cause), `laissée quatre jours sans soins : elle meurt (${B.mort?.cause})`);
  R.doux = true; const D = bete(herb, 7); C0.avancer(D, T0 + 4 * 24 * H, { confort: 1, absent: true }); R.doux = false;
  verif(!D.mort && D.faim >= R.plancher, `le mode doux : quatre jours d\'absence, elle vous attend (satiété ${fx(D.faim)})`);
  const audace = s => { let best = null; for (let k = 1; k < 60; k++) { const c = bete(herb, k); if (!best || (s > 0 ? c.ind.z.audace > best.ind.z.audace : c.ind.z.audace < best.ind.z.audace)) best = c; } return best; };
  const hardi = audace(1), timide = audace(-1); verif(hardi.confiance > timide.confiance, `une bête audacieuse se fie plus vite : ${fx(hardi.confiance)} contre ${fx(timide.confiance)} pour une timide`); }

console.log('3. La maladie, l\'apprentissage, l\'âge');
{ let sain = 0, epid = 0; for (let k = 0; k < 40; k++) { const a = bete(herb, 100 + k), b = bete(herb, 100 + k); soigner(a, 24, { confort: 1 }); soigner(b, 24, { confort: 1, epidemie: .5 }); sain += a.journal.some(j => j.type === 'maladie'); epid += b.journal.some(j => j.type === 'maladie'); }
  verif(epid > sain * 2, `quand sa lignée a une épidémie là où elle vit, elle tombe malade plus souvent : ${epid} sur 40, contre ${sain}`); }
{ const A = bete(herb, 9); A.malade = { virulence: 1 }; let n = 0; while (A.malade && n < 6) { C0.agir(A, 'soigner'); n++; } verif(!A.malade, `un soin la guérit (${n} essai${n > 1 ? 's' : ''})`); }
{ const A = bete(trouver(p => (p.sociabilite || 0) > .5), 11); A.confiance = 80; let n = 0, appris = null; while (!appris && n < 60) { A.energie = 90; A.dort = false; const r = C0.agir(A, 'dresser'); if (/a appris/.test(r.texte || '')) appris = r.texte; n++; }
  verif(!!appris, `elle apprend : « ${appris} » en ${n} leçons`); const B = bete(herb, 12); B.confiance = 10; verif(!C0.agir(B, 'dresser').ok, 'pas sans confiance'); }
{ R.vitesse = 60; const A = bete(herb, 13, { c: { age: 0 } }); let adulte = null, fin = null;
  for (let k = 0; k < 24 * 400 && !A.mort; k++) { soigner(A, .5, { confort: 1 }); if (!adulte && C0.stadeDe(A) !== 'jeune') adulte = A.age; }
  verif(adulte != null && Math.abs(adulte - A.plan.maturite) < .5, `elle grandit : adulte à ${fx(adulte, 2)} cycles de vie (maturité de sa lignée : ${A.plan.maturite})`);
  verif(A.mort?.cause === 'la vieillesse' && A.mort.age >= A.plan.longevite * (A.ind.vigueur ?? 1), `bien soignée, elle meurt de vieillesse, à ${fx(A.mort?.age, 1)} cycles (longévité ${A.plan.longevite})`); R.vitesse = 1; }

console.log('4. Les petits, l\'œuf, la partie gardée');
{ const t = herb, b = t.populations.slice().sort((a, b) => b.effectif - a.effectif)[0].biome; let m = null, p = null;
  for (let k = 0; k < 40 && !(m && p); k++) { const x = Individus.tirer(I, t.id, b, { r: graine(200 + k) }); if (x.sexe === 'f' && !m) m = x; if (x.sexe === 'm' && !p) p = x; }
  const A = C0.adopter(m, t, { biome: b, maintenant: T0, cat }); A.age = A.plan.maturite + 1; A.confiance = 70;
  const r = Individus.croiser(A.ind, p, I, { r: graine(5) }); verif(C0.lire(A).peutAvoirDesPetits && r.ok, 'adulte et confiante, elle peut avoir des petits avec une bête sauvage de sa lignée');
  const P = C0.naissance(A, r.petit, t, { biome: b }); verif(P.generation === 1 && P.ind.parents?.[0] === A.ind.id && A.enfants === 1, `un petit de la génération 1 (${P.nom}), de mère ${A.nom}`);
  const ov = trouver(q => q.reproduction === 'ovipare'), O = bete(ov, 21, { c: { oeuf: true } }); C0.avancer(O, T0 + (R.heures_par_cycle * R.incubation + .2) * H);
  verif(!O.oeuf && O.journal.some(j => j.type === 'naissance'), `l\'œuf d\'un pondeur (${O.espece}) éclot en ${R.heures_par_cycle * R.incubation} h`); }
{ const a = bete(herb, 31), b = C0.charger(C0.sauver(a)); soigner(a, 30, { confort: .8 }); soigner(b, 30, { confort: .8 });
  verif(C0.sauver(a) === C0.sauver(b), 'gardée puis reprise, la même vie, au tirage près'); }

console.log(`\n${ok ? 'Tout est bon' : 'ÉCHEC'}`);
process.exit(ok ? 0 : 1);
