// Orvane — LE BANC DU CLIMAT (bancs/climat.js, docs/31)
//  1. le jour un : un monde sans climat tourne exactement comme le moteur sans moteur/climat.js ; le jour de l'éveil, rien ne bouge ;
//  2. le climat : deux ondes et une marche, nulles à l'éveil ; un âge glaciaire vient ; le froid est sec, la mer en sent la moitié ;
//  3. la vie suit : au froid, les lignées des lieux froids gagnent, celles des lieux chauds reculent ;
//  4. la mer : elle baisse, des ponts de terre émergent et des lignées les passent ; elle remonte, ils sombrent ;
//  5. les îles : une île naît au large d'un rivage ; ses plantes viennent du rivage ; seules les bêtes qui volent, nagent ou dérivent y passent ;
//  6. les parcelles, le contrat, le cycle de nuit.
//   node bancs/climat.js
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm'), { execFileSync } = require('child_process');
const racine = p => path.join(__dirname, '..', p);
const Orvane = require(racine('moteur/orvane.js')), Cl = require(racine('moteur/climat.js')), Mi = require(racine('moteur/milieu.js')), Fl = require(racine('moteur/flore.js')), Parcelles = require(racine('moteur/parcelles.js')), Tampon = require(racine('tampon/tampon.js'));
const lireJ = f => JSON.parse(fs.readFileSync(racine(f), 'utf8'));
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const empreinte = I => crypto.createHash('sha256').update(JSON.stringify(I)).digest('hex').slice(0, 16);
const clone = o => JSON.parse(JSON.stringify(o)), fx = (x, d = 0) => (+x).toLocaleString('fr-FR', { maximumFractionDigits: d }), t0 = Date.now();
const S = lireJ('schemas/instantane.schema.json');
const val = (s, v, p) => { if (!s) return []; if (s.$ref) s = S.$defs[s.$ref.split('/').pop()]; const t = Array.isArray(s.type) ? s.type : [s.type], ty = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
  if (s.type && !t.includes(ty === 'number' && t.includes('integer') && Number.isInteger(v) ? 'integer' : ty)) return [p + ': type ' + ty]; if (s.enum && !s.enum.includes(v)) return [p + ': hors enum ' + v]; const e = [];
  if (ty === 'object') { for (const r of s.required || []) if (!(r in v)) e.push(p + ': manque ' + r); for (const k in v) { const ps = s.properties?.[k] || (typeof s.additionalProperties === 'object' ? s.additionalProperties : null); if (ps) e.push(...val(ps, v[k], p + '.' + k)); else if (s.additionalProperties === false) e.push(p + ': en trop ' + k); } }
  if (ty === 'array' && s.items) v.forEach((x, i) => e.push(...val(s.items, x, p + '[' + i + ']'))); return e; };
// (le monde d'Orvane a désormais un milieu transformé, qui suit le climat avec retard : le banc part du même monde sans milieu, comme
//  quand il a été écrit ; la section 2 éveille le milieu pour comparer)
const I0 = (X => { delete X.monde.milieu; for (const b of X.biomes) { delete b.transforme; for (const k in b.axes) b.axes[k] = Math.round(b.axes[k] * 1e4) / 1e4; } return X; })(require('./monde.js').orvane({ continent: '', sans: ['climat'] })),   // (axes à 4 décimales, comme le climat les écrit)   // (le monde d'Orvane vu par biome, sans le continent de la genèse 7 : bancs/monde.js)
  W = Cl.eveiller(I0).inst, animaux = I => I.taxons.map(t => [t.id, t.populations.map(p => [p.biome, p.effectif])]);
const B = (X, id) => X.biomes.find(b => b.id === id) || X.biomes.find(b => (b.type || b.id) === id), tot = t => t ? t.populations.reduce((a, p) => a + p.effectif, 0) : 0;
// des réglages de banc : une onde courte et forte (le froid au cycle 30, le chaud au cycle 50), sans marche
const avec = (o, f) => { const g = clone(Cl.REGLES); Object.assign(Cl.REGLES, o); try { return f(); } finally { for (const k of Object.keys(g)) Cl.REGLES[k] = g[k]; } };
const ONDE = { ondes: [{ periode: 40, ampleur: .15, phase: 0 }], marche: { pas: 0, retour: 0 }, iles: { ...Cl.REGLES.iles, chance: 0 } };
const avancer = (X, n, o = ONDE) => avec(o, () => { for (let k = 0; k < n; k++) X = Orvane.cycle(X, {}); return X; });

