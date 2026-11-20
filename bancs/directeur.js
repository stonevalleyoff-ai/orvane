// Orvane — LE BANC DU DIRECTEUR DE MISE EN SCÈNE (bancs/directeur.js, docs/40)
//  1. une scène (la genèse 2026, où l'on pose une lignée neuve, un chasseur qui se multiplie, une migration qui part, un nom donné, une
//     annonce de la chronique, une catastrophe, un savoir) : chaque genre met en avant ce qu'il doit ;
//  2. chaque moment est une lignée vivante que le jeu montre, dans un lieu qu'il joue ; la dose du genre ; pas plus de deux moments
//     d'une sorte ; une lignée une fois ;
//  3. un moment déjà montré ne revient pas ; le choix des lieux ; la même scène, le même choix ; le monde intact ;
//  4. le monde piège (outils/banc-traducteur.js) ne le fait pas tomber ;
//  5. les souches (docs/18) : un moment pour chacune des cinq choses qui leur arrivent (souche_nouvelle, saut_hote, mutation, vecteur,
//     remission), lu sur les champs des événements (souche, nature, nom, lieux, hotes) ; un poids fort en survie et en horreur ; une
//     souche a sa clé, et ne revient pas deux fois dans la dose ; une souche qui s'éteint, là où elle avait ses derniers malades ; un saut
//     d'hôte ne fait jamais sortir de la dose un moment majeur (une catastrophe, une lignée menacée, un effondrement, une explosion).
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
console.log('5. Les souches');
{ // la même genèse, ses 59 souches ; ce cycle, cinq événements de souche, un par nature, chez cinq lignées
  const X = JSON.parse(JSON.stringify(I0)), S = X.monde.pathogenes.souches, ids = Object.keys(S).slice(0, 5), ou = t => t.populations.filter(p => p.effectif >= 100).sort((a, b) => b.effectif - a.effectif)[0].biome;
  const A = X.taxons.filter(t => !t.eteint && t.plan.regime !== 'vegetal' && t.plan.regime !== 'synthetique' && t.populations.some(p => p.effectif >= 100)).slice(0, 5);
  S[ids[2]].parent = ids[0]; S[ids[3]].vecteur = A[0].id; const morte = S[ids[4]]; delete S[ids[4]];   // une mutante ; une souche que porte un insecte ; une qui vient de s'éteindre
  const ev = (nature, t, s, detail, plus = {}) => ({ type: nature === 'extinction' ? 'remission' : 'epidemie', taxon: t.id, ...(nature === 'extinction' ? {} : { biome: ou(t) }), souche: s, nature, ...plus, detail });
  const fin = (t, lieux, hotes) => ev('extinction', t, ids[4], `la souche ${morte.nom} s'éteint, après 40 cycles et ${hotes.length} lignées touchées`, { nom: morte.nom, lieux, hotes });
  X.evenements = [ev('naissance', A[0], ids[0], `une souche nouvelle, ${S[ids[0]].nom}, apparaît chez ${A[0].nom}`), ev('saut_hote', A[1], ids[1], `la souche ${S[ids[1]].nom} passe à ${A[1].nom}`),
    ev('mutation', A[2], ids[2], `la souche ${S[ids[0]].nom} mute chez ${A[2].nom} : ${S[ids[2]].nom}`), ev('vecteur', A[3], ids[3], `la souche … mute chez ${A[3].nom} : ${S[ids[3]].nom}, portée par ${A[0].nom}`),
    fin(A[4], [ou(A[4])], [A[4].id])];
  const attendu = { naissance: 'souche_nouvelle', saut_hote: 'saut_hote', mutation: 'mutation', vecteur: 'vecteur', extinction: 'remission' }, SORTES = Object.values(attendu);
  const tous = (g, Y = X, o = {}) => D.moments(Y, { genre: g, max: 1000, ...o }), M = tous('survie'), de = (L, e) => L.find(m => m.type === attendu[e.nature] && m.taxon === e.taxon && m.souche === e.souche);
  const fautes = X.evenements.filter(e => { const m = de(M, e); return !m || m.biome !== (e.biome || e.lieux[0]) || !m.cle.endsWith(':' + e.souche) || !/\.$/.test(m.texte) || !m.titre; });
  verif(!fautes.length, `un moment par nature, chez sa lignée, à son lieu, avec sa souche : ${X.evenements.map(e => `${attendu[e.nature]} (${de(M, e)?.poids})`).join(', ')}` + (fautes.length ? ` ; manquent : ${fautes.map(e => e.nature).join(', ')}` : ''));
  const m3 = de(M, X.evenements[2]), m4 = de(M, X.evenements[3]), m5 = de(M, X.evenements[4]); console.log(`     ex. ${m3?.titre} — ${m3?.texte}\n     ex. ${m4?.titre} — ${m4?.texte}\n     ex. ${m5?.titre} — ${m5?.texte}`);
  // les poids : fort en survie et en horreur pour une souche qui naît, mute, que porte un insecte, qui s'éteint ; le saut d'hôte, fréquent,
  // sous les moments majeurs du genre (le banc le vérifie plus bas) et au-dessus des savoirs
  const poids = g => X.evenements.map(e => de(tous(g), e)?.poids || 0), su = poids('survie'), ho = poids('horreur'), co = poids('cozy'), cl = poids('collection');
  const montres = g => D.moments(X, { genre: g }).filter(m => SORTES.includes(m.type)).map(m => m.type), fort = g => montres(g).length, sauf = (L, k) => L.filter((x, i) => i !== k);
  verif(su.every((x, i) => x > co[i] && x > cl[i]) && ho.every((x, i) => x > co[i] && x > cl[i]) && sauf(su, 1).every(x => x >= 1) && sauf(ho, 1).every(x => x >= 1) && fort('survie') >= 2 && fort('horreur') >= 1 && montres('cozy').every(t => t === 'remission'),
    `un poids fort en survie (${su.join(', ')}) et en horreur (${ho.join(', ')}), le saut d'hôte à part ; contre ${co.join(', ')} en cozy et ${cl.join(', ')} pour un jeu de collection : la survie en montre ${fort('survie')} dans sa dose de ${D.GENRES.survie.dose}, l'horreur ${fort('horreur')} sur ${D.GENRES.horreur.dose}, le cozy ${montres('cozy').join(', ') || 'aucun'} (une bonne nouvelle)`);
  // déjà vus ; une autre souche, plus tard, au même lieu, reste à montrer ; des événements sans ces champs ne font aucun moment de souche
  const vus = M.filter(m => m.souche && m.type !== 'epidemie').map(m => m.cle), Y = JSON.parse(JSON.stringify(X)); Y.evenements[0].souche = ids[1];
  const apres = tous('survie', Y, { deja: vus }), Z = JSON.parse(JSON.stringify(X)); Z.evenements.forEach(e => { for (const k of ['souche', 'nature', 'nom', 'lieux', 'hotes']) delete e[k]; });
  const sans = tous('survie', Z).filter(m => SORTES.includes(m.type)), epi = M.filter(m => m.type === 'epidemie');
  verif(!apres.some(m => vus.includes(m.cle)) && apres.some(m => m.type === 'souche_nouvelle' && m.souche === ids[1]) && !sans.length && epi.length && epi.every(m => S[m.souche]),
    `les moments déjà montrés ne reviennent pas, une autre souche au même lieu si ; sans souche ni nature (un instantané d'avant), aucun moment de souche ; les ${epi.length} moments « une maladie court » disent aussi leur souche`);
  // une souche qui gagne trois lignées en un cycle (Goteose α au cycle 65 du monde d'Orvane) : un moment dans la dose, pas trois
  const Q = JSON.parse(JSON.stringify(X)); Q.evenements = A.slice(0, 3).map(t => ev('saut_hote', t, ids[1], `la souche ${S[ids[1]].nom} passe à ${t.nom}`));
  const q = D.moments(Q, { genre: 'survie', max: 8 }), qs = q.filter(m => m.souche === ids[1]);
  verif(tous('survie', Q).filter(m => m.type === 'saut_hote').length === 3 && qs.length === 1 && q.length === 8,
    `une souche qui gagne trois lignées en un cycle : un seul de ses moments parmi huit (${q.map(m => m.type).join(', ')}), une souche une fois comme une lignée`);
  // une souche qui s'éteint loin de sa lignée d'origine : le moment est là où elle avait ses derniers malades, chez un hôte vivant là ;
  // sa lignée d'origine éteinte et oubliée, il reste ; un jeu qui ne joue aucun de ces lieux n'en a pas
  const loin = A.find(t => t.id !== A[4].id && !A[4].populations.some(p => p.biome === ou(t))), R = JSON.parse(JSON.stringify(X));
  R.evenements = [fin(A[4], [ou(loin)], [A[4].id, loin.id])]; const r1 = tous('survie', R, { biomes: [ou(loin)] }).find(m => m.type === 'remission');
  R.taxons = R.taxons.filter(t => t.id !== A[4].id); const r2 = tous('survie', R, { biomes: [ou(loin)] }).find(m => m.type === 'remission');
  R.evenements[0].hotes = [A[4].id]; const r3 = tous('survie', R, { biomes: [ou(loin)] }).find(m => m.type === 'remission'), r4 = tous('survie', R, { biomes: [ou(A[4])] }).find(m => m.type === 'remission');
  verif(r1?.biome === ou(loin) && r1.taxon === loin.id && r2?.taxon === loin.id && r3 && r3.taxon === null && r3.biome === ou(loin) && !r4,
    `une souche qui s'éteint loin de sa lignée d'origine : le moment est à ${ou(loin)}, où elle avait ses derniers malades, chez ${loin.nom}, un de ses hôtes ; l'origine oubliée, il reste ; sans hôte à montrer, au lieu seul ; ailleurs, aucun (« ${r1?.texte} »)`);
  // un saut d'hôte ne fait jamais sortir de la dose une catastrophe, une lignée menacée, un effondrement ni une explosion
  const MAJ = ['catastrophe', 'extinction_proche', 'effondrement', 'explosion'];
  const borne = Object.entries(D.GENRES).filter(([, G]) => !(G.poids.saut_hote < Math.min(.9 * G.poids.catastrophe, .5 * G.poids.extinction_proche, .8 * G.poids.effondrement, .7 * G.poids.explosion))).map(([g]) => g);
  const C = JSON.parse(JSON.stringify(I0)), CS = C.monde.pathogenes.souches, cid = Object.keys(CS).slice(0, 3); for (const k of cid) CS[k].virulence = .6;
  const B5 = C.taxons.filter(t => !t.eteint && t.plan.regime !== 'vegetal' && t.plan.regime !== 'synthetique' && t.populations.some(p => p.effectif >= 100)).slice(5, 8);
  C.evenements = [{ type: 'catastrophe', taxon: C.biomes[0].id, biome: C.biomes[0].id, detail: 'un incendie ravage le lieu' }, ...B5.map((t, k) => ({ type: 'epidemie', taxon: t.id, biome: ou(t), souche: cid[k], nature: 'saut_hote', detail: `la souche passe à ${t.nom}` }))];
  const dose = ['horreur', 'survie', 'strategie', 'mmo'].map(g => [g, D.moments(C, { genre: g })]), perdue = dose.filter(([, L]) => !L.some(m => m.type === 'catastrophe')).map(([g]) => g);
  const devant = Object.keys(D.GENRES).filter(g => { const L = tous(g, C), s = L.filter(m => m.type === 'saut_hote'), maj = L.filter(m => MAJ.includes(m.type)); return s.length && maj.length && Math.max(...s.map(m => m.poids)) >= Math.min(...maj.map(m => m.poids)); });
  verif(!borne.length && !perdue.length && !devant.length && dose.every(([, L]) => L.filter(m => m.type === 'saut_hote').length <= 2),
    `un saut d'hôte pèse moins que le plus faible des moments majeurs de chaque genre (catastrophe, lignée menacée, effondrement, explosion) : trois sauts d'hôte très virulents et une catastrophe au même cycle, la catastrophe reste dans la dose (${dose.map(([g, L]) => `${g} : ${L.map(m => m.type).join(', ')}`).join(' ; ')})` + (borne.length ? ` ; poids trop forts : ${borne.join(', ')}` : '') + (devant.length ? ` ; devant : ${devant.join(', ')}` : ''));
}
console.log(`\n${ok ? 'tout passe' : 'ÉCHEC'} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(ok ? 0 : 1);
