// Orvane — LE BANC DU DIRECTEUR DE MISE EN SCÈNE (bancs/directeur.js, docs/40)
//  1. une scène (la genèse 2026, où l'on pose une lignée neuve, un chasseur qui se multiplie, une migration qui part, un nom donné, une
//     annonce de la chronique, une catastrophe, un savoir) : chaque genre met en avant ce qu'il doit ;
//  2. chaque moment est une lignée vivante que le jeu montre, dans un lieu qu'il joue ; la dose du genre ; pas plus de deux moments
//     d'une sorte ; une lignée une fois ;
//  3. un moment déjà montré ne revient pas ; le choix des lieux ; la même scène, le même choix ; le monde intact ;
//  4. le monde piège (outils/banc-traducteur.js) ne le fait pas tomber.
//   node bancs/directeur.js
'use strict';
const path = require('path'), crypto = require('crypto'), fs = require('fs'), racine = p => path.join(__dirname, '..', p);
const D = require(racine('tampon/directeur.js')), { piege } = require(racine('outils/banc-traducteur.js'));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); }, t0 = Date.now();
const empreinte = o => crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex').slice(0, 16);
const lireJ = f => JSON.parse(fs.readFileSync(racine(f), 'utf8'));

// la scène : un peu de tout ce qu'un jeu voudrait montrer
const I0 = lireJ('mondes/genese-2026/instantane.json'), n = I0.cycle.n;
const scene = (() => { const X = JSON.parse(JSON.stringify(I0)), A = X.taxons.filter(t => !t.eteint && t.plan.regime === 'herbivore' && t.populations.some(p => p.effectif >= 1000));
  const C = X.taxons.find(t => !t.eteint && t.plan.regime === 'carnivore'), neuve = A[0], migr = A[1], nomme = A[2], sage = A[3];
  neuve.parent = A[4].id; neuve.apparu = n; delete neuve.origine;                                                             // une lignée née ce cycle
  X.precedent = { cycle: n - 1, taxons: [{ id: C.id, populations: C.populations.map(p => ({ biome: p.biome, effectif: p.effectif / 1.6 })) }] };   // un chasseur : +60 %
  migr.populations[0].migration = { vers: X.biomes[1].id, vers_nom: X.biomes[1].nom, saison: 'hiver', part: .6, depart: .8, retour: .2, etat: 'au depart' };
  X.evenements = [...X.evenements, { type: 'catastrophe', taxon: X.biomes[0].id, biome: X.biomes[0].id, detail: 'un incendie ravage la savane' },
    { type: 'savoir', taxon: sage.id, biome: sage.populations[0].biome, detail: `chez ${sage.nom}, une bête invente : casser des noix avec une pierre` }];
  const chronique = { derniers: [{ n, type: 'nom', importance: 2, taxon: nomme.id, texte: `${nomme.nom} s'appelle désormais « la Fleur des marais »` },
    { n, type: 'extinction', importance: 3, titre: 'Une extinction', texte: 'la dernière lignée de la banquise s\'éteint' }] };
  return { X, chronique, ids: { neuve: neuve.id, migr: migr.id, nomme: nomme.id, chasseur: C.id } }; })();

console.log('1. Chaque genre met en avant ce qu\'il doit');
{ const S = {}; for (const g of Object.keys(D.GENRES)) S[g] = D.moments(scene.X, { genre: g, chronique: scene.chronique });
  const types = g => S[g].map(m => m.type), haut = (g, L) => L.includes(S[g][0]?.type);
  verif(haut('horreur', ['predateurs', 'forme_nouvelle', 'epidemie', 'catastrophe']) && types('horreur').includes('predateurs'), `horreur : ${types('horreur').join(', ')} — les chasseurs qui se multiplient, les corps nouveaux`);
  verif(['nom', 'migration', 'savoir'].every(t => types('cozy').includes(t)) && !types('cozy').includes('predateurs'), `cozy : ${types('cozy').join(', ')} — un nom, une migration, un savoir ; aucun chasseur`);
  verif(haut('collection', ['lignee_neuve', 'rarete', 'forme_nouvelle']) && types('collection').includes('lignee_neuve'), `collection : ${types('collection').join(', ')} — la lignée neuve, les raretés`);
  verif(haut('mmo', ['catastrophe', 'epidemie', 'annonce', 'migration']), `monde partagé : ${types('mmo').join(', ')} — ce que tout le serveur vit`);
  verif(new Set(Object.values(S).map(L => L.map(m => m.cle).join('|'))).size === Object.keys(S).length, `les ${Object.keys(S).length} genres font ${Object.keys(S).length} choix différents de la même scène`);
}

