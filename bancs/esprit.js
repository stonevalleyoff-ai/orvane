// Orvane — LE BANC DE L'ESPRIT (bancs/esprit.js, docs/34)
//  1. le jour un : un monde sans esprit tourne exactement comme le moteur sans moteur/esprit.js ; le jour de l'éveil, rien ne bouge ;
//  2. qui apprend : une bête sociable, aux sens fins, qui a des mains ; qui peut apprendre quoi ;
//  3. une tradition : un savoir naît, se répand là où il sert, reste rare là où il ne sert pas ; le catalogue le dit ;
//  4. la perte : une petite population oublie, une grande garde ; les migrants l'emportent ;
//  5. ce que ça rapporte : chasser ensemble nourrit mieux ; là où savoir paie, la curiosité gagne (les gènes et la culture) ;
//  6. le contrat, le cycle de nuit.
//   node bancs/esprit.js
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm'), { execFileSync } = require('child_process');
const racine = p => path.join(__dirname, '..', p);
const Orvane = require(racine('moteur/orvane.js')), E = require(racine('moteur/esprit.js')), Tampon = require(racine('tampon/tampon.js'));
const lireJ = f => JSON.parse(fs.readFileSync(racine(f), 'utf8'));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const empreinte = I => crypto.createHash('sha256').update(JSON.stringify(I)).digest('hex').slice(0, 16);
const clone = o => JSON.parse(JSON.stringify(o)), fx = (x, d = 0) => (+x).toLocaleString('fr-FR', { maximumFractionDigits: d }), t0 = Date.now();
const S = lireJ('schemas/instantane.schema.json');
const val = (s, v, p) => { if (!s) return []; if (s.$ref) s = S.$defs[s.$ref.split('/').pop()]; const t = Array.isArray(s.type) ? s.type : [s.type], ty = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
  if (s.type && !t.includes(ty === 'number' && t.includes('integer') && Number.isInteger(v) ? 'integer' : ty)) return [p + ': type ' + ty]; if (s.enum && !s.enum.includes(v)) return [p + ': hors enum ' + v]; const e = [];
  if (ty === 'object') { for (const r of s.required || []) if (!(r in v)) e.push(p + ': manque ' + r); for (const k in v) { const ps = s.properties?.[k] || (typeof s.additionalProperties === 'object' ? s.additionalProperties : null); if (ps) e.push(...val(ps, v[k], p + '.' + k)); else if (s.additionalProperties === false) e.push(p + ': en trop ' + k); } }
  if (ty === 'array' && s.items) v.forEach((x, i) => e.push(...val(s.items, x, p + '[' + i + ']'))); return e; };
const I0 = lireJ('mondes/orvane/etat.json'), W = E.eveiller(I0).inst, animaux = I => I.taxons.map(t => [t.id, t.populations.map(p => [p.biome, p.effectif]), t.phenotypes.map(p => p.id)]);
const avec = (o, f) => { const g = clone(E.REGLES); Object.assign(E.REGLES, o); try { return f(); } finally { Object.assign(E.REGLES, g); } };
const Tx = (X, id) => X.taxons.find(t => t.id === id), Bm = (X, id) => X.biomes.find(b => b.id === id), tot = t => t.populations.reduce((a, p) => a + p.effectif, 0);
const savoir = (X, tid, bid, k) => Tx(X, tid)?.populations.find(p => p.biome === bid)?.savoirs?.[k] || 0;
const avancer = (X, n, o = {}) => avec(o, () => { for (let k = 0; k < n; k++) X = Orvane.cycle(X, {}); return X; });

console.log('1. Le jour un');
{ const src = fs.readFileSync(racine('moteur/orvane.js'), 'utf8'), mod = { exports: {} };
  vm.runInNewContext(src, { module: mod, require: p => p === './esprit.js' ? null : require(racine('moteur/' + p.replace('./', ''))), console });
  let A = I0, C = I0; for (let k = 0; k < 3; k++) { A = Orvane.cycle(A, {}); C = mod.exports.cycle(C, {}); }
  verif(empreinte(A) === empreinte(C), 'un monde sans esprit tourne exactement comme le moteur sans moteur/esprit.js');
  const T = E.TRAITS.curiosite; delete E.TRAITS.curiosite; const a = Orvane.cycle(I0, {}), b = avec({ invention: 0 }, () => Orvane.cycle(W, {})); E.TRAITS.curiosite = T;
  verif(empreinte(animaux(a)) === empreinte(animaux(b)), 'le jour de l\'éveil, rien ne bouge (le tirage de la curiosité mis à part) : personne ne sait encore rien');
}