console.log('1. Le jour un');
{ const src = fs.readFileSync(racine('moteur/orvane.js'), 'utf8'), mod = { exports: {} };
  vm.runInNewContext(src, { module: mod, require: p => p === './climat.js' ? null : require(racine('moteur/' + p.replace('./', ''))), console });
  let A = I0, C = I0; for (let k = 0; k < 3; k++) { A = Orvane.cycle(A, {}); C = mod.exports.cycle(C, {}); }
  verif(empreinte(A) === empreinte(C), 'un monde sans climat tourne exactement comme le moteur sans moteur/climat.js');
  const a = Orvane.cycle(I0, {}), b = Orvane.cycle(W, {});
  verif(empreinte(animaux(a)) === empreinte(animaux(b)) && b.monde.climat.temperature === 0, 'le jour de l\'éveil, rien ne bouge : le climat part de zéro');
}

console.log('2. Le climat');
{ const C = { depuis: 0, marche: 0 }, T = []; for (let n = 1; n <= 3000; n++) { const e = Cl.ecart(C, n, 7); C.marche = e.marche; T.push(e.temperature); }
  const premier = T.findIndex(x => x <= Cl.REGLES.ponts.emerger), mn = Math.min(...T), mx = Math.max(...T);
  verif(T[0] === 0 && premier > 0 && premier < 1500 && mn > -.3 && mx < .3, `sur 3 000 cycles (125 jours à un cycle par heure) : un premier âge glaciaire au cycle ${premier + 1}, ${fx(mn, 2)} au plus froid, +${fx(mx, 2)} au plus chaud`);
  const X = avancer(W, 30), f = B(X, 'foret'), f0 = B(W, 'foret'), mer = B(X, 'large'), mer0 = B(W, 'large'), dT = X.monde.climat.temperature;
  verif(dT < -.14 && Math.abs(f.axes.temperature - (f0.axes.temperature + dT)) < 1e-3 && Math.abs(f.axes.humidite - (f0.axes.humidite - .5 * dT)) < 1e-3 && Math.abs(mer.axes.temperature - (mer0.axes.temperature + dT / 2)) < 1e-3,
    `une onde de banc, 30 cycles : ${fx(dT, 2)} ; la forêt passe de ${fx(f0.axes.temperature, 2)} à ${fx(f.axes.temperature, 2)} de température, et de ${fx(f0.axes.humidite, 2)} à ${fx(f.axes.humidite, 2)} d'humidité (le froid est sec) ; la mer n'en sent que la moitié`);
  const M = Cl.eveiller(Mi.eveiller(I0).inst).inst, Y = avancer(M, 30), fy = B(Y, 'foret');
  verif(fy.axes.temperature < f0.axes.temperature - .03 && fy.axes.temperature > f.axes.temperature, `dans un monde au milieu transformé, le milieu suit le climat avec retard : la forêt à ${fx(fy.axes.temperature, 2)}`);
}

console.log('3. La vie suit');
{ const X = avancer(W, 40, { ...ONDE, force: -.12 }), A = avancer(W, 40, { ...ONDE, force: 0 });   // (un écart imposé : 40 cycles à −0,12)
  // les populations dont le lieu convient mieux à leur niche au froid, et celles dont il convient moins (Orvane.convenance)
  const BX = Object.fromEntries(X.biomes.map(b => [b.id, b])), BA = Object.fromEntries(A.biomes.map(b => [b.id, b])), Ax = Object.fromEntries(A.taxons.map(t => [t.id, t]));
  const s = (sens, I) => I.taxons.filter(t => !t.eteint && t.plan.regime !== 'vegetal' && t.plan.niche).reduce((a, t) => a + t.populations.filter(p => BX[p.biome] && BA[p.biome]
    && sens * (Orvane.convenance(t.plan, BX[p.biome]) - Orvane.convenance(t.plan, BA[p.biome])) > .05).reduce((x, p) => x + p.effectif * (t.plan.masse_kg || 1), 0), 0);
  const pop = (sens, I, J) => { let a = 0, b = 0; for (const t of I.taxons) { if (t.eteint || t.plan.regime === 'vegetal' || !t.plan.niche) continue; const u = J.taxons.find(x => x.id === t.id); if (!u) continue;
    for (const p of t.populations) { const q = u.populations.find(x => x.biome === p.biome); if (!q || !BX[p.biome] || !BA[p.biome]) continue;
      if (sens * (Orvane.convenance(t.plan, BX[p.biome]) - Orvane.convenance(t.plan, BA[p.biome])) > .05) { a += p.effectif * (t.plan.masse_kg || 1); b += q.effectif * (t.plan.masse_kg || 1); } } } return a / b; };
  const rf = pop(1, X, A), rc = pop(-1, X, A);
  verif(rf > 1 && rc < 1, `40 cycles d'un âge glaciaire (−0,12) : les populations dont le lieu convient mieux à leur niche pèsent ${fx((rf - 1) * 100, 1)} % de plus qu'au climat stable, celles dont il convient moins ${fx((1 - rc) * 100, 1)} % de moins`);
}

