// Orvane — LE BANC DES COMPORTEMENTS COLLECTIFS (bancs/collectif.js, docs/38)
//  1. rien ne change : la vie en groupe se lit dans l'état, elle ne le touche pas, le jour de l'éveil comme après ;
//  2. qui vit comment : un rôdeur sociable chasse en meute, un grand brouteur grégaire vit en troupeau, un poisson en banc,
//     un insecte social en colonie, une bête farouche seule ;
//  3. la taille des groupes : elle grandit avec la sociabilité, à découvert et sous la prédation ; la hiérarchie se durcit quand
//     la nourriture manque ; les troupeaux mêlés ;
//  4. les migrations : un lieu froid l'hiver, un voisin plus doux ; le départ, l'hiver au loin, le retour ; les visiteurs ;
//     ni migration vers un lieu meilleur toute l'année, ni pour un fouisseur ;
//  5. le monde d'Orvane : ce qu'il publie, et ce que cela pèse.
//   node bancs/collectif.js
'use strict';
const fs = require('fs'), path = require('path');
const racine = p => path.join(__dirname, '..', p);
const Orvane = require(racine('moteur/orvane.js')), K = require(racine('moteur/collectif.js'));
const lireJ = f => JSON.parse(fs.readFileSync(racine(f), 'utf8'));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const fx = (x, d = 1) => (+x).toLocaleString('fr-FR', { maximumFractionDigits: d }), t0 = Date.now();

// un petit monde réglé à la main : une toundra à saisons, une taïga voisine plus douce, une mer
const axes = (t, h, c) => ({ temperature: t, humidite: h, altitude: .3, lumiere: .6, couvert: c });
const B = [
  { id: 'toundra', nom: 'Toundra', milieu: 'terrestre', axes: axes(.15, .45, .05), capacite: 1e5, voisins: ['taiga', 'mer'], saisons: { temperature: .2 } },
  { id: 'taiga', nom: 'Taïga', milieu: 'terrestre', axes: axes(.32, .5, .4), capacite: 1e5, voisins: ['toundra'], saisons: { temperature: .12 } },
  { id: 'prairie', nom: 'Prairie', milieu: 'terrestre', axes: axes(.55, .5, .1), capacite: 1e5, voisins: [] },
  { id: 'mer', nom: 'Mer', milieu: 'marin', axes: axes(.4, 1, 0), capacite: 1e5, voisins: ['toundra'] }];
const plan = o => ({ regime: 'herbivore', masse_kg: 60, taille_m: 1.2, locomotion: ['marche', 'course'], longevite: 25, maturite: 3, portee: 1, sociabilite: .7, temperament: .3, activite: 'diurne', vitesse_rel: 5, perception: .5,
  niche: axes(.24, .48, .3), tolerance: .12, corps: { forme: 'quadrupede' }, ...o });
const tx = (id, o, pops, traits = []) => ({ id, nom: id, parent: null, apparu: 0, eteint: null, statut: 'stable', plan: plan(o),
  populations: pops.map(p => ({ tendance: 0, depuis: 0, ...p })), phenotypes: [{ id: 'base', frequence: 1 - (traits.length ? .6 : 0), traits: [] }, ...(traits.length ? [{ id: 'x', frequence: .6, traits }] : [])] });
