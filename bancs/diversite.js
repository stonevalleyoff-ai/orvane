// Orvane — LE BANC DE LA FLORE RICHE (bancs/diversite.js, docs/48)
//  1. le jour un : un monde sans diversité tourne exactement comme le moteur sans moteur/diversite.js ; le jour de l'éveil, chaque
//     lieu porte le même poids de plantes, et les bêtes ne bougent pas ;
//  2. le catalogue : les formes, leurs ports, les caractères et ce qu'ils cuisent dans le plan d'une lignée ;
//  3. la radiation : trois fois plus de lignées, des formes qui se plaisent où elles naissent, plus nombreuses au chaud et à l'humide ;
//  4. les brouteurs ne mangent pas tout pareil : la hauteur, ce que la plante donne, ses feuilles coriaces ;
//  5. le feu trie les caractères (docs/47) ;
//  6. la flore vit : elle se sépare, gagne les lieux voisins, se dispute la place, s'éteint ; le monde garde son poids ;
//  7. les parcelles, le contrat, le cycle de nuit.
//   node bancs/diversite.js            (environ 7 minutes ; --court : moins de cycles)
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm'), { execFileSync } = require('child_process');
const racine = p => path.join(__dirname, '..', p);
const Orvane = require(racine('moteur/orvane.js')), Di = require(racine('moteur/diversite.js')), Fl = require(racine('moteur/flore.js')), Su = require(racine('moteur/succession.js')), Parcelles = require(racine('moteur/parcelles.js')), Tampon = require(racine('tampon/tampon.js')), Monde = require('./monde.js');
const COURT = process.argv.includes('--court');
const lireJ = f => JSON.parse(fs.readFileSync(racine(f), 'utf8'));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const empreinte = I => crypto.createHash('sha256').update(JSON.stringify(I)).digest('hex').slice(0, 16);
const clone = o => JSON.parse(JSON.stringify(o)), fx = (x, d = 0) => (+x).toLocaleString('fr-FR', { maximumFractionDigits: d }), t0 = Date.now();
const S = lireJ('schemas/instantane.schema.json');
const val = (s, v, p) => { if (!s) return []; if (s.$ref) s = S.$defs[s.$ref.split('/').pop()]; const t = Array.isArray(s.type) ? s.type : [s.type], ty = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
  if (s.type && !t.includes(ty === 'number' && t.includes('integer') && Number.isInteger(v) ? 'integer' : ty)) return [p + ': type ' + ty]; if (s.enum && !s.enum.includes(v)) return [p + ': hors enum ' + v]; const e = [];
  if (ty === 'object') { for (const r of s.required || []) if (!(r in v)) e.push(p + ': manque ' + r); for (const k in v) { const ps = s.properties?.[k] || (typeof s.additionalProperties === 'object' ? s.additionalProperties : null); if (ps) e.push(...val(ps, v[k], p + '.' + k)); else if (s.additionalProperties === false) e.push(p + ': en trop ' + k); } }
  if (ty === 'array' && s.items) v.forEach((x, i) => e.push(...val(s.items, x, p + '[' + i + ']'))); return e; };
// le monde d'Orvane vu par biome, sans le continent de la genèse 7, avec sa flore (bancs/monde.js)
const I0 = Monde.orvane({ continent: '', sans: ['diversite', 'succession', 'phenologie', 'meteo'] }), EV = Di.eveiller(I0), W = EV.inst;
const estPlante = t => t.plan?.regime === 'vegetal', vives = I => I.taxons.filter(t => estPlante(t) && !t.eteint), port = t => t.plan.port || t.plan.forme;
const bio = (I, f) => I.taxons.filter(t => !t.eteint && f(t)).reduce((s, t) => s + t.populations.reduce((x, p) => x + p.effectif, 0) * (t.plan.masse_kg || 1), 0);
// par lieu et par port : le poids des plantes, leur place
const somme = (I, quoi) => { const o = {}; for (const t of vives(I)) for (const p of t.populations) { const k = p.biome + '|' + port(t); o[k] = (o[k] || 0) + (quoi === 'place' ? p.potentiel || 0 : p.effectif * t.plan.masse_kg); } return o; };
const ecart = (a, b) => Math.max(0, ...Object.keys(a).filter(k => (a[k] || 0) > 1e-9 || (b[k] || 0) > 1e-9).map(k => Math.abs((b[k] || 0) / (a[k] || 1e-9) - 1)));   // (un port sans place des deux côtés ne compte pas)
const avec = (o, f) => { const g = clone(Di.REGLES); Object.assign(Di.REGLES, o); try { return f(); } finally { for (const k of Object.keys(g)) Di.REGLES[k] = g[k]; } };
const lieu = (I, id) => I.biomes.find(b => b.id === id), ici = (I, id) => vives(I).filter(t => t.populations.some(p => p.biome === id));

