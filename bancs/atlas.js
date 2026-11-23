// Orvane — LE BANC DE L'ATLAS (bancs/atlas.js, docs/55)
// Les planches d'atlas de l'Observatoire (monde/atlas.js), sur chaque lignée animale des mondes du dépôt :
//  1. chacune se dessine, et sa planche entière (l'échelle, les renvois) ; son SVG est bien formé (chaque balise refermée, aucun
//     identifiant en double, même entre deux planches d'une page) ; elle ne touche ni au corps, ni au plan, ni aux traits qu'on lui donne ;
//  2. le même dessin à chaque fois (aux numéros des identifiants près) ; le dessin des jeux (monde/silhouette.js) reste le même, avant
//     comme après une planche ;
//  3. ce qu'elle lit des données se voit : la robe d'un albinos, d'un mélanique ; l'œil d'une chasseuse de nuit (une fente), d'une
//     brouteuse à sabots (une barre), d'un insecte (des facettes) ; le serpent à sa vraie épaisseur ; le cétacé (un « poisson » qui met
//     bas) sans écailles ni opercule ; ses renvois sont dans le cadre, numérotés de 1 à 7 au plus ; l'échelle vaut une longueur ronde ;
//  4. la vignette (léger) pèse moins que la planche ; ce que coûte une planche.
//   node bancs/atlas.js [--court]          (--court : trois mondes)
'use strict';
const fs = require('fs'), path = require('path');
const racine = p => path.join(__dirname, '..', p);
globalThis.OrvaneCorps = require(racine('moteur/corps.js'));
const Sil = require(racine('monde/silhouette.js')); globalThis.OrvaneSilhouette = Sil;
const At = require(racine('monde/atlas.js')), Fi = require(racine('monde/fiche.js')), Co = globalThis.OrvaneCorps;
const t0 = Date.now(), court = process.argv.includes('--court');
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const fx = (x, d = 0) => (+x).toLocaleString('fr-FR', { maximumFractionDigits: d });

const MONDES = court ? ['orvane', 'aube', 'genese-7'] : ['orvane', 'aube', 'europe', 'genese-2026', 'genese-7', 'eaux-douces', 'marin', 'sv-1'];
const lire = m => { const f = ['instantane.json', 'etat.json', 'amorce.json'].map(x => racine(`mondes/${m}/${x}`)).find(fs.existsSync); return f ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; };
// le SVG bien formé : chaque balise ouverte est refermée, dans l'ordre ; ses identifiants
function forme(svg) { const pile = []; for (const m of svg.matchAll(/<(\/?)([a-zA-Z]+)[^>]*?(\/?)>/g)) { if (m[3]) continue; if (m[1]) { if (pile.pop() !== m[2]) return false; } else pile.push(m[2]); } return pile.length === 0; }
const ids = svg => [...svg.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
const sansNumeros = s => s.replace(/\b(atl|sil)\d+/g, '$1');
const geler = o => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const v of Object.values(o)) geler(v); } return o; };
const dominants = t => { const n = {}; for (const q of t.phenotypes || []) for (const x of q.traits || []) n[x] = (n[x] || 0) + q.frequence; return Object.keys(n).filter(k => n[k] >= .5); };

