// Orvane — LE BANC DES PROFILS DE GENRE (bancs/genres.js, docs/41)
// Chaque genre promet quelque chose ; on le mesure sur un monde réel (la genèse 7 : 99 lignées, 16 lieux), contre le réglage neutre,
// sur les mêmes cycles et la même graine :
//  1. le neutre ne change rien ; un genre se pose sur les règles d'un monde sans effacer leurs voisines ;
//  2. l'horreur : une évolution rapide, peu de variantes, des maladies ;
//  3. le cozy : des épidémies rares, des catastrophes douces, pas d'effondrement ;
//  4. la collection : plus de lignées, plus de séparations ;
//  5. le monde partagé : des catastrophes et des épidémies, des événements de serveur ;
//  6. la survie : le joueur pèse deux fois plus ; la stratégie : le temps accéléré ; le voxel : un cycle par session ;
//  7. un monde hébergé (profil.monde.genre) : le profil se vérifie, le genre passe sous les règles du profil.
//   node bancs/genres.js [cycles]   (80 par défaut)
'use strict';
const path = require('path');
const racine = p => path.join(__dirname, '..', p);
const Orvane = require(racine('moteur/orvane.js')), G = require(racine('moteur/genres.js')), Solo = require(racine('moteur/solo.js'));
const N = +process.argv[2] || 80;
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const t0 = Date.now(), MONDE = require(racine('mondes/genese-7/instantane.json'));
const animal = t => !t.eteint && t.plan?.regime !== 'vegetal' && t.plan?.regime !== 'synthetique';
const clone = o => JSON.parse(JSON.stringify(o)), sans = I => JSON.stringify({ ...I, monde: { ...I.monde, genre: undefined } });

// ce qu'il se passe en N cycles sous un genre
function mesurer(g) {
  let I = G.appliquer(MONDE, g); const ev = {};
  for (let i = 0; i < N; i++) { I = Orvane.cycle(I, {}, { duree_ms: 864e5 }); for (const e of I.evenements) ev[e.type] = (ev[e.type] || 0) + 1; }
  const A = I.taxons.filter(animal), ph = A.map(t => t.phenotypes.length);
  return { I, ev: k => ev[k] || 0, lignees: A.length, phenotypes: ph.reduce((a, x) => a + x, 0) / ph.length };
}

console.log('1. Le neutre, et un genre posé sur un monde');
{ const a = Orvane.cycle(clone(MONDE), {}, { duree_ms: 864e5 }), b = Orvane.cycle(G.appliquer(MONDE, 'neutre'), {}, { duree_ms: 864e5 });
  verif(sans(a) === sans(b) && !b.monde.regles, 'le genre neutre ne change rien : le même cycle, au caractère près');
  const R0 = { separation: { cycles: 30, effectif: 60, chance: .004 }, besoin: .3 }, R = G.regles('collection', R0);
  verif(R.separation.cycles === 20 && R.separation.effectif === 60 && R.separation.chance === .012 && R.besoin === .3 && R0.separation.chance === .004,
    'la collection pose sa chance de séparation et garde l\'effectif et le besoin du monde ; les règles qu\'on lui donne ne changent pas');
  let jete = false; try { G.appliquer(MONDE, 'western'); } catch (e) { jete = /genre inconnu/.test(e.message); }
  verif(jete, 'un genre inconnu se refuse, en disant ceux qu\'on connaît'); }

console.log(`   (${N} cycles de la genèse 7 sous chaque genre…)`);
const M = Object.fromEntries(['neutre', 'horreur', 'cozy', 'collection', 'mmo'].map(g => [g, mesurer(g)])), n = M.neutre;
const fx = (x, d = 1) => (+x).toLocaleString('fr-FR', { maximumFractionDigits: d });

console.log('2. L\'horreur');
{ const h = M.horreur;
  verif(h.ev('nouveau_trait') >= 2 * n.ev('nouveau_trait'), `une évolution rapide : ${h.ev('nouveau_trait')} traits apparus, contre ${n.ev('nouveau_trait')}`);
  verif(h.phenotypes <= .6 * n.phenotypes, `peu de variantes, mais marquées : ${fx(h.phenotypes)} phénotypes par lignée, contre ${fx(n.phenotypes)}`);
  verif(h.ev('epidemie') > 1.3 * n.ev('epidemie'), `des maladies : ${h.ev('epidemie')} épidémies, contre ${n.ev('epidemie')}`); }

console.log('3. Le cozy');
{ const c = M.cozy;
  verif(c.ev('epidemie') <= .6 * n.ev('epidemie'), `des épidémies rares : ${c.ev('epidemie')}, contre ${n.ev('epidemie')}`);
  verif(c.ev('catastrophe') <= n.ev('catastrophe') && c.ev('effondrement') <= n.ev('effondrement'),
    `des catastrophes douces : ${c.ev('catastrophe')} catastrophes et ${c.ev('effondrement')} effondrements, contre ${n.ev('catastrophe')} et ${n.ev('effondrement')}`);
  verif(c.lignees >= n.lignees - 1, `les lignées tiennent : ${c.lignees}, contre ${n.lignees}`); }

