// Orvane — LE BANC DE LA FUSION PAR PONTS (bancs/ponts.js, docs/23)
// Le monde de la genèse 7 (seize biomes, 99 lignées) devient un continent du monde d'Orvane, relié par trois ponts.
//  1. le continent : ses parcelles, ses types, ses lignées, ses ponts ; le monde d'Orvane n'est pas touché ;
//  2. les ponts : sans eux, rien ne passe ; avec eux, les deux faunes passent ;
//  3. de proche en proche : une parcelle proche d'un pont est gagnée avant une parcelle lointaine ;
//  4. deux mondes ne se croisent pas ; la flore et le milieu du continent, à l'arrivée ;
//  5. le contrat, le déterminisme, le cycle de nuit.
//   node bancs/ponts.js [--court]
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execFileSync } = require('child_process');
const racine = p => path.join(__dirname, '..', p);
const Orvane = require(racine('moteur/orvane.js')), Fusion = require(racine('moteur/fusion.js')), Parcelles = require(racine('moteur/parcelles.js')), Flore = require(racine('moteur/flore.js')), Mi = require(racine('moteur/milieu.js')), Tampon = require(racine('tampon/tampon.js'));
const court = process.argv.includes('--court'), CYCLES = court ? 40 : 80;
const lireJ = f => JSON.parse(fs.readFileSync(racine(f), 'utf8'));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const empreinte = I => crypto.createHash('sha256').update(JSON.stringify(I)).digest('hex').slice(0, 16);
const clone = o => JSON.parse(JSON.stringify(o)), somme = x => x.reduce((s, y) => s + y, 0), fx = (x, d = 1) => (+x).toLocaleString('fr-FR', { maximumFractionDigits: d });
const S = lireJ('schemas/instantane.schema.json');
const val = (s, v, p) => { if (!s) return []; if (s.$ref) s = S.$defs[s.$ref.split('/').pop()]; const t = Array.isArray(s.type) ? s.type : [s.type], ty = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
  if (s.type && !t.includes(ty === 'number' && t.includes('integer') && Number.isInteger(v) ? 'integer' : ty)) return [p + ': type ' + ty]; if (s.enum && !s.enum.includes(v)) return [p + ': hors enum ' + v]; const e = [];
  if (ty === 'object') { for (const r of s.required || []) if (!(r in v)) e.push(p + ': manque ' + r); for (const k in v) { const ps = s.properties?.[k] || (typeof s.additionalProperties === 'object' ? s.additionalProperties : null); if (ps) e.push(...val(ps, v[k], p + '.' + k)); else if (s.additionalProperties === false) e.push(p + ': en trop ' + k); } }
  if (ty === 'array' && s.items) v.forEach((x, i) => e.push(...val(s.items, x, p + '[' + i + ']'))); return e; };
// (le monde d'Orvane d'avant ses fusions — sa génération 0 — : etat.json est déjà relié à la genèse 7)
const I0 = lireJ('mondes/orvane/generation-0.json'), G = lireJ('mondes/genese-7/instantane.json'), t0 = Date.now(), T = Parcelles.decouper(I0, { par: 4 });
const TAG = '~genese-7-', duContinent = b => b.includes(TAG);

console.log('1. Le continent');
const R = Fusion.relier(T, G, { id: 'genese-7' }), X0 = R.inst, src = new Set(X0.taxons.filter(t => t.origine?.fusion === 'genese-7').map(t => t.id));
{ const B = R.bilan, places = X0.biomes.filter(b => duContinent(b.id)), types = X0.monde.parcelles.types.length;
  verif(places.length === G.biomes.length * 4 && types === T.monde.parcelles.types.length + G.biomes.filter(b => !T.monde.parcelles.types.some(x => x.id === b.id)).length && B.lignees === G.taxons.filter(t => t.eteint == null).length,
    `le monde de la genèse 7 devient un continent : ${places.length} parcelles (${G.biomes.length} biomes en 4), ${types - T.monde.parcelles.types.length} biomes de plus au monde (sa prairie est une part de la prairie), ${B.lignees} lignées, ${fx(B.individus / 1e6)} millions de bêtes`);
  verif(B.ponts.length === 3 && B.ponts.every(([a, b]) => X0.biomes.find(x => x.id === a).voisins.includes(b) && X0.biomes.find(x => x.id === b).voisins.includes(a)), `trois ponts, entre les parcelles les plus semblables : ${B.ponts.map(([a, b]) => a.replace(TAG, '~') + ' ↔ ' + b).join(', ')}`);
  const ids = X0.taxons.map(t => t.id), racines = X0.taxons.filter(t => src.has(t.id)).every(t => !t.parent || src.has(t.parent));
  verif(new Set(ids).size === ids.length && racines && B.renommees === 2, `chaque arbre garde sa racine (aucune lignée du continent n'a d'ancêtre dans Orvane) ; ${B.renommees} noms déjà pris, renommés`);
  const avant = T.taxons.map(t => t.populations), apres = X0.taxons.filter(t => !src.has(t.id)).map(t => t.populations);
  verif(empreinte(avant) === empreinte(apres), 'le monde d\'Orvane n\'est pas touché : ses lignées et leurs populations restent ce qu\'elles étaient');
  const V = Parcelles.regrouper(X0), prairie = V.taxons.filter(t => t.populations.some(p => p.biome === 'prairie')).length, prairieT = Parcelles.regrouper(T).taxons.filter(t => t.populations.some(p => p.biome === 'prairie')).length;
  verif(V.biomes.length === types && prairie > prairieT, `l'instantané publié a ${V.biomes.length} biomes ; la prairie y compte ${prairie} lignées, celles d'Orvane (${prairieT}) et celles de la prairie du continent`);
}

