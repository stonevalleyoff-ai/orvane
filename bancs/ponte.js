// Orvane — LE BANC DE LA PONTE (bancs/ponte.js, docs/25)
//  1. le jour un : un monde sans ponte tourne exactement comme le moteur sans moteur/ponte.js ; le jour de l'éveil, rien ne bouge ;
//  2. les modes à l'éveil ; le froid favorise les vivipares : une lignée qui ne pond plus gagne au froid, perd au chaud ;
//  3. les mangeurs d'œufs : plus de petits là où l'on pond, des nids pillés, un nid gardé qui l'est moins ;
//  4. la séparation : on devient vivipare, plus souvent au froid ; un oiseau pond toujours ;
//  5. les joueurs qui prennent des œufs ; le contrat ; le cycle de nuit.
//   node bancs/ponte.js
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm'), { execFileSync } = require('child_process');
const racine = p => path.join(__dirname, '..', p);
const Orvane = require(racine('moteur/orvane.js')), Po = require(racine('moteur/ponte.js')), Tampon = require(racine('tampon/tampon.js'));
const lireJ = f => JSON.parse(fs.readFileSync(racine(f), 'utf8'));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const empreinte = I => crypto.createHash('sha256').update(JSON.stringify(I)).digest('hex').slice(0, 16);
const clone = o => JSON.parse(JSON.stringify(o)), fx = (x, d = 2) => (+x).toLocaleString('fr-FR', { maximumFractionDigits: d }), t0 = Date.now();
const S = lireJ('schemas/instantane.schema.json');
const val = (s, v, p) => { if (!s) return []; if (s.$ref) s = S.$defs[s.$ref.split('/').pop()]; const t = Array.isArray(s.type) ? s.type : [s.type], ty = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
  if (s.type && !t.includes(ty === 'number' && t.includes('integer') && Number.isInteger(v) ? 'integer' : ty)) return [p + ': type ' + ty]; if (s.enum && !s.enum.includes(v)) return [p + ': hors enum ' + v]; const e = [];
  if (ty === 'object') { for (const r of s.required || []) if (!(r in v)) e.push(p + ': manque ' + r); for (const k in v) { const ps = s.properties?.[k] || (typeof s.additionalProperties === 'object' ? s.additionalProperties : null); if (ps) e.push(...val(ps, v[k], p + '.' + k)); else if (s.additionalProperties === false) e.push(p + ': en trop ' + k); } }
  if (ty === 'array' && s.items) v.forEach((x, i) => e.push(...val(s.items, x, p + '[' + i + ']'))); return e; };
const I0 = lireJ('mondes/orvane/etat.json'), animaux = I => I.taxons.map(t => [t.id, t.populations.map(p => [p.biome, p.effectif])]);
const W = Po.eveiller(I0).inst, B = Object.fromEntries(W.biomes.map(b => [b.id, b]));

console.log('1. Le jour un');
{ const src = fs.readFileSync(racine('moteur/orvane.js'), 'utf8'), mod = { exports: {} };
  vm.runInNewContext(src, { module: mod, require: p => p === './ponte.js' ? null : require(racine('moteur/' + p.replace('./', ''))), console });
  let A = I0, C = I0; for (let k = 0; k < 3; k++) { A = Orvane.cycle(A, {}); C = mod.exports.cycle(C, {}); }
  verif(empreinte(A) === empreinte(C), 'un monde sans ponte tourne exactement comme le moteur sans moteur/ponte.js');
  const T = Po.TRAITS.oophage; delete Po.TRAITS.oophage; const a = Orvane.cycle(I0, {}), b = Orvane.cycle(W, {}); Po.TRAITS.oophage = T;
  verif(empreinte(animaux(a)) === empreinte(animaux(b)), 'le jour de l\'éveil, rien ne bouge : chaque lignée a son mode, et ses naissances se rapportent à lui (le tirage du mangeur d\'œufs mis à part)');
}

