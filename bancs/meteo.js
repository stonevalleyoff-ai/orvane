// Orvane — LE BANC DE LA MÉTÉO (bancs/meteo.js, docs/45)
//  1. le jour un : un monde sans météo tourne exactement comme le moteur sans moteur/meteo.js ; le jour de l'éveil, rien ne bouge ;
//  2. le temps : des écarts autour de la saison, qui durent et passent de parcelle en parcelle ; le même monde, le même temps ;
//  3. la neige et le sec : la neige tient au froid et fond au redoux, la sécheresse s'installe quand le sec dure ;
//  4. la production : de moyenne 1 dans chaque lieu ; la pluie nourrit les terres sèches ;
//  5. la vie suit : un été sec pèse sur les brouteurs des terres sèches ; sur la durée, le monde garde son poids ;
//  6. les parcelles, le contrat, le cycle de nuit.
//   node bancs/meteo.js            (environ 6 minutes ; --court : environ 2 minutes)
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm'), { execFileSync } = require('child_process');
const racine = p => path.join(__dirname, '..', p);
const Orvane = require(racine('moteur/orvane.js')), Me = require(racine('moteur/meteo.js')), Parcelles = require(racine('moteur/parcelles.js')), Tampon = require(racine('tampon/tampon.js')), Monde = require('./monde.js');
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
// le monde d'Orvane vu par biome, sans le continent de la genèse 7 (bancs/monde.js) : de quoi tourner vite ; et ses parcelles, pour le temps seul
const I0 = Monde.orvane({ continent: '', sans: ['meteo'] }), W = Me.eveiller(I0).inst, E0 = Monde.etat(['meteo']);
const animaux = I => I.taxons.filter(t => t.plan.regime !== 'vegetal').map(t => [t.id, t.populations.map(p => [p.biome, p.effectif])]);
const avec = (o, f) => { const g = clone(Me.REGLES); Object.assign(Me.REGLES, o); try { return f(); } finally { for (const k of Object.keys(g)) Me.REGLES[k] = g[k]; } };
const avancer = (X, n, o = {}) => avec(o, () => { for (let k = 0; k < n; k++) X = Orvane.cycle(X, {}); return X; });
const m = b => (b.meteo && typeof b.meteo === 'object' ? b.meteo : null);
// le temps seul, sans les bêtes : les lieux d'un monde, n cycles ; chaque(lieux, cycle) à chaque cycle
function temps(E, n, chaque, graine) {
  const X = Me.eveiller(E).inst, monde = graine == null ? X.monde : { ...X.monde, graine }, biomes = Object.fromEntries(X.biomes.map(b => [b.id, b])), A = monde.annee || 0, ev = [];
  for (let c = X.cycle.n + 1; c <= X.cycle.n + n; c++) { const ph = A ? (c % A) / A : null, r = Me.preparer({ monde, biomes, n: c, axes: b => Orvane.axesSaison(b, ph) }); ev.push(...r.evenements); if (chaque) chaque(biomes, c, ph); }
  return { biomes, ev };
}

console.log('1. Le jour un');
{ const src = fs.readFileSync(racine('moteur/orvane.js'), 'utf8'), mod = { exports: {} };
  vm.runInNewContext(src, { module: mod, require: p => p === './meteo.js' ? null : require(racine('moteur/' + p.replace('./', ''))), console });
  let A = I0, C = I0; for (let k = 0; k < 3; k++) { A = Orvane.cycle(A, {}); C = mod.exports.cycle(C, {}); }
  verif(empreinte(A) === empreinte(C), 'un monde sans météo tourne exactement comme le moteur sans moteur/meteo.js');
  const a = Orvane.cycle(I0, {}), b = Orvane.cycle(W, {}), L = b.biomes.filter(m);
  verif(empreinte(animaux(a)) === empreinte(animaux(b)) && L.length > 0 && L.every(x => x.meteo.t === 0 && x.meteo.e === 0 && x.meteo.production === 1), `le jour de l'éveil, rien ne bouge : ${L.length} lieux ont un temps, partout celui de la saison`);
  const sans = b.biomes.filter(x => !m(x)).map(x => x.nom || x.id);
  verif(sans.length > 0 && b.biomes.filter(x => x.milieu === 'souterrain').every(x => !m(x)), `le sous-sol et la mer sans lumière n'ont pas de temps (${sans.join(', ')})`);
}