console.log('1. Le jour un');
{ const src = fs.readFileSync(racine('moteur/orvane.js'), 'utf8'), mod = { exports: {} };
  vm.runInNewContext(src, { module: mod, require: p => p === './diversite.js' ? null : require(racine('moteur/' + p.replace('./', ''))), console });
  let A = I0, C = I0; for (let k = 0; k < 3; k++) { A = Orvane.cycle(A, {}); C = mod.exports.cycle(C, {}); }
  verif(empreinte(A) === empreinte(C), 'un monde sans diversité tourne exactement comme le moteur sans moteur/diversite.js');
  const ep = ecart(somme(I0, 'poids'), somme(W, 'poids')), ek = ecart(somme(I0, 'place'), somme(W, 'place'));
  verif(ep < 1e-3 && ek < 1e-3, `le jour de l'éveil, chaque lieu porte le même poids de plantes de chaque port (à ${fx(ep * 100, 3)} % près) et la même place (à ${fx(ek * 100, 3)} % près) : les lignées nouvelles prennent sur leur mère`);
  const a = Orvane.cycle(I0, {}), b = Orvane.cycle(W, {}), rb = bio(b, t => !estPlante(t)) / bio(a, t => !estPlante(t)), vifs = I => I.taxons.filter(t => !t.eteint && !estPlante(t)).length;
  verif(Math.abs(rb - 1) < .01 && vifs(a) === vifs(b), `un cycle après, les bêtes pèsent ${fx(rb * 100, 2)} % de ce qu'elles pèsent sans la flore riche, ${vifs(b)} lignées des deux côtés`);
}

console.log('2. Le catalogue');
{ const F = Di.FORMES, ports = ['herbe', 'buisson', 'arbre', 'roseau', 'algue', 'lichen', 'succulente', 'champignon'], par = Object.fromEntries(ports.map(p => [p, Object.keys(F).filter(f => F[f].port === p).length]));
  verif(Object.keys(F).length >= 40 && ports.every(p => par[p] >= 2) && Object.values(F).every(f => ports.includes(f.port) && f.h > 0 && f.m > 0 && f.r > 0 && typeof f.ou === 'function') && Object.keys(F).every(f => S.properties.taxons.items.properties.plan.properties.forme.enum.includes(f)),
    `${Object.keys(F).length} formes de plus, de tous les ports (${ports.map(p => `${par[p]} ${p}${par[p] > 1 ? (p === 'roseau' ? 'x' : 's') : ''}`).join(', ')}), toutes au contrat`);
  const mere = W.taxons.find(t => t.id === 'flore-foret-arbre').plan, base = { h: 10, m: 100, r: .3, rendement: { feuilles: 1, fruits: .4, nectar: .2 } }, P = c => Di.planDe(mere, 'fruitier', base, c);
  const nu = P([]), feu = P(['pyrophyte']), ge = P(['geante']), ve = P(['vent']), me = P(['mellifere']), co = P(['coriace']), ra = P(['rapide']);
  verif(feu.sinistres.incendie === .3 && feu.croissance < nu.croissance && ge.hauteur_m === 16 && ge.croissance < nu.croissance && !ve.rendement.nectar && ve.vent && me.rendement.nectar === .4 && co.appetence === .75 && ra.croissance > nu.croissance && ra.sinistres.incendie === 1.2,
    `${Object.keys(Di.CARACTERES).length} caractères, cuits dans le plan : « aime le feu » (le feu lui prend × ${fx(feu.sinistres.incendie, 1)}, repousse ${fx(nu.croissance, 3)} → ${fx(feu.croissance, 3)}), « géante » (${nu.hauteur_m} m → ${ge.hauteur_m} m), « fécondée par le vent » (plus de nectar), « mellifère » (nectar ${fx(nu.rendement.nectar, 1)} → ${fx(me.rendement.nectar, 1)}), « feuilles coriaces » (× ${fx(co.appetence, 2)}), « pousse vite » (repousse → ${fx(ra.croissance, 3)}, le feu × ${fx(ra.sinistres.incendie, 1)})`);
  verif(nu.cle !== ge.cle && nu.cle !== me.cle && nu.cle === P([]).cle && nu.port === 'arbre', 'deux lignées qu\'un brouteur ne mange pas pareil n\'ont pas la même clé ; deux lignées pareilles, la même');
}