console.log('2. Qui apprend');
{ const singe = { regime: 'omnivore', masse_kg: 8, sociabilite: .7, perception: .6, locomotion: ['grimpe', 'marche'], corps: { forme: 'bipede', organes: [{ type: 'mains' }] } }, fourmi = { regime: 'omnivore', masse_kg: .005, sociabilite: .9, perception: .3, locomotion: ['marche'], corps: { forme: 'hexapode' } }, loup = { regime: 'carnivore', masse_kg: 40, sociabilite: .8, perception: .7, locomotion: ['course'] };
  const qui = p => Object.keys(E.SAVOIRS).filter(k => E.SAVOIRS[k].peut(p));
  verif(E.capacite(singe) > .8 && E.capacite(fourmi) < .3 && qui(singe).includes('casser-noix') && !qui(loup).includes('casser-noix') && qui(loup).includes('chasse-concertee'),
    `un simien qui a des mains apprend à ${fx(E.capacite(singe) * 100)} % (${qui(singe).join(', ')}) ; un loup à ${fx(E.capacite(loup) * 100)} % (${qui(loup).join(', ')}) ; une fourmi à ${fx(E.capacite(fourmi) * 100)} %`);
}

console.log('3. Une tradition');
let X3, sim;
{ // une lignée reçoit des mains (le banc) : un simien ; une bête invente ; puis, pour le voir partout, 5 % de chaque population le savent ; 40 cycles
  const X0 = clone(W); sim = X0.taxons.filter(t => !t.eteint && ['herbivore', 'omnivore'].includes(t.plan.regime) && t.plan.masse_kg >= .1 && t.populations.length >= 3).sort((a, b) => tot(b) - tot(a))[0];
  sim.plan.corps = { ...(sim.plan.corps || {}), organes: [...(sim.plan.corps?.organes || []), { type: 'mains', place: 'avant', taille: .5, nombre: 2, forme: 'agiles' }] };
  let X = avancer(X0, 1, { invention: 1 }); const ne = X.evenements.find(e => e.type === 'savoir' && e.taxon === sim.id && /noix/.test(e.detail)), k = 'casser-noix';
  for (const p of Tx(X, sim.id).populations) p.savoirs = { ...(p.savoirs || {}), [k]: Math.max(p.savoirs?.[k] || 0, .05) };
  X = avancer(X, 40, { invention: 0 }); X3 = X;
  const L = Tx(X, sim.id).populations.map(p => [p.biome, p.savoirs?.[k] || 0, E.SAVOIRS[k].ou(Bm(X, p.biome))]).sort((a, b) => b[1] - a[1]), haut = L.filter(x => x[2] >= .8), bas = L.filter(x => x[2] < .3);
  const mh = haut.reduce((a, x) => a + x[1], 0) / (haut.length || 1), mb = bas.reduce((a, x) => a + x[1], 0) / (bas.length || 1);
  verif(ne && mh > .15 && mh > 3 * mb && X.catalogue.savoirs?.[k]?.outil === 'pierre',
    `${sim.nom} reçoit des mains ; « ${ne?.detail} » ; 5 % de chaque population le savent, 40 cycles : ${fx(mh * 100)} % dans les lieux boisés (${haut.slice(0, 3).map(x => Bm(X, x[0]).nom + ' ' + fx(x[1] * 100) + ' %').join(', ')}), ${fx(mb * 100, 1)} % dans les lieux ouverts, où il ne sert pas : une tradition`);
}

console.log('4. La perte');
{ const t = { id: 't', nom: 'Essai', plan: { regime: 'omnivore', masse_kg: 2, sociabilite: .6, perception: .6, locomotion: ['marche'], corps: { forme: 'quadrupede' } }, phenotypes: [{ id: 'base', traits: [], frequence: 1 }],
    populations: [{ biome: 'petite', effectif: 12, savoirs: { 'cris-precis': .5 } }, { biome: 'grande', effectif: 5000, savoirs: { 'cris-precis': .5 } }, { biome: 'loin', effectif: 800, flux: .1 }] };
  const biomes = { petite: { id: 'petite', axes: {} }, grande: { id: 'grande', axes: {} }, loin: { id: 'loin', axes: {} } };
  let A = [t]; for (let n = 1; n <= 15; n++) { const B = clone(A); for (const x of B) for (const p of x.populations) delete p.savoirs; E.apres({ avant: A, sortie: B, biomes, n: 1000 + n }); A = B; }
  const q = b => A[0].populations.find(p => p.biome === b).savoirs?.['cris-precis'] || 0;
  verif(q('petite') < .2 && q('grande') > .5 && q('loin') > .02, `15 cycles : une population de 12 bêtes ne sait presque plus (${fx(q('petite') * 100)} %), une de 5 000 sait mieux (${fx(q('grande') * 100)} %) ; une troisième, qui ne savait rien, l'apprend de ses migrants (${fx(q('loin') * 100)} %)`);
}

