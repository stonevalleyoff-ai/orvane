// Orvane — LE BANC DU MILIEU TRANSFORMÉ (bancs/milieu.js, docs/22)
//  1. le jour un : un monde sans milieu éveillé tourne exactement comme le moteur sans moteur/milieu.js ; le jour de l'éveil, rien ne bouge ;
//  2. le pâturage : une savane sans ses brouteurs se referme, une savane surpâturée s'ouvre ; la place des plantes suit ;
//  3. les terriers : des fouisseurs plus nombreux, une capacité plus grande ; les barrages : des bâtisseurs, un lieu plus humide ;
//  4. le jeu : une forêt défrichée, qui se referme quand on la laisse ; une construction ; un axe quelconque ;
//  5. les parcelles : le défrichage reste là où il a eu lieu ; le contrat ; le cycle de nuit.
//   node bancs/milieu.js
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm'), { execFileSync } = require('child_process');
const racine = p => path.join(__dirname, '..', p);
const Orvane = require(racine('moteur/orvane.js')), Mi = require(racine('moteur/milieu.js')), Flore = require(racine('moteur/flore.js')), Parcelles = require(racine('moteur/parcelles.js')), Tampon = require(racine('tampon/tampon.js'));
const lireJ = f => JSON.parse(fs.readFileSync(racine(f), 'utf8'));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const empreinte = I => crypto.createHash('sha256').update(JSON.stringify(I)).digest('hex').slice(0, 16);
const clone = o => JSON.parse(JSON.stringify(o)), somme = x => x.reduce((s, y) => s + y, 0), fx = (x, d = 2) => (+x).toLocaleString('fr-FR', { maximumFractionDigits: d });
const S = lireJ('schemas/instantane.schema.json'), SP = lireJ('schemas/pression.schema.json');
const val = (s, v, p, R = S) => { if (!s) return []; if (s.$ref) s = R.$defs[s.$ref.split('/').pop()]; const t = Array.isArray(s.type) ? s.type : [s.type], ty = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
  if (s.type && !t.includes(ty === 'number' && t.includes('integer') && Number.isInteger(v) ? 'integer' : ty)) return [p + ': type ' + ty]; if (s.enum && !s.enum.includes(v)) return [p + ': hors enum ' + v]; const e = [];
  if (ty === 'object') { for (const r of s.required || []) if (!(r in v)) e.push(p + ': manque ' + r); for (const k in v) { const ps = s.properties?.[k] || (typeof s.additionalProperties === 'object' ? s.additionalProperties : null); if (ps) e.push(...val(ps, v[k], p + '.' + k, R)); else if (s.additionalProperties === false) e.push(p + ': en trop ' + k); } }
  if (ty === 'array' && s.items) v.forEach((x, i) => e.push(...val(s.items, x, p + '[' + i + ']', R))); return e; };
// (le monde d'Orvane avant ses éveils — sa génération 0 —, celui que ce banc suppose : etat.json a depuis éveillé la flore, la Mère et le milieu)
const I0 = lireJ('mondes/orvane/generation-0.json'), profil = lireJ('mondes/orvane/profil.json'), t0 = Date.now();
const animaux = I => I.taxons.filter(t => t.plan?.regime !== 'vegetal').map(t => ({ id: t.id, populations: t.populations.map(p => [p.biome, p.effectif]) }));
const biome = (I, id) => I.biomes.find(b => b.id === id);
const place = (I, b, f) => somme(I.taxons.filter(t => t.plan?.regime === 'vegetal' && t.plan.forme === f).flatMap(t => t.populations.filter(p => p.biome === b).map(p => p.potentiel || 0)));
const tenir = (I, b, filtre, k) => { for (const t of I.taxons) if (filtre(t)) for (const p of t.populations) if (p.biome === b) p.effectif *= k; };
const brouteur = t => t.plan?.regime === 'herbivore' && (t.plan.masse_kg || 0) >= Mi.REGLES.paturage.masse;
const avancer = (I, n, avant = () => {}, pr = () => ({})) => { const ev = []; for (let k = 0; k < n; k++) { avant(I, k); I = Orvane.cycle(I, pr(k)); ev.push(...I.evenements); } return { I, ev }; };

