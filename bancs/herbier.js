// Orvane — LE BANC DE L'HERBIER (bancs/herbier.js, docs/49)
//  1. le dessin : chaque forme de plante a le sien, lisible ; le même à chaque fois ; deux lignées d'une même forme, deux dessins ;
//  2. ce qu'elle est ce cycle se voit : nue, en fleurs, en fruits, brûlée, sous la neige ; ses épines ;
//  3. la planche d'un biome : ses plantes, les plus lourdes d'abord, leur part, le temps qu'il fait ;
//  4. le cycle de nuit : morceaux/herbier/<biome>.json, à côté des planches des bêtes.
//   node bancs/herbier.js
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const racine = p => path.join(__dirname, '..', p);
const He = require(racine('monde/herbier.js')), Di = require(racine('moteur/diversite.js')), Ph = require(racine('moteur/phenologie.js')), Me = require(racine('moteur/meteo.js')), Su = require(racine('moteur/succession.js')), Orvane = require(racine('moteur/orvane.js')), Monde = require('./monde.js');
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const fx = (x, d = 0) => (+x).toLocaleString('fr-FR', { maximumFractionDigits: d }), t0 = Date.now(), lireJ = f => JSON.parse(fs.readFileSync(racine(f), 'utf8'));
// un SVG lisible : une seule racine, des balises fermées, aucun nombre manquant
const lisible = s => /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 120 150" width="120" height="150">.+<\/svg>$/.test(s) && !/NaN|undefined|Infinity/.test(s) && (s.match(/<svg/g) || []).length === 1 && (s.match(/<(circle|path|ellipse)[^>]*[^/]>/g) || []).length === 0;
const PORTS = ['herbe', 'buisson', 'arbre', 'roseau', 'algue', 'lichen', 'succulente', 'champignon'], niche = { temperature: .5, humidite: .6 };
const plan = f => ({ forme: f, port: Di.FORMES[f]?.port || f, niche, hauteur_m: Di.FORMES[f]?.h || 1 }), toutes = [...PORTS, ...Object.keys(Di.FORMES)];

console.log('1. Le dessin');
{ const D = Object.fromEntries(toutes.map(f => [f, He.dessiner(plan(f), { stade: 'feuilles', feuillage: 1 }, 'x-' + f)])), mal = toutes.filter(f => !lisible(D[f]));
  const tailles = Object.values(D).map(s => s.length), uniques = new Set(toutes.map(f => He.dessiner(plan(f), {}, 'meme')));
  verif(!mal.length && Math.max(...tailles) < 12000, `${toutes.length} formes dessinées, toutes lisibles (de ${fx(Math.min(...tailles))} à ${fx(Math.max(...tailles))} caractères)` + (mal.length ? ' ; illisibles : ' + mal.join(', ') : ''));
  verif(uniques.size === toutes.length, 'chaque forme a son dessin : aucune ne se confond avec une autre');
  verif(He.dessiner(plan('figuier'), {}, 'a') === He.dessiner(plan('figuier'), {}, 'a') && He.dessiner(plan('figuier'), {}, 'a') !== He.dessiner(plan('figuier'), {}, 'b'), 'la même lignée a toujours le même dessin ; deux lignées de la même forme, deux dessins');
  verif(lisible(He.dessiner({ forme: 'inconnue', port: 'arbre', niche }, {}, 'z')) && lisible(He.dessiner({ forme: 'inconnue' }, {}, 'z')), 'une forme que l\'herbier ne connaît pas se dessine comme son port ; sans port, comme une herbe');
}

console.log('2. Ce qu\'elle est ce cycle');
{ const a = st => He.dessiner(plan('arbre'), { stade: st, feuillage: st === 'nu' ? 0 : 1, sinistre: st === 'brule' ? { type: 'incendie', cycle: 1 } : undefined }, 'a'), S = ['nu', 'bourgeons', 'fleurs', 'feuilles', 'fruits', 'feuilles_tombent', 'brule'], D = S.map(a);
  verif(new Set(D).size === S.length && D.every(lisible), `un arbre a ${S.length} dessins : nu, en bourgeons, en fleurs, en feuilles, en fruits, quand ses feuilles tombent, brûlé`);
  const h = st => He.dessiner(plan('herbe'), { stade: st, feuillage: st === 'seche' ? .4 : 1 }, 'h'), neige = h('sous_la_neige');
  verif(new Set(['fleurs', 'feuilles', 'graines', 'seche', 'sous_la_neige'].map(h)).size === 5 && neige.includes('#f2f6fa'), 'une herbe en fleurs, en feuilles, en graines, sèche, sous la neige : cinq dessins');
  verif(He.dessiner(plan('buisson'), { defense: ['epineux'] }, 'b') !== He.dessiner(plan('buisson'), {}, 'b') && He.dessiner(plan('arbre'), { feuillage: .3 }, 'a') !== He.dessiner(plan('arbre'), { feuillage: 1 }, 'a'), 'ses épines se dessinent ; la part de son feuillage aussi');
}

