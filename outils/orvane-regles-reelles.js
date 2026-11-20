// (docs/53, « Ce que gagnerait Orvane ») node outils/orvane-regles-reelles.js V0|V1|V2 <graine>
// B : Orvane, avec et sans les règles des mondes réels — 30 cycles (10 ans) depuis son état, sans joueurs
const O = require(require('path').join(__dirname, '..', 'moteur', 'orvane.js')), fs = require('fs');
const [, , V, G] = process.argv, I0 = JSON.parse(fs.readFileSync(require('path').join(__dirname, '..', 'mondes', 'orvane', 'etat.json'), 'utf8'));
const VARS = { V0: {}, V1: { petites_proies: true, concurrence_masse: .7, domination: .5, viande_part: true },
  V2: { petites_proies: true, concurrence_masse: .7, domination: .5, viande_part: true, besoin: 6, conversion: .06, demi_satiete: 5 } };
let I = JSON.parse(JSON.stringify(I0)); I.monde.graine = +G; I.monde.regles = { ...(I.monde.regles || {}), ...VARS[V] };
const ani = t => t.plan.regime !== 'vegetal' && t.plan.regime !== 'synthetique', tot = t => t.populations.reduce((s, p) => s + p.effectif, 0);
const debut = new Map(I.taxons.filter(t => ani(t) && !t.eteint).map(t => [t.id, 0])), fin = new Map(), R = { prod: 0, mange: 0 }, SAT = [];
const shannon = X => { const L = new Map(); for (const t of X.taxons) if (ani(t)) for (const p of t.populations) if (p.effectif > 0) (L.get(p.biome) || L.set(p.biome, []).get(p.biome)).push(p.effectif * (t.plan.masse_kg || 1));
  let H = 0; for (const B of L.values()) { const S = B.reduce((a, x) => a + x, 0); for (const b of B) { const q = b / S; H -= q * Math.log(q); } } return H / Math.max(1, L.size); };
const damuth = X => { const P = X.taxons.filter(t => ani(t) && tot(t) > 0).map(t => [Math.log10(t.plan.masse_kg || 1), Math.log10(tot(t) / Math.max(1, t.populations.length))]); const n = P.length, mx = P.reduce((a, p) => a + p[0], 0) / n, my = P.reduce((a, p) => a + p[1], 0) / n;
  return P.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0) / P.reduce((a, p) => a + (p[0] - mx) ** 2, 0); };
const pp = X => { let c = 0, h = 0; for (const t of X.taxons) if (ani(t)) { const b = tot(t) * (t.plan.masse_kg || 1); if (t.plan.regime === 'carnivore') c += b; else h += b; } return c / h; };
const H0 = shannon(I), D0 = damuth(I), P0 = pp(I), C = 30, plans = new Map(I.taxons.map(t => [t.id, t.plan]));
for (let k = 0; k < C; k++) { I = O.cycle(I, {}, { trace: x => { const pl = plans.get(x.taxon); if (pl?.regime === 'carnivore') { if (k >= C - 3) { R.prod += (x.nais || 0) * (pl.masse_kg || 1); R.mange += x.ration || 0; if (x.satiete != null) SAT.push([x.N, x.satiete]); } } } });
  for (const t of I.taxons) if (!plans.has(t.id)) plans.set(t.id, t.plan);
  const M = k < 3 ? debut : k >= C - 3 ? fin : null; if (M) for (const t of I.taxons) if (ani(t) && (M === fin || M.has(t.id))) M.set(t.id, (M.get(t.id) || 0) + tot(t)); }
let dans = 0, n = 0, eteintes = 0; for (const [id, a] of debut) { n++; const b = fin.get(id) || 0; if (!(b > 0)) eteintes++; else if (b / a < 2 && a / b < 2) dans++; }
const sN = SAT.reduce((a, x) => a + x[0], 0);
console.log(JSON.stringify({ V, G, lignees: n, eteintes, stables: +(dans / n).toFixed(3), shannon: +(shannon(I) / H0).toFixed(3), damuth: [+D0.toFixed(3), +damuth(I).toFixed(3)], carnivores_sur_proies: [+P0.toFixed(4), +pp(I).toFixed(4)],
  rendement: R.mange > 0 ? +(R.prod / R.mange).toFixed(4) : null, satiete: sN ? +(SAT.reduce((a, x) => a + x[0] * x[1], 0) / sN).toFixed(3) : null, lignees_fin: I.taxons.filter(t => ani(t) && !t.eteint).length }));