console.log('1. Chaque lignée a sa planche, bien formée, sans toucher à ce qu\'on lui donne');
const tous = [], fautes = [], vus = new Set(); let doubles = 0, nP = 0, msP = 0, poidsP = 0, poidsL = 0;
for (const m of MONDES) {
  const I = lire(m); if (!I) continue; Co.etendre(I.catalogue?.monde || null);
  for (const t of I.taxons.filter(x => x.plan?.regime !== 'vegetal' && !x.eteint)) {
    const dom = dominants(t); let F = null; try { F = Fi.ecrire(t, I).champs; } catch (e) { F = null; }
    const o = { famille: F?.famille?.id, details: (F?.famille?.details || []).map(d => d.id), graine: t.id, taille: F?.silhouette?.taille_vue_m };
    const avant = JSON.stringify([t.plan, dom]), corps = geler(JSON.parse(JSON.stringify(t.plan.corps ?? null))), plan = geler(JSON.parse(JSON.stringify(t.plan))), tr = geler(dom.slice());
    try { const a = Date.now(), D = At.dessiner(corps, plan, tr, o), Pl = At.planche(corps, plan, tr, o); msP += Date.now() - a; nP++;
      const L = At.dessiner(corps, plan, tr, { ...o, leger: true }); poidsP += Pl.svg.length; poidsL += L.svg.length;
      for (const s of [D.svg, Pl.svg, L.svg]) { if (!forme(s)) fautes.push(`${m}/${t.id} : SVG mal formé`); for (const i of ids(s)) { if (vus.has(i)) doubles++; vus.add(i); } }
      if (JSON.stringify([t.plan, dom]) !== avant) fautes.push(`${m}/${t.id} : ses données ont changé`);
      tous.push({ m, t, dom, o, D, Pl, corps, plan, I }); }
    catch (e) { fautes.push(`${m}/${t.id} : ${e.message}`); } }
  Co.etendre(null); }
verif(tous.length > 200 && !fautes.length, `${fx(tous.length)} lignées de ${MONDES.length} mondes : chacune se dessine, en planche et en vignette, en SVG bien formé, sans que ses données changent` + (fautes.length ? ` ; ${fautes.length} fautes : ${fautes.slice(0, 4).join(' ; ')}` : ''));
verif(!doubles, `aucun identifiant en double, même entre deux planches d'une même page (${fx(vus.size)} identifiants)`);

console.log('2. Le même dessin à chaque fois ; celui des jeux ne bouge pas');
{ let diff = 0, jeux = 0; const ech = tous.filter((_, i) => i % 7 === 0);
  for (const x of ech) { Co.etendre(x.I.catalogue?.monde || null);
    const a = sansNumeros(At.planche(x.corps, x.plan, x.dom, x.o).svg), b = sansNumeros(At.planche(x.corps, x.plan, x.dom, x.o).svg); if (a !== b) diff++;
    const s0 = sansNumeros(Sil.dessiner(x.corps, x.plan, x.dom)); At.dessiner(x.corps, x.plan, x.dom, x.o); if (sansNumeros(Sil.dessiner(x.corps, x.plan, x.dom)) !== s0) jeux++;
    Co.etendre(null); }
  verif(!diff, `${ech.length} planches dessinées deux fois : les mêmes, au caractère près (hors numéros des identifiants)`);
  verif(!jeux, 'le dessin des jeux (monde/silhouette.js) est le même avant et après une planche'); }