console.log('3. La radiation');
{ const av = vives(I0).length, ap = vives(W).length, formes = new Set(vives(W).map(t => t.plan.forme)), nb = id => ici(W, id).length, B = Object.fromEntries(W.biomes.map(b => [b.id, b]));
  verif(ap >= 2.5 * av && formes.size >= 40, `« ${EV.evenements[0].detail.split(' ;')[0]} » : de ${av} à ${ap} lignées de plantes, de ${formes.size} formes`);
  verif(nb('jungle') > nb('foret') && nb('foret') > nb('toundra') && nb('mangrove') > nb('mer-froide') && nb('jungle') >= 2 * nb('banquise'), `plus un lieu est chaud et humide, plus il en porte : la jungle ${nb('jungle')}, la forêt ${nb('foret')}, la mangrove ${nb('mangrove')} ; la toundra ${nb('toundra')}, la banquise ${nb('banquise')}, la mer froide ${nb('mer-froide')}`);
  const neuves = vives(W).filter(t => t.plan.cle), mal = neuves.filter(t => t.populations.some(p => Di.convient(t.plan, B[p.biome]) < .2)), f = (id, forme) => ici(W, id).some(t => t.plan.forme === forme);
  verif(mal.length === 0 && f('jungle', 'palmier') && !f('toundra', 'palmier') && f('taiga', 'conifere') && !f('jungle', 'conifere') && f('desert', 'cactus') && f('mer-froide', 'varech') && f('lac', 'nenuphar'),
    `chaque forme naît où elle se plaît : des palmiers dans la jungle (pas dans la toundra), des conifères dans la taïga (pas dans la jungle), des cactus au désert, du varech en mer froide, des nénuphars sur le lac`);
  console.log(`    (la jungle : ${ici(W, 'jungle').map(t => t.nom.replace(/ \(.*/, '')).join(', ')})`);
  const car = neuves.filter(t => t.plan.caracteres?.length), parC = {}; for (const t of car) for (const c of t.plan.caracteres) parC[c] = (parC[c] || 0) + 1;
  verif(car.length > neuves.length / 3 && Object.keys(parC).length >= 8 && neuves.every(t => t.parent && t.plan.port && t.plan.rendement && t.plan.hauteur_m > 0), `${car.length} lignées nouvelles sur ${neuves.length} portent un caractère (${Object.entries(parC).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c, k]) => `${Di.CARACTERES[c].nom} ${k}`).join(', ')}…)`);
  verif(empreinte(Di.eveiller(I0).inst) === empreinte(W) && empreinte(Di.eveiller(W).inst) === empreinte(W), 'la même radiation à chaque fois ; elle ne se fait qu\'une fois');
}

console.log('4. Les brouteurs ne mangent pas tout pareil');
{ const mere = W.taxons.find(t => t.id === 'flore-foret-arbre').plan, P = (forme, car = []) => Di.planDe(mere, forme, { h: Di.FORMES[forme].h, m: Di.FORMES[forme].m, r: Di.FORMES[forme].r, rendement: Di.FORMES[forme].rendement }, car);
  const sol = { taille_m: 1.5, masse_kg: 80, locomotion: ['marche'] }, girafe = { taille_m: 5, masse_kg: 800, locomotion: ['marche'] }, at = (h, pl) => Fl.atteinte(h, [], pl);
  verif(at(sol, P('geant')) < at(sol, P('fruitier')) && at(sol, P('fruitier')) < at(sol, P('sous_bois')) && at(girafe, P('fruitier')) === 1 && at(girafe, P('geant')) < 1 && at(sol, P('fruitier', ['coriace'])) < at(sol, P('fruitier')),
    `une bête d'un mètre et demi atteint ${fx(at(sol, P('sous_bois')) * 100)} % d'un arbre du sous-bois, ${fx(at(sol, P('fruitier')) * 100)} % d'un arbre fruitier, ${fx(at(sol, P('geant')) * 100)} % d'un arbre géant ; une bête de cinq mètres, tout le fruitier et ${fx(at(girafe, P('geant')) * 100)} % du géant ; des feuilles coriaces, un quart de moins`);
  // un mangeur de fruits et un mangeur de graines devant un figuier et un conifère de même poids
  const plantes = forme => [{ t: { plan: P(forme) }, p: { effectif: 1000 / P(forme).masse_kg, frequences: [1, 0, 0, 0] } }], singe = { taille_m: .6, masse_kg: 5, locomotion: ['grimpe'], diete: { fruits: .8, feuilles: .2 } }, bec = { taille_m: .2, masse_kg: .1, locomotion: ['vol'], diete: { graines: 1 } };
  const o = (h, forme) => Fl.offreD(plantes(forme), h, [], false);
  verif(o(singe, 'figuier') > 2 * o(singe, 'conifere') && o(bec, 'conifere') > 0 && o(bec, 'figuier') === 0, `à poids égal, un mangeur de fruits trouve ${fx(o(singe, 'figuier') / o(singe, 'conifere'), 1)} fois plus dans un figuier que dans un conifère ; un mangeur de graines trouve les siennes dans le conifère, et rien dans le figuier`);
}

