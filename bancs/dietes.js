// Orvane — LE BANC DES RÉGIMES EN SPECTRE (bancs/dietes.js, docs/30)
//  1. le jour un : un monde sans régimes en spectre tourne exactement comme le moteur sans moteur/dietes.js ; le jour de l'éveil, aucune bête ne change ;
//  2. les spectres de l'éveil : des brouteurs, des mangeurs de fruits, des butineurs, des mangeurs d'insectes, des mangeurs de viande ;
//  3. les plantes : un fruit n'est pas gardé par les toxines ; un mangeur de fruits gêne moins les mangeurs de feuilles et sème les arbres ;
//  4. les bêtes : un mangeur d'insectes chasse les petites bêtes ; un buveur de sang pique les grandes sans les tuer, et porte mieux leurs souches ;
//  5. le glissement : des parts voisines, aux taux dits ; le régime d'hier suit ; le contrat ; le cycle de nuit.
//   node bancs/dietes.js
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm'), { execFileSync } = require('child_process');
const racine = p => path.join(__dirname, '..', p);
const Orvane = require(racine('moteur/orvane.js')), Di = require(racine('moteur/dietes.js')), Fl = require(racine('moteur/flore.js')), Dv = require(racine('moteur/derives.js')), Tampon = require(racine('tampon/tampon.js'));
const lireJ = f => JSON.parse(fs.readFileSync(racine(f), 'utf8'));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const empreinte = I => crypto.createHash('sha256').update(JSON.stringify(I)).digest('hex').slice(0, 16);
const clone = o => JSON.parse(JSON.stringify(o)), fx = (x, d = 0) => (+x).toLocaleString('fr-FR', { maximumFractionDigits: d }), t0 = Date.now();
const S = lireJ('schemas/instantane.schema.json');
const val = (s, v, p) => { if (!s) return []; if (s.$ref) s = S.$defs[s.$ref.split('/').pop()]; const t = Array.isArray(s.type) ? s.type : [s.type], ty = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
  if (s.type && !t.includes(ty === 'number' && t.includes('integer') && Number.isInteger(v) ? 'integer' : ty)) return [p + ': type ' + ty]; if (s.enum && !s.enum.includes(v)) return [p + ': hors enum ' + v]; const e = [];
  if (ty === 'object') { for (const r of s.required || []) if (!(r in v)) e.push(p + ': manque ' + r); for (const k in v) { const ps = s.properties?.[k] || (typeof s.additionalProperties === 'object' ? s.additionalProperties : null); if (ps) e.push(...val(ps, v[k], p + '.' + k)); else if (s.additionalProperties === false) e.push(p + ': en trop ' + k); } }
  if (ty === 'array' && s.items) v.forEach((x, i) => e.push(...val(s.items, x, p + '[' + i + ']'))); return e; };
// (le monde d'Orvane, d'avant ce mécanisme : bancs/monde.js)
const I0 = require('./monde.js').etat(['dietes']); let V = Fl.eveiller(I0).inst; V = Orvane.cycle(V, {});   // un monde avec sa flore, un cycle après
const W = Di.eveiller(V).inst, W1 = Orvane.cycle(W, {});
const animaux = I => I.taxons.filter(t => t.plan.regime !== 'vegetal').map(t => [t.id, t.populations.map(p => [p.biome, p.effectif])]);
const tot = (t, B) => t ? t.populations.filter(p => !B || B.has(p.biome)).reduce((a, p) => a + p.effectif, 0) : 0, Tx = (X, id) => X.taxons.find(t => t.id === id);
const bio = (X, f, B) => X.taxons.filter(f).reduce((a, t) => a + tot(t, B) * (t.plan.masse_kg || 1), 0);
const avancer = (X, n) => { for (let k = 0; k < n; k++) X = Orvane.cycle(X, {}); return X; };

console.log('1. Le jour un');
{ const src = fs.readFileSync(racine('moteur/orvane.js'), 'utf8'), mod = { exports: {} };
  vm.runInNewContext(src, { module: mod, require: p => p === './dietes.js' ? null : require(racine('moteur/' + p.replace('./', ''))), console });
  let A = V, C = V; for (let k = 0; k < 2; k++) { A = Orvane.cycle(A, {}); C = mod.exports.cycle(C, {}); }
  verif(empreinte(A) === empreinte(C), 'un monde sans régimes en spectre (avec sa flore) tourne exactement comme le moteur sans moteur/dietes.js');
  const a = Orvane.cycle(V, {}); verif(empreinte(animaux(a)) === empreinte(animaux(W1)), 'le jour de l\'éveil, aucune bête ne change : la nourriture, la concurrence et la chasse se raccordent à ce qu\'elles étaient');
}