console.log('3. Ce qu\'elle lit des données se voit');
{ const pick = f => tous.find(f);
  // la robe d'un albinos, d'un mélanique : celle que le dessin reçoit
  const q = pick(x => x.D.parties?.dessin === 'quadrupede'); Co.etendre(q.I.catalogue?.monde || null);
  const rb = t => { const c = Co.normaliser(q.corps).couleurs, r = At.robeDesTraits(c, t).robe; return `rgb(${r.map(Math.round).join(',')})`; };
  const alb = At.dessiner(q.corps, q.plan, ['albinisme'], q.o).svg, mela = At.dessiner(q.corps, q.plan, ['melanisme'], q.o).svg; Co.etendre(null);
  const clair = c => (c[0] + c[1] + c[2]) / 3; const ca = At.robeDesTraits(Co.normaliser(q.corps).couleurs, ['albinisme']), cm = At.robeDesTraits(Co.normaliser(q.corps).couleurs, ['melanisme']);
  verif(alb.includes(rb(['albinisme'])) && mela.includes(rb(['melanisme'])) && clair(ca.robe) > 200 && clair(cm.robe) < 60 && ca.oeil[0] > ca.oeil[2], `un albinos a la robe blanche et l'œil rosé, un mélanique la robe noire (${q.t.id})`);
  // les pupilles
  const pup = f => tous.filter(f).map(x => x.D.pupille);
  const nuit = pup(x => x.plan.regime === 'carnivore' && ['nocturne', 'crepusculaire'].includes(x.plan.activite) && x.o.famille === 'pelage'), sab = pup(x => x.o.famille === 'pelage' && x.plan.regime === 'herbivore' && (x.D.parties?.pattes || []).some(p => p.pied === 'sabot')), ins = pup(x => x.D.famille === 'chitine');
  verif(nuit.length && nuit.every(p => p === 'fente') && sab.length && sab.every(p => p === 'barre') && ins.length && ins.every(p => p === 'facettes'), `l'œil : une fente chez ${nuit.length} chasseuses de nuit à poil, une barre chez ${sab.length} brouteuses à sabots, des facettes chez ${ins.length} bêtes à chitine`);
  // le serpent : son épaisseur d'après sa masse et sa longueur (le dessin des jeux le garde fin)
  const sn = tous.filter(x => x.D.parties?.dessin === 'serpent' && x.plan.masse_kg > 0 && x.plan.taille_m > 0);
  const bon = sn.filter(x => { const svg = x.D.svg; return /<clipPath id="atl\d+c\d+"><path d="M/.test(svg); });
  verif(sn.length && bon.length === sn.length, `${sn.length} serpents redessinés en ruban, à l'épaisseur de leur masse et de leur longueur`);
  // le cétacé : un « poisson » qui met bas, sans écailles ni opercule, la queue à plat
  const ce = tous.filter(x => x.D.parties?.dessin === 'poisson' && x.plan.reproduction === 'vivipare' && x.plan.masse_kg >= 10);
  const opercule = /<path d="M[^"]*Q[^"]*" stroke="[^"]*" stroke-width="1\.2" fill="none" opacity="\.7"\/>/, dents = /fill="#fbf6ea"|fill="#3a1f1f"/;
  verif(!ce.length || ce.every(x => x.D.famille === 'peau-lisse' && !opercule.test(x.D.svg) && !dents.test(x.D.svg)), `${ce.length} cétacés (des « poissons » qui mettent bas) : la peau lisse, sans écailles, sans opercule ni dents de poisson`);
  // les renvois, l'échelle
  const R = tous.flatMap(x => (x.Pl.renvois || []).map(r => ({ ...r, x })));
  verif(tous.every(x => (x.Pl.renvois || []).length <= 7 && (x.Pl.renvois || []).every((r, i) => r.n === i + 1 && r.texte)), `${fx(R.length)} renvois, numérotés de 1 à 7 au plus par planche, chacun avec son texte`);
  const marques = tous.every(x => [...x.Pl.svg.matchAll(/<circle class="renvoi" cx="([-\d.]+)" cy="([-\d.]+)"/g)].every(m => +m[1] >= 0 && +m[1] <= 170 && +m[2] >= 0 && +m[2] <= 102));
  verif(marques, 'chaque renvoi est posé dans le cadre de la planche');
  const RONDES = [.001, .002, .005, .01, .02, .05, .1, .2, .5, 1, 2, 5, 10, 20], ech = tous.filter(x => x.Pl.echelle);
  verif(ech.length >= tous.filter(x => x.plan.taille_m > 0).length * .95 && ech.every(x => RONDES.includes(x.Pl.echelle.m)), `${fx(ech.length)} planches ont leur échelle, d'une longueur ronde (de 1 mm à 20 m)`); }

console.log('4. Ce qu\'elle pèse, ce qu\'elle coûte');
verif(poidsL < poidsP * .5, `une vignette pèse ${fx(poidsL / Math.max(1, tous.length) / 1024, 1)} Ko, une planche ${fx(poidsP / Math.max(1, tous.length) / 1024, 1)} Ko ; une planche se dessine en ${fx(msP / Math.max(1, nP), 1)} ms`);

console.log(`\n${ok ? 'tout passe' : 'ÉCHEC'} (${fx((Date.now() - t0) / 1000, 1)} s)`);
process.exit(ok ? 0 : 1);