console.log('2. Les ponts');
const passe = X => { let a = new Set(), b = new Set(); for (const t of X.taxons) if (!t.eteint) for (const p of t.populations) if (p.effectif >= 1) { const c = duContinent(p.biome); if (src.has(t.id) && !c) a.add(t.id); if (!src.has(t.id) && c) b.add(t.id); } return [a.size, b.size]; };
{ let Z = Fusion.relier(T, G, { id: 'genese-7', ponts: 0 }).inst, Y = clone(X0); for (let k = 0; k < 10; k++) { Z = Orvane.cycle(Z, {}); Y = Orvane.cycle(Y, {}); }
  const [za, zb] = passe(Z), [ya, yb] = passe(Y);
  verif(za === 0 && zb === 0 && ya > 0 && yb > 0, `sans pont, rien ne passe en 10 cycles (${za} et ${zb}) ; avec trois ponts, ${ya} lignées du continent gagnent Orvane et ${yb} lignées d'Orvane gagnent le continent`);
}

console.log('3. De proche en proche');
let X = clone(X0);
{ // la distance de chaque parcelle d'Orvane au plus proche pont, en pas ; le cycle où une lignée du continent y arrive
  const cote = new Set(R.bilan.ponts.map(([, b]) => b)), V = new Map(X0.biomes.map(b => [b.id, b])), dist = new Map([...cote].map(b => [b, 0])), file = [...cote];
  while (file.length) { const b = file.shift(); for (const v of V.get(b).voisins || []) if (!duContinent(v) && !dist.has(v)) { dist.set(v, dist.get(b) + 1); file.push(v); } }
  const arrivee = new Map(), paires = new Set(), a20 = [];
  for (let k = 1; k <= CYCLES; k++) { X = Orvane.cycle(X, {}); for (const t of X.taxons) if (src.has(t.id) && !t.eteint) for (const p of t.populations) if (p.effectif >= 1 && !duContinent(p.biome)) {
      if (!arrivee.has(p.biome)) arrivee.set(p.biome, k); paires.add(t.id + '|' + p.biome); }
    if (k === 20) a20.push(...[...paires].filter(x => dist.get(x.split('|')[1]) === 1)); }
  const parD = {}; for (const [b, k] of arrivee) (parD[dist.get(b)] ??= []).push(k);
  const moy = d => parD[d] ? somme(parD[d]) / parD[d].length : Infinity, un = [...paires].filter(x => dist.get(x.split('|')[1]) === 1).length;
  const dit = Object.keys(parD).sort().map(d => `${parD[d].length} parcelle${parD[d].length > 1 ? 's' : ''} à ${d} pas${d === '0' ? ' (les ponts)' : ''} vers le cycle ${fx(moy(d), 0)}`).join(', ');
  verif(moy(0) < moy(1) && (parD[2] ? moy(1) < moy(2) : true) && un > a20.length, `les lignées du continent gagnent Orvane de proche en proche, en ${CYCLES} cycles : ${dit} ; à un pas des ponts, ${a20.length} présences (une lignée dans une parcelle) au cycle 20, ${un} au cycle ${CYCLES}`);
}