console.log('1. Le jour un');
{ const src = fs.readFileSync(racine('moteur/orvane.js'), 'utf8'), mod = { exports: {} };
  vm.runInNewContext(src, { module: mod, require: p => p === './milieu.js' ? null : require(racine('moteur/' + p.replace('./', ''))), console });
  let A = I0, B = I0; for (let k = 0; k < 3; k++) { A = Orvane.cycle(A, {}); B = mod.exports.cycle(B, {}); }
  verif(empreinte(A) === empreinte(B), 'un monde sans milieu éveillé tourne exactement comme le moteur sans moteur/milieu.js');
  const T = Mi.TRAITS.batisseur; delete Mi.TRAITS.batisseur;
  const W = Mi.eveiller(I0).inst, a = Orvane.cycle(I0, {}), b = Orvane.cycle(W, {}); Mi.TRAITS.batisseur = T;
  verif(empreinte(animaux(a)) === empreinte(animaux(b)) && empreinte(a.biomes.map(x => x.axes)) === empreinte(b.biomes.map(x => x.axes)),
    'le jour de l\'éveil, rien ne bouge : les axes de chaque lieu deviennent sa base, ce que ses bêtes y pèsent sa référence (le tirage du bâtisseur mis à part)');
}

console.log('2. Le pâturage');
const F = Mi.eveiller(Flore.eveiller(I0).inst).inst;
{ const c0 = biome(F, 'savane').axes.couvert, ar0 = place(F, 'savane', 'arbre'), he0 = place(F, 'savane', 'herbe');
  const sans = avancer(clone(F), 40, I => tenir(I, 'savane', brouteur, .3)).I, trop = avancer(clone(F), 40, I => tenir(I, 'savane', brouteur, 1.5)).I;
  const c1 = biome(sans, 'savane').axes.couvert, c2 = biome(trop, 'savane').axes.couvert;
  verif(c1 > c0 + .04 && c2 < c0 - .04, `la savane (couvert ${fx(c0)}) : ses brouteurs d'un kilo et plus tenus au tiers 40 cycles, elle se referme (${fx(c1)}) ; multipliés par 1,5 à chaque cycle, elle s'ouvre (${fx(c2)})`);
  const ar1 = place(sans, 'savane', 'arbre') / ar0, he1 = place(sans, 'savane', 'herbe') / he0, ar2 = place(trop, 'savane', 'arbre') / ar0;
  verif(ar1 > 1.1 && he1 < 1 && ar2 < .95, `la place des plantes suit : sans brouteurs, ${fx(ar1 * 100, 0)} % pour les arbres, ${fx(he1 * 100, 0)} % pour l'herbe ; surpâturée, ${fx(ar2 * 100, 0)} % pour les arbres`);
}

