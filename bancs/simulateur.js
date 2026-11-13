// Orvane — LE BANC DU SIMULATEUR DE JOUEURS (bancs/simulateur.js, simulateur/, docs/50)
//  1. les styles de joueurs, sur le monde publié lu par morceaux (comme la page) : chaque façon de jouer fait la faune qu'on attend,
//     et les mêmes joueurs ne font pas la même bête de deux lignées de caractères opposés ;
//  2. la fidélité : nuit après nuit, le simulateur donne ce que donne la vraie nuit (le tampon, puis le moteur entier) ;
//  3. ce qu'un jeu en ferait : sans mémoire, les valeurs de Lisière d'aujourd'hui ; avec, elles bougent dans le bon sens ;
//  4. la page : elle charge ce dont le cœur a besoin, dans l'ordre, et ses styles ne déclarent que des actions du contrat.
//   node bancs/simulateur.js
'use strict';
const fs = require('fs'), path = require('path');
const racine = p => path.join(__dirname, '..', p);
const Sim = require(racine('simulateur/coeur.js')), Orvane = require(racine('moteur/orvane.js')), Tampon = require(racine('tampon/tampon.js')), M = require(racine('moteur/memoire.js')), Morceaux = require(racine('tampon/morceaux.js'));
const lireJ = f => JSON.parse(fs.readFileSync(racine(f), 'utf8')), lireT = f => fs.readFileSync(racine(f), 'utf8');
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const fx = (x, d = 2) => (+x).toLocaleString('fr-FR', { maximumFractionDigits: d }), t0 = Date.now();