console.log('2. Le temps');
{ const N = COURT ? 240 : 480, st = { e: 0, t: 0, k: 0, ee: 0, e1: 0 }, T = {}, hier = {}; let vo = [0, 0, 0], lo = [0, 0, 0], faux = 0;
  const R = temps(E0, N, (B, c) => { if (c < E0.cycle.n + 20) { for (const b of Object.values(B)) if (m(b)) hier[b.id] = b.meteo.e; return; }
    const L = Object.values(B).filter(m);
    for (const b of L) { const x = b.meteo; st.e += x.e * x.e; st.t += x.t * x.t; st.k++; T[x.temps] = (T[x.temps] || 0) + 1; if (hier[b.id] != null) { st.e1 += x.e * hier[b.id]; st.ee += hier[b.id] * hier[b.id]; }
      const ax = b.axes.temperature; if ((x.temps === 'neige' && ax > .55) || (x.temps === 'canicule' && ax < .45)) faux++;
      for (const v of b.voisins || []) { const w = B[v] && m(B[v]); if (w) { vo[0] += x.e * w.e; vo[1] += x.e * x.e; vo[2] += w.e * w.e; } }
      const o = L[(L.indexOf(b) + 53) % L.length]; if (!(b.voisins || []).includes(o.id)) { lo[0] += x.e * o.meteo.e; lo[1] += x.e * x.e; lo[2] += o.meteo.e * o.meteo.e; } }
    for (const b of L) hier[b.id] = b.meteo.e; });
  const sd = Math.sqrt(st.e / st.k), sdt = Math.sqrt(st.t / st.k), dure = st.e1 / st.ee, cv = vo[0] / Math.sqrt(vo[1] * vo[2]), cl = lo[0] / Math.sqrt(lo[1] * lo[2]);
  const nbL = Object.values(R.biomes).filter(m).length;
  verif(sd > .35 && sd < .7 && sdt > .35 && sdt < .7, `${nbL} parcelles, ${N} cycles : l'eau s'écarte de la saison de ±${fx(sd, 2)}, la chaleur de ±${fx(sdt, 2)}`);
  verif(dure > .4, `le temps dure : d'un cycle au suivant, l'écart d'eau d'une parcelle se retrouve à ${fx(dure * 100)} %`);
  verif(cv > .2 && Math.abs(cl) < .1, `il passe par fronts : deux parcelles voisines ont le même temps à ${fx(cv * 100)} %, deux parcelles loin l'une de l'autre à ${fx(cl * 100)} %`);
  const tot = Object.values(T).reduce((a, x) => a + x, 0), part = k => (T[k] || 0) / tot;
  verif(Object.keys(Me.NOMS).every(k => T[k] > 0) && part('clair') + part('couvert') > .4 && part('tempete') < .1 && faux === 0,
    `tous les temps viennent : ${Object.keys(T).sort((a, b) => T[b] - T[a]).map(k => `${Me.NOMS[k]} ${fx(part(k) * 100, 1)} %`).join(', ')} ; jamais de neige dans un lieu chaud, ni de canicule dans un lieu froid`);
  verif(R.ev.length > 0 && R.ev.length <= N * Me.REGLES.evenements && R.ev.every(e => e.type === 'meteo'), `${fx(R.ev.length / N, 1)} événements par cycle au plus ${Me.REGLES.evenements} (« ${R.ev[0]?.detail} », « ${R.ev.find(e => /neige|sécheresse|canicule/.test(e.detail))?.detail} »)`);
  // le même monde, le même temps ; l'ordre des lieux n'y fait rien ; une autre graine, un autre temps
  const fin = E => empreinte(Object.values(temps(E, 30).biomes).map(b => [b.id, b.meteo]).sort((a, b) => a[0] < b[0] ? -1 : 1));
  const inverse = { ...E0, biomes: E0.biomes.slice().reverse() };
  verif(fin(E0) === fin(E0) && fin(E0) === fin(inverse) && empreinte(Object.values(temps(E0, 30, null, 99).biomes).map(b => b.meteo)) !== empreinte(Object.values(temps(E0, 30).biomes).map(b => b.meteo)), 'le même monde a le même temps, quel que soit l\'ordre de ses lieux ; une autre graine, un autre temps');
}