console.log('3. Les terriers, les barrages');
{ const fou = t => t.plan?.regime !== 'vegetal' && (t.plan?.locomotion || []).includes('fouissage'), K0 = biome(F, 'foret').capacite_base ?? biome(F, 'foret').capacite;
  const R = avancer(clone(F), 30, I => tenir(I, 'foret', fou, 1.05)).I, k = biome(R, 'foret').capacite / K0;
  verif(k > 1.02, `les fouisseurs de la forêt, plus nombreux chaque cycle pendant 30 cycles : la capacité de la forêt passe à ${fx(k * 100, 1)} % de sa base (le sol ameubli)`);
  // les bâtisseurs : une lignée de la forêt (au bord du lac et de la rivière) dont la moitié porte le trait
  const W = clone(F), t = W.taxons.filter(x => x.plan?.regime !== 'vegetal' && x.populations.some(p => p.biome === 'foret')).sort((a, b) => (b.populations.find(p => p.biome === 'foret').effectif * b.plan.masse_kg) - (a.populations.find(p => p.biome === 'foret').effectif * a.plan.masse_kg))[0];
  t.phenotypes.forEach(p => { p.frequence *= .5; if (p.frequence_par_biome) for (const k2 in p.frequence_par_biome) p.frequence_par_biome[k2] *= .5; });
  t.phenotypes.push({ id: 'batisseur', frequence: .5, traits: ['batisseur'], cout_total: .1, frequence_par_biome: Object.fromEntries(t.populations.map(p => [p.biome, .5])) });
  const B = Object.fromEntries(W.biomes.map(b => [b.id, b])), h0 = B.foret.axes.humidite, d0 = B.desert.axes.humidite; let evB = [];
  for (let k2 = 0; k2 < 30; k2++) evB.push(...Mi.preparer({ biomes: B, taxons: W.taxons, n: k2 }).evenements);
  verif(B.foret.axes.humidite > h0 + .03 && evB.some(e => e.biome === 'foret' && /bâtisseurs/.test(e.detail)),
    `les bâtisseurs (${t.nom}, la moitié de la lignée) : l'humidité de la forêt passe de ${fx(h0)} à ${fx(B.foret.axes.humidite)} en 30 cycles, et le journal le dit (« ${evB.find(e => e.biome === 'foret').detail} »)`);
  verif(Mi.TRAITS.batisseur.vulnerabilite < 1 && Orvane.cycle(W, {}).catalogue.traits.batisseur, 'leur hutte les protège des prédateurs (vulnérabilité 0,75) ; le trait est publié dans le catalogue du monde qui le porte');
}

console.log('4. Le jeu');
// (un compte ne pèse pas plus de par_compte_cycle unités de milieu par cycle, tampon/tampon.js : le défrichage d'un lieu est l'affaire
//  de nombreux joueurs, 30 unités chacun au plus)
{ const C = profil.influence?.plafonds?.par_compte_cycle || 30, lot = (action, n, extra = {}) => Array.from({ length: Math.ceil(n / C) }, (_, i) => ({ monde: I0.monde.id, source: { jeu: 'essai', compte: 'j' + i }, evenements: [{ biome: 'foret', action, n: Math.min(C, n - C * i), ...extra }] }));
  const pres = (I, L) => Tampon.agreger(L.flat(), I, profil, {}).pressions;
  const c0 = biome(F, 'foret').axes.couvert, ar0 = place(F, 'foret', 'arbre'), he0 = place(F, 'foret', 'herbe');
  const tr = [], ev = []; let X = clone(F), Y;
  for (let k = 0; k < 60; k++) { X = Orvane.cycle(X, k < 20 ? pres(X, [lot('defrichage', 2000)]) : {}); ev.push(...X.evenements); if (k === 19) { tr.push(biome(X, 'foret').axes.couvert); Y = clone(X); } if (k === 59) tr.push(biome(X, 'foret').axes.couvert); }
  verif(tr[0] < c0 - .05 && tr[1] > tr[0] + .03 && ev.some(e => e.biome === 'foret' && /joueurs/.test(e.detail)),
    `la forêt (couvert ${fx(c0)}) défrichée 20 cycles : ${fx(tr[0])} ; laissée 40 cycles, elle se referme (${fx(tr[1])}) ; le journal dit que ce sont les joueurs`);
  verif(place(Y, 'foret', 'herbe') / he0 > 1.1 && place(Y, 'foret', 'arbre') / ar0 < .99, `la place des plantes suit le défrichage : ${fx(place(Y, 'foret', 'herbe') / he0 * 100, 0)} % pour l'herbe, ${fx(place(Y, 'foret', 'arbre') / ar0 * 100, 0)} % pour les arbres`);
  const pc = pres(F, [lot('construction', 100)]).biomes.foret, pt = pres(F, [lot('transformation', 2000, { axe: 'temperature', sens: 1 })]);
  const Z = Orvane.cycle(clone(F), pt);
  verif(pc.habitat < 0 && pc.milieu.couvert < 0 && biome(Z, 'foret').axes.temperature > biome(F, 'foret').axes.temperature,
    `construire retire de l'habitat et du couvert ; transformation (axe, sens) change un axe quelconque : la température de la forêt passe de ${fx(biome(F, 'foret').axes.temperature, 3)} à ${fx(biome(Z, 'foret').axes.temperature, 3)}`);
  const e = val(SP.properties.evenements.items, { biome: 'foret', action: 'transformation', n: 10, axe: 'temperature', sens: 1 }, '$', SP);
  verif(!e.length, 'un lot qui transforme le milieu respecte schemas/pression.schema.json : sans taxon' + (e.length ? ' : ' + e.join(' ; ') : ''));
}