console.log('5. Le feu trie les caractères');
{ const mk = (id, plan) => ({ id, plan, populations: [{ biome: 'x', effectif: 1000, potentiel: 1000, frequences: [1, 0, 0, 0], reference: { succession: 1000 } }] }), mere = W.taxons.find(t => t.id === 'flore-savane-herbe').plan;
  const base = { h: 1, m: .1, r: .5, rendement: { feuilles: 1 } }, T = [mk('nue', Di.planDe(mere, 'hautes_herbes', base, [])), mk('feu', Di.planDe(mere, 'hautes_herbes', base, ['pyrophyte'])), mk('vite', Di.planDe(mere, 'hautes_herbes', base, ['rapide'])), mk('bulbe', Di.planDe(mere, 'bulbe', base, ['bulbe']))];
  Su.preparer({ plantes: T, biomes: { x: { id: 'x' } }, n: 10 }).frapper({ x: 'incendie' }); const r = id => T.find(t => t.id === id).populations[0].effectif / 1000;
  verif(r('feu') > r('bulbe') && r('bulbe') > r('nue') && r('nue') > r('vite'), `un incendie (docs/47) : il reste ${fx(r('feu') * 100)} % d'une herbe qui aime le feu, ${fx(r('bulbe') * 100)} % d'une plante à bulbe, ${fx(r('nue') * 100)} % d'une herbe ordinaire, ${fx(r('vite') * 100)} % d'une herbe qui pousse vite`);
}

console.log('6. La flore vit');
{ const N = COURT ? 25 : 60; let X = W, A = I0; const T = { separation: [], migration: [], extinction: [] }, courbe = [];
  for (let k = 0; k < N; k++) { X = Orvane.cycle(X, {}); A = Orvane.cycle(A, {}); for (const e of X.evenements) { const t = X.taxons.find(x => x.id === e.taxon); if (t && estPlante(t) && T[e.type] && (e.type !== 'separation' || t.plan.cle)) T[e.type].push(e.detail); } courbe.push(vives(X).length); }
  const D = X.monde.diversite, filles = vives(X).filter(t => t.apparu > W.cycle.n && t.plan.cle);
  verif(T.separation.length > 0 && T.migration.length > 0 && D.nees > W.monde.diversite.nees && D.lignees === vives(X).length, `${N} cycles : ${T.separation.length} séparations (« ${T.separation[0]} »), ${T.migration.length} lieux gagnés (« ${T.migration[0]} ») ; de ${vives(W).length} à ${vives(X).length} lignées de plantes`);
  // la place : la vie de la flore seule (sans le moteur), forcée, trente fois de suite ; elle ne crée ni ne perd de place
  { const Z = clone(X), P = Z.taxons.filter(estPlante), Bz = Object.fromEntries(Z.biomes.map(b => [b.id, b])), avant = somme(Z, 'place'); let monde = Z.monde, sep = 0, col = 0, ext = 0;
    avec({ concurrence: .3, separation: { ...Di.REGLES.separation, chance: .05 }, colonisation: { ...Di.REGLES.colonisation, chance: .05 }, evenements: 1e6 }, () => { for (let k = 1; k <= 30; k++) { const r = Di.vivre(P, { n: Z.cycle.n + k, biomes: Bz, monde }); monde = r.monde(monde);
      for (const e of r.evenements) { if (e.type === 'separation') sep++; else if (e.type === 'migration') col++; else ext++; } } });
    Z.taxons = [...Z.taxons.filter(t => !estPlante(t)), ...P]; const ek = ecart(avant, somme(Z, 'place')), vides = vives(Z).flatMap(t => t.populations).filter(p => !(p.potentiel >= 0) || !Number.isFinite(p.effectif)).length;
    const parLieu = {}; for (const t of vives(Z)) for (const p of t.populations) parLieu[p.biome] = (parLieu[p.biome] || 0) + 1;
    verif(ek < .005 && vides === 0 && sep > 0 && col > 0 && ext > 0 && Math.max(...Object.values(parLieu)) <= Di.REGLES.par_lieu && monde.diversite.lignees === vives(Z).length,
      `la vie de la flore, forcée trente fois de suite (${sep} séparations, ${col} lieux gagnés, ${ext} extinctions) : la place de chaque port dans chaque lieu ne bouge pas (à ${fx(ek * 100, 2)} % près), aucun lieu ne passe ${Di.REGLES.par_lieu} lignées ; ${vives(Z).length} lignées vivantes`); }
  const rb = bio(X, t => !estPlante(t)) / bio(A, t => !estPlante(t)), rp = bio(X, estPlante) / bio(A, estPlante), vifs = I => I.taxons.filter(t => !t.eteint && !estPlante(t)).length;
  verif(rb > .85 && rb < 1.15 && rp > .7 && rp < 1.3 && Math.abs(vifs(X) - vifs(A)) <= 8, `les bêtes pèsent ${fx(rb * 100, 1)} % de ce qu'elles pèsent sans la flore riche, les plantes ${fx(rp * 100, 1)} %, ${vifs(X)} lignées de bêtes contre ${vifs(A)}`);
  verif(empreinte(Orvane.cycle(Orvane.cycle(W, {}), {})) === empreinte(Orvane.cycle(Orvane.cycle(W, {}), {})), 'deux fois le même monde');
}