console.log('2. Les modes, le froid');
{ const n = m => W.taxons.filter(t => t.plan.reproduction === m).length, f = (forme, m) => W.taxons.filter(t => t.plan.corps?.forme === forme).every(t => t.plan.reproduction === m);
  verif(f('oiseau', 'ovipare') && f('serpent', 'ovipare') && f('hexapode', 'ovipare'), `à l'éveil : ${n('ovipare')} lignées pondent (les oiseaux, les serpents, les hexapodes, les poissons, les bêtes à carapace), ${n('vivipare')} mettent bas`);
  const pv = { reproduction: 'vivipare', reproduction0: 'ovipare', corps: { forme: 'quadrupede' } }, Sx = Po.preparer({ taxons: [], biomes: B }), fac = id => Sx.naissances({ plan: pv, phenotypes: [{ traits: [] }] }, id, 0);
  verif(fac('banquise') > 1.5 && fac('toundra') > 1.2 && fac('jungle') < .75, `une lignée née d'une pondeuse, qui met bas : ${fx(fac('banquise'))} fois ses naissances sur la banquise, ${fx(fac('toundra'))} dans la toundra, ${fx(fac('jungle'))} dans la jungle (des petits moins nombreux, mais à l'abri du froid)`);
  // deux moitiés d'une même lignée, l'une qui pond, l'autre qui met bas, 30 cycles : au froid (la toundra), au chaud (le récif)
  const course = (tid, bid) => { let X = clone(W); const t = X.taxons.find(x => x.id === tid), u = clone(t); u.id = tid + '-vivipare'; u.nom += ' (vivipare)'; u.parent = null; u.plan.reproduction = 'vivipare';
    for (const L of [t.populations, u.populations]) for (const p of L) p.effectif /= 2; X.taxons.push(u);
    for (let k = 0; k < 30; k++) X = Orvane.cycle(X, {});
    const e = id => X.taxons.find(x => x.id === id)?.populations.find(p => p.biome === bid)?.effectif || 0; return e(u.id) / Math.max(1e-9, e(u.id) + e(tid)); };
  const froid = course('nouso', 'toundra'), chaud = course('ouorren', 'recif');
  verif(froid > .55 && chaud < .45, `deux moitiés d'une lignée qui pond, l'une devenue vivipare, 30 cycles : dans la toundra (0,12), la vivipare fait ${fx(froid * 100, 0)} % de la lignée ; au récif (0,85), ${fx(chaud * 100, 0)} %`);
}

console.log('3. Les mangeurs d\'œufs');
{ // un omnivore qui met bas, là où d'autres pondent
  const X = clone(W), ovi = new Set(X.taxons.filter(t => t.plan.reproduction === 'ovipare' && t.plan.corps?.forme !== 'oiseau').flatMap(t => t.populations.map(p => p.biome)));
  const om = X.taxons.filter(t => t.plan.regime === 'omnivore' && t.plan.reproduction === 'vivipare').sort((a, b) => Math.max(...b.populations.map(p => p.effectif)) - Math.max(...a.populations.map(p => p.effectif))).find(t => t.populations.some(p => ovi.has(p.biome)));
  const bid = om.populations.filter(p => ovi.has(p.biome)).sort((a, b) => b.effectif - a.effectif)[0].biome;
  om.phenotypes.forEach(p => { p.frequence *= .5; if (p.frequence_par_biome) for (const k in p.frequence_par_biome) p.frequence_par_biome[k] *= .5; });
  om.phenotypes.push({ id: 'oophage', frequence: .5, traits: ['oophage'], frequence_par_biome: Object.fromEntries(om.populations.map(p => [p.biome, .5])) });
  const Sx = Po.preparer({ taxons: X.taxons, biomes: B }), pond = X.taxons.find(t => t.plan.reproduction === 'ovipare' && t.plan.corps?.forme !== 'oiseau' && t.populations.some(p => p.biome === bid));
  const iO = om.phenotypes.length - 1, festin = Sx.naissances(om, bid, iO), nid = Sx.naissances({ ...pond, phenotypes: [{ traits: [] }] }, bid, 0), garde = Sx.naissances({ ...pond, phenotypes: [{ traits: ['soins-parentaux'] }] }, bid, 0);
  verif(festin > 1 && nid < 1 && garde > nid, `${B[bid].nom || bid} : la moitié de ${om.nom} mange les œufs : ${fx(festin)} fois ses naissances ; les pondeurs y perdent ${fx((1 - nid) * 100, 0)} % de leurs petits (pillage ${fx(Sx.pillage(bid) * 100, 0)} %), ceux qui gardent leur nid ${fx((1 - garde) * 100, 0)} %`);
  const cat = Orvane.cycle(X, {}).catalogue.traits; verif(cat.oophage?.effet, 'le mangeur d\'œufs est un trait du monde où l\'on pond : il apparaît par mutation et le catalogue le publie');
}