console.log('2. Les spectres de l\'éveil');
{ const c = {}; for (const t of W.taxons) if (t.plan.diete) { const k = Di.mots(t.plan.diete); c[k] = (c[k] || 0) + 1; }
  const n = W.taxons.filter(t => t.plan.diete).length, L = Object.entries(c).sort((x, y) => y[1] - x[1]);
  verif(n > 50 && W.taxons.filter(t => t.plan.diete).every(t => Di.regimeDe(t.plan.diete) === t.plan.regime && t.plan.diete0) && W.taxons.filter(t => ['filtreur', 'vegetal'].includes(t.plan.regime)).every(t => !t.plan.diete),
    `${n} lignées reçoivent un spectre qui redit leur régime ; les plus courants : ${L.slice(0, 4).map(([k, v]) => `${k} (${v})`).join(' ; ')}`);
}

console.log('3. Les plantes');
{ const arbre = { t: { plan: { forme: 'arbre', masse_kg: 500 } }, p: { effectif: 100, frequences: [0, 1, 0, 0] } }, corps = { masse_kg: 2, taille_m: .5, locomotion: ['marche', 'grimpe'] };
  const fe = Fl.offreD([arbre], { ...corps, diete: { feuilles: 1 } }, [], false), fr = Fl.offreD([arbre], { ...corps, diete: { fruits: 1 } }, [], false);
  verif(fr / fe > 1, `sur un arbre aux feuilles toxiques, un mangeur de fruits trouve ${fx(fr / fe, 2)} fois ce que trouve un mangeur de feuilles (0,4 de fruits par part de feuilles, mais les toxines ne les gardent pas)`);
  // une lignée qui mange moitié feuilles, moitié fruits ne mange plus que des fruits : elle gêne moins les mangeurs de feuilles, elle sème les arbres
  const q = W1.taxons.filter(t => t.plan.diete?.fruits >= .5 && t.plan.regime === 'herbivore').sort((a, b) => tot(b) * b.plan.masse_kg - tot(a) * a.plan.masse_kg)[0], B = new Set(q.populations.map(p => p.biome));
  const X0 = clone(W1); Tx(X0, q.id).plan.diete = { fruits: 1 };
  const A = avancer(W1, 20), X = avancer(X0, 20), arbres = Y => bio(Y, t => t.plan.forme === 'arbre', B), fol = Y => bio(Y, t => t.id !== q.id && t.plan.diete?.feuilles >= .8, B);
  verif(tot(Tx(X, q.id)) > tot(Tx(A, q.id)) * 1.02 && arbres(X) > arbres(A), `${q.nom} (${q.plan.masse_kg} kg) ne mange plus que des fruits : 20 cycles après, ${fx(tot(Tx(X, q.id)))} bêtes contre ${fx(tot(Tx(A, q.id)))} ; les arbres de ses lieux pèsent ${fx((arbres(X) / arbres(A) - 1) * 100, 1)} % de plus (elle ne les broute plus, elle les sème) ; les mangeurs de feuilles de ses lieux, ${fx((fol(X) / fol(A) - 1) * 100, 1)} %`);
}

