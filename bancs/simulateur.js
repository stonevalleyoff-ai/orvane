// Orvane — LE BANC DU SIMULATEUR DE JOUEURS (bancs/simulateur.js, simulateur/, docs/50)
//  1. les styles de joueurs, sur le monde publié lu par morceaux (comme la page) : chaque façon de jouer fait la faune qu'on attend ;
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
  const jouer = (groupes, n = 12, sim = null) => { sim ??= Sim.creer(inst, profil); Sim.suivre(sim, pred.t.id, lieu); Sim.suivre(sim, proie.t.id, lieu); for (let k = 0; k < n; k++) Sim.nuit(sim, groupes); return sim; };
  const de = (sim, x) => sim.betes.get(Sim.cle(x.t.id, lieu)), fin = (sim, x) => de(sim, x).histoire.at(-1), nom = x => x.t.nom_commun || x.t.nom || x.t.id;
  const terres = jouer([{ style: 'terre', n: 3 }]), chasse = jouer([{ style: 'chasseur', n: 3 }]), nourri = jouer([{ style: 'nourrisseur', n: 4 }]), pieges = jouer([{ style: 'piegeur', n: 4 }]), faux = jouer([{ style: 'passant', n: 10 }, { style: 'tricheur', n: 1 }], 20);
  verif(!Sim.creer(inst, profil).eveille || inst.monde.memoire, 'le monde publié se lit par morceaux, et le simulateur éveille la mémoire sur sa copie s\'il ne l\'a pas encore');
  verif(fin(terres, pred).attitude === 'traqueuse' && fin(terres, pred).neophobie < .25 && fin(terres, proie).traque === 0 && fin(terres, proie).attitude === 'familiere',
    `trois joueurs terrés derrière leur feu, douze nuits : ${nom(pred)} devient « ${fin(terres, pred).attitude} » (traque ${fx(fin(terres, pred).traque)}) et ne craint plus le feu (${fx(fin(terres, pred).neophobie)}) ; ${nom(proie)} reste « ${fin(terres, proie).attitude} »`);
  verif(fin(chasse, pred).attitude === 'fuyante' && fin(chasse, proie).attitude === 'fuyante' && fin(chasse, pred).traque < .1 && fin(chasse, pred).neophobie > .4,
    `trois chasseurs : les deux deviennent « fuyante » (méfiance ${fx(fin(chasse, pred).mefiance)} et ${fx(fin(chasse, proie).mefiance)}), et le feu reste craint (${fx(fin(chasse, pred).neophobie)})`);
  verif(fin(nourri, pred).attitude === 'quemandeuse' && fin(nourri, proie).attitude === 'quemandeuse' && fin(nourri, pred).traque === 0,
    `quatre nourrisseurs : les deux deviennent « quemandeuse » (attrait ${fx(fin(nourri, pred).attrait)} et ${fx(fin(nourri, proie).attrait)}), sans traque`);
  verif(fin(pieges, proie).neophobie > .75 && fin(pieges, proie).mefiance < fin(chasse, proie).mefiance, `quatre piégeurs : ${nom(proie)} craint les pièges (néophobie ${fx(fin(pieges, proie).neophobie)}) plus que les joueurs (méfiance ${fx(fin(pieges, proie).mefiance)})`);
  verif(fin(faux, pred).attitude !== 'traqueuse' && fin(faux, pred).traque < .3 && de(faux, pred).retenu.tombes <= Tampon.VECU.tombes + .01 && de(faux, pred).declare.joueur_tombe === 500,
    `un faux compte parmi dix passants, vingt nuits : 500 joueurs tombés déclarés, ${fx(de(faux, pred).retenu.tombes, 1)} retenus par le tampon ; traque ${fx(fin(faux, pred).traque)}, « ${fin(faux, pred).attitude || 'rien de marqué'} »`);
  const oubli = jouer([], 30, jouer([{ style: 'terre', n: 3 }]));
  verif(fin(oubli, pred).attitude !== 'traqueuse' && fin(oubli, pred).traque < .15 && de(oubli, pred).histoire.length === 43, `puis trente nuits sans personne : l'oubli (traque ${fx(fin(oubli, pred).traque)}) ; l'histoire garde chaque nuit (${de(oubli, pred).histoire.length} points)`);
  const journal = terres.journal.map(j => j.detail).join(' | ');
  verif(/proie/.test(journal) && /ne craignent plus le feu/.test(journal) && terres.journal.every(j => j.nuit >= 1 && j.nom), `le journal note les bascules, avec leur nuit (${terres.journal.length} en douze nuits)`);
  const re = jouer([{ style: 'terre', n: 3 }], 5); Sim.recommencer(re);
  verif(re.nuit === 0 && re.betes.size === 2 && [...re.betes.values()].every(b => b.histoire.length === 1 && b.M.t === 0) && !re.journal.length, 'recommencer : les mêmes bêtes, à la nuit zéro, telles que le monde les publie');

  console.log('2. La fidélité : le simulateur et la vraie nuit');
  { const I0 = lireJ('mondes/sv-1/etat.json'), P = { ...lireJ('mondes/sv-1/profil.json'), influence: profil.influence }, betes = [['traqueur', 'prairie'], ['brouteur', 'prairie']]; let pire = 0, memes = true;
    for (const groupes of [[{ style: 'terre', n: 3 }], [{ style: 'chasseur', n: 3 }], [{ style: 'nourrisseur', n: 4 }], [{ style: 'passant', n: 10 }, { style: 'tricheur', n: 1 }], [{ style: 'pille', n: 3 }, { style: 'piegeur', n: 2 }]]) {
      const sim = Sim.creer(I0, P); for (const [t, b] of betes) Sim.suivre(sim, t, b);
      let X = M.eveiller(I0).inst, te = {};
      for (let k = 0; k < 10; k++) { const r = Tampon.agreger(Sim.lotsDe(sim, groupes), X, P, te); te = r.etat; X = Orvane.cycle(X, r.pressions); Sim.nuit(sim, groupes);
        for (const [t, b] of betes) { const p = X.taxons.find(x => x.id === t).populations.find(x => x.biome === b), s = sim.betes.get(Sim.cle(t, b)), V = M.lire(p.memoire);
          pire = Math.max(pire, Math.abs((p.mefiance || 0) - s.m), Math.abs((p.habituation || 0) - s.h), Math.abs(V.a - s.M.a), Math.abs(V.t - s.M.t), Math.abs(V.o - s.M.o)); if ((p.attitude || null) !== s.attitude) memes = false; } } }
    verif(pire < .02 && memes, `cinq compositions de joueurs, dix nuits chacune, deux populations : les mêmes attitudes que la vraie nuit (le tampon, puis le moteur entier), et jamais plus de ${fx(pire, 3)} d'écart sur une disposition — ce que font les migrants, que le simulateur ne déplace pas`); }

  console.log('3. Ce qu\'un jeu en ferait');
  { const plan = { perception: .5, temperament: .5 }, neutre = Sim.lisiere(plan, { mefiance: 0, habituation: 0, attrait: 0, traque: 0, neophobie: .5 });
    const craintive = Sim.lisiere(plan, { mefiance: .8, neophobie: .5 }), habituee = Sim.lisiere(plan, { habituation: .9, neophobie: .5 }), traqueuse = Sim.lisiere(plan, { traque: .8, neophobie: .1 }), brulee = Sim.lisiere(plan, { neophobie: .95 });
    verif(neutre.fuite === neutre.flair && neutre.torche === 145 && neutre.feu === .8 && neutre.suit === 0 && neutre.charge === 6 && !neutre.passeTorche, `sans mémoire, Lisière comme aujourd'hui : fuite au flair (${neutre.fuite} pixels), torche à 145, lisière du feu à 0,8, aucune poursuite`);
    verif(craintive.fuite > neutre.fuite * 1.3 && craintive.fuite <= 420 && habituee.fuite < neutre.fuite * .7 && traqueuse.suit > .4 && traqueuse.charge > 9 && traqueuse.passeTorche && traqueuse.torche < neutre.torche && brulee.torche > neutre.torche && brulee.feu > .8 && traqueuse.feu === .8,
      `avec : craintive, elle fuit de ${craintive.fuite} pixels ; habituée, de ${habituee.fuite} ; traqueuse et faite au feu, elle suit ${Math.round(traqueuse.suit * 100)} % du temps et passe la torche (${traqueuse.torche} pixels) ; brûlée, la torche la tient à ${brulee.torche} ; aucun feu vivant ne laisse entrer (0,8 au moins)`);
    verif(Sim.lisiere(plan, { traque: .8, neophobie: .1 }, true).suit < traqueuse.suit, 'la première nuit, la traque compte pour moitié'); }

  console.log('4. La page');
  { const html = lireT('simulateur/index.html'), obs = lireT('monde/index.html'), src = s => [...s.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
    const S = src(html), moteurObs = src(obs).filter(x => x.startsWith('../moteur/')).slice(0, src(obs).indexOf('../moteur/orvane.js') + 1).filter(x => x.startsWith('../moteur/'));
    const jusqua = S.slice(0, S.indexOf('../moteur/orvane.js') + 1);
    verif(JSON.stringify(jusqua) === JSON.stringify(moteurObs.slice(0, moteurObs.indexOf('../moteur/orvane.js') + 1)) && S.indexOf('../tampon/tampon.js') > S.indexOf('../moteur/orvane.js') && S.indexOf('coeur.js') > S.indexOf('../tampon/tampon.js') && S.indexOf('page.js') > S.indexOf('coeur.js') && S.every(x => fs.existsSync(path.join(racine('simulateur'), x))),
      `la page charge les ${jusqua.length} modules du moteur dans l'ordre de l'observatoire, puis le tampon, puis le cœur, puis la page ; tous ces fichiers existent`);
    const mauvais = []; for (const [id, st] of Object.entries(Sim.STYLES)) for (const role of ['predateur', 'proie']) for (const [a, n, m] of st[role] || []) if (!Tampon.ACTIONS.has(a) || !(n > 0 && n <= Tampon.N_MAX) || (m && !Tampon.MOYENS.has(m)) || !Sim.ACTIONS[a] || (m && !Sim.MOYENS[m])) mauvais.push(`${id}/${role}/${a}`);
    verif(!mauvais.length && Object.values(Sim.STYLES).every(st => st.nom && st.dit && st.predateur.length && st.proie.length), `les ${Object.keys(Sim.STYLES).length} styles ne déclarent que des actions et des moyens du contrat, et chacun se dit en français` + (mauvais.length ? ' ; à revoir : ' + mauvais.join(', ') : ''));
    verif(Sim.DISPOSITIONS.map(d => d.id).join() === 'mefiance,habituation,attrait,traque,neophobie' && Sim.DISPOSITIONS.every(d => d.seuil() > 0 && d.seuil() < 1), 'les cinq dispositions montrées sont celles que le monde publie, avec leur seuil pris dans les règles de la mémoire'); }

  console.log(`\n${ok ? 'tout passe' : 'ÉCHEC'} (${fx((Date.now() - t0) / 1000, 0)} s)`);
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