console.log('7. Les parcelles, le contrat, le cycle de nuit');
{ const P = Di.eveiller(Parcelles.decouper(I0, { par: 2 })).inst, Y = Orvane.cycle(P, {}), V = Parcelles.regrouper(Y), X = Orvane.cycle(W, {});
  const e = [...val(S, Tampon.filtrer(X, { familles: ['animale', 'vegetale'] }), '$'), ...val(S, Tampon.filtrer(V, { familles: ['animale', 'vegetale'] }), '$')];
  verif(!e.length && X.catalogue.flore_riche?.formes?.palmier && vives(P).length === vives(W).length, `l'instantané et ses plantes respectent le schéma, par biome et par parcelles (${vives(P).length} lignées dans les deux) ; le catalogue dit les formes et les caractères` + (e.length ? ' : ' + e.slice(0, 3).join(' ; ') : ''));
  const sansP = Tampon.filtrer(X, { familles: ['animale'] });
  verif(!sansP.taxons.some(estPlante), 'un jeu qui ne demande pas les plantes n\'en reçoit aucune');
  const dossier = racine('mondes/essai-diversite'); fs.rmSync(dossier, { recursive: true, force: true }); fs.mkdirSync(dossier, { recursive: true });
  try { const Pf = lireJ('mondes/orvane/profil.json'); fs.writeFileSync(path.join(dossier, 'profil.json'), JSON.stringify({ ...Pf, monde: { ...Pf.monde, id: 'essai-diversite', diversite: true, succession: true, meteo: false, climat: false, natures: false, invention: false, stades: false, ponte: false, synthetique: false, pathogenes: false, fusions: [], parcelles: undefined, pressions: undefined } }));
    fs.writeFileSync(path.join(dossier, 'etat.json'), JSON.stringify(I0)); fs.writeFileSync(path.join(dossier, 'instantane.json'), JSON.stringify(I0));
    const sortie = execFileSync('node', [racine('hebergement/cycle.js'), 'essai-diversite', '--sans-reseau', '--cycles', '2'], { encoding: 'utf8', maxBuffer: 1e8 }), Ip = JSON.parse(fs.readFileSync(path.join(dossier, 'instantane.json'), 'utf8')), Fp = JSON.parse(fs.readFileSync(path.join(dossier, 'flore.json'), 'utf8'));
    verif((sortie.match(/^diversite : /gm) || []).length === 1 && sortie.indexOf('diversite : ') < sortie.indexOf('succession : ') && Ip.monde.diversite && Fp.taxons.filter(t => !t.eteint).length >= 2.5 * vives(I0).length && Fp.taxons.filter(t => t.plan.cle).every(t => t.populations.every(p => p.reference?.succession != null)),
      `le profil demande la flore riche (monde.diversite), elle s'éveille une fois, avant la succession ; flore.json porte ${Fp.taxons.filter(t => !t.eteint).length} lignées`);
  } finally { fs.rmSync(dossier, { recursive: true, force: true }); }
}
console.log(`\n${ok ? 'tout passe' : 'ÉCHEC'} (${fx((Date.now() - t0) / 60000, 1)} min)`);
process.exit(ok ? 0 : 1);