console.log('4. La mer');
let XP;
{ const X = avancer(W, 30), P = X.monde.climat.ponts;
  verif(P.length > 0 && P.length <= Cl.REGLES.ponts.max && P.every(([a, b]) => B(X, a).voisins.includes(b) && B(X, b).voisins.includes(a)), `la mer baisse : ${P.length} ponts de terre émergent (${P.map(([a, b]) => `${B(X, a).nom} et ${B(X, b).nom}`).join(' ; ')})`);
  const Y = avancer(X, 12);
  // (6 novembre) le pont est un passage : un rivage serré (sa place à 30 % pendant 12 cycles, le pont tenu) pousse des bêtes à le
  // passer ; le même, sans le pont, aucune. (On comptait les lignées qui passent d'elles-mêmes : le monde d'Orvane est désormais assez
  // répandu pour que, sans rien qui pousse, aucune ne le fasse en 12 cycles.)
  const lignees = id => X.taxons.filter(t => t.populations.some(p => p.biome === id)).length, cote = P.length ? P[0].slice().sort((u, v) => lignees(v) - lignees(u))[0] : null;   // (le rivage le plus peuplé du premier pont)
  const serre = sansPont => { const X2 = clone(X); if (cote) B(X2, cote).capacite *= .3;
    if (sansPont) for (const [a, b] of P) { B(X2, a).voisins = B(X2, a).voisins.filter(v => v !== b); B(X2, b).voisins = B(X2, b).voisins.filter(v => v !== a); }
    const Y2 = avancer(X2, 12, { ...ONDE, ponts: { ...Cl.REGLES.ponts, sombrer: 9, emerger: -9 } });
    const avant = (t, bb) => (X.taxons.find(x => x.id === t.id)?.populations.find(p => p.biome === bb)?.effectif || 0) > 0, ici = (t, bb) => (t.populations.find(p => p.biome === bb)?.effectif || 0) > 0;
    return Y2.taxons.filter(t => t.plan.regime !== 'vegetal' && P.some(([a, b]) => (avant(t, b) && !avant(t, a) && ici(t, a)) || (avant(t, a) && !avant(t, b) && ici(t, b)))); };
  const passe = serre(false), sansPont = serre(true);
  verif(cote && passe.length > 0 && sansPont.length === 0, `le pont est un passage : un rivage serré (${B(X, cote)?.nom}, sa place à 30 % pendant 12 cycles), ${passe.length} lignées le passent vers un rivage où elles ne vivaient pas (${passe.slice(0, 3).map(t => t.nom).join(', ')}) ; sans le pont, ${sansPont.length}`);
  const Z = avancer(Y, 10); XP = Z;
  verif(Z.monde.climat.temperature > -.04 && !Z.monde.climat.ponts.length && P.every(([a, b]) => !B(Z, a).voisins.includes(b) && !B(Z, b).voisins.includes(a)), `la mer remonte (${fx(Z.monde.climat.temperature, 2)}) : les ponts sombrent, les rivages se séparent à nouveau`);
}