const monde = phase => ({ orvane: '0.1', monde: { id: 'banc', graine: 1, annee: 120, collectif: { depuis: 0 } }, cycle: { n: Math.round(phase * 120), date: '2026-11-05T03:00:00Z', saison: { phase } }, biomes: B, catalogue: { traits: {} },
  taxons: [
    tx('renne', { niche: axes(.3, .48, .3), tolerance: .25 }, [{ biome: 'toundra', effectif: 4000 }]),
    tx('loup', { regime: 'carnivore', masse_kg: 35, sociabilite: .75, temperament: .7, niche: axes(.3, .5, .4), tolerance: .4 }, [{ biome: 'toundra', effectif: 300, satiete: .3 }, { biome: 'taiga', effectif: 300, satiete: .9 }]),
    tx('hareng', { regime: 'filtreur', masse_kg: .3, locomotion: ['nage'], eau: 'salee', sociabilite: .8, niche: axes(.4, 1, 0), tolerance: .3 }, [{ biome: 'mer', effectif: 1e6 }]),
    tx('fourmi', { masse_kg: .005, locomotion: ['marche'], sociabilite: .8, castes: { reine: 1, part: .9 }, corps: { forme: 'hexapode' }, niche: axes(.55, .5, .1), tolerance: .3 }, [{ biome: 'prairie', effectif: 1e6 }]),
    tx('ours', { regime: 'omnivore', masse_kg: 300, sociabilite: .05, niche: axes(.3, .5, .5), tolerance: .4 }, [{ biome: 'taiga', effectif: 80 }]),
    tx('taupe', { masse_kg: .1, locomotion: ['fouissage'], sociabilite: .3, niche: axes(.24, .48, .3), tolerance: .12 }, [{ biome: 'toundra', effectif: 9000 }]),
    tx('boeuf', { masse_kg: 120, sociabilite: .75, niche: axes(.15, .45, .05), tolerance: .3 }, [{ biome: 'toundra', effectif: 3000 }]),
    tx('caribou', { masse_kg: 90, sociabilite: .6 }, [{ biome: 'toundra', effectif: 2000 }]),
    tx('cerf', { masse_kg: 80, sociabilite: .7, activite: 'nocturne', niche: axes(.55, .5, .1), tolerance: .3 }, [{ biome: 'prairie', effectif: 5000, predation: 0 }]),
    tx('gazelle', { masse_kg: 30, sociabilite: .7, niche: axes(.55, .5, .1), tolerance: .3 }, [{ biome: 'prairie', effectif: 5000, predation: .8 }])] });
const grp = (I, id, b) => I.taxons.find(t => t.id === id).populations.find(p => p.biome === b);

console.log('1. Rien ne change');
{ const W = monde(.4), s = JSON.stringify(W), D = K.decrire(W);
  verif(JSON.stringify(W) === s && D !== W, 'décrire rend un nouvel instantané, celui qu\'il a lu ne change pas');
  const I = lireJ('mondes/genese-7/instantane.json'), e = K.eveiller(I), a = Orvane.cycle(I, {}, { duree_ms: 864e5 }), b = Orvane.cycle(e.inst, {}, { duree_ms: 864e5 });
  const eff = x => JSON.stringify(x.taxons.map(t => [t.id, t.populations.map(p => [p.biome, p.effectif])]));
  verif(eff(a) === eff(b) && e.evenements[0]?.type === 'eveil', `le monde éveillé tourne comme l'autre, au caractère près (${a.taxons.length} lignées) : « ${e.evenements[0]?.detail} »`); }

console.log('2. Qui vit comment');
{ const D = K.decrire(monde(.4)), f = (id, b) => grp(D, id, b).groupe;
  verif(f('loup', 'toundra').forme === 'meute' && f('loup', 'toundra').meneur === 'un couple dominant' && f('loup', 'toundra').chasse,
    `le loup chasse en meute de ${f('loup', 'toundra').taille.typ} (${f('loup', 'toundra').taille.min} à ${f('loup', 'toundra').taille.max}), menée par un couple dominant`);
  verif(f('renne', 'toundra').forme === 'troupeau' && f('hareng', 'mer').forme === 'banc' && f('fourmi', 'prairie').forme === 'colonie' && f('fourmi', 'prairie').meneur === 'une reine',
    `le renne en troupeau de ${f('renne', 'toundra').taille.typ}, le hareng en banc de ${f('hareng', 'mer').taille.typ}, la fourmi en colonie de ${fx(f('fourmi', 'prairie').taille.typ, 0)} autour d'une reine`);
  verif(f('ours', 'taiga').forme === 'solitaire' && f('ours', 'taiga').taille.typ === 1 && f('taupe', 'toundra').forme === 'famille', 'l\'ours vit seul, la taupe en famille'); }