console.log('4. La collection');
{ const c = M.collection;
  verif(c.ev('separation') > n.ev('separation') && c.lignees > n.lignees, `plus de lignées : ${c.ev('separation')} séparations, ${c.lignees} lignées, contre ${n.ev('separation')} et ${n.lignees}`);
  verif(c.ev('nouveau_trait') > 1.4 * n.ev('nouveau_trait'), `plus de traits à découvrir : ${c.ev('nouveau_trait')}, contre ${n.ev('nouveau_trait')}`); }

console.log('5. Le monde partagé');
{ const m = M.mmo, evts = x => x.ev('catastrophe') + x.ev('epidemie');
  verif(evts(m) > 1.3 * evts(n) && m.ev('catastrophe') >= n.ev('catastrophe'), `des événements de serveur : ${m.ev('catastrophe')} catastrophes et ${m.ev('epidemie')} épidémies, contre ${n.ev('catastrophe')} et ${n.ev('epidemie')}`); }

console.log('6. La survie, la stratégie, le voxel : le joueur et le temps');
{ // la même chasse (300 bêtes prélevées sur une population) dans un monde solo neutre, puis de survie
  const cible = MONDE.taxons.filter(animal).flatMap(t => t.populations.map(p => ({ t, p }))).filter(x => x.p.effectif >= 3000 && x.p.effectif <= 30000).sort((a, b) => a.p.effectif - b.p.effectif)[0];
  const chasse = g => { const S = Solo.creer(MONDE, { genre: g, maintenant: 0 }); Solo.noter(S, { taxon: cible.t.id, biome: cible.p.biome, action: 'prelevement', n: 300 });
    Solo.cycles(S, 1); const T = Solo.creer(MONDE, { genre: g, maintenant: 0 }); Solo.cycles(T, 1);
    const eff = X => X.etat.taxons.find(t => t.id === cible.t.id).populations.find(p => p.biome === cible.p.biome)?.effectif || 0; return eff(T) - eff(S); };
  const dn = chasse('neutre'), ds = chasse('survie');
  verif(ds > 1.6 * dn && dn > 0, `300 ${cible.t.nom} chassés : la population perd ${fx(dn, 0)} bêtes de plus qu'un monde qu'on laisse en paix ; dans un jeu de survie, ${fx(ds, 0)}`);
  const S = Solo.creer(MONDE, { genre: 'strategie', maintenant: 0 }), Sn = Solo.creer(MONDE, { maintenant: 0 });
  const a = Solo.avancer(S, 3600e3) && S.etat.cycle.n - MONDE.cycle.n, b = (Solo.avancer(Sn, 3600e3), Sn.etat.cycle.n - MONDE.cycle.n);
  verif(a === 12 && b === 1, `le temps accéléré : en une heure, un monde de stratégie vit ${a} cycles, un monde neutre ${b}`);
  const V = Solo.creer(MONDE, { genre: 'voxel', maintenant: 0 }), o = G.solo('voxel');
  verif(V.session === 1 && o.session === 1 && G.GENRES.voxel.mecanismes.includes('parcelles'), 'le voxel : un cycle par session de jeu (le jeu l\'appelle), un monde en parcelles à éveiller');
  const P = G.profil('survie', Solo.PROFIL);
  verif(P.influence.poids.prelevement === 2 && Solo.PROFIL.influence.poids.prelevement === 1 && P.influence.plafonds.part_max_population === .5, 'le profil de survie double le poids d\'une chasse, sans toucher au profil qu\'on lui donne'); }

console.log('7. Un monde hébergé');
{ const V = require(racine('outils/verifier.js'));
  const p = clone(require(racine('mondes/orvane/profil.json'))); p.monde.genre = 'cozy';
  const E = V.verifier(p, 'profil'), q = clone(p); q.monde.genre = 'western'; const F = V.verifier(q, 'profil');
  verif(!E.length && F.length === 1 && /genre/.test(F[0]), `un profil de monde hébergé dit son genre (profil.monde.genre : « cozy » passe ; « western » : ${F[0]})`);
  const R = G.regles('horreur', { derive: { tolerance: .35, formes: 1 } });
  verif(R.derive.tolerance === .35 && R.derive.formes === 2 && R.derive.corps === 1.8, 'le genre passe sur les règles de la genèse, sans effacer leurs voisines (la tolérance du monde reste)'); }

console.log('8. Déterministe');
{ let a = G.appliquer(MONDE, 'horreur'), b = G.appliquer(MONDE, 'horreur'); for (let i = 0; i < 3; i++) { a = Orvane.cycle(a, {}, { duree_ms: 864e5 }); b = Orvane.cycle(b, {}, { duree_ms: 864e5 }); }
  verif(JSON.stringify(a) === JSON.stringify(b), 'même monde, même genre : mêmes cycles'); }

console.log(`\n${ok ? 'tout est vérifié' : 'ÉCHEC'} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
process.exit(ok ? 0 : 1);