console.log('2. Ce qu\'il rend');
{ const T = new Map(scene.X.taxons.map(t => [t.id, t])), fautes = [];
  for (const [g, G] of Object.entries(D.GENRES)) { const M = D.moments(scene.X, { genre: g, chronique: scene.chronique }), parType = {};
    if (M.length > G.dose) fautes.push(`${g} : ${M.length} moments pour une dose de ${G.dose}`);
    for (const m of M) { parType[m.type] = (parType[m.type] || 0) + 1; const t = T.get(m.taxon);
      if (m.taxon && (!t || t.eteint) && m.type !== 'catastrophe' && m.type !== 'annonce') fautes.push(`${g} : ${m.taxon} n'est pas une lignée vivante`);
      if (!m.texte || !m.titre || !(m.poids > 0)) fautes.push(`${g} : un moment sans texte ou sans poids`); }
    if (Object.values(parType).some(k => k > 2)) fautes.push(`${g} : plus de deux moments d'une sorte`);
    if (new Set(M.filter(m => m.taxon).map(m => m.taxon)).size !== M.filter(m => m.taxon).length) fautes.push(`${g} : une lignée deux fois`);
    if (M.some((m, i) => i && m.poids > M[i - 1].poids)) fautes.push(`${g} : pas classés`); }
  verif(!fautes.length, fautes.length ? fautes.slice(0, 3).join(' ; ') : 'chaque moment est une lignée vivante, avec son titre, son texte et son poids ; la dose de chaque genre ; deux moments d\'une sorte au plus ; une lignée une fois ; classés');
  const M = D.moments(scene.X, { genre: 'collection', chronique: scene.chronique });
  verif(M.every(m => /\.$/.test(m.texte) || m.type === 'annonce' || m.type === 'catastrophe'), `des phrases : « ${M[0].texte} »`);
}

console.log('3. Déjà vus, lieux, déterminisme');
{ const a = D.moments(scene.X, { genre: 'cozy', chronique: scene.chronique }), b = D.moments(scene.X, { genre: 'cozy', chronique: scene.chronique, deja: a.map(m => m.cle) });
  verif(a.length && b.length && !b.some(m => a.some(x => x.cle === m.cle)), `une deuxième session, les ${a.length} moments déjà montrés passés : ${b.length} autres`);
  const P = D.moments(scene.X, { genre: 'collection', biomes: ['prairie'], chronique: scene.chronique, max: 20 });
  verif(P.length > 0 && P.every(m => !m.biome || m.biome.split('~')[0] === 'prairie'), `un jeu qui ne joue que la prairie : ${P.length} moments, tous dans la prairie`);
  const av = empreinte(scene.X), c1 = D.moments(scene.X, { genre: 'survie', chronique: scene.chronique }), c2 = D.moments(scene.X, { genre: 'survie', chronique: scene.chronique });
  verif(empreinte(c1) === empreinte(c2) && empreinte(scene.X) === av, 'la même scène, le même choix ; le monde n\'est pas touché');
}

console.log('4. Le monde piège');
{ let M = null, err = null; try { M = Object.keys(D.GENRES).map(g => D.moments(piege(lireJ('mondes/orvane/instantane.json')), { genre: g })); } catch (e) { err = e; }
  verif(!err && M.every(L => Array.isArray(L)), err ? `il tombe : ${err.message}` : 'une forme et un organe inconnus, une lignée sans corps, une lignée éteinte, un lieu inconnu : il ne tombe pas');
}
console.log(`\n${ok ? 'tout passe' : 'ÉCHEC'} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(ok ? 0 : 1);