console.log('5. Ce que ça rapporte');
{ // chasser ensemble : un carnivore grégaire qui le sait (80 %), contre lui-même qui ne le sait pas
  // (le carnivore le plus nombreux de la savane, rendu grégaire par le banc, dans les deux essais)
  const W2 = clone(W), c = W2.taxons.filter(t => !t.eteint && t.plan.regime === 'carnivore').sort((a, b) => tot(b) - tot(a)).find(t => t.populations.some(p => E.SAVOIRS['chasse-concertee'].ou(Bm(W2, p.biome)) > .5)); c.plan.sociabilite = .6;
  const X0 = clone(W2); for (const p of Tx(X0, c.id).populations) p.savoirs = { 'chasse-concertee': .8 };
  const A = avancer(W2, 15, { invention: 0 }), X = avancer(X0, 15, { invention: 0 }), ouvert = Tx(X, c.id).populations.filter(p => E.SAVOIRS['chasse-concertee'].ou(Bm(X, p.biome)) > .5).map(p => p.biome);
  const s = (Y) => Tx(Y, c.id).populations.filter(p => ouvert.includes(p.biome)).reduce((a, p) => a + p.effectif, 0), A1 = Orvane.cycle(W2, {}), X1 = Orvane.cycle(X0, {});
  const sat = Y => { const P = Tx(Y, c.id).populations.filter(p => ouvert.includes(p.biome)); return P.reduce((a, p) => a + (p.satiete || 0) * p.effectif, 0) / (P.reduce((a, p) => a + p.effectif, 0) || 1); };
  verif(sat(X1) > sat(A1) * 1.05 && s(X) > s(A), `${c.nom} chasse ensemble (80 % le savent) : dans les lieux ouverts, il se nourrit à ${fx(sat(X1) * 100)} % contre ${fx(sat(A1) * 100)} %, et compte ${fx(s(X))} bêtes 15 cycles après, contre ${fx(s(A))} sans ce savoir`);
  // la curiosité : la moitié d'une lignée est curieuse ; elle gagne là où l'on sait (le savoir lui rapporte plus), elle coûte ailleurs
  const h = W.taxons.filter(t => !t.eteint && E.SAVOIRS['cris-precis'].peut(t.plan)).sort((a, b) => tot(b) - tot(a))[0];
  const essai = (sait) => { const Y = clone(W), t = Tx(Y, h.id); if (sait) for (const p of t.populations) p.savoirs = { 'cris-precis': .6, laver: .6 };
    for (const p of t.populations) p.alleles = { ...(p.alleles || {}), curiosite: .29 };
    for (const p of t.phenotypes.slice()) { const traits = [...p.traits, 'curiosite'].sort(), fb = p.frequence_par_biome; t.phenotypes.push({ id: traits.join('+'), traits, frequence: p.frequence / 2, ...(fb ? { frequence_par_biome: Object.fromEntries(Object.entries(fb).map(([b, v]) => [b, v / 2])) } : {}) }); p.frequence /= 2; if (fb) for (const b in fb) fb[b] /= 2; }
    const Z = avancer(Y, 40, { invention: 0 }); return Tx(Z, h.id).phenotypes.reduce((a, p) => a + (p.traits.includes('curiosite') ? p.frequence : 0), 0); };
  const oui = essai(true), non = essai(false);
  verif(oui > non + .03, `la moitié de ${h.nom} est curieuse, 40 cycles : là où l'on sait crier juste et laver sa nourriture, la curiosité tient ${fx(oui * 100)} % ; là où l'on ne sait rien, elle coûte sans servir, ${fx(non * 100)} %`);
}

console.log('6. Le contrat, le cycle de nuit');
{ const e = val(S, Tampon.filtrer(X3, { familles: ['animale'] }), '$'); verif(!e.length, 'l\'instantané d\'un monde qui apprend respecte le schéma' + (e.length ? ' : ' + e.slice(0, 3).join(' ; ') : ''));
  const dossier = racine('mondes/essai-esprit'); fs.rmSync(dossier, { recursive: true, force: true }); fs.mkdirSync(dossier, { recursive: true });
  try { const Pf = lireJ('mondes/orvane/profil.json'); fs.writeFileSync(path.join(dossier, 'profil.json'), JSON.stringify({ ...Pf, monde: { ...Pf.monde, id: 'essai-esprit', esprit: true, castes: false, formes: false, grammaire: false, climat: false, dietes: false, flore: false, derives: false, natures: false, milieu: false, invention: false, stades: false, ponte: false, synthetique: false, pathogenes: false, fusions: [], parcelles: undefined, pressions: undefined } }));
    fs.writeFileSync(path.join(dossier, 'etat.json'), JSON.stringify(I0)); fs.writeFileSync(path.join(dossier, 'instantane.json'), JSON.stringify(I0));
    const sortie = execFileSync('node', [racine('hebergement/cycle.js'), 'essai-esprit', '--sans-reseau', '--cycles', '2'], { encoding: 'utf8' }), Ip = JSON.parse(fs.readFileSync(path.join(dossier, 'instantane.json'), 'utf8'));
    verif((sortie.match(/^esprit : /gm) || []).length === 1 && Ip.monde.esprit, 'le profil demande l\'esprit (monde.esprit), il s\'éveille une fois');
  } finally { fs.rmSync(dossier, { recursive: true, force: true }); }
}
console.log(`\n${ok ? 'tout passe' : 'ÉCHEC'} (${fx((Date.now() - t0) / 60000, 1)} min)`);
process.exit(ok ? 0 : 1);