console.log('4. Deux mondes, une flore, un milieu');
{ const hy = X.taxons.flatMap(t => t.populations.filter(p => p.hybride).map(p => [t.id, p.hybride.avec])), croises = hy.filter(([a, b]) => b && src.has(a) !== src.has(b));
  const M = new Map(X.taxons.map(t => [t.id, t])), A = X.taxons.filter(t => src.has(t.id)), B = X.taxons.filter(t => !src.has(t.id)); let liees = 0;
  for (const a of A) for (const b of B) if (Orvane.parente(a, b, M)) liees++;
  verif(hy.length > 0 && croises.length === 0 && liees === 0, `${hy.length} zones hybrides au bout de ${CYCLES} cycles, aucune entre une lignée du continent et une lignée d'Orvane : sur ${A.length * B.length} paires, aucune n'a d'ancêtre commun`);
  const F = Mi.eveiller(Flore.eveiller(T).inst).inst, RF = Fusion.relier(F, G, { id: 'genese-7' }), W = RF.inst, P = W.taxons.filter(t => t.plan?.regime === 'vegetal' && t.origine?.fusion === 'genese-7');
  const nouvelles = W.biomes.filter(b => duContinent(b.id)), avec = nouvelles.filter(b => P.some(t => t.populations.some(q => q.biome === b.id))).length;
  let Y = W; for (let k = 0; k < 3; k++) Y = Orvane.cycle(Y, {});
  const nour = Y.taxons.filter(t => src.has(t.id) || t.origine?.fusion === 'genese-7').flatMap(t => t.populations.filter(q => duContinent(q.biome) && q.nourriture != null).map(q => q.nourriture)), m = nour.length ? somme(nour) / nour.length : 1;
  verif(P.length > 0 && avec >= nouvelles.length * .8 && nouvelles.every(b => b.transforme?.base) && m > .8 && m < 1.25,
    `dans un monde à flore et à milieu transformé, le continent arrive avec ses plantes (${P.length} lignées, sur ${avec} de ses ${nouvelles.length} parcelles) et la base de son milieu ; ses brouteurs y trouvent ${fx(m * 100, 0)} % de leur nourriture`);
}

console.log('5. Le contrat, le déterminisme, le cycle de nuit');
{ const pub = Tampon.filtrer(Parcelles.regrouper(X), { familles: ['animale', 'synthetique'] }), e = val(S, pub, '$');
  verif(!e.length, "l'instantané du monde relié respecte schemas/instantane.schema.json" + (e.length ? ' : ' + e.slice(0, 3).join(' ; ') : ''));
  verif(empreinte(Fusion.relier(T, G, { id: 'genese-7' }).inst) === empreinte(X0) && Fusion.relier(X0, G, { id: 'genese-7' }).bilan.deja, 'les mêmes mondes donnent le même continent ; une fusion faite ne se refait pas');
  const dossier = racine('mondes/essai-ponts'); fs.rmSync(dossier, { recursive: true, force: true }); fs.mkdirSync(dossier, { recursive: true });
  try { const pf = lireJ('mondes/orvane/profil.json');
    fs.writeFileSync(path.join(dossier, 'profil.json'), JSON.stringify({ ...pf, monde: { ...pf.monde, id: 'essai-ponts', synthetique: false, flore: false, milieu: false, pathogenes: false, fusions: [{ id: 'genese-7', source: 'mondes/genese-7/instantane.json', ponts: 3 }], pressions: undefined } }));
    fs.writeFileSync(path.join(dossier, 'etat.json'), JSON.stringify(I0)); fs.writeFileSync(path.join(dossier, 'instantane.json'), JSON.stringify(I0));
    const sortie = execFileSync('node', [racine('hebergement/cycle.js'), 'essai-ponts', '--sans-reseau', '--cycles', '2'], { encoding: 'utf8' }), E = JSON.parse(fs.readFileSync(path.join(dossier, 'etat.json'), 'utf8'));
    verif((sortie.match(/^fusion genese-7 : le continent .* relié par 3 ponts/gm) || []).length === 1 && E.monde.fusions.some(f => f.id === 'genese-7' && f.mode === 'ponts') && E.biomes.some(b => duContinent(b.id)), 'le cycle de nuit : le profil commande la fusion par ponts (monde.fusions, ponts : 3), elle se fait une fois');
  } finally { fs.rmSync(dossier, { recursive: true, force: true }); }
}
console.log(`\n${ok ? 'tout passe' : 'ÉCHEC'} (${fx((Date.now() - t0) / 60000, 1)} min)`);
process.exit(ok ? 0 : 1);