console.log('4. La séparation');
{ const essai = (mode, forme, T, k = 4000) => { let c = 0; for (let i = 0; i < k; i++) { const p = { reproduction: mode, corps: { forme } }, q = { ...p }; if (Po.separer(p, q, { axes: { temperature: T } }, 'x' + i, 7)) c++; } return c / k; };
  const chaud = essai('ovipare', 'quadrupede', .6), froid = essai('ovipare', 'quadrupede', .1), retour = essai('vivipare', 'quadrupede', .6), oiseau = essai('ovipare', 'oiseau', .1);
  verif(froid > chaud * 2 && retour < chaud / 3 && oiseau === 0, `à la séparation, une lignée qui pond devient vivipare ${fx(chaud * 100, 1)} fois sur cent au chaud, ${fx(froid * 100, 1)} au froid ; une vivipare se remet à pondre ${fx(retour * 100, 1)} fois sur cent ; un oiseau, jamais`);
}

console.log('5. Les joueurs, le contrat, le cycle de nuit');
{ const lot = age => [{ monde: I0.monde.id, source: { jeu: 'essai', compte: 'j1' }, evenements: [{ taxon: 'ouorren', biome: 'recif', action: 'prelevement', n: 10, age }] }];
  const pf = { ...lireJ('mondes/orvane/profil.json').influence ? lireJ('mondes/orvane/profil.json') : {} };
  const ret = age => Object.values(Tampon.agreger(lot(age), W, pf, {}).pressions.taxons.ouorren?.recif?.retrait || {}).reduce((a, x) => a + x, 0);
  verif(ret('oeuf') > 0 && Math.abs(ret('oeuf') / ret('adulte') - .3 / 1.2) < .01, `dix œufs pris pèsent ${fx(ret('oeuf') / ret('adulte') * 100, 0)} % de dix adultes (age : oeuf, dans un lot)`);
  const e = val(S, Tampon.filtrer(Orvane.cycle(W, {}), { familles: ['animale', 'synthetique'] }), '$'); verif(!e.length, "l'instantané d'un monde où l'on pond respecte schemas/instantane.schema.json" + (e.length ? ' : ' + e.slice(0, 3).join(' ; ') : ''));
  const dossier = racine('mondes/essai-ponte'); fs.rmSync(dossier, { recursive: true, force: true }); fs.mkdirSync(dossier, { recursive: true });
  try { const P = lireJ('mondes/orvane/profil.json'); fs.writeFileSync(path.join(dossier, 'profil.json'), JSON.stringify({ ...P, monde: { ...P.monde, id: 'essai-ponte', ponte: true, synthetique: false, flore: false, milieu: false, pathogenes: false, fusions: [], parcelles: undefined, pressions: undefined } }));
    fs.writeFileSync(path.join(dossier, 'etat.json'), JSON.stringify(I0)); fs.writeFileSync(path.join(dossier, 'instantane.json'), JSON.stringify(I0));
    const sortie = execFileSync('node', [racine('hebergement/cycle.js'), 'essai-ponte', '--sans-reseau', '--cycles', '2'], { encoding: 'utf8' }), Ip = JSON.parse(fs.readFileSync(path.join(dossier, 'instantane.json'), 'utf8'));
    verif((sortie.match(/^ponte : /gm) || []).length === 1 && Ip.monde.ponte && Ip.taxons.every(t => t.plan.reproduction), 'le cycle de nuit : le profil demande la ponte (monde.ponte), elle s\'éveille une fois, et chaque lignée publie son mode');
  } finally { fs.rmSync(dossier, { recursive: true, force: true }); }
}
console.log(`\n${ok ? 'tout passe' : 'ÉCHEC'} (${fx((Date.now() - t0) / 60000, 1)} min)`);
process.exit(ok ? 0 : 1);