console.log('5. Les parcelles, le contrat, le cycle de nuit');
{ const P = Mi.eveiller(Parcelles.decouper(clone(I0), { par: 4 })).inst, ps = P.biomes.filter(b => (b.type || b.id) === 'foret'), cible = ps[0].id;
  const L = Array.from({ length: 14 }, (_, i) => ({ monde: I0.monde.id, source: { jeu: 'essai', compte: 'j' + i }, evenements: [{ biome: 'foret', parcelle: cible, action: 'defrichage', n: Math.min(30, 400 - 30 * i) }] }));   // (400 unités, entre 14 joueurs)
  let X = P; for (let k = 0; k < 10; k++) { const r = Tampon.agreger(L, Parcelles.regrouper(X), profil, {}); X = Orvane.cycle(X, Parcelles.repartir(r.pressions, X, Parcelles.localiser(L, X))); }
  const c = id => X.biomes.find(b => b.id === id).axes.couvert, autres = ps.slice(1).map(b => c(b.id)), V = Parcelles.regrouper(X);
  verif(c(cible) < ps[0].axes.couvert - .03 && autres.every(v => Math.abs(v - ps[1].axes.couvert) < .02) && biome(V, 'foret').axes.couvert < biome(I0, 'foret').axes.couvert && biome(V, 'foret').axes.couvert > c(cible),
    `le défrichage d'une parcelle de la forêt reste là : ${fx(c(cible))} contre ${autres.map(v => fx(v)).join(', ')} pour les autres ; la forêt publiée en fait la moyenne (${fx(biome(V, 'foret').axes.couvert)})`);
  const pub = Tampon.filtrer(Parcelles.regrouper(X), { familles: ['animale', 'synthetique'] }), er = val(S, pub, '$');
  verif(!er.length, "l'instantané d'un monde au milieu transformé respecte schemas/instantane.schema.json" + (er.length ? ' : ' + er.slice(0, 3).join(' ; ') : ''));
  const dossier = racine('mondes/essai-milieu'); fs.rmSync(dossier, { recursive: true, force: true }); fs.mkdirSync(dossier, { recursive: true });
  try { fs.writeFileSync(path.join(dossier, 'profil.json'), JSON.stringify({ ...profil, monde: { ...profil.monde, id: 'essai-milieu', milieu: true, synthetique: false, flore: false, fusions: [], parcelles: undefined, pressions: undefined } }));
    fs.writeFileSync(path.join(dossier, 'etat.json'), JSON.stringify(I0)); fs.writeFileSync(path.join(dossier, 'instantane.json'), JSON.stringify(I0));
    const sortie = execFileSync('node', [racine('hebergement/cycle.js'), 'essai-milieu', '--sans-reseau', '--cycles', '2'], { encoding: 'utf8' }), Ip = JSON.parse(fs.readFileSync(path.join(dossier, 'instantane.json'), 'utf8'));
    verif((sortie.match(/milieu : les bêtes/g) || []).length === 1 && Ip.monde.milieu && Ip.biomes.every(b => b.transforme?.base), 'le cycle de nuit : le profil demande le milieu (monde.milieu), il s\'éveille une fois, et chaque lieu publie sa base');
  } finally { fs.rmSync(dossier, { recursive: true, force: true }); }
}
console.log(`\n${ok ? 'tout passe' : 'ÉCHEC'} (${fx((Date.now() - t0) / 60000, 1)} min)`);
process.exit(ok ? 0 : 1);