console.log('3. La planche d\'un biome');
{ let W = Monde.orvane({ continent: '', sans: ['diversite', 'succession', 'phenologie', 'meteo'] }); W = Su.eveiller(Di.eveiller(Ph.eveiller(Me.eveiller(W).inst).inst).inst).inst; for (let k = 0; k < 3; k++) W = Orvane.cycle(W, {});
  const F = { orvane: W.orvane, monde: W.monde, cycle: W.cycle, taxons: W.taxons.filter(t => t.plan.regime === 'vegetal') }, P = He.planche(F, W.biomes.find(b => b.id === 'foret')), L = Object.values(P.plantes);
  const somme = L.reduce((s, x) => s + x.part, 0), ici = F.taxons.filter(t => !t.eteint && t.populations.some(p => p.biome === 'foret' && p.effectif > 0)).length;
  verif(L.length === ici && L.length >= 10 && Math.abs(somme - 1) < .01 && L.every((x, i) => i === 0 || x.part <= L[i - 1].part) && L.every(x => lisible(x.svg) && x.nom && x.forme && x.port && x.hauteur_m > 0 && x.stade),
    `la forêt : ${L.length} plantes dessinées, les plus lourdes d'abord (${L.slice(0, 3).map(x => `${x.nom.replace(/ \(.*/, '')} ${fx(x.part * 100)} %`).join(', ')}…), chacune avec sa forme, son port, sa hauteur, son stade`);
  verif(P.meteo?.temps && P.cadre[0] === 120 && P.cadre[1] === 150 && P.biome === 'foret' && P.cycle.n === W.cycle.n, `la planche dit le temps qu'il fait (${Me.NOMS[P.meteo?.temps]}), son cadre et son cycle`);
  const Pl = He.planches(F, W.biomes), vides = Object.values(Pl).filter(x => !Object.keys(x.plantes).length).map(x => x.biome), poids = Object.values(Pl).reduce((s, x) => s + JSON.stringify(x).length, 0);
  verif(Object.keys(Pl).length === W.biomes.length && Pl['herbier/foret.json'] && vides.every(b => !F.taxons.some(t => t.populations.some(p => p.biome === b && p.effectif > 0))), `${Object.keys(Pl).length} planches, une par biome (${fx(poids / 1e3)} Ko en tout) ; sans plantes : ${vides.join(', ') || 'aucun'}`);
  const sansF = He.planche({ taxons: Monde.orvane({ continent: '' }).taxons.filter(t => t.plan.regime === 'vegetal') }, 'foret');
  verif(Object.keys(sansF.plantes).length >= 3 && !sansF.meteo && Object.values(sansF.plantes).every(x => lisible(x.svg) && !x.stade), 'un monde sans météo, sans saisons des plantes ni flore riche a son herbier quand même : ses huit formes, en feuilles');
}

console.log('4. Le cycle de nuit');
{ const dossier = racine('mondes/essai-herbier'); fs.rmSync(dossier, { recursive: true, force: true }); fs.mkdirSync(dossier, { recursive: true });
  try { const I0 = Monde.orvane({ continent: '' }), Pf = lireJ('mondes/orvane/profil.json'); fs.writeFileSync(path.join(dossier, 'profil.json'), JSON.stringify({ ...Pf, monde: { ...Pf.monde, id: 'essai-herbier', climat: false, natures: false, invention: false, stades: false, ponte: false, synthetique: false, pathogenes: false, fusions: [], parcelles: undefined, pressions: undefined } }));
    fs.writeFileSync(path.join(dossier, 'etat.json'), JSON.stringify(I0)); fs.writeFileSync(path.join(dossier, 'instantane.json'), JSON.stringify(I0));
    execFileSync('node', [racine('hebergement/cycle.js'), 'essai-herbier', '--sans-reseau', '--cycles', '1'], { encoding: 'utf8', maxBuffer: 1e8 });
    const H = fs.readdirSync(path.join(dossier, 'morceaux/herbier')), Sil = fs.readdirSync(path.join(dossier, 'morceaux/silhouettes')), f = JSON.parse(fs.readFileSync(path.join(dossier, 'morceaux/herbier/foret.json'), 'utf8'));
    verif(H.length === Sil.length && H.length === I0.biomes.length && Object.keys(f.plantes).length >= 3 && f.cycle.n === I0.cycle.n + 1, `le cycle de nuit écrit ${H.length} planches de plantes (morceaux/herbier/), à côté des ${Sil.length} planches des bêtes`);
  } finally { fs.rmSync(dossier, { recursive: true, force: true }); }
}
console.log(`\n${ok ? 'tout passe' : 'ÉCHEC'} (${fx((Date.now() - t0) / 1000)} s)`);
process.exit(ok ? 0 : 1);