console.log('3. La neige et le sec');
{ const N = COURT ? 240 : 480, neige = {}, sec = {}, cyc = {}; let fonte = 0, prem = 0;
  const R = temps(E0, N, (B, c, ph) => { for (const b of Object.values(B)) { const x = m(b); if (!x) continue; const ty = b.type || b.id; cyc[ty] = (cyc[ty] || 0) + 1;
    if (x.neige > 0) { neige[ty] = (neige[ty] || 0) + 1; if (ph > .4 && ph < .6 && b.axes.temperature > .3) fonte++; } if (x.secheresse >= Me.REGLES.secheresse.seuil) sec[ty] = (sec[ty] || 0) + 1; } });
  prem = R.ev.filter(e => /premières neiges/.test(e.detail)).length;
  const part = (o, ty) => (o[ty] || 0) / (cyc[ty] || 1), froids = ['banquise', 'toundra', 'sommets'].filter(k => cyc[k]), chauds = ['jungle', 'desert', 'savane'].filter(k => cyc[k]);
  verif(froids.every(k => part(neige, k) > .2) && chauds.every(k => !neige[k]) && fonte === 0 && prem > 0,
    `la neige tient au froid (${froids.map(k => `${k} ${fx(part(neige, k) * 100)} % des cycles`).join(', ')}), jamais au chaud (${chauds.join(', ')}), et aucune ne passe le cœur de l'été d'un lieu tempéré`);
  const secs = Object.keys(sec).length, tous = Object.values(sec).reduce((a, x) => a + x, 0) / Object.values(cyc).reduce((a, x) => a + x, 0);
  verif(secs > 0 && tous > .005 && tous < .2 && R.ev.some(e => /sécheresse/.test(e.detail)), `le sec dure parfois : une sécheresse est installée ${fx(tous * 100, 1)} % du temps, dans ${secs} sortes de lieux`);
  // un sec imposé : la sécheresse monte, cycle après cycle ; la pluie revenue, elle retombe
  const X = Me.eveiller(E0).inst, Bm = Object.fromEntries(X.biomes.map(b => [b.id, b])), p = Object.values(Bm).find(b => (b.type || b.id) === 'prairie'), suite = [];
  avec({ force: { e: -1, t: 0 } }, () => { for (let c = 1; c <= 13; c++) { Me.preparer({ monde: X.monde, biomes: Bm, n: X.cycle.n + c }); suite.push(p.meteo.secheresse || 0); } });
  avec({ force: { e: 1, t: 0 } }, () => { for (let c = 14; c <= 25; c++) Me.preparer({ monde: X.monde, biomes: Bm, n: X.cycle.n + c }); });
  verif(suite[1] > 0 && suite[12] >= Me.REGLES.secheresse.seuil && suite.every((x, i) => i === 0 || x >= suite[i - 1]) && !(p.meteo.secheresse > 0), `douze cycles secs sur une prairie : la sécheresse monte de ${fx(suite[1], 2)} à ${fx(suite[12], 2)} ; douze cycles de pluie, il n'en reste rien`);
}