console.log('4. Les bêtes');
{ const ins = { masse_kg: .01, corps: { forme: 'hexapode' } }, sou = { masse_kg: .3, corps: { forme: 'quadrupede' } }, d0 = { insectes: 1 }, pp = { masse_kg: .1, diete: { insectes: .5, viande: .5 }, diete0: d0 };
  const a1 = Di.appetence(pp, ins, 1), a2 = Di.appetence(pp, sou, 1);
  verif(a1 < 1 && a2 > 3, `un mangeur d'insectes (100 g) qui mange désormais moitié viande : ×${fx(a1, 2)} pour un insecte, ×${fx(a2, 1)} pour une souris de 300 g`);
  // dans le monde : un carnivore qui mangeait de la viande ne mange plus que des insectes ; les insectes de ses lieux en pâtissent
  const c = W1.taxons.filter(t => t.plan.regime === 'carnivore' && t.plan.diete?.viande >= .8 && t.plan.masse_kg < 3).sort((a, b) => tot(b) - tot(a))[0], Bc = new Set(c.populations.map(p => p.biome));
  const X0 = clone(W1); Tx(X0, c.id).plan.diete = { insectes: 1 };
  const A = avancer(W1, 15), X = avancer(X0, 15), insectes = Y => bio(Y, t => t.plan.regime !== 'vegetal' && t.id !== c.id && Di.estInsecte(t.plan), Bc), autres = Y => bio(Y, t => t.plan.regime !== 'vegetal' && t.id !== c.id && !Di.estInsecte(t.plan), Bc);
  verif(insectes(X) < insectes(A) && autres(X) > autres(A), `${c.nom} (${c.plan.masse_kg} kg) ne mange plus que des insectes : 15 cycles après, les insectes de ses lieux pèsent ${fx((insectes(X) / insectes(A) - 1) * 100, 1)} %, les autres bêtes ${fx((autres(X) / autres(A) - 1) * 100, 1)} %`);
  // un buveur de sang : un petit hexapode omnivore qui pique les grandes bêtes de ses lieux
  const v = W1.taxons.filter(t => t.plan.regime === 'omnivore' && Dv.estVecteur(t)).sort((a, b) => tot(b) - tot(a))[0] || W1.taxons.filter(t => t.plan.regime === 'omnivore' && t.plan.masse_kg <= .05).sort((a, b) => tot(b) - tot(a))[0];
  const Bv = new Set(v.populations.map(p => p.biome)), Y0 = clone(W1); Tx(Y0, v.id).plan.diete = { sang: .5, feuilles: .3, fruits: .2 };
  const Y1 = Orvane.cycle(Y0, {}), A1 = Orvane.cycle(W1, {}), sat = (Z, id) => { const t = Tx(Z, id), N = tot(t); return t.populations.reduce((a, p) => a + (p.satiete || 0) * p.effectif, 0) / (N || 1); };
  const Y = avancer(Y1, 14), Am = avancer(A1, 14), grands = Z => bio(Z, t => t.plan.regime !== 'vegetal' && (t.plan.masse_kg || 1) >= 20 * v.plan.masse_kg, Bv);
  const fx0 = Di.appetence(Tx(Y0, v.id).plan, { masse_kg: 60 }, 0);
  verif(fx0 > 0 && sat(Y1, v.id) > 2 * sat(A1, v.id) && Math.abs(grands(Y) / grands(Am) - 1) < .02 && Di.mortel(Tx(Y0, v.id).plan, { masse_kg: 60 }) === .1,
    `${v.nom} (${fx(v.plan.masse_kg * 1000)} g) boit désormais du sang : il pique un brouteur de 60 kg qu'il n'aurait jamais chassé, et sa part de chair le nourrit à ${fx(sat(Y1, v.id) * 100, 1)} % contre ${fx(sat(A1, v.id) * 100, 1)} % ; ses hôtes n'y perdent que ${fx((1 - grands(Y) / grands(Am)) * 100, 1)} % en 15 cycles (une piqûre ne tue qu'un dixième de ce qu'elle prend) ; la sélection dit si le sang paie : ${fx(tot(Tx(Y, v.id)))} bêtes contre ${fx(tot(Tx(Am, v.id)))}, il n'y en a pas assez pour 2 millions de buveurs`);
  // il porte mieux les souches (docs/29)
  const vec = { id: 'v', plan: { masse_kg: .01, corps: { forme: 'hexapode' }, locomotion: ['marche'], diete: { sang: 0 } } }, hote = { id: 'h', plan: { masse_kg: 50 } }, autre = { id: 'a', plan: { masse_kg: 40 } };
  const pique = sang => { vec.plan.diete.sang = sang; const lieux = { b: [{ t: vec, N: 1e4, inf: {} }, { t: hote, N: 100, inf: { s: { i: .5 } } }, { t: autre, N: 100, inf: {} }] };
    return Dv.souches({ S: { s: { vecteur: 'v' } }, P: {}, n: 1, lieux, Tmap: new Map([['v', vec], ['h', hote], ['a', autre]]) }).piqures(lieux.b[2], 's', 'b', []); };
  verif(Math.abs(pique(.6) / pique(0) - 2.8) < .01, `un insecte qui boit 60 % de sang transmet ${fx(pique(.6) / pique(0), 1)} fois ce que transmet un insecte qui ne fait que se poser`);
}