(async () => {
  console.log('1. Les styles de joueurs, sur le monde publié');
  const profil = lireJ('mondes/orvane/profil.json'), lieu = 'foret';
  const inst = await Morceaux.lire('', { biomes: [lieu], lecteur: async c => lireJ('mondes/orvane/morceaux/' + c) });
  const L = inst.taxons.filter(t => !t.eteint).map(t => ({ t, p: t.populations.find(p => p.biome === lieu), corps: M.corpsDe(t.plan, Orvane.appetence) })).filter(x => x.p && x.p.effectif >= 5 && !['vegetal', 'synthetique'].includes(x.t.plan.regime));
  const pred = L.filter(x => x.corps >= .9).sort((a, b) => b.p.effectif - a.p.effectif)[0], proie = L.filter(x => !(x.corps > 0)).sort((a, b) => b.p.effectif - a.p.effectif)[0];
  if (!pred || !proie) { verif(false, 'la forêt du monde publié n\'a pas un mangeur de chair à la taille d\'un joueur et une autre bête : le banc ne peut rien vérifier'); process.exit(1); }
  // trois caractères qui ne se ressemblent pas, comme la page les choisit : la plus combative du lieu, la plus craintive, une entre les deux
  const C = L.map(x => ({ ...x, car: M.caractereDe(x.t.plan) })), combative = C.slice().sort((a, b) => b.car.combativite - a.car.combativite || b.p.effectif - a.p.effectif)[0], craintive = C.filter(x => x !== combative).sort((a, b) => a.car.hardiesse - b.car.hardiesse || b.p.effectif - a.p.effectif)[0];
  const mi = (combative.car.combativite + craintive.car.combativite) / 2, milieu = C.filter(x => x !== combative && x !== craintive).sort((a, b) => Math.abs(a.car.combativite - mi) - Math.abs(b.car.combativite - mi))[0];
  const suivies = [pred, proie, combative, milieu, craintive].filter((x, i, L) => L.findIndex(y => y.t.id === x.t.id) === i);
  const jouer = (groupes, n = 12, sim = null) => { sim ??= Sim.creer(inst, profil); for (const x of suivies) Sim.suivre(sim, x.t.id, lieu); for (let k = 0; k < n; k++) Sim.nuit(sim, groupes); return sim; };
  const de = (sim, x) => sim.betes.get(Sim.cle(x.t.id, lieu)), fin = (sim, x) => de(sim, x).histoire.at(-1), nom = x => x.t.nom_commun || x.t.nom || x.t.id;
  const terres = jouer([{ style: 'terre', n: 3 }]), chasse = jouer([{ style: 'chasseur', n: 5 }]), arc = jouer([{ style: 'archer', n: 5 }]), nourri = jouer([{ style: 'nourrisseur', n: 5 }]), frustre = jouer([{ style: 'nourrisseur', n: 5 }, { style: 'passant', n: 10 }]), pieges = jouer([{ style: 'piegeur', n: 4 }]), faux = jouer([{ style: 'passant', n: 10 }, { style: 'tricheur', n: 1 }], 20);
  const front = a => ['agressive', 'defensive', 'exigeante'].includes(a), dit = c => `${Sim.motDe('hardiesse', c.hardiesse)}, ${Sim.motDe('combativite', c.combativite)}`;
  verif(!Sim.creer(inst, profil).eveille || inst.monde.memoire, 'le monde publié se lit par morceaux, et le simulateur éveille la mémoire sur sa copie s\'il ne l\'a pas encore');
  verif(fin(terres, pred).attitude === 'traqueuse' && fin(terres, pred).neophobie < .25 && fin(terres, proie).traque === 0 && fin(terres, proie).agressivite === 0 && fin(terres, proie).habituation > .3,
    `trois joueurs terrés derrière leur feu, douze nuits : ${nom(pred)} devient « ${fin(terres, pred).attitude} » (traque ${fx(fin(terres, pred).traque)}) et ne craint plus le feu (${fx(fin(terres, pred).neophobie)}) ; ${nom(proie)}, que personne ne touche, s'habitue (${fx(fin(terres, proie).habituation)})`);
  // les mêmes joueurs, trois caractères
  verif(combative.car.combativite > milieu.car.combativite + .15 && milieu.car.combativite > craintive.car.combativite + .1 && de(chasse, combative).caractere.combativite > 0 && Object.keys(de(chasse, combative).caractere).length === 3,
    `trois caractères dans la même forêt : ${nom(combative)} (${dit(combative.car)}, combativité ${fx(combative.car.combativite)}), ${nom(milieu)} (${dit(milieu.car)}, ${fx(milieu.car.combativite)}), ${nom(craintive)} (${dit(craintive.car)}, ${fx(craintive.car.combativite)})`);
  verif(front(fin(chasse, combative).attitude) && fin(chasse, craintive).attitude === 'fuyante' && fin(chasse, craintive).agressivite < .15 && fin(chasse, combative).agressivite > fin(chasse, milieu).agressivite && fin(chasse, milieu).agressivite > fin(chasse, craintive).agressivite + .1 && fin(chasse, craintive).mefiance > fin(chasse, combative).mefiance + .1 && fin(chasse, pred).traque < .1,
    `cinq chasseurs à l'épieu, douze nuits, les mêmes pour tous : ${nom(combative)} fait front (« ${fin(chasse, combative).attitude} », agressivité ${fx(fin(chasse, combative).agressivite)}, méfiance ${fx(fin(chasse, combative).mefiance)}) ; ${nom(craintive)} fuit (agressivité ${fx(fin(chasse, craintive).agressivite)}, méfiance ${fx(fin(chasse, craintive).mefiance)}) ; ${nom(milieu)} entre les deux (${fx(fin(chasse, milieu).agressivite)})`);
  { const P = de(chasse, milieu).parts, somme = Object.values(P).reduce((a, x) => a + x, 0), debout = (P.agressive || 0) + (P.defensive || 0), Pc = de(chasse, craintive).parts;
    verif(Math.abs(somme - 1) < .01 && debout > .05 && debout < .95 && (Pc.agressive || 0) + (Pc.defensive || 0) < .02, `et une bête n'est pas sa population : chez ${nom(milieu)}, sur cent bêtes, ${fx(debout * 100, 0)} font front et ${fx((P.fuyante || 0) * 100, 0)} fuient ; chez ${nom(craintive)}, aucune ne fait front`); }
  verif(suivies.every(x => fin(arc, x).agressivite < .1) && fin(arc, combative).mefiance > fin(chasse, combative).mefiance && !front(fin(arc, combative).attitude),
    `cinq chasseurs à l'arc : le même mal, de loin, et personne n'apprend à faire front (${nom(combative)} : agressivité ${fx(fin(arc, combative).agressivite)}, méfiance ${fx(fin(arc, combative).mefiance)} contre ${fx(fin(chasse, combative).mefiance)} à l'épieu)`);
  verif(de(chasse, combative).declare.attaque > (Sim.STYLES.chasseur[de(chasse, combative).role].find(e => e[0] === 'attaque')?.[1] || 0) * 5 && !(de(arc, craintive).declare.attaque > 0),
    `la boucle se ferme : devenue agressive, ${nom(combative)} charge, et les joueurs fictifs le déclarent (${fx(de(chasse, combative).declare.attaque, 0)} assauts la dernière nuit) ; ${nom(craintive)}, jamais`);
  verif(fin(nourri, pred).attitude === 'quemandeuse' && fin(nourri, pred).traque === 0 && fin(nourri, craintive).attitude !== 'quemandeuse' && fin(nourri, craintive).attrait < fin(nourri, pred).attrait - .2 && fin(nourri, craintive).habituation < fin(nourri, pred).habituation - .2,
    `cinq nourrisseurs : ${nom(pred)} devient « ${fin(nourri, pred).attitude} » (attrait ${fx(fin(nourri, pred).attrait)}), sans traque ; ${nom(craintive)}, non (attrait ${fx(fin(nourri, craintive).attrait)}, habituation ${fx(fin(nourri, craintive).habituation)}, « ${fin(nourri, craintive).attitude || 'rien de marqué'} ») : nourries de la même main, elles ne deviennent pas toutes familières`);
  verif(fin(frustre, combative).agressivite > fin(nourri, combative).agressivite + .15 && front(fin(frustre, combative).attitude) && fin(frustre, craintive).agressivite < .1,
    `les mêmes nourrisseurs, plus dix passants qui ne donnent rien : la frustration. ${nom(combative)} passe de ${fx(fin(nourri, combative).agressivite)} à ${fx(fin(frustre, combative).agressivite)} d'agressivité (« ${fin(frustre, combative).attitude} ») ; ${nom(craintive)} reste à ${fx(fin(frustre, craintive).agressivite)}`);
  verif(fin(pieges, proie).neophobie > .75 && fin(pieges, proie).mefiance < fin(chasse, proie).mefiance, `quatre piégeurs : ${nom(proie)} craint les pièges (néophobie ${fx(fin(pieges, proie).neophobie)}) plus que les joueurs (méfiance ${fx(fin(pieges, proie).mefiance)})`);
  verif(fin(faux, pred).attitude !== 'traqueuse' && fin(faux, pred).traque < .3 && suivies.every(x => !front(fin(faux, x).attitude)) && fin(faux, combative).agressivite < M.REGLES.attitudes.seuil && de(faux, pred).retenu.tombes <= Tampon.VECU.tombes + .01 && de(faux, pred).declare.joueur_tombe === 500,
    `un faux compte parmi dix passants, vingt nuits : 500 joueurs tombés déclarés, ${fx(de(faux, pred).retenu.tombes, 1)} retenus par le tampon ; traque ${fx(fin(faux, pred).traque)}, agressivité ${fx(fin(faux, combative).agressivite)}, « ${fin(faux, pred).attitude || 'rien de marqué'} »`);
  const oubli = jouer([], 30, jouer([{ style: 'terre', n: 3 }]));
  verif(fin(oubli, pred).attitude !== 'traqueuse' && fin(oubli, pred).traque < .15 && fin(oubli, pred).agressivite < .15 && de(oubli, pred).histoire.length === 43, `puis trente nuits sans personne : l'oubli (traque ${fx(fin(oubli, pred).traque)}) ; l'histoire garde chaque nuit (${de(oubli, pred).histoire.length} points)`);
  const journal = terres.journal.map(j => j.detail).join(' | ');
  verif(/proie/.test(journal) && /ne craignent plus le feu/.test(journal) && terres.journal.every(j => j.nuit >= 1 && j.nom), `le journal note les bascules, avec leur nuit (${terres.journal.length} en douze nuits)`);
  const re = jouer([{ style: 'terre', n: 3 }], 5); Sim.recommencer(re);
  verif(re.nuit === 0 && re.betes.size === suivies.length && [...re.betes.values()].every(b => b.histoire.length === 1 && b.M.t === 0) && !re.journal.length, 'recommencer : les mêmes bêtes, à la nuit zéro, telles que le monde les publie');

  console.log('2. La fidélité : le simulateur et la vraie nuit');
  { const I0 = lireJ('mondes/sv-1/etat.json'), P = { ...lireJ('mondes/sv-1/profil.json'), influence: profil.influence }, betes = [['traqueur', 'prairie'], ['brouteur', 'prairie']]; let pire = 0, memes = true, auSeuil = 0;
    // (une valeur à moins de 0,02 d'un seuil peut tomber d'un côté dans le simulateur, de l'autre dans le monde : ce n'est pas un écart)
    const A = M.REGLES.attitudes, presDunSeuil = (p, V) => Math.min(Math.abs((p.mefiance || 0) - A.mefiance), Math.abs((p.mefiance || 0) - A.craintive), Math.abs((p.habituation || 0) - A.familiere), Math.abs(V.a - A.seuil), Math.abs(V.t - A.seuil), Math.abs(V.g - A.seuil)) < .02;
    for (const groupes of [[{ style: 'terre', n: 3 }], [{ style: 'chasseur', n: 3 }], [{ style: 'archer', n: 3 }], [{ style: 'nourrisseur', n: 4 }, { style: 'passant', n: 6 }], [{ style: 'passant', n: 10 }, { style: 'tricheur', n: 1 }], [{ style: 'pille', n: 3 }, { style: 'piegeur', n: 2 }]]) {
      const sim = Sim.creer(I0, P); for (const [t, b] of betes) Sim.suivre(sim, t, b);
      let X = M.eveiller(I0).inst, te = {};
      for (let k = 0; k < 10; k++) { const r = Tampon.agreger(Sim.lotsDe(sim, groupes), X, P, te); te = r.etat; X = Orvane.cycle(X, r.pressions); Sim.nuit(sim, groupes);
        for (const [t, b] of betes) { const p = X.taxons.find(x => x.id === t).populations.find(x => x.biome === b), s = sim.betes.get(Sim.cle(t, b)), V = M.lire(p.memoire);
          pire = Math.max(pire, Math.abs((p.mefiance || 0) - s.m), Math.abs((p.habituation || 0) - s.h), Math.abs(V.a - s.M.a), Math.abs(V.t - s.M.t), Math.abs(V.o - s.M.o), Math.abs(V.g - s.M.g)); if ((p.attitude || null) !== s.attitude) { if (presDunSeuil(p, V)) auSeuil++; else memes = false; } } } }
    verif(pire < .02 && memes && auSeuil <= 3, `six compositions de joueurs, dix nuits chacune, deux populations : les mêmes attitudes que la vraie nuit (le tampon, puis le moteur entier), et jamais plus de ${fx(pire, 3)} d'écart sur une disposition — ce que font les migrants, que le simulateur ne déplace pas${auSeuil ? ` (${auSeuil} fois, une valeur à moins de 0,02 de son seuil a donné deux mots voisins)` : ''}`); }

  console.log('3. Ce qu\'un jeu en ferait');
  { const plan = { perception: .5, temperament: .5 }, neutre = Sim.lisiere(plan, { mefiance: 0, habituation: 0, attrait: 0, traque: 0, neophobie: .5 });
    const craintive = Sim.lisiere(plan, { mefiance: .8, neophobie: .5 }), habituee = Sim.lisiere(plan, { habituation: .9, neophobie: .5 }), traqueuse = Sim.lisiere(plan, { traque: .8, neophobie: .1 }), brulee = Sim.lisiere(plan, { neophobie: .95 });
    verif(neutre.fuite === neutre.flair && neutre.torche === 145 && neutre.feu === .8 && neutre.suit === 0 && neutre.charge === 6 && !neutre.passeTorche, `sans mémoire, Lisière comme aujourd'hui : fuite au flair (${neutre.fuite} pixels), torche à 145, lisière du feu à 0,8, aucune poursuite`);
    verif(craintive.fuite > neutre.fuite * 1.3 && craintive.fuite <= 420 && habituee.fuite < neutre.fuite * .7 && traqueuse.suit > .4 && traqueuse.charge > 9 && traqueuse.passeTorche && traqueuse.torche < neutre.torche && brulee.torche > neutre.torche && brulee.feu > .8 && traqueuse.feu === .8,
      `avec : craintive, elle fuit de ${craintive.fuite} pixels ; habituée, de ${habituee.fuite} ; traqueuse et faite au feu, elle suit ${Math.round(traqueuse.suit * 100)} % du temps et passe la torche (${traqueuse.torche} pixels) ; brûlée, la torche la tient à ${brulee.torche} ; aucun feu vivant ne laisse entrer (0,8 au moins)`);
    verif(Sim.lisiere(plan, { traque: .8, neophobie: .1 }, true).suit < traqueuse.suit, 'la première nuit, la traque compte pour moitié');
    const gros = { ...plan, masse_kg: 20 }, menu = { ...plan, masse_kg: .3 }, debout = Sim.lisiere(gros, { mefiance: .3, agressivite: .6 }), petite = Sim.lisiere(menu, { agressivite: .6 }), nuit1 = Sim.lisiere(gros, { agressivite: .6 }, true);
    verif(!neutre.front && !neutre.tient && neutre.lache === .25 && debout.front && debout.portee >= 50 && debout.portee < debout.fuite && debout.chargeFront > 5 && debout.lache < Sim.lisiere(gros, { mefiance: .3 }).lache && petite.tient && !petite.front && !nuit1.front,
      `l'agressivité : à 0,6, une bête de vingt kilos ne fuit plus ; elle s'arrête à ${debout.fuite} pixels et charge à ${debout.portee}, ${fx(debout.chargeFront, 1)} secondes ; frappée, elle lâche prise ${fx(debout.lache * 100, 0)} fois sur cent au lieu de ${fx(Sim.lisiere(gros, { mefiance: .3 }).lache * 100, 0)} ; trop petite pour charger, elle tient sa place ; la première nuit, elle compte pour moitié`); }

  console.log('4. La page');
  { const html = lireT('simulateur/index.html'), obs = lireT('monde/index.html'), src = s => [...s.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
    const S = src(html), moteurObs = src(obs).filter(x => x.startsWith('../moteur/')).slice(0, src(obs).indexOf('../moteur/orvane.js') + 1).filter(x => x.startsWith('../moteur/'));
    const jusqua = S.slice(0, S.indexOf('../moteur/orvane.js') + 1);
    verif(JSON.stringify(jusqua) === JSON.stringify(moteurObs.slice(0, moteurObs.indexOf('../moteur/orvane.js') + 1)) && S.indexOf('../tampon/tampon.js') > S.indexOf('../moteur/orvane.js') && S.indexOf('coeur.js') > S.indexOf('../tampon/tampon.js') && S.indexOf('page.js') > S.indexOf('coeur.js') && S.every(x => fs.existsSync(path.join(racine('simulateur'), x))),
      `la page charge les ${jusqua.length} modules du moteur dans l'ordre de l'observatoire, puis le tampon, puis le cœur, puis la page ; tous ces fichiers existent`);
    const mauvais = []; for (const [id, st] of Object.entries(Sim.STYLES)) for (const role of ['predateur', 'proie', 'riposte']) for (const [a, n, m] of st[role] || []) if (!Tampon.ACTIONS.has(a) || !(n > 0 && n <= Tampon.N_MAX) || (m && !Tampon.MOYENS.has(m)) || !Sim.ACTIONS[a] || (m && !Sim.MOYENS[m])) mauvais.push(`${id}/${role}/${a}`);
    verif(!mauvais.length && Object.values(Sim.STYLES).every(st => st.nom && st.dit && st.predateur.length && st.proie.length), `les ${Object.keys(Sim.STYLES).length} styles ne déclarent que des actions et des moyens du contrat, et chacun se dit en français` + (mauvais.length ? ' ; à revoir : ' + mauvais.join(', ') : ''));
    verif(Sim.DISPOSITIONS.map(d => d.id).join() === 'mefiance,habituation,attrait,traque,neophobie,agressivite' && Sim.DISPOSITIONS.every(d => d.seuil() > 0 && d.seuil() < 1) && Sim.DISPOSITIONS.slice(2).every(d => M.DISPOSITIONS[d.id]) && Object.keys(Sim.MOTS).join() === Object.keys(M.CARACTERE).join(),
      'les six dispositions montrées sont celles que le monde publie, avec leur seuil pris dans les règles de la mémoire ; les trois traits du caractère sont ceux du moteur'); }

  console.log(`\n${ok ? 'tout passe' : 'ÉCHEC'} (${fx((Date.now() - t0) / 1000, 0)} s)`);
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