console.log('5. Les îles');
let XI;
{ const V = Cl.eveiller(Fl.eveiller(I0).inst).inst, O1 = { ...ONDE, ondes: [], iles: { ...Cl.REGLES.iles, chance: 1, max: 1, maturite: 20, derive: .05 } };   // (le rivage de banc n'a que des dizaines de bêtes qui traversent : le flux est forcé)
  const X = avancer(V, 1, O1), ile = X.biomes.find(b => b.id.startsWith('ile-')), c = ile && B(X, ile.traversees[0]);
  const plantes = ile && X.taxons.filter(t => t.plan.regime === 'vegetal' && t.populations.some(p => p.biome === ile.id));
  verif(ile && c && c.voisins.includes(ile.id) && c.traversees.includes(ile.id) && plantes.length > 0 && ile.capacite_base < ile.jeune.cible / 10,
    `« ${X.evenements.find(e => e.type === 'climat')?.detail} » : sa terre est d'abord pauvre (${fx(ile.capacite_base)} sur ${fx(ile.jeune.cible)}) ; ${plantes.length} lignées de plantes du rivage y poussent`);
  const Y = avancer(X, 25, O1), iy = B(Y, ile.id), venus = Y.taxons.filter(t => t.plan.regime !== 'vegetal' && t.populations.some(p => p.biome === ile.id && p.effectif > 0));
  verif(!iy.jeune && iy.capacite_base === ile.jeune.cible && venus.length > 0 && venus.every(t => Cl.traverse(t.plan)),
    `25 cycles après, sa terre est mûre ; ${venus.length} lignées l'ont gagnée, toutes par les airs, la mer ou en dérivant (${venus.slice(0, 4).map(t => t.nom + ' : ' + (t.plan.locomotion || []).join(', ')).join(' ; ')})`);
  XI = Y;
}

console.log('6. Les parcelles, le contrat, le cycle de nuit');
{ let P = Cl.eveiller(Parcelles.decouper(I0, { par: 3 })).inst; const X = avancer(P, 1, { ...ONDE, ondes: [], iles: { ...Cl.REGLES.iles, chance: 1, max: 1 } }), ile = X.biomes.find(b => b.id.startsWith('ile-')), V = Parcelles.regrouper(X);
  verif(ile && ile.type === ile.id && X.monde.parcelles.types.some(t => t.id === ile.id) && V.biomes.some(b => b.id === ile.id), `un monde par parcelles : l'île est un type de lieu à elle, et le monde publié la montre (${V.biomes.length} biomes)`);
  const e = [...val(S, Tampon.filtrer(XP, { familles: ['animale'] }), '$'), ...val(S, Tampon.filtrer(XI, { familles: ['animale', 'vegetale'] }), '$'), ...val(S, Tampon.filtrer(V, { familles: ['animale'] }), '$')];
  verif(!e.length, 'l\'instantané d\'un monde au climat éveillé respecte le schéma' + (e.length ? ' : ' + e.slice(0, 3).join(' ; ') : ''));
  const dossier = racine('mondes/essai-climat'); fs.rmSync(dossier, { recursive: true, force: true }); fs.mkdirSync(dossier, { recursive: true });
  try { const Pf = lireJ('mondes/orvane/profil.json'); fs.writeFileSync(path.join(dossier, 'profil.json'), JSON.stringify({ ...Pf, monde: { ...Pf.monde, id: 'essai-climat', climat: true, dietes: false, flore: false, derives: false, natures: false, milieu: false, invention: false, stades: false, ponte: false, synthetique: false, pathogenes: false, fusions: [], parcelles: undefined, pressions: undefined } }));
    fs.writeFileSync(path.join(dossier, 'etat.json'), JSON.stringify(I0)); fs.writeFileSync(path.join(dossier, 'instantane.json'), JSON.stringify(I0));
    const sortie = execFileSync('node', [racine('hebergement/cycle.js'), 'essai-climat', '--sans-reseau', '--cycles', '2'], { encoding: 'utf8' }), Ip = JSON.parse(fs.readFileSync(path.join(dossier, 'instantane.json'), 'utf8'));
    verif((sortie.match(/^climat : /gm) || []).length === 1 && Ip.monde.climat, 'le profil demande le climat (monde.climat), il s\'éveille une fois');
  } finally { fs.rmSync(dossier, { recursive: true, force: true }); }
}
console.log(`\n${ok ? 'tout passe' : 'ÉCHEC'} (${fx((Date.now() - t0) / 60000, 1)} min)`);
process.exit(ok ? 0 : 1);