console.log('5. Le glissement, le contrat, le cycle de nuit');
{ const c = {}, base = { regime: 'herbivore', diete: { feuilles: .5, fruits: .5 } }; let g = 0, voisin = true;
  for (let i = 0; i < 4000; i++) { const p = clone(base), m = Di.deriver(base, p, 'essai-' + i, 3); if (!m) continue; g++;
    for (const [k, v] of Object.entries(p.diete)) if (!(k in base.diete) && !['feuilles', 'fruits'].some(x => Di.VOISINES[x].includes(k))) voisin = false; c[p.regime] = (c[p.regime] || 0) + 1; }
  verif(Math.abs(g / 4000 - .25) < .02 && voisin && c.omnivore > 0 && c.herbivore > 0, `${fx(g / 40, 1)} % des séparations glissent, vers une part voisine ; d'une lignée moitié feuilles, moitié fruits naissent ${c.omnivore} omnivores (un peu d'insectes) pour ${c.herbivore} herbivores`);
  const sep = clone(Orvane.REGLES.separation); Object.assign(Orvane.REGLES.separation, { cycles: 0, distance: 0, chance: 1 }); const gl = clone(Di.REGLES.glissement); Di.REGLES.glissement.chance = 1;
  let X; try { X = Orvane.cycle(W1, {}); } finally { Object.assign(Orvane.REGLES.separation, sep); Object.assign(Di.REGLES.glissement, gl); }
  // (les filles de ce cycle : celles qui n'existaient pas avant lui)
  const avant = new Set(W1.taxons.map(t => t.id)), F = X.taxons.filter(t => !avant.has(t.id) && t.apparu === X.cycle.n && t.parent && t.plan.diete), P = F.map(f => [f, Tx(X, f.parent)]), ch = P.filter(([f, p]) => JSON.stringify(f.plan.diete) !== JSON.stringify(p.plan.diete));
  verif(F.length > 50 && ch.length === F.length && F.every(f => Di.regimeDe(f.plan.diete) === f.plan.regime && f.plan.diete0), `${F.length} séparations forcées, le glissement forcé : toutes les filles ont un spectre neuf, et leur régime le suit (${ch.filter(([f, p]) => f.plan.regime !== p.plan.regime).length} changent de régime) ; elles gardent la référence de leur mère`);
  const e = val(S, Tampon.filtrer(X, { familles: ['animale', 'synthetique', 'vegetale'] }), '$'); verif(!e.length, 'l\'instantané respecte le schéma' + (e.length ? ' : ' + e.slice(0, 3).join(' ; ') : ''));
  const dossier = racine('mondes/essai-dietes'); fs.rmSync(dossier, { recursive: true, force: true }); fs.mkdirSync(dossier, { recursive: true });
  try { const Pf = lireJ('mondes/orvane/profil.json'); fs.writeFileSync(path.join(dossier, 'profil.json'), JSON.stringify({ ...Pf, monde: { ...Pf.monde, id: 'essai-dietes', dietes: true, flore: false, derives: false, natures: false, milieu: false, invention: false, stades: false, ponte: false, synthetique: false, pathogenes: false, fusions: [], parcelles: undefined, pressions: undefined } }));
    fs.writeFileSync(path.join(dossier, 'etat.json'), JSON.stringify(I0)); fs.writeFileSync(path.join(dossier, 'instantane.json'), JSON.stringify(I0));
    const sortie = execFileSync('node', [racine('hebergement/cycle.js'), 'essai-dietes', '--sans-reseau', '--cycles', '2'], { encoding: 'utf8' }), Ip = JSON.parse(fs.readFileSync(path.join(dossier, 'instantane.json'), 'utf8'));
    verif((sortie.match(/^dietes : /gm) || []).length === 1 && Ip.monde.dietes && Ip.taxons.some(t => t.plan.diete), 'le profil demande les régimes en spectre (monde.dietes), ils s\'éveillent une fois');
  } finally { fs.rmSync(dossier, { recursive: true, force: true }); }
}
console.log(`\n${ok ? 'tout passe' : 'ÉCHEC'} (${fx((Date.now() - t0) / 60000, 1)} min)`);
process.exit(ok ? 0 : 1);