console.log('3. La taille des groupes, la hiérarchie, les troupeaux mêlés');
{ const D = K.decrire(monde(.4)), W = monde(.4);
  const plus = JSON.parse(JSON.stringify(W)); plus.taxons.find(t => t.id === 'renne').populations[0].quant = { sociabilite: { m: 2, v: 1 } };
  const g0 = grp(D, 'renne', 'toundra').groupe, g1 = grp(K.decrire(plus), 'renne', 'toundra').groupe;
  verif(g1.taille.typ > g0.taille.typ && g1.sociabilite > g0.sociabilite, `des rennes plus sociables (sociabilité génétique +2 écarts-types) : des troupeaux de ${g1.taille.typ} au lieu de ${g0.taille.typ}`);
  const cerf = grp(D, 'cerf', 'prairie').groupe, gaz = grp(D, 'gazelle', 'prairie').groupe;
  verif(gaz.taille.typ > 30 * .4 * 1.2 && gaz.taille.typ > cerf.taille.typ * .5, `à découvert et sous la prédation (80 % des morts), la gazelle se serre en troupeaux de ${gaz.taille.typ}`);
  const lT = grp(D, 'loup', 'toundra').groupe, lF = grp(D, 'loup', 'taiga').groupe;
  verif(lT.hierarchie.niveau > lF.hierarchie.niveau, `la meute affamée de la toundra (satiété 0,3) est plus hiérarchisée (${fx(lT.hierarchie.niveau, 2)}, ${lT.hierarchie.type}) que celle, repue, de la taïga (${fx(lF.hierarchie.niveau, 2)}, ${lF.hierarchie.type})`);
  const r = grp(D, 'renne', 'toundra').groupe;
  verif((r.avec || []).includes('caribou') && (r.avec || []).includes('boeuf') && !(gaz.avec || []).includes('cerf'), `troupeaux mêlés : le renne paît avec ${r.avec.join(' et ')} ; la gazelle ne se mêle pas au cerf, qui vit la nuit`); }

console.log('4. Les migrations');
{ const R = ph => grp(K.decrire(monde(ph)), 'renne', 'toundra').migration, m = R(.4);
  verif(m && m.vers === 'taiga' && m.part > .05 && m.etat === 'au pays', `le renne de la toundra hiverne en taïga : ${fx(m.part * 100, 0)} % d'entre eux partent (au printemps, il est au pays)`);
  verif(R(.82).etat === 'au depart' && R(.95).etat === 'partie' && R(.05).etat === 'partie' && R(.15).etat === 'au retour', 'à la fin de l\'automne il part, il passe l\'hiver au loin, il revient au printemps');
  const V = K.decrire(monde(.95)).biomes.find(b => b.id === 'taiga').visiteurs || [];
  verif(V.some(v => v.taxon === 'renne' && v.de === 'toundra' && v.effectif > 0), `en hiver, la taïga voit arriver ses visiteurs : ${V.map(v => `${v.effectif} ${v.taxon} de la ${v.de}`).join(', ')}`);
  const D = K.decrire(monde(.4));
  verif(!grp(D, 'taupe', 'toundra').migration && !grp(D, 'boeuf', 'toundra').migration && !grp(D, 'hareng', 'mer').migration,
    'la taupe ne migre pas (elle fouit), le bœuf musqué non plus (son hiver n\'est pas rude), le hareng n\'a pas de voisin de mer'); }

console.log('5. Le monde d\'Orvane');
{ const I = lireJ('mondes/orvane/instantane.json'), D = K.decrire(I, { forcer: true }), F = {}; let n = 0, m = 0;
  for (const t of D.taxons) for (const p of t.populations) if (p.groupe) { n++; F[p.groupe.forme] = (F[p.groupe.forme] || 0) + 1; if (p.migration) m++; }
  const poids = JSON.stringify(D).length - JSON.stringify(I).length;
  verif(n > 0 && F.meute && F.troupeau && F.banc && m > 0, `${n} populations : ${Object.entries(F).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${v} ${k}`).join(', ')} ; ${m} migrent avec les saisons`);
  verif(poids < .15 * JSON.stringify(I).length, `ce que cela ajoute à l'instantané : ${fx(poids / 1024, 0)} Ko (${fx(100 * poids / JSON.stringify(I).length, 1)} %)`); }

console.log(`\n${ok ? 'tout est vérifié' : 'ÉCHEC'} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
process.exit(ok ? 0 : 1);