console.log('4. La production');
{ const N = COURT ? 360 : 720, P = {};
  temps(E0, N, (B, c) => { if (c < E0.cycle.n + 20) return; for (const b of Object.values(B)) { const x = m(b); if (x) { const y = P[b.type || b.id] ??= [0, 0, 9, 0]; y[0] += x.production; y[1]++; y[2] = Math.min(y[2], x.production); y[3] = Math.max(y[3], x.production); } } });
  const moy = Object.entries(P).map(([k, y]) => [k, y[0] / y[1], y[2], y[3]]), pire = moy.slice().sort((a, b) => Math.abs(b[1] - 1) - Math.abs(a[1] - 1))[0], ample = moy.slice().sort((a, b) => (b[3] - b[2]) - (a[3] - a[2]))[0], mer = moy.find(x => x[0] === 'large');
  verif(Math.abs(pire[1] - 1) < .02, `sur ${N} cycles, la production moyenne de chaque sorte de lieu reste à 1 (le plus loin : ${pire[0]}, ${fx(pire[1], 3)})`);
  verif(ample[3] - ample[2] > .15 && mer && mer[3] - mer[2] < .08, `elle bouge le plus dans ${ample[0]} (de ${fx(ample[2], 2)} à ${fx(ample[3], 2)}), à peine en mer (le large : de ${fx(mer[2], 2)} à ${fx(mer[3], 2)})`);
  const d = { milieu: 'terrestre', axes: { temperature: .8, humidite: .15 } }, j = { milieu: 'terrestre', axes: { temperature: .8, humidite: .85 } }, f = { milieu: 'terrestre', axes: { temperature: .1, humidite: .5 } };
  verif(Me.productionDe(d, 1, 0) > 1.1 && Me.productionDe(d, -1, 0) < .9 && Me.productionDe(j, 1, 0) < 1 && Me.productionDe(f, 0, 1) > 1.05 && Me.productionDe(d, 0, 1) < 1,
    `la pluie nourrit une terre sèche (× ${fx(Me.productionDe(d, 1, 0), 2)}) et noie un peu une terre gorgée (× ${fx(Me.productionDe(j, 1, 0), 2)}) ; un coup de chaud nourrit une terre froide (× ${fx(Me.productionDe(f, 0, 1), 2)}) et brûle une terre chaude (× ${fx(Me.productionDe(d, 0, 1), 2)})`);
}

console.log('5. La vie suit');
{ const N = COURT ? 12 : 25, sec = avancer(W, N, { force: { e: -1.2, t: .6 } }), arrose = avancer(W, N, { force: { e: 1.2, t: -.3 } });
  const secs = new Set(W.biomes.filter(b => b.milieu === 'terrestre' && (b.axes.humidite ?? .5) < .4).map(b => b.id));
  const brout = I => I.taxons.filter(t => !t.eteint && (t.plan.regime === 'herbivore' || t.plan.regime === 'omnivore')).reduce((a, t) => a + t.populations.filter(p => secs.has(p.biome)).reduce((x, p) => x + p.effectif * (t.plan.masse_kg || 1), 0), 0);
  const r = brout(sec) / brout(arrose);
  verif(secs.size > 0 && r < .97, `${N} cycles d'un temps sec et chaud, ou arrosé : dans les terres sèches (${[...secs].join(', ')}), les brouteurs pèsent ${fx((1 - r) * 100, 1)} % de moins au sec`);
  const M2 = COURT ? 20 : 60, a = avancer(I0, M2), b = avancer(W, M2), bio = I => I.taxons.filter(t => !t.eteint && t.plan.regime !== 'vegetal').reduce((s, t) => s + t.populations.reduce((x, p) => x + p.effectif, 0) * (t.plan.masse_kg || 1), 0);
  const vifs = I => I.taxons.filter(t => !t.eteint && t.plan.regime !== 'vegetal').length, rb = bio(b) / bio(a);
  verif(rb > .93 && rb < 1.07 && Math.abs(vifs(a) - vifs(b)) <= 3, `${M2} cycles avec et sans météo : les bêtes pèsent ${fx(rb * 100, 1)} % de ce qu'elles pèsent sans elle, ${vifs(b)} lignées contre ${vifs(a)}`);
  const T = {}; for (const x of b.biomes) if (m(x)) T[x.meteo.temps] = (T[x.meteo.temps] || 0) + 1;
  verif(Object.keys(T).length >= 3 && empreinte(avancer(W, 3)) === empreinte(avancer(W, 3)), `au dernier cycle : ${Object.entries(T).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${Me.NOMS[k]} sur ${v}`).join(', ')} ; deux fois le même monde`);
}

console.log('6. Les parcelles, le contrat, le cycle de nuit');
{ const P = Me.eveiller(Parcelles.decouper(I0, { par: 3 })).inst, X = avancer(P, COURT ? 3 : 5), V = Parcelles.regrouper(X), f = V.biomes.find(b => b.id === 'foret'), pf = V.parcelles.filter(p => p.type === 'foret');
  const moy = pf.reduce((s, p) => s + p.meteo.e, 0) / pf.length, divers = V.parcelles.filter(p => p.type === 'foret' || p.type === 'prairie').map(p => p.meteo.e);
  verif(pf.length === 3 && pf.every(p => p.meteo) && new Set(divers).size === divers.length && f.meteo && Math.abs(f.meteo.e - moy) < .35 && Me.NOMS[f.meteo.temps],
    `un monde par parcelles : chaque parcelle a son temps (la forêt : ${pf.map(p => `${Me.NOMS[p.meteo.temps]} ${p.meteo.e > 0 ? '+' : ''}${fx(p.meteo.e, 2)}`).join(', ')}), le biome publié le temps de ses parcelles (${Me.NOMS[f.meteo.temps]}, ${f.meteo.e > 0 ? '+' : ''}${fx(f.meteo.e, 2)})`);
  const Y = avancer(W, 2), e = [...val(S, Tampon.filtrer(Y, { familles: ['animale'] }), '$'), ...val(S, Tampon.filtrer(V, { familles: ['animale'] }), '$')];
  verif(!e.length, 'l\'instantané d\'un monde à la météo éveillée respecte le schéma, par biome et par parcelles' + (e.length ? ' : ' + e.slice(0, 3).join(' ; ') : ''));
  const dossier = racine('mondes/essai-meteo'); fs.rmSync(dossier, { recursive: true, force: true }); fs.mkdirSync(dossier, { recursive: true });
  try { const Pf = lireJ('mondes/orvane/profil.json'); fs.writeFileSync(path.join(dossier, 'profil.json'), JSON.stringify({ ...Pf, monde: { ...Pf.monde, id: 'essai-meteo', meteo: true, climat: false, dietes: false, flore: false, derives: false, natures: false, milieu: false, invention: false, stades: false, ponte: false, synthetique: false, pathogenes: false, fusions: [], parcelles: undefined, pressions: undefined } }));
    fs.writeFileSync(path.join(dossier, 'etat.json'), JSON.stringify(I0)); fs.writeFileSync(path.join(dossier, 'instantane.json'), JSON.stringify(I0));
    const sortie = execFileSync('node', [racine('hebergement/cycle.js'), 'essai-meteo', '--sans-reseau', '--cycles', '2'], { encoding: 'utf8' }), Ip = JSON.parse(fs.readFileSync(path.join(dossier, 'instantane.json'), 'utf8'));
    verif((sortie.match(/^meteo : /gm) || []).length === 1 && Ip.monde.meteo && Ip.biomes.some(m), 'le profil demande la météo (monde.meteo), elle s\'éveille une fois');
  } finally { fs.rmSync(dossier, { recursive: true, force: true }); }
}
console.log(`\n${ok ? 'tout passe' : 'ÉCHEC'} (${fx((Date.now() - t0) / 60000, 1)} min)`);
process.exit(ok ? 0 : 1);
